<?php
namespace Refraction\Modules\AskClaude\Classes;

use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * What Claude may build with on this page: the widgets the user can use (with their controls, as data for the
 * Layout_Sanitizer and as a compact list for Claude), the container, the site's global colors and fonts, and images
 * from the media library.
 */
class Widget_Specs {

	/** Widgets never offered: raw markup and code, shortcodes, and legacy WordPress widgets. */
	const UNSAFE = [ 'html', 'shortcode', 'wp-widget-', 'template', 'global', 'code-highlight' ];

	/** Responsive copies of a control (padding_tablet...) are not listed for Claude; it is told they exist. */
	const DEVICES = [ '_widescreen', '_laptop', '_tablet_extra', '_tablet', '_mobile_extra', '_mobile', '_phone_lg', '_phone_md', '_phone_sm', '_phone_xs' ];

	private $post_id;

	private $widgets = null;

	public function __construct( int $post_id ) {
		$this->post_id = $post_id;
	}

	/** @return \Refraction\Widget_Base[] by name */
	public function widgets(): array {
		if ( null !== $this->widgets ) {
			return $this->widgets;
		}

		$document = Plugin::$instance->documents->get( $this->post_id );
		$is_form = class_exists( Form_Document::class ) && $document instanceof Form_Document;
		$this->widgets = [];

		foreach ( Plugin::$instance->widgets_manager->get_widget_types() as $name => $widget ) {
			$unsafe = array_filter( self::UNSAFE, static function ( $prefix ) use ( $name ) {
				return 0 === strpos( $name, $prefix );
			} );

			// Raw markup is never generated, not even for administrators: a reference image or page text could try to
			// steer Claude into adding script.
			if ( $unsafe || 'common' === $name || 0 === strpos( $name, 'common-' ) ) {
				continue;
			}

			$form_field = in_array( 'refraction-form-fields', (array) $widget->get_categories(), true );

			// Form Canvas sits in the Form Builder category but is made for ordinary pages: it shows a finished form (0.91.0).
			if ( 'rfb-form-canvas' === $name ) {
				$form_field = false;
			}

			if ( ( $form_field && ! $is_form ) || ( ! $form_field && ! $widget->show_in_panel() ) ) {
				continue;
			}

			$this->widgets[ $name ] = $widget;
		}

		return $this->widgets;
	}

	/** The spec the sanitizer uses for an element: its controls and whether it holds child containers. */
	public function spec( string $el_type, string $widget_type ): ?array {
		if ( 'container' === $el_type ) {
			$container = Plugin::$instance->elements_manager->get_element_types( 'container' );

			return $container ? [ 'controls' => $container->get_controls(), 'nested' => true ] : null;
		}

		$widget = $this->widgets()[ $widget_type ] ?? null;

		if ( ! $widget ) {
			return null;
		}

		return [ 'controls' => $widget->get_controls(), 'nested' => $widget instanceof \Refraction\Modules\NestedElements\Base\Widget_Nested_Base ];
	}

	/** Page settings Ask Claude may set with a whole page: the template, pages side by side, the loading screen, the page background. */
	const PAGE_SETTINGS = '/^(template$|rf_hp|rf_loader|background_)/';

	/** The page settings Claude may set on this page (empty when the page has none, or there is no page yet). */
	public function page_controls(): array {
		$document = $this->post_id > 0 ? Plugin::$instance->documents->get( $this->post_id ) : null;

		if ( ! $document ) {
			return [];
		}

		$out = [];

		foreach ( $document->get_controls() as $key => $control ) {
			if ( preg_match( self::PAGE_SETTINGS, (string) $key ) && ! $this->is_device_copy( (string) $key ) ) {
				$out[ $key ] = $control;
			}
		}

		return $out;
	}

	/** One line per widget for the system prompt: name, title and keywords. */
	public function catalog(): string {
		$lines = [];

		foreach ( $this->widgets() as $name => $widget ) {
			$keywords = array_slice( (array) $widget->get_keywords(), 0, 6 );
			$lines[] = $name . ' - ' . wp_strip_all_tags( (string) $widget->get_title() ) . ( $keywords ? ' (' . implode( ', ', $keywords ) . ')' : '' ) . ( $this->spec( 'widget', $name )['nested'] ? ' [holds containers]' : '' );
		}

		sort( $lines );

		return implode( "\n", $lines );
	}

