<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * What Claude is told, shared by the two ways of using Ask Claude:
 * - "API key": Claude_Builder sends it to Anthropic's API with the site's key; Claude looks up controls with tools.
 * - "Claude.ai chat": the person copies one self-contained prompt (with every control listed, since there are no
 *   tools) into their own Claude.ai chat, which their Pro or Max plan pays for, and pastes the JSON answer back.
 *   The site makes no call at all in that mode.
 * Both results go through Layout_Sanitizer (clean()). Plain PHP 7.4, so the chat mode works without the SDK.
 */
class Prompt_Builder {

	/** The longest answer accepted from the chat (a full page is usually 20-80 KB). */
	const MAX_ANSWER = 2000000;

	const INTRO = 'You build web page content inside Refraction, a WordPress page builder, for the person editing this page. You produce elements in Refraction\'s JSON format, which the editor inserts as ordinary, editable elements.';

	const FORMAT = "FORMAT\n- An element is {\"elType\": \"container\"|\"widget\", \"widgetType\": \"<widget name, widgets only>\", \"settings\": {...}, \"elements\": [...]}.\n- The top level holds containers only. Containers hold widgets and other containers (flex layout: flex_direction row or column, gaps, alignment, padding, background, min height). Widgets have \"elements\": [] unless they are marked [holds containers] in the catalog (tabs, accordions, carousels and similar), whose items are containers.\n- Setting values by control type: text/textarea/wysiwyg strings; select/choose one of the listed options; switcher \"yes\" or \"\"; color \"#rrggbb\" or rgba(); slider {\"unit\": \"px\", \"size\": 24}; dimensions {\"unit\": \"px\", \"top\": \"40\", \"right\": \"20\", \"bottom\": \"40\", \"left\": \"20\"}; gaps {\"unit\": \"px\", \"row\": \"24\", \"column\": \"24\"}; url {\"url\": \"https://...\"}; media {\"id\": <library image id>}; icons {\"value\": \"fas fa-star\", \"library\": \"fa-solid\"}; repeater: a list of objects using the repeater's own fields.\n- Group controls are flat settings with a prefix and a switch: typography needs \"typography_typography\": \"custom\" before typography_font_size and the rest; backgrounds need \"background_background\": \"classic\" before background_color or background_image.\n- Responsive controls also accept a _tablet and a _mobile copy (padding_mobile, flex_direction_mobile...). Use them so every layout works on a phone.";

	const CONTENT = "CONTENT AND DESIGN\n- Write real, specific copy for the subject in the request, in plain sentence case. Do not invent facts about the business: no made-up prices, addresses, phone numbers, client names, testimonials, ratings, awards or statistics. Where such a fact is needed, write a short bracketed placeholder such as [Phone number] and mention it in the summary.\n- Give the page a point of view that fits the subject: a deliberate palette, a clear type scale, generous spacing, and one memorable moment rather than many decorations. Avoid template habits: identical card grids, gradient washes, all-caps labels above every heading, emoji, and filler like \"Lorem ipsum\" or \"Welcome to our website\".\n- Use headings in order (one h1 per page), descriptive link and button text, alt text on images, and enough color contrast to read.\n- Refraction has widgets for scroll scenes: build-scene (a 3D model that assembles while scrolling; it has a built-in sample house) and scroll-sequence (a video or image frames played with the scroll). Use them only when the request calls for that kind of experience.";

	public static function task( string $mode ): string {
		return [
			'page' => 'Build the whole page from the request below. The result replaces the current page content.',
			'section' => 'Build one new section (usually one top-level container) for the request below. It is added to the existing page, so match the page\'s existing style, shown as JSON after the request.',
			'selected' => 'Change the selected element as the request below says. Submit exactly one element (the replacement for it), keeping what the request does not ask to change. The selected element is shown as JSON after the request.',
		][ $mode ];
	}

	/** The request part: the task, the person's description and the current page or element. */
	public static function request( string $mode, string $prompt, string $context, string $images_note ): string {
		return self::task( $mode ) . ( '' !== $images_note ? ' ' . $images_note : '' ) . "\n\nREQUEST:\n" . $prompt . ( '' !== $context ? "\n\nCURRENT " . ( 'selected' === $mode ? 'SELECTED ELEMENT' : 'PAGE' ) . ":\n" . $context : '' );
	}

