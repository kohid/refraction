<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Modules\FormBuilder\Base\Field_Widget;
use Refraction\Modules\FormBuilder\Base\Form_Field;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Forms built in the page editor. A Form page (Documents\Form_Document) is tied to one collection: every time it is
 * saved, its field widgets are read in page order and saved as that collection's fields, together with the form-wide
 * values from the page settings. Everything downstream (records, validation, exports, the shortcode) keeps reading the
 * collection, so it does not need to know about the editor.
 */
class Editor_Forms {

	/** The panel category of the field widgets. */
	const CATEGORY = 'refraction-form-fields';

	/** collection slug => Form page id */
	const OPTION = 'refraction_fb_editor_forms';

	/** Post meta on a Form page: its collection slug, and field keys by element id (keys never change once given). */
	const META_COLLECTION = '_rfb_collection';
	const META_KEYS = '_rfb_field_keys';

	/** What the field widgets need while a form is printed: values, errors and context (see Shortcodes::form). */
	private static $render = null;

	public static function begin( array $state ): void {
		self::$render = $state;
	}

	public static function end(): void {
		self::$render = null;
	}

	public static function rendering(): ?array {
		return self::$render;
	}

	/** @var array[] The Group or Repeater rows being printed, innermost last: name prefix, path and answers. */
	private static $scopes = [];

	public static function push_scope( string $name, string $path, array $values ): void {
		self::$scopes[] = [ 'name' => $name, 'path' => $path, 'values' => $values ];
	}

	public static function pop_scope(): void {
		array_pop( self::$scopes );
	}

	public static function scope(): ?array {
		return self::$scopes ? self::$scopes[ count( self::$scopes ) - 1 ] : null;
	}

	/** @var array[] The choice cards being printed, innermost last (a Price widget in a card shows its price). */
	private static $cards = [];

	public static function push_card( array $card ): void {
		self::$cards[] = $card;
	}

	public static function pop_card(): void {
		array_pop( self::$cards );
	}

	public static function card(): ?array {
		return self::$cards ? self::$cards[ count( self::$cards ) - 1 ] : null;
	}

	/**
	 * The Choice cards item (its settings: price, period...) of the card that holds the element $id, found in a page's
	 * saved data; null when it is not in a card. Used in the editor, where cards do not print their children.
	 */
	public static function card_item_of( array $elements, string $id ): ?array {
		foreach ( $elements as $element ) {
			$children = (array) ( $element['elements'] ?? [] );

			if ( 'rfb-field-choice_set' === ( $element['widgetType'] ?? '' ) ) {
				$items = array_values( (array) ( $element['settings']['cards'] ?? [] ) );

				foreach ( $children as $i => $child ) {
					if ( isset( $items[ $i ] ) && self::contains( [ $child ], $id ) ) {
						return $items[ $i ];
					}
				}
			}

			$found = self::card_item_of( $children, $id );

			if ( $found ) {
				return $found;
			}
		}

		return null;
	}

	private static function contains( array $elements, string $id ): bool {
		foreach ( $elements as $element ) {
			if ( (string) ( $element['id'] ?? '' ) === $id || self::contains( (array) ( $element['elements'] ?? [] ), $id ) ) {
				return true;
			}
		}

		return false;
	}

	public function __construct( Collections $collections ) {
		$this->collections = $collections;
	}

	/** @var Collections */
	private $collections;

	public static function doc_for( string $slug ): int {
		$map = (array) get_option( self::OPTION, [] );
		$id = (int) ( $map[ $slug ] ?? 0 );

		return $id && Form_Document::TYPE === get_post_meta( $id, '_refraction_template_type', true ) && 'trash' !== get_post_status( $id ) ? $id : 0;
	}

	/** A deleted collection takes its Form page with it. */
	public static function forget( string $slug ): void {
		$doc_id = self::doc_for( $slug );
		$map = (array) get_option( self::OPTION, [] );
		unset( $map[ $slug ] );
		update_option( self::OPTION, $map, false );

		if ( $doc_id ) {
			wp_delete_post( $doc_id, true );
		}
	}

