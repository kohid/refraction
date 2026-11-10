<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Checks the elements Claude proposes before they reach the editor. Only element types and widgets that exist (and
 * that the user may use) are kept; only settings that are real controls of that element are kept, each cleaned for
 * its control type (choices from the control's own options, numbers, colors, links, and media that is already in the
 * library); ids are made fresh. Whatever does not pass is dropped and reported, never passed through.
 *
 * The control definitions come in as data (see Widget_Specs), so this class is tested without WordPress:
 * scripts/test-ask-claude.php.
 */
class Layout_Sanitizer {

	const MAX_ELEMENTS = 250;
	const MAX_DEPTH = 8;
	const MAX_TEXT = 20000;

	/** Control types that hold no value. */
	const NO_VALUE = [ 'section', 'tab', 'tabs', 'heading', 'divider', 'raw_html', 'button', 'deprecated_notice', 'alert', 'notice', 'hidden', 'wp_widget', 'code' ];

	/** @var callable (string $el_type, string $widget_type) => ?array spec: [ 'controls' => [ name => control ], 'nested' => bool ] */
	private $spec;

	/** @var callable (int $id) => string attachment URL ('' when it is not an image in the library) */
	private $attachment;

	/** @var array [ 'colors' => ids[], 'typography' => ids[] ] */
	private $globals;

	private $count = 0;

	private $ids = [];

	/** @var string[] What was dropped, for the summary shown to the user. */
	public $dropped = [];

	/** Settings left out (unknown names, or values that do not fit), for Claude to correct. */
	public $ignored = [];

	public function __construct( callable $spec, callable $attachment, array $globals = [] ) {
		$this->spec = $spec;
		$this->attachment = $attachment;
		$this->globals = $globals;
	}

	/** @return array The cleaned elements (possibly empty). */
	public function elements( $elements, int $depth = 0, string $parent = 'root' ): array {
		$out = [];

		foreach ( is_array( $elements ) ? array_values( $elements ) : [] as $element ) {
			$clean = $this->element( $element, $depth, $parent );

			if ( null !== $clean ) {
				$out[] = $clean;
			}
		}

		return $out;
	}

	private function element( $element, int $depth, string $parent ): ?array {
		if ( ! is_array( $element ) || $depth > self::MAX_DEPTH ) {
			return null;
		}

		if ( ++$this->count > self::MAX_ELEMENTS ) {
			$this->drop( 'elements beyond the limit of ' . self::MAX_ELEMENTS );

			return null;
		}

		$el_type = (string) ( $element['elType'] ?? '' );
		$widget = 'widget' === $el_type ? (string) ( $element['widgetType'] ?? '' ) : '';

		if ( ! in_array( $el_type, [ 'container', 'widget' ], true ) ) {
			$this->drop( 'element type "' . substr( $el_type, 0, 40 ) . '"' );

			return null;
		}

		// A page holds containers; widgets live inside containers.
		if ( 'root' === $parent && 'widget' === $el_type ) {
			$element = [ 'elType' => 'container', 'settings' => [], 'elements' => [ $element ] ];

			return $this->element( $element, $depth, $parent );
		}

		$spec = ( $this->spec )( $el_type, $widget );

		if ( ! is_array( $spec ) ) {
			$this->drop( 'widget "' . substr( $widget, 0, 60 ) . '"' );

			return null;
		}

		$children = (array) ( $element['elements'] ?? [] );
		$nested = 'container' === $el_type || ! empty( $spec['nested'] );
		$out = [
			'id' => $this->id(),
			'elType' => $el_type,
			'settings' => $this->settings( (array) ( $element['settings'] ?? [] ), (array) ( $spec['controls'] ?? [] ) ),
			'elements' => $nested ? $this->elements( $children, $depth + 1, $el_type ) : [],
		];

		if ( 'widget' === $el_type ) {
			$out['widgetType'] = $widget;
		} else {
			$out['isInner'] = 'root' !== $parent;
		}

		return $out;
	}

	private function id(): string {
		do {
			$id = substr( bin2hex( random_bytes( 4 ) ), 0, 7 );
		} while ( isset( $this->ids[ $id ] ) );

		$this->ids[ $id ] = true;

		return $id;
	}