	private static function styles( Widget_Specs $specs, bool $use_styles ): string {
		$globals = $use_styles ? $specs->globals() : null;

		if ( ! $globals || ( ! $globals['colors'] && ! $globals['typography'] ) ) {
			return '';
		}

		return "SITE STYLES\nUse the site's global colors and fonts instead of raw values, through the \"__globals__\" setting of an element: {\"__globals__\": {\"title_color\": \"globals/colors?id=primary\", \"typography_typography\": \"globals/typography?id=primary\"}}. Available colors: " . wp_json_encode( $globals['colors'] ) . "\nAvailable fonts: " . wp_json_encode( $globals['typography'] );
	}

	/** The system prompt of the API mode, where Claude looks up controls and images with tools. */
	public static function api_system( Widget_Specs $specs, bool $use_styles ): string {
		return implode( "\n\n", array_filter( [
			self::INTRO,
			self::FORMAT . "\n- Use only setting names and option values returned by get_widget_controls; anything else is dropped.",
			"WORKFLOW\n1. Decide the structure. 2. Call get_widget_controls for \"container\" and for each widget you will use (several at once). 3. If the design needs pictures, call list_images and use matching library images; never invent image URLs. If none fit, leave image settings out and say in the summary which pictures to add. 4. Call submit_elements once with the complete result.",
			self::CONTENT,
			self::styles( $specs, $use_styles ),
			"WIDGET CATALOG (name - title (keywords))\n" . $specs->catalog(),
		] ) );
	}

	/** Settings left out of the chat prompt: rarely wanted in a generated page, and they make the prompt much longer. */
	const CHAT_SKIP = '/^(_transform_|_background_hover_|_mask_|_element_cache|_attributes|_position_description|hide_|rf_mouse_|rf_assets)|(slideshow|_video_|_video$|play_once|privacy_mode)/';

	const DEVICES = [ '_widescreen', '_laptop', '_tablet_extra', '_tablet', '_mobile_extra', '_mobile' ];

	private static function is_device_copy( string $key ): bool {
		foreach ( self::DEVICES as $suffix ) {
			if ( substr( $key, -strlen( $suffix ) ) === $suffix ) {
				return true;
			}
		}

		return false;
	}

	/** One control as "type(option|option)", with * when it has tablet and mobile copies. */
	private static function short( string $key, array $control, array $all ): string {
		$type = (string) ( $control['type'] ?? '' );
		$out = $type;

		if ( ! empty( $control['options'] ) && is_array( $control['options'] ) && in_array( $type, [ 'select', 'choose', 'select2', 'font' ], true ) && 'font' !== $type ) {
			$out .= '(' . implode( '|', array_slice( array_map( 'strval', array_keys( $control['options'] ) ), 0, 25 ) ) . ')';
		}

		if ( 'repeater' === $type && ! empty( $control['fields'] ) ) {
			$fields = [];

			foreach ( (array) $control['fields'] as $field_key => $field ) {
				$name = (string) ( $field['name'] ?? $field_key );

				if ( ! in_array( $field['type'] ?? '', Layout_Sanitizer::NO_VALUE, true ) && ! preg_match( self::CHAT_SKIP, $name ) ) {
					$fields[] = $name . ':' . self::short( $name, (array) $field, [] );
				}
			}

			$out .= '{' . implode( ', ', $fields ) . '}';
		}

		return $out . ( isset( $all[ $key . '_mobile' ] ) || ! empty( $control['is_responsive'] ) ? '*' : '' );
	}

