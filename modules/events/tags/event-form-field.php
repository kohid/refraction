<?php
namespace Refraction\Modules\Events\Tags;

use Refraction\Controls_Manager;
use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Modules\DynamicTags\Module as Tags;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Classes\Event_Types;
use Refraction\Modules\Events\Module;
use Refraction\Modules\FormBuilder\Classes\Collections;
use Refraction\Modules\FormBuilder\Classes\Records;
use Refraction\Modules\FormBuilder\Classes\Schema;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event Form Field: any answer of the event form that made the current event, by its field key, including the fields
 * you added to the form yourself (a dress code, an age limit...). Uploads, signatures and hidden fields are not shown.
 */
class Event_Form_Field extends Tag {

	public function get_name() {
		return 'refraction-event-form-field';
	}

	public function get_title() {
		return esc_html__( 'Event Form Field', 'refraction' );
	}

	public function get_group() {
		return 'event';
	}

	public function get_categories() {
		return [ Tags::TEXT_CATEGORY ];
	}

	public function get_panel_template_setting_key() {
		return 'key';
	}

	public function is_settings_required() {
		return true;
	}

	/** The fields of every event form: key => "Label (Type)". */
	private static function field_options(): array {
		$options = [ '' => esc_html__( 'Choose a field', 'refraction' ) ];

		foreach ( Event_Types::types() as $slug => $label ) {
			$definition = ( new Collections() )->get( $slug );

			foreach ( $definition ? Schema::value_fields( $definition ) : [] as $field ) {
				if ( ! in_array( $field['type'], [ 'file', 'signature', 'hidden' ], true ) ) {
					$options[ $field['key'] ] ??= $field['label'] . ' (' . $label . ')';
				}
			}
		}

		return $options;
	}

	protected function register_controls() {
		$this->add_control( 'key', [
			'label' => esc_html__( 'Field', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => self::field_options(),
			'description' => esc_html__( 'The answer given in the event form that made this event.', 'refraction' ),
		] );

		$this->add_control( 'date_format', [
			'label' => esc_html__( 'Date format (date and time fields)', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => 'F j, Y',
			'description' => esc_html__( 'Empty: November 5, 2026 (and the time).', 'refraction' ),
		] );
	}

	public function render() {
		$post = Context::get_post();
		$key = (string) $this->get_settings( 'key' );

		if ( '' === $key || ! Context::can_read( $post ) || Module::CPT !== $post->post_type ) {
			return;
		}

		$slug = (string) get_post_meta( $post->ID, Event_Data::META_PREFIX . 'type', true );
		$record = ( new Records() )->get( (int) get_post_meta( $post->ID, Event_Types::META_RECORD, true ), $slug );
		$definition = '' !== $slug ? ( new Collections() )->get( $slug ) : null;
		$field = $definition ? Schema::field( $definition, $key ) : null;

		if ( ! $record || ! $field || in_array( $field['type'], [ 'file', 'signature', 'hidden' ], true ) ) {
			return;
		}

		$value = $record['values'][ $key ] ?? '';

		// Dates and times are written out ("November 5, 2026", "19:00"), not as the form stores them (2026-11-05T19:00).
		if ( in_array( $field['type'], [ 'date', 'time', 'datetime' ], true ) && is_string( $value ) && '' !== $value ) {
			$ts = strtotime( str_replace( 'T', ' ', 'time' === $field['type'] ? '2000-01-01 ' . $value : $value ) . ' UTC' );
			$formats = [ 'date' => Event_Detail::DATE_FORMAT, 'time' => get_option( 'time_format', 'H:i' ), 'datetime' => Event_Detail::DATE_FORMAT . ' ' . get_option( 'time_format', 'H:i' ) ];
			$format = trim( (string) $this->get_settings( 'date_format' ) );

			if ( $ts ) {
				echo esc_html( date_i18n( '' !== $format ? $format : $formats[ $field['type'] ], $ts ) );

				return;
			}
		}

		echo nl2br( esc_html( Schema::display( $field, $value ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped, then line breaks.
	}
}