	/** A setting that is not a control here, or whose value did not fit it: told to Claude, not to the person. */
	private function ignore( string $what ): void {
		if ( count( $this->ignored ) < 60 && ! in_array( $what, $this->ignored, true ) ) {
			$this->ignored[] = $what;
		}
	}

	private function drop( string $what ): void {
		if ( count( $this->dropped ) < 30 && ! in_array( $what, $this->dropped, true ) ) {
			$this->dropped[] = $what;
		}
	}

	const DEVICES = [ '_widescreen', '_laptop', '_tablet_extra', '_tablet', '_mobile_extra', '_mobile', '_phone_lg', '_phone_md', '_phone_sm', '_phone_xs' ];

	/**
	 * The control behind a device copy such as padding_mobile: the editor makes those copies from a control marked
	 * responsive (is_responsive) instead of registering them, so they are not in the list of controls.
	 */
	public static function device_copy_of( string $name, array $controls ): ?array {
		foreach ( self::DEVICES as $suffix ) {
			if ( substr( $name, -strlen( $suffix ) ) !== $suffix ) {
				continue;
			}

			$base = $controls[ substr( $name, 0, -strlen( $suffix ) ) ] ?? null;

			return is_array( $base ) && ( ! empty( $base['is_responsive'] ) || isset( $base['responsive'] ) ) ? $base : null;
		}

		return null;
	}

	/** Keeps only real controls, each value cleaned for its type. */
	public function settings( array $settings, array $controls ): array {
		$out = [];

		foreach ( $settings as $name => $value ) {
			$name = (string) $name;

			if ( '__globals__' === $name ) {
				$globals = $this->global_refs( (array) $value, $controls );

				if ( $globals ) {
					$out['__globals__'] = $globals;
				}

				continue;
			}

			$control = $controls[ $name ] ?? self::device_copy_of( $name, $controls );

			if ( ! is_array( $control ) || in_array( $control['type'] ?? '', self::NO_VALUE, true ) ) {
				$this->ignore( $name );
				continue;
			}

			$clean = $this->value( $value, $control );

			if ( null !== $clean ) {
				$out[ $name ] = $clean;
			} else {
				$this->ignore( $name . ' (value)' );
			}
		}

		return $out;
	}

	/** References to the site's global colors and fonts ("globals/colors?id=primary") on color/typography controls. */
	private function global_refs( array $refs, array $controls ): array {
		$out = [];

		foreach ( $refs as $name => $ref ) {
			$type = $controls[ $name ]['type'] ?? '';

			if ( ! is_string( $ref ) || 1 !== preg_match( '#^globals/(colors|typography)\?id=([A-Za-z0-9_-]{1,40})$#', $ref, $m ) ) {
				continue;
			}

			$fits = ( 'colors' === $m[1] && 'color' === $type ) || ( 'typography' === $m[1] && 'popover_toggle' === $type );

			if ( $fits && in_array( $m[2], (array) ( $this->globals[ $m[1] ] ?? [] ), true ) ) {
				$out[ $name ] = $ref;
			}
		}

		return $out;
	}

	/** @return mixed|null The cleaned value, or null to drop it. */
	public function value( $value, array $control ) {
		switch ( (string) ( $control['type'] ?? '' ) ) {
			case 'text':
			case 'textarea':
				return is_scalar( $value ) ? $this->inline( (string) $value ) : null;

			case 'wysiwyg':
				return is_scalar( $value ) ? wp_kses_post( self::without_code( substr( (string) $value, 0, self::MAX_TEXT ) ) ) : null;

			case 'number':
				return is_numeric( $value ) ? $this->bounded( (float) $value, $control ) : null;

			case 'select':
			case 'choose':
			case 'select2':
			case 'visual_choice':
				return $this->choice( $value, $control );

			case 'switcher':
				$on = (string) ( $control['return_value'] ?? 'yes' );

				return $on === $value || true === $value ? $on : '';

			case 'popover_toggle':
				return in_array( $value, [ 'custom', 'yes', '' ], true ) ? $value : null;

			case 'color':
				return is_string( $value ) && self::is_color( $value ) ? $value : null;

			case 'slider':
				return $this->slider( $value, $control );

			case 'dimensions':
				return $this->dimensions( $value, $control );

			case 'gaps':
				return $this->gaps( $value, $control );

			case 'url':
				return $this->link( $value );

			case 'media':
				return $this->media( $value, (array) ( $control['media_types'] ?? [] ) );

			case 'gallery':
				return is_array( $value ) ? array_values( array_filter( array_map( [ $this, 'media' ], $value ) ) ) : null;

			case 'icons':
				return $this->icon( $value );

			case 'box_shadow':
			case 'text_shadow':
				return $this->shadow( $value );

			// The items of tabs, accordions and other nested widgets (their titles; the content is the child containers).
			case 'repeater':
			case 'nested-elements-repeater':
				return $this->repeater( $value, $control );

			case 'font':
			case 'animation':
			case 'hover_animation':
			case 'exit_animation':
			case 'date_time':
				return is_scalar( $value ) ? sanitize_text_field( substr( (string) $value, 0, 200 ) ) : null;

			default:
				return null;
		}
	}

