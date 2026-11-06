<?php
namespace Refraction\Modules\Migration\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Turns the other builder's page data (its elements tree and page settings) into Refraction's. Refraction started as
 * that builder, so the format is the same: containers, sections, columns and widgets keep their settings. What changes:
 * - widget names: its Pro widgets and theme widgets have Refraction names (animated-headline is
 *   refraction-animated-headline, woocommerce-product-price is woo-product-price, ...);
 * - names inside settings: dynamic tags, popup links, template shortcodes, its icon font, CSS class names in custom CSS;
 * - template references (template widget, global widgets, popup links and shortcodes) point at the converted templates;
 * - a widget Refraction has no version of (from an add-on plugin) becomes an HTML widget holding what it showed,
 *   so the page keeps its content, and is listed in the report to be rebuilt with a Refraction widget.
 *
 * No WordPress calls: everything outside the data comes in through the constructor.
 */
class Converter {

	/** Their name => Refraction's, where the plain rules below do not find it. */
	const NAMES = [
		'search-form' => 'theme-search-form',
		'search' => 'theme-search-form',
		'sitemap' => 'theme-sitemap',
		'author-box' => 'theme-author-box',
		'post-comments' => 'theme-post-comments',
		'post-navigation' => 'theme-post-navigation',
		'post-info' => 'theme-post-info',
		'breadcrumbs' => 'theme-breadcrumbs',
		'woocommerce-product-add-to-cart' => 'woo-add-to-cart',
		'wc-add-to-cart' => 'woo-add-to-cart',
		'woocommerce-product-additional-information' => 'woo-additional-information',
		'woocommerce-checkout-page' => 'woo-checkout',
		'woocommerce-product-related' => 'woo-related-products',
		'woocommerce-product-upsell' => 'woo-upsells',
		'woocommerce-categories' => 'woo-product-categories',
		'wc-categories' => 'woo-product-categories',
		'wc-archive-products' => 'woo-products',
		'woocommerce-archive-products' => 'woo-products',
	];

	/** Settings holding the id of a template or popup. */
	const ID_KEYS = [ 'template_id', 'popup_id', 'templateID' ];

	/** @var array<string,bool> Refraction's widget names. */
	private array $known;

	/** @var callable(array):string The HTML an element showed (or '' when it cannot be had). */
	private $snapshot;

	/** @var array<int,int> Their template id => the converted one. */
	private array $templates;

	/** @var array<string,int> Widgets kept as HTML: their name => how many. */
	public array $replaced = [];

	/**
	 * @param string[]          $known_widgets Refraction's widget names.
	 * @param callable|null     $snapshot      fn( array $element ): string, the element's HTML.
	 * @param array<int,int>    $templates     Their template id => the converted template's id.
	 */
	public function __construct( array $known_widgets, ?callable $snapshot = null, array $templates = [] ) {
		$this->known = array_fill_keys( $known_widgets, true );
		$this->snapshot = $snapshot ?? static fn() => '';
		$this->templates = array_map( 'intval', $templates );
	}

	/** The elements tree of a page. */
	public function elements( array $elements ): array {
		$out = [];

		foreach ( $elements as $element ) {
			if ( is_array( $element ) ) {
				$converted = $this->element( $element, true );

				if ( $converted ) {
					$out[] = $converted;
				}
			}
		}

		return $out;
	}

	/** Page settings: the same names inside, and the page templates renamed. */
	public function page_settings( array $settings ): array {
		$settings = $this->value( $settings );

		if ( isset( $settings['template'] ) && is_string( $settings['template'] ) ) {
			$settings['template'] = self::page_template( $settings['template'] );
		}

		return $settings;
	}

