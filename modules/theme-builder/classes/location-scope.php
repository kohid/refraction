<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Which kind of request a Theme Builder location may serve, whatever its display rules say.
 *
 * A Single template with the rule "entire site" must still never replace an archive, search or 404 page.
 */
final class Location_Scope {

	const HEADER = 'header';
	const FOOTER = 'footer';
	const SINGLE = 'single';
	const ARCHIVE = 'archive';
	const SEARCH = 'search-results';
	const NOT_FOUND = 'error-404';

	/** Locations that replace the main content of the page. */
	public static function body_locations(): array {
		return [ self::SINGLE, self::ARCHIVE, self::SEARCH, self::NOT_FOUND ];
	}

	public static function is_body_location( string $location ): bool {
		return in_array( $location, self::body_locations(), true );
	}

	public static function applies( string $location, Environment $environment ): bool {
		switch ( $location ) {
			case self::HEADER:
			case self::FOOTER:
				return true;
			case self::SINGLE:
				return $environment->is_singular();
			case self::SEARCH:
				return $environment->is_search();
			case self::NOT_FOUND:
				return $environment->is_404();
			case self::ARCHIVE:
				if ( $environment->is_singular() || $environment->is_search() || $environment->is_404() ) {
					return false;
				}

				// Posts as front page is the blog home too.
				return $environment->is_archive() || $environment->is_blog_index() || $environment->is_front_page();
			default:
				return false;
		}
	}
}