	/**
	 * The controls of one element for the chat prompt: [ name => "type(options)" ] for plain controls, and
	 * [ "@<group type>:<prefix>" => true ] for each group control (typography, background, border...), whose fields
	 * are listed once for all elements. Group fields go into $groups.
	 */
	private static function compact( array $controls, array &$groups ): array {
		$out = [];

		foreach ( $controls as $key => $control ) {
			$key = (string) $key;
			$type = (string) ( $control['type'] ?? '' );

			if ( in_array( $type, Layout_Sanitizer::NO_VALUE, true ) || self::is_device_copy( $key ) || preg_match( self::CHAT_SKIP, $key ) || ( ! empty( $control['classes'] ) && false !== strpos( (string) $control['classes'], 'refraction-control-type-hidden' ) ) ) {
				continue;
			}

			if ( ! empty( $control['groupType'] ) && ! empty( $control['groupPrefix'] ) && 0 === strpos( $key, (string) $control['groupPrefix'] ) ) {
				$group = (string) $control['groupType'];
				$prefix = (string) $control['groupPrefix'];
				$field = substr( $key, strlen( $prefix ) );

				if ( ! isset( $groups[ $group ][ $field ] ) ) {
					$groups[ $group ][ $field ] = self::short( $key, $control, $controls );
				}

				$out[ '@' . $group . ':' . rtrim( $prefix, '_' ) ] = true;
				continue;
			}

			$out[ $key ] = self::short( $key, $control, $controls );
		}

		return $out;
	}

	private static function line( array $compact ): string {
		$plain = [];
		$groups = [];

		foreach ( $compact as $key => $value ) {
			if ( '@' === $key[0] ) {
				[ $group, $prefix ] = explode( ':', substr( $key, 1 ), 2 );
				$groups[ $group ][] = $prefix;
			} else {
				$plain[] = $key . ':' . $value;
			}
		}

		foreach ( $groups as $group => $prefixes ) {
			$plain[] = $group . ' group: ' . implode( ', ', $prefixes );
		}

		return implode( '; ', $plain );
	}

	/**
	 * Every control of the container and of each widget, one compact line each ("name:type(options)", * when it has
	 * _tablet and _mobile copies). The settings every widget shares (the Advanced tab: margins, motion...) are listed
	 * once, and so are the fields of each kind of group control. $only limits the element lines to some names.
	 */
	public static function controls( Widget_Specs $specs, array $only = [] ): string {
		$groups = [];
		$all = [];

		foreach ( array_keys( $specs->widgets() ) as $name ) {
			$spec = $specs->spec( 'widget', $name );

			if ( $spec ) {
				$all[ $name ] = self::compact( (array) $spec['controls'], $groups );
			}
		}

		$container = $specs->spec( 'container', '' );
		$container = $container ? self::compact( (array) $container['controls'], $groups ) : [];
		$shared = null;

		foreach ( $all as $compact ) {
			$shared = null === $shared ? $compact : array_intersect_assoc( $shared, $compact );
		}

		$shared = (array) $shared;
		$lines = [ 'GROUP FIELDS (a group named P has the settings P_<field>; set its switch field first, e.g. typography: P_typography "custom", background: P_background "classic")' ];

		foreach ( $groups as $group => $fields ) {
			$lines[] = $group . ': ' . implode( '; ', array_map( static function ( $field, $type ) {
				return $field . ':' . $type;
			}, array_keys( $fields ), $fields ) );
		}

		$lines[] = '';
		$lines[] = 'ELEMENT SETTINGS';
		$lines[] = 'shared by every widget: ' . self::line( $shared );

		if ( ! $only || in_array( 'container', $only, true ) ) {
			$lines[] = 'container: ' . self::line( $container );
		}

		foreach ( $all as $name => $compact ) {
			if ( ! $only || in_array( $name, $only, true ) ) {
				$lines[] = $name . ': ' . self::line( array_diff_key( $compact, $shared ) );
			}
		}

		return implode( "\n", $lines );
	}