	/** Refraction's widget for theirs, '' when there is none. */
	public function widget_name( string $name ): string {
		$candidates = [ $name, self::NAMES[ $name ] ?? '', 'refraction-' . $name, 'theme-' . $name ];

		if ( 0 === strpos( $name, 'woocommerce-' ) ) {
			$rest = substr( $name, strlen( 'woocommerce-' ) );
			$candidates[] = 'woo-' . $rest;
			$candidates[] = 'woo-' . preg_replace( '/^product-/', '', $rest );
		}

		foreach ( $candidates as $candidate ) {
			if ( '' !== $candidate && isset( $this->known[ $candidate ] ) ) {
				return $candidate;
			}
		}

		return '';
	}

	/** Their page template (canvas, full width, theme) as Refraction's. */
	public static function page_template( string $template ): string {
		$up = Upstream::name();
		$map = [
			$up . '_canvas' => 'refraction_canvas',
			$up . '_header_footer' => 'refraction_header_footer',
			$up . '_theme' => 'default',
		];

		return $map[ $template ] ?? $template;
	}

	/** Their template type as Refraction's. */
	public static function template_type( string $type ): string {
		$map = [
			'single-post' => 'single',
			'single-page' => 'single',
			'product' => 'single',
			'product-archive' => 'archive',
			'widget' => 'section',
			'container' => 'section',
		];

		return $map[ $type ] ?? $type;
	}

	private function element( array $element, bool $top ): ?array {
		$type = (string) ( $element['elType'] ?? '' );

		if ( in_array( $type, [ 'section', 'column', 'container' ], true ) ) {
			$element['settings'] = $this->settings( $element['settings'] ?? [] );
			$element['elements'] = $this->children( $element );

			return $element;
		}

		if ( 'widget' !== $type ) {
			// An element kind Refraction does not have (their newer editor's elements): kept as what it showed.
			$html = $this->keep_as_html( $element, $type );

			return $top ? $this->container( $html ) : $html;
		}

		$name = (string) ( $element['widgetType'] ?? '' );

		// A global widget, or their Template widget: Refraction's Template widget showing the converted template.
		if ( 'global' === $name || 'template' === $name ) {
			$old = 'global' === $name ? (int) ( $element['templateID'] ?? 0 ) : (int) ( $element['settings']['template_id'] ?? 0 );
			$settings = 'template' === $name ? $this->settings( $element['settings'] ?? [] ) : [];
			$settings['template_id'] = (string) ( $this->templates[ $old ] ?? 0 );
			unset( $element['templateID'] );

			return [ 'id' => $element['id'] ?? '', 'elType' => 'widget', 'widgetType' => 'refraction-template', 'settings' => $settings, 'elements' => [] ];
		}

		$mapped = $this->widget_name( $name );

		if ( '' === $mapped ) {
			return $this->keep_as_html( $element, $name );
		}

		$element['widgetType'] = $mapped;
		$element['settings'] = $this->settings( $element['settings'] ?? [] );
		$element['elements'] = $this->children( $element );

		return $element;
	}

	private function children( array $element ): array {
		$out = [];

		foreach ( (array) ( $element['elements'] ?? [] ) as $child ) {
			if ( is_array( $child ) ) {
				$converted = $this->element( $child, false );

				if ( $converted ) {
					$out[] = $converted;
				}
			}
		}

		return $out;
	}

	/** An HTML widget with what the element showed, keeping its spacing and position (the advanced settings). */
	private function keep_as_html( array $element, string $name ): array {
		$name = '' !== $name ? $name : 'element';
		$this->replaced[ $name ] = ( $this->replaced[ $name ] ?? 0 ) + 1;
		$html = (string) ( $this->snapshot )( $element );
		$settings = [];

		foreach ( (array) ( $element['settings'] ?? [] ) as $key => $value ) {
			if ( is_string( $key ) && '_' === ( $key[0] ?? '' ) && '__dynamic__' !== $key && '__globals__' !== $key ) {
				$settings[ $key ] = $this->value( $value, $key );
			}
		}

		$classes = trim( 'rf-imported-widget rf-imported-' . preg_replace( '/[^a-z0-9-]/', '-', strtolower( $name ) ) . ' ' . ( is_string( $settings['_css_classes'] ?? null ) ? $settings['_css_classes'] : '' ) );
		$settings['_css_classes'] = $classes;
		$settings['html'] = '' !== trim( $html ) ? $html : '<!-- ' . str_replace( '--', '- -', $name ) . ' -->';

		return [ 'id' => (string) ( $element['id'] ?? '' ), 'elType' => 'widget', 'widgetType' => 'html', 'settings' => $settings, 'elements' => [] ];
	}

