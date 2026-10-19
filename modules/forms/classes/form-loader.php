<?php
namespace Refraction\Modules\Forms\Classes;

use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Finds a form widget in a saved document and returns its settings, defaults applied.
 *
 * A submission only names a document and a widget id. The structure of the form (fields, required
 * flags, options, actions, recipients) always comes from here, never from the request.
 */
final class Form_Loader {

	const WIDGET = 'refraction-form';

	/** @return array|null Widget settings with defaults, or null when there is no such readable form. */
	public static function load_settings( int $post_id, string $element_id, string $widget = self::WIDGET ): ?array {
		$post = get_post( $post_id );

		if ( ! $post || '' === $element_id ) {
			return null;
		}

		$public = 'publish' === $post->post_status;

		if ( ! $public && ! current_user_can( 'edit_post', $post_id ) ) {
			return null;
		}

		if ( post_password_required( $post ) ) {
			return null;
		}

		$document = Plugin::$instance->documents->get( $post_id );

		if ( ! $document ) {
			return null;
		}

		$data = self::find( (array) $document->get_elements_data(), $element_id, $widget );

		if ( ! $data ) {
			return null;
		}

		$element = Plugin::$instance->elements_manager->create_element_instance( $data );

		return $element ? (array) $element->get_settings() : null;
	}

	private static function find( array $elements, string $element_id, string $widget ): ?array {
		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}

			if ( ( $element['id'] ?? '' ) === $element_id && 'widget' === ( $element['elType'] ?? '' ) && $widget === ( $element['widgetType'] ?? '' ) ) {
				return $element;
			}

			if ( ! empty( $element['elements'] ) ) {
				$found = self::find( (array) $element['elements'], $element_id, $widget );

				if ( $found ) {
					return $found;
				}
			}
		}

		return null;
	}
}