	/**
	 * The one self-contained prompt of the chat mode: reference data first, then the rules, the request and the
	 * answer format last.
	 *
	 * @param array $request [ prompt, mode, context, use_styles ]
	 */
	public static function chat( Widget_Specs $specs, array $request ): string {
		$images = Widget_Specs::images();

		return implode( "\n\n", array_filter( [
			'# Build page content for Refraction',
			self::INTRO . ' Everything you need is below (no tools are needed): your answer is checked and inserted into the editor as it is.',
			"WIDGET CATALOG (name - title (keywords))\n" . $specs->catalog(),
			"CONTROLS (setting:type(allowed options); * = also has _tablet and _mobile copies)\n" . self::controls( $specs ),
			$images ? "IMAGES IN THE MEDIA LIBRARY (use only these ids in media settings; never invent image URLs)\n" . wp_json_encode( $images ) : "IMAGES\nThe media library has no images yet: leave image settings out and say in the summary which pictures to add.",
			self::FORMAT . "\n- Use only setting names and option values listed under CONTROLS; anything else is dropped.",
			self::CONTENT,
			self::styles( $specs, (bool) $request['use_styles'] ),
			self::request( $request['mode'], $request['prompt'], $request['context'], 'If images are attached to this message, they are references for layout, colors and mood; do not copy text or logos from them.' ),
			"ANSWER FORMAT\nReply with a single ```json code block and nothing else: no artifact, no file, no explanation before or after it. The block holds one object: {\"elements\": [ ...the elements... ], \"summary\": \"Two or three sentences for the person: what you built and anything they should replace (placeholders, images).\"}" . ( 'selected' === $request['mode'] ? ' "elements" holds exactly one element.' : '' ) . ' If the answer would be very long, keep the copy tight rather than stopping halfway: an answer that is cut off cannot be inserted.',
		] ) );
	}

	/**
	 * The JSON in what the person pasted from the chat: a ```json block (the longest one), or the text from the first
	 * bracket to the last. Accepts {"elements": [...], "summary": "..."} or a bare list of elements.
	 *
	 * @return array|null [ 'elements' => array, 'summary' => string ], or null when no JSON can be read.
	 */
	public static function parse_answer( string $text ): ?array {
		$candidates = [];

		if ( preg_match_all( '/```(?:json)?\s*\n(.*?)```/s', $text, $blocks ) ) {
			$candidates = $blocks[1];
			usort( $candidates, static function ( $a, $b ) {
				return strlen( $b ) - strlen( $a );
			} );
		}

		$start = strcspn( $text, '{[' );
		$end = max( (int) strrpos( $text, '}' ), (int) strrpos( $text, ']' ) );

		if ( $start < strlen( $text ) && $end > $start ) {
			$candidates[] = substr( $text, $start, $end - $start + 1 );
		}

		foreach ( $candidates as $candidate ) {
			$data = json_decode( trim( $candidate ), true );

			if ( ! is_array( $data ) ) {
				continue;
			}

			// One element on its own (its "elements" are its children, not the answer's list).
			if ( isset( $data['elType'] ) ) {
				return [ 'elements' => [ $data ], 'summary' => '' ];
			}

			if ( isset( $data['elements'] ) && is_array( $data['elements'] ) ) {
				return [ 'elements' => $data['elements'], 'summary' => is_string( $data['summary'] ?? null ) ? $data['summary'] : '' ];
			}

			if ( array_values( $data ) === $data ) {
				return [ 'elements' => $data, 'summary' => '' ];
			}
		}

		return null;
	}

	/**
	 * Cleans proposed elements for a mode.
	 *
	 * @return array [ elements, dropped, ok ] where ok is false when no widget is left (or, for "selected", not
	 *               exactly one element).
	 */
	public static function clean( Widget_Specs $specs, $elements, string $mode ): array {
		$sanitizer = new Layout_Sanitizer( [ $specs, 'spec' ], [ Widget_Specs::class, 'image_url' ], $specs->global_ids() );
		// A replacement for the selected element may be a widget; elsewhere the top level holds containers.
		$clean = $sanitizer->elements( $elements, 0, 'selected' === $mode ? 'container' : 'root' );

		return [ $clean, $sanitizer->dropped, self::has_widget( $clean ) && ( 'selected' !== $mode || 1 === count( $clean ) ) ];
	}

	/** Whether any widget is left: empty containers alone (everything in them dropped) are not a result. */
	private static function has_widget( array $elements ): bool {
		foreach ( $elements as $element ) {
			if ( 'widget' === $element['elType'] || self::has_widget( $element['elements'] ?? [] ) ) {
				return true;
			}
		}

		return false;
	}
}