	/** A box or text shadow: numbers for its offsets, blur and spread, and a color. */
	private function shadow( $value ): ?array {
		if ( ! is_array( $value ) ) {
			return null;
		}

		$out = [];

		foreach ( [ 'horizontal', 'vertical', 'blur', 'spread' ] as $key ) {
			if ( isset( $value[ $key ] ) ) {
				if ( ! is_numeric( $value[ $key ] ) ) {
					return null;
				}

				$out[ $key ] = max( -500, min( 500, (float) $value[ $key ] ) );
			}
		}

		if ( isset( $value['color'] ) ) {
			if ( ! is_string( $value['color'] ) || ! self::is_color( $value['color'] ) ) {
				return null;
			}

			$out['color'] = $value['color'];
		}

		return $out ?: null;
	}

	/** Short text: a few inline tags are allowed (bold, italics, line breaks, spans), nothing else. */
	private function inline( string $text ): string {
		return wp_kses( self::without_code( substr( $text, 0, self::MAX_TEXT ) ), [ 'b' => [], 'strong' => [], 'em' => [], 'i' => [], 'br' => [], 'span' => [ 'class' => [] ] ] );
	}

	/** Script, style and similar blocks go with their content (the HTML filters would keep the text inside them). */
	public static function without_code( string $html ): string {
		return (string) preg_replace( '#<(script|style|noscript|template|iframe|object)\b[^>]*>.*?(</\1\s*>|$)#is', '', $html );
	}

	private function bounded( float $number, array $control ) {
		if ( isset( $control['min'] ) && is_numeric( $control['min'] ) ) {
			$number = max( (float) $control['min'], $number );
		}

		if ( isset( $control['max'] ) && is_numeric( $control['max'] ) ) {
			$number = min( (float) $control['max'], $number );
		}

		return floor( $number ) === $number ? (int) $number : $number;
	}

	private function choice( $value, array $control ) {
		$options = array_map( 'strval', array_keys( (array) ( $control['options'] ?? [] ) ) );

		if ( ! empty( $control['multiple'] ) && is_array( $value ) ) {
			return array_values( array_intersect( array_map( 'strval', $value ), $options ) );
		}

		return is_scalar( $value ) && in_array( (string) $value, $options, true ) ? (string) $value : null;
	}

	public static function is_color( string $value ): bool {
		return 1 === preg_match( '/^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+%?\s*)?\)|hsla?\(\s*[\d.]+(deg)?\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(,\s*[\d.]+%?\s*)?\)|transparent)$/', trim( $value ) );
	}

	private function unit( $unit, array $control, string $fallback = 'px' ): string {
		$units = (array) ( $control['size_units'] ?? [ 'px' ] );

		return is_string( $unit ) && in_array( $unit, $units, true ) ? $unit : ( in_array( $fallback, $units, true ) ? $fallback : (string) reset( $units ) );
	}

	private function slider( $value, array $control ): ?array {
		if ( is_numeric( $value ) ) {
			$value = [ 'size' => $value ];
		}

		if ( ! is_array( $value ) || ! is_numeric( $value['size'] ?? null ) ) {
			return null;
		}

		$size = (float) $value['size'];

		return [ 'unit' => $this->unit( $value['unit'] ?? null, $control ), 'size' => floor( $size ) === $size ? (int) $size : $size, 'sizes' => [] ];
	}