	private function container( array $child ): array {
		return [ 'id' => substr( md5( (string) $child['id'] . 'wrap' ), 0, 7 ), 'elType' => 'container', 'isInner' => false, 'settings' => [], 'elements' => [ $child ] ];
	}

	private function settings( $settings ): array {
		return is_array( $settings ) ? $this->value( $settings ) : [];
	}

	/** Every string inside, with the other builder's names made Refraction's; ids of templates moved. */
	private function value( $value, string $key = '' ) {
		if ( is_array( $value ) ) {
			$out = [];

			foreach ( $value as $k => $v ) {
				$out[ $k ] = $this->value( $v, is_string( $k ) ? $k : $key );
			}

			return $out;
		}

		if ( in_array( $key, self::ID_KEYS, true ) && is_scalar( $value ) && is_numeric( (string) $value ) && (int) $value ) {
			return (string) ( $this->templates[ (int) $value ] ?? $value );
		}

		if ( ! is_string( $value ) ) {
			return $value;
		}

		$value = $this->text( $value );

		return 'custom_css' === $key ? self::css( $value ) : $value;
	}

	/** The other builder's names inside a setting's text. */
	public function text( string $text ): string {
		$up = Upstream::name();

		if ( false === stripos( $text, $up ) && false === strpos( $text, Upstream::icon_prefix() ) ) {
			return $text;
		}

		// Dynamic tags: [<up>-tag id="..." name="..." settings="..."].
		$text = str_replace( '[' . $up . '-tag ', '[refraction-tag ', $text );

		// Popup links: #<up>-action:action=popup:open&settings=<base64 {"id":"12"}> (often URL-encoded), as
		// Refraction's #refraction-popup:open:<new id>.
		$text = preg_replace_callback(
			'/(?:#|%23)' . $up . '-action(?::|%3A)action(?:=|%3D)popup(?::|%3A)(open|close|toggle)(?:(?:&|%26|&amp;)settings(?:=|%3D)([A-Za-z0-9%+\/=_-]+))?/i',
			function ( $m ) {
				$verb = strtolower( $m[1] );
				$settings = isset( $m[2] ) ? json_decode( (string) base64_decode( rawurldecode( $m[2] ), true ), true ) : null;
				$id = is_array( $settings ) ? (int) ( $settings['id'] ?? 0 ) : 0;
				$id = $this->templates[ $id ] ?? $id;

				// Colons percent-encoded, as the Popup dynamic tag makes them (esc_url() drops an unknown "protocol").
				return '#refraction-popup%3A' . $verb . ( $id ? '%3A' . $id : '' );
			},
			$text
		);

		// Their template shortcode.
		$text = preg_replace_callback(
			'/\[' . $up . '-template\s+id=(["\']?)(\d+)\1\s*\]/i',
			fn( $m ) => '[refraction-template id="' . ( $this->templates[ (int) $m[2] ] ?? (int) $m[2] ) . '"]',
			$text
		);

		// Their icon font: "<prefix>-star" in the "<prefix>s" library is Refraction's rficon-star in "rficons".
		$icon = Upstream::icon_prefix();

		if ( $icon . 's' === $text ) {
			return 'rficons';
		}

		return preg_replace( '/(?<![A-Za-z0-9_-])' . $icon . '-(?=[a-z0-9])/', 'rficon-', $text );
	}

	/** Custom CSS: their class names (.<up>-widget-container, #<up>-...) are Refraction's. */
	public static function css( string $css ): string {
		return preg_replace( '/([.#])' . Upstream::name() . '(?=[-_])/', '$1refraction', $css );
	}
}
