<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The structure of one form, built from the saved widget settings: fields, steps and actions.
 *
 * Submissions are always validated against a Form_Definition rebuilt on the server from the saved
 * document, never against anything the browser sends about the form.
 */
final class Form_Definition {

	const FIELD_TYPES = [ 'text', 'email', 'textarea', 'url', 'tel', 'number', 'select', 'radio', 'checkbox', 'acceptance', 'date', 'time', 'file', 'hidden', 'password', 'html', 'step', 'honeypot' ];
	const ACTION_TYPES = [ 'collect', 'email', 'email2', 'redirect', 'webhook', 'discord', 'slack', 'popup_open', 'popup_close' ];
	const NON_INPUT_TYPES = [ 'html', 'step' ];

	private string $name;
	private array $fields = [];
	private array $steps = [];
	private array $actions = [];
	private array $settings;

	private function __construct( array $settings ) {
		$this->settings = $settings;
		$this->name = trim( (string) ( $settings['form_name'] ?? '' ) );

		if ( '' === $this->name ) {
			$this->name = __( 'New Form', 'refraction' );
		}

		$this->parse_fields( (array) ( $settings['form_fields'] ?? [] ) );
		$this->parse_actions( (array) ( $settings['submit_actions'] ?? [] ) );
	}

	public static function from_settings( array $settings ): Form_Definition {
		return new self( $settings );
	}

	public static function sanitize_id( $id ): string {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $id ) );
	}

	public static function form_key( $post_id, $element_id ): string {
		return 'f_' . (int) $post_id . '_' . self::sanitize_id( $element_id );
	}

	public static function is_truthy( $value ): bool {
		return true === $value || in_array( strtolower( (string) $value ), [ 'true', 'yes', '1', 'on' ], true );
	}

	public function get_name(): string {
		return $this->name;
	}

	public function get_setting( string $key, $default = '' ) {
		return $this->settings[ $key ] ?? $default;
	}

	public function get_fields(): array {
		return $this->fields;
	}

	public function get_input_fields(): array {
		return array_values( array_filter( $this->fields, fn( $f ) => ! in_array( $f['type'], self::NON_INPUT_TYPES, true ) ) );
	}

	public function get_field( string $id ): ?array {
		foreach ( $this->fields as $field ) {
			if ( $field['id'] === $id ) {
				return $field;
			}
		}

		return null;
	}

	public function get_steps(): array {
		return $this->steps;
	}

	public function get_actions(): array {
		return $this->actions;
	}

	public function has_action( string $type ): bool {
		foreach ( $this->actions as $action ) {
			if ( $type === $action['type'] ) {
				return true;
			}
		}

		return false;
	}

	public static function parse_options( string $raw ): array {
		$options = [];

		foreach ( preg_split( '/\r\n|\r|\n/', $raw ) as $line ) {
			$line = trim( $line );

			if ( '' === $line ) {
				continue;
			}

			$parts = explode( '|', $line, 2 );
			$label = trim( $parts[0] );
			$value = isset( $parts[1] ) ? trim( $parts[1] ) : $label;
			$options[] = [ 'label' => $label, 'value' => $value ];
		}

		return $options;
	}

	private function parse_fields( array $items ): void {
		$used = [];
		$current = -1;

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$type = (string) ( $item['field_type'] ?? 'text' );
			$type = in_array( $type, self::FIELD_TYPES, true ) ? $type : 'text';

			if ( 'step' === $type ) {
				$this->steps[] = [ 'title' => trim( (string) ( $item['field_label'] ?? '' ) ) ];
				++$current;
			} elseif ( $current < 0 ) {
				$this->steps[] = [ 'title' => '' ];
				$current = 0;
			}

			$item_id = self::sanitize_id( $item['_id'] ?? '' );
			$id = self::sanitize_id( $item['custom_id'] ?? '' );
			$id = '' !== $id ? $id : 'field_' . $item_id;
			$base = $id;

			for ( $n = 2; isset( $used[ $id ] ); $n++ ) {
				$id = $base . '_' . $n;
			}

			$used[ $id ] = true;

			$this->fields[] = [
				'id' => $id,
				'item_id' => $item_id,
				'type' => $type,
				'label' => trim( (string) ( $item['field_label'] ?? '' ) ),
				'placeholder' => (string) ( $item['placeholder'] ?? '' ),
				'required' => self::is_truthy( $item['required'] ?? '' ),
				'width' => (string) ( $item['field_width'] ?? '100' ),
				'default' => (string) ( $item['field_value'] ?? '' ),
				'options' => self::parse_options( (string) ( $item['field_options'] ?? '' ) ),
				'html' => (string) ( $item['field_html'] ?? '' ),
				'step' => $current,
				'file_types' => (string) ( $item['file_types'] ?? 'jpg, jpeg, png, gif, pdf, doc, docx, txt' ),
				'file_max_size' => (float) ( $item['file_max_size'] ?? 2 ),
				'min' => $item['min_value'] ?? '',
				'max' => $item['max_value'] ?? '',
				'rows' => max( 2, (int) ( $item['rows'] ?? 4 ) ),
				'inline' => self::is_truthy( $item['inline_list'] ?? '' ),
			];
		}

		foreach ( $this->steps as $i => $step ) {
			if ( '' === $step['title'] ) {
				/* translators: %d: step number. */
				$this->steps[ $i ]['title'] = sprintf( __( 'Step %d', 'refraction' ), $i + 1 );
			}
		}
	}

	private function parse_actions( array $items ): void {
		foreach ( $items as $item ) {
			$type = is_array( $item ) ? (string) ( $item['action_type'] ?? '' ) : '';

			if ( in_array( $type, self::ACTION_TYPES, true ) ) {
				$this->actions[] = array_merge( $item, [ 'type' => $type ] );
			}
		}
	}
}