	private function dimensions( $value, array $control ): ?array {
		if ( ! is_array( $value ) ) {
			return null;
		}

		$out = [ 'unit' => $this->unit( $value['unit'] ?? null, $control ) ];

		foreach ( [ 'top', 'right', 'bottom', 'left' ] as $side ) {
			$out[ $side ] = is_numeric( $value[ $side ] ?? null ) ? (string) ( (float) $value[ $side ] + 0 ) : '';
		}

		$out['isLinked'] = count( array_unique( [ $out['top'], $out['right'], $out['bottom'], $out['left'] ] ) ) === 1;

		return $out;
	}

	private function gaps( $value, array $control ): ?array {
		if ( is_numeric( $value ) ) {
			$value = [ 'row' => $value, 'column' => $value ];
		}

		if ( ! is_array( $value ) ) {
			return null;
		}

		$row = is_numeric( $value['row'] ?? null ) ? (string) ( (float) $value['row'] + 0 ) : '';
		$column = is_numeric( $value['column'] ?? null ) ? (string) ( (float) $value['column'] + 0 ) : $row;

		return [ 'column' => $column, 'row' => '' !== $row ? $row : $column, 'isLinked' => $row === $column, 'unit' => $this->unit( $value['unit'] ?? null, $control ) ];
	}

	private function link( $value ): ?array {
		$url = is_array( $value ) ? (string) ( $value['url'] ?? '' ) : ( is_string( $value ) ? $value : '' );
		$url = trim( $url );

		// Links may point to a page, an anchor on it, mail or phone; nothing that runs script.
		if ( '' !== $url && 1 !== preg_match( '#^(https?://|/|\#|mailto:|tel:)#i', $url ) ) {
			return null;
		}

		return [
			'url' => '#' === substr( $url, 0, 1 ) ? '#' . preg_replace( '/[^A-Za-z0-9_-]/', '', substr( $url, 1 ) ) : esc_url_raw( $url ),
			'is_external' => is_array( $value ) && ! empty( $value['is_external'] ) ? 'on' : '',
			'nofollow' => is_array( $value ) && ! empty( $value['nofollow'] ) ? 'on' : '',
			'custom_attributes' => '',
		];
	}

	/** Media must be an image already in the library; its URL is taken from the library, never from the proposal. */
	/**
	 * A library attachment: an image, or the file types the control asks for (a .glb model, a video).
	 *
	 * @param mixed    $value [ 'id' => attachment id ].
	 * @param string[] $types The control's media_types ('image' when empty).
	 */
	public function media( $value, array $types = [] ): ?array {
		$id = is_array( $value ) ? (int) ( $value['id'] ?? 0 ) : 0;
		$url = $id > 0 ? (string) ( $this->attachment )( $id, $types ?: [ 'image' ] ) : '';

		if ( '' === $url ) {
			return is_array( $value ) && empty( $value['id'] ) && empty( $value['url'] ) ? null : [ 'id' => '', 'url' => '' ];
		}

		return [ 'id' => $id, 'url' => $url, 'alt' => is_array( $value ) && isset( $value['alt'] ) && is_scalar( $value['alt'] ) ? sanitize_text_field( (string) $value['alt'] ) : '', 'source' => 'library' ];
	}

	private function icon( $value ): ?array {
		if ( ! is_array( $value ) ) {
			return null;
		}

		$library = (string) ( $value['library'] ?? '' );
		$name = (string) ( $value['value'] ?? '' );

		if ( in_array( $library, [ 'fa-solid', 'fa-regular', 'fa-brands', 'rficons' ], true ) && 1 === preg_match( '/^(fas|far|fab|rficon) (fa|rficon)-[a-z0-9-]{1,60}$/', $name ) ) {
			return [ 'value' => $name, 'library' => $library ];
		}

		return null;
	}

	private function repeater( $value, array $control ): ?array {
		if ( ! is_array( $value ) ) {
			return null;
		}

		$fields = [];

		foreach ( (array) ( $control['fields'] ?? [] ) as $key => $field ) {
			$name = is_array( $field ) && isset( $field['name'] ) ? (string) $field['name'] : (string) $key;
			$fields[ $name ] = (array) $field;
		}

		$items = [];

		foreach ( array_slice( array_values( $value ), 0, 50 ) as $item ) {
			if ( is_array( $item ) ) {
				$items[] = [ '_id' => $this->id() ] + $this->settings( $item, $fields );
			}
		}

		return $items;
	}
}
