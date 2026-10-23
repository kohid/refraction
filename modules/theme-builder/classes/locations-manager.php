<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;
use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Locations (header, footer): which template wins on this request, and its markup.
 */
class Locations_Manager {

	const HEADER = Location_Scope::HEADER;
	const FOOTER = Location_Scope::FOOTER;
	const SINGLE = Location_Scope::SINGLE;
	const ARCHIVE = Location_Scope::ARCHIVE;
	const SEARCH = Location_Scope::SEARCH;
	const NOT_FOUND = Location_Scope::NOT_FOUND;

	private Conditions_Store $store;
	private Resolver $resolver;

	/** @var array<string, int> */
	private array $resolved = [];

	/** @var array<string, bool> */
	private array $printed = [];

	public function __construct( Conditions_Store $store, Resolver $resolver ) {
		$this->store = $store;
		$this->resolver = $resolver;
	}

	/**
	 * @return array<string, array{label: string, tag: string}>
	 */
	public function get_locations(): array {
		$locations = [
			self::HEADER => [
				'label' => esc_html__( 'Header', 'refraction' ),
				'tag' => 'header',
			],
			self::FOOTER => [
				'label' => esc_html__( 'Footer', 'refraction' ),
				'tag' => 'footer',
			],
			self::SINGLE => [
				'label' => esc_html__( 'Single', 'refraction' ),
				'tag' => 'main',
			],
			self::ARCHIVE => [
				'label' => esc_html__( 'Archive', 'refraction' ),
				'tag' => 'main',
			],
			self::SEARCH => [
				'label' => esc_html__( 'Search Results', 'refraction' ),
				'tag' => 'main',
			],
			self::NOT_FOUND => [
				'label' => esc_html__( 'Error 404', 'refraction' ),
				'tag' => 'main',
			],
		];

		/**
		 * Other modules add their template locations (WooCommerce adds product, cart, checkout...).
		 *
		 * @param array<string, array{label: string, tag: string}> $locations
		 */
		return (array) apply_filters( 'refraction/theme_builder/locations', $locations );
	}

	public function is_location( string $location ): bool {
		return isset( $this->get_locations()[ $location ] );
	}

	/** Forget resolved templates; the next request-sensitive call resolves again. */
	public function reset(): void {
		$this->resolved = [];
		$this->printed = [];
	}

	/**
	 * Whether this request may show a Theme Builder template at all: a public front end page, not the
	 * editor, and not the preview or front end view of a header/footer template itself.
	 */
	public function is_active_request(): bool {
		if ( is_admin() || wp_doing_ajax() || is_feed() || is_embed() || is_robots() || is_trackback() ) {
			return false;
		}

		if ( ! did_action( 'wp' ) || ! apply_filters( 'refraction/theme_builder/is_active_request', true ) ) {
			return false;
		}

		if ( Plugin::$instance->editor->is_edit_mode() ) {
			return false;
		}

		if ( isset( $_GET['refraction-preview'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$preview_id = absint( wp_unslash( $_GET['refraction-preview'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

			if ( $preview_id && $this->is_theme_document( $preview_id ) ) {
				return false;
			}
		}

		return ! ( is_singular( Source_Local::CPT ) && $this->is_theme_document( (int) get_queried_object_id() ) );
	}

	private function is_theme_document( int $post_id ): bool {
		return Plugin::$instance->documents->get( $post_id ) instanceof Theme_Document;
	}

	/** The winning template ID for the location on the current request, 0 when the theme should render. */
	public function get_template_id( string $location ): int {
		if ( ! $this->is_location( $location ) || ! $this->is_active_request() ) {
			return 0;
		}

		if ( ! isset( $this->resolved[ $location ] ) ) {
			$id = $this->resolver->pick( $this->store->get_candidates( $location, Source_Local::CPT ), $location );

			/**
			 * Filters the template chosen for a location.
			 *
			 * @param int    $id       Winning template ID, 0 for none.
			 * @param string $location `header` or `footer`.
			 */
			$this->resolved[ $location ] = (int) apply_filters( 'refraction/theme_builder/location_template_id', $id, $location );
		}

		return $this->resolved[ $location ];
	}

	/**
	 * The body location (single, archive, search results, 404) that has a template for this request,
	 * or an empty string when the theme should render the page.
	 */
	public function get_body_location(): string {
		// Library templates (sections, pages, headers...) opened on their own are not site pages.
		if ( is_singular( Source_Local::CPT ) || ( is_singular() && $this->uses_own_page_template() ) ) {
			return '';
		}

		foreach ( Location_Scope::body_locations() as $location ) {
			if ( $this->get_template_id( $location ) ) {
				return $location;
			}
		}

		return '';
	}

	/** A page that picked the Refraction Canvas or Header-Footer page template keeps it. */
	private function uses_own_page_template(): bool {
		$template = (string) get_post_meta( (int) get_queried_object_id(), '_wp_page_template', true );

		return in_array( $template, [ 'refraction_canvas', 'refraction_header_footer' ], true );
	}

	/** Markup of the winning template wrapped for its location; empty when nothing matches. */
	public function get_markup( string $location ): string {
		$id = $this->get_template_id( $location );

		if ( ! $id ) {
			return '';
		}

		$content = Plugin::$instance->frontend->get_builder_content_for_display( $id );

		if ( '' === trim( $content ) ) {
			return '';
		}

		$tag = $this->get_locations()[ $location ]['tag'];

		/**
		 * Extra CSS classes for the wrapper of a location (WooCommerce adds the product classes the variation script looks for).
		 *
		 * @param string $classes  Space separated classes.
		 * @param string $location Location.
		 * @param int    $id       Template ID.
		 */
		$classes = (string) apply_filters( 'refraction/theme_builder/location_classes', '', $location, $id );

		return sprintf(
			'<%1$s class="refraction-location-%2$s%5$s" data-refraction-location="%2$s" data-refraction-template-id="%3$d">%4$s</%1$s>',
			tag_escape( $tag ),
			esc_attr( $location ),
			$id,
			$content,
			'' !== $classes ? ' ' . esc_attr( $classes ) : '' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Builder output is escaped by the elements.
		);
	}

	/** Print the location once per request. Returns whether a Refraction template was printed. */
	public function print_location( string $location ): bool {
		if ( ! empty( $this->printed[ $location ] ) ) {
			return true;
		}

		$markup = $this->get_markup( $location );

		if ( '' === $markup ) {
			return false;
		}

		$this->printed[ $location ] = true;

		echo $markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built in get_markup().

		return true;
	}

	public function was_printed( string $location ): bool {
		return ! empty( $this->printed[ $location ] );
	}

	public function mark_printed( string $location ): void {
		$this->printed[ $location ] = true;
	}
}