	/** The controls of some widgets (or "container"), compact, for the get_widget_controls tool. */
	public function describe( array $names ): array {
		$out = [];

		foreach ( array_slice( array_unique( array_map( 'strval', $names ) ), 0, 12 ) as $name ) {
			$spec = 'container' === $name ? $this->spec( 'container', '' ) : $this->spec( 'widget', $name );

			if ( ! $spec ) {
				$out[ $name ] = 'unknown or not available here';
				continue;
			}

			$controls = [];

			foreach ( $spec['controls'] as $key => $control ) {
				$type = (string) ( $control['type'] ?? '' );

				if ( in_array( $type, Layout_Sanitizer::NO_VALUE, true ) || $this->is_device_copy( (string) $key ) || ! empty( $control['classes'] ) && false !== strpos( (string) $control['classes'], 'refraction-control-type-hidden' ) ) {
					continue;
				}

				$row = [ 'type' => $type ];

				if ( ! empty( $control['label'] ) ) {
					$row['label'] = wp_strip_all_tags( (string) $control['label'] );
				}

				if ( ! empty( $control['options'] ) && is_array( $control['options'] ) ) {
					$row['options'] = array_slice( array_map( 'strval', array_keys( $control['options'] ) ), 0, 40 );
				}

				if ( ! empty( $control['size_units'] ) ) {
					$row['units'] = array_values( (array) $control['size_units'] );
				}

				if ( isset( $control['default'] ) && '' !== $control['default'] && [] !== $control['default'] && strlen( (string) wp_json_encode( $control['default'] ) ) < 160 ) {
					$row['default'] = $control['default'];
				}

				if ( isset( $control['tab'] ) && 'content' !== $control['tab'] ) {
					$row['tab'] = $control['tab'];
				}

				if ( ! empty( $control['is_responsive'] ) || isset( $spec['controls'][ $key . '_mobile' ] ) ) {
					$row['responsive'] = true;
				}

				if ( 'repeater' === $type && ! empty( $control['fields'] ) ) {
					$row['fields'] = [];

					foreach ( (array) $control['fields'] as $field_key => $field ) {
						$field_name = (string) ( $field['name'] ?? $field_key );

						if ( ! in_array( $field['type'] ?? '', Layout_Sanitizer::NO_VALUE, true ) ) {
							$row['fields'][ $field_name ] = array_filter( [ 'type' => $field['type'] ?? '', 'options' => ! empty( $field['options'] ) ? array_slice( array_map( 'strval', array_keys( (array) $field['options'] ) ), 0, 30 ) : null ] );
						}
					}
				}

				$controls[ $key ] = $row;
			}

			$out[ $name ] = $controls;
		}

		return $out;
	}

	private function is_device_copy( string $key ): bool {
		foreach ( self::DEVICES as $suffix ) {
			if ( substr( $key, -strlen( $suffix ) ) === $suffix ) {
				return true;
			}
		}

		return false;
	}

	/** The ids of the site's global colors and fonts, for the sanitizer. */
	public function global_ids(): array {
		$globals = $this->globals();

		return [ 'colors' => array_column( $globals['colors'], 'id' ), 'typography' => array_column( $globals['typography'], 'id' ) ];
	}

	/** The site's global colors and fonts (from the active kit). */
	public function globals(): array {
		$kit = Plugin::$instance->kits_manager->get_active_kit_for_frontend();
		$out = [ 'colors' => [], 'typography' => [] ];

		if ( ! $kit ) {
			return $out;
		}

		foreach ( [ 'system_colors', 'custom_colors' ] as $group ) {
			foreach ( (array) $kit->get_settings_for_display( $group ) as $color ) {
				if ( ! empty( $color['_id'] ) ) {
					$out['colors'][] = [ 'id' => (string) $color['_id'], 'title' => (string) ( $color['title'] ?? '' ), 'color' => (string) ( $color['color'] ?? '' ) ];
				}
			}
		}

		foreach ( [ 'system_typography', 'custom_typography' ] as $group ) {
			foreach ( (array) $kit->get_settings_for_display( $group ) as $font ) {
				if ( ! empty( $font['_id'] ) ) {
					$out['typography'][] = [ 'id' => (string) $font['_id'], 'title' => (string) ( $font['title'] ?? '' ), 'family' => (string) ( $font['typography_font_family'] ?? '' ), 'weight' => (string) ( $font['typography_font_weight'] ?? '' ) ];
				}
			}
		}

		return $out;
	}

	/**
	 * The URL of a library attachment of one of the given types ('image', 'video', or a full MIME type such as
	 * model/gltf-binary); '' when the id is not such an attachment.
	 */
	public static function image_url( int $id, array $types = [ 'image' ] ): string {
		$mime = $id > 0 && 'attachment' === get_post_type( $id ) ? (string) get_post_mime_type( $id ) : '';

		foreach ( $types as $type ) {
			if ( '' !== $mime && ( $mime === $type || 0 === strpos( $mime, rtrim( (string) $type, '/' ) . '/' ) ) ) {
				return 'image' === $type ? (string) wp_get_attachment_image_url( $id, 'full' ) : (string) wp_get_attachment_url( $id );
			}
		}

		return '';
	}

	/** Images in the library, newest first, optionally matching a search. */
	public static function images( string $search = '' ): array {
		$query = [ 'post_type' => 'attachment', 'post_mime_type' => 'image', 'post_status' => 'inherit', 'posts_per_page' => 30, 'orderby' => 'date', 'order' => 'DESC' ];

		if ( '' !== $search ) {
			$query['s'] = $search;
		}

		return array_map( static function ( $post ) {
			$meta = wp_get_attachment_metadata( $post->ID );

			return [ 'id' => $post->ID, 'title' => $post->post_title, 'alt' => (string) get_post_meta( $post->ID, '_wp_attachment_image_alt', true ), 'width' => (int) ( $meta['width'] ?? 0 ), 'height' => (int) ( $meta['height'] ?? 0 ) ];
		}, get_posts( $query ) );
	}
}