	public static function edit_url( int $doc_id ): string {
		$document = Plugin::$instance->documents->get( $doc_id );

		return $document ? $document->get_edit_url() : '';
	}

	/** Creates a Form page and opens it in the editor (through the editor's own "new post" action). */
	public static function new_url(): string {
		return Plugin::$instance->documents->get_create_new_post_url( 'refraction_library', Form_Document::TYPE );
	}

	/** Field keys by element id, in page order, for the field widgets of an element tree. */
	public static function field_elements( array $elements ): array {
		$found = [];

		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}

			if ( 'widget' === ( $element['elType'] ?? '' ) && 0 === strpos( (string) ( $element['widgetType'] ?? '' ), Field_Widget::PREFIX ) ) {
				$found[] = $element;
			}

			if ( ! empty( $element['elements'] ) ) {
				$found = array_merge( $found, self::field_elements( (array) $element['elements'] ) );
			}
		}

		return $found;
	}

	/**
	 * The Builder fields of an element tree, in page order and with their nesting: a field widget is a field, a Group or
	 * Repeater widget holds the fields inside it, and a Steps widget becomes a step break before the fields of each step.
	 * Any other element (containers, the editor's own widgets) only arranges, so its fields are read as if it was not there.
	 *
	 * @param callable $key ( element id, raw field ) => final key
	 */
	public static function collect( array $elements, callable $key ): array {
		$fields = [];

		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}

			$type = (string) ( $element['widgetType'] ?? '' );
			$children = (array) ( $element['elements'] ?? [] );

			if ( 'widget' === ( $element['elType'] ?? '' ) && 0 === strpos( $type, Field_Widget::PREFIX ) ) {
				$widget = Plugin::$instance->elements_manager->create_element_instance( $element );

				if ( ! $widget instanceof Form_Field ) {
					continue;
				}

				$raw = $widget->raw_field();
				$raw['key'] = $key( (string) $element['id'], $raw );

				if ( Schema::is_container( $raw['type'] ) ) {
					$raw['children'] = self::collect( $children, $key );
				}

				// Choice cards: each card (a repeater item and its container) is a free Group card of the set.
				if ( 'choice_set' === $raw['type'] && $widget instanceof \Refraction\Modules\FormBuilder\Widgets\Field_Choice_Set ) {
					$items = array_values( (array) ( $element['settings']['cards'] ?? [] ) );
					$raw['children'] = [];

					foreach ( $items as $i => $item ) {
						$card = $widget->card_raw( $i );
						$card['key'] = $key( $element['id'] . '-' . ( $item['_id'] ?? $i ), $card );
						$card['children'] = self::collect( (array) ( $children[ $i ]['elements'] ?? [] ), $key );
						$raw['children'][] = $card;
					}

					$picked = $widget->default_index();
					$raw['default'] = $picked > 0 && isset( $raw['children'][ $picked - 1 ] ) ? $raw['children'][ $picked - 1 ]['key'] : '';
				}

				$fields[] = $raw;
				continue;
			}

			if ( self::STEPS === $type ) {
				foreach ( array_values( (array) ( $element['settings']['steps'] ?? [] ) ) as $i => $step ) {
					$marker = [ 'type' => 'step', 'label' => (string) ( $step['step_title'] ?? '' ), 'description' => (string) ( $step['step_description'] ?? '' ), 'hide_label' => false, 'label_tag' => 'h3' ];
					$marker['key'] = $key( $element['id'] . '-' . $i, $marker );
					$fields[] = $marker;
					$fields = array_merge( $fields, self::collect( (array) ( $children[ $i ]['elements'] ?? [] ), $key ) );
				}

				continue;
			}

			$fields = array_merge( $fields, self::collect( $children, $key ) );
		}

		return $fields;
	}

	/** The Steps widget's name. */
	const STEPS = 'rfb-steps';

	/**
	 * The collection a Form page saves into. Field keys are given once and kept: the field's own key if you set one,
	 * else the key it already had, else one made from its label; clashes get a number.
	 */
	public function sync( Form_Document $document ): ?array {
		$id = (int) $document->get_main_id();

		// The editor saves a new, empty page while it opens it; reading the elements through the document would convert
		// and save it again, so the saved data is read as stored, and a save inside a sync is ignored.
		static $busy = false;

		if ( $busy || wp_is_post_autosave( $id ) || wp_is_post_revision( $id ) ) {
			return null;
		}

		$busy = true;

		try {
			return $this->sync_now( $document, $id );
		} finally {
			$busy = false;
		}
	}

	private function sync_now( Form_Document $document, int $id ): ?array {
		$stored = json_decode( (string) get_post_meta( $id, '_refraction_data', true ), true );

		$keys = (array) get_post_meta( $id, self::META_KEYS, true );
		$used = [];
		$new_keys = [];
		$assign = static function ( string $element_id, array $raw ) use ( $keys, &$used, &$new_keys ): string {
			$label = (string) ( $raw['label'] ?? '' );
			$base = Schema::key( '' !== (string) ( $raw['key'] ?? '' ) ? $raw['key'] : ( $keys[ $element_id ] ?? ( '' !== $label ? $label : $raw['type'] ) ) );
			$base = '' === $base ? 'field' : $base;
			$key = $base;

			for ( $i = 2; isset( $used[ $key ] ); $i++ ) {
				$key = substr( $base, 0, 36 ) . '_' . $i;
			}

			$used[ $key ] = true;
			$new_keys[ $element_id ] = $key;

			return $key;
		};
		$fields = self::collect( is_array( $stored ) ? $stored : [], $assign );

		$slug = (string) get_post_meta( $id, self::META_COLLECTION, true );
		$existing = '' !== $slug ? $this->collections->get( $slug ) : null;

		// A new Form page that is opened and left without a field is not a collection yet.
		if ( ! $existing && ! $fields ) {
			return null;
		}
		// The document passed to the save hook still holds the settings it was loaded with; read the page again.
		$fresh = Plugin::$instance->documents->get( $id, false );
		$form = ( $fresh instanceof Form_Document ? $fresh : $document )->form_settings();
		$raw = array_merge( $existing ?: [], $form, [
			'label' => get_the_title( $id ) ?: Schema::t( 'Form' ),
			'fields' => $fields,
			'settings' => array_merge( $existing['settings'] ?? [], $form['settings'] ),
		] );

		if ( ! $raw['statuses'] ) {
			unset( $raw['statuses'] );
		}

		$saved = $this->collections->save( $raw, $existing ? $slug : '' );

		if ( ! $saved ) {
			return null;
		}

		update_post_meta( $id, self::META_COLLECTION, $saved['slug'] );
		update_post_meta( $id, self::META_KEYS, $new_keys );
		$map = (array) get_option( self::OPTION, [] );
		$map[ $saved['slug'] ] = $id;
		update_option( self::OPTION, $map, false );

		return $saved;
	}

	/** The cleaned field of a widget as the collection has it (null when the page was not saved since it was added). */
	public static function saved_field( int $doc_id, string $element_id ): ?array {
		$key = ( (array) get_post_meta( $doc_id, self::META_KEYS, true ) )[ $element_id ] ?? '';
		$slug = (string) get_post_meta( $doc_id, self::META_COLLECTION, true );

		if ( '' === $key || '' === $slug ) {
			return null;
		}

		$definition = ( new Collections() )->get( $slug );

		return $definition ? Schema::field( $definition, $key ) : null;
	}

	/** Does this element tree have its own Submit button? */
	public static function has_submit( array $elements ): bool {
		foreach ( $elements as $element ) {
			if ( 'rfb-submit' === ( $element['widgetType'] ?? '' ) || ( ! empty( $element['elements'] ) && self::has_submit( (array) $element['elements'] ) ) ) {
				return true;
			}
		}

		return false;
	}
}
