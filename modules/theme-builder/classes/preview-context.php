<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Makes the editor render a Theme Builder template against the content chosen in Preview Settings.
 *
 * The editor asks the server to render each widget (admin-ajax). Before it does, the global query is replaced by a
 * query for the chosen post, archive, search or 404 page, so the Theme Elements widgets and every template tag
 * (the_title(), is_category(), have_posts()...) behave as they will on the site.
 */
class Preview_Context {

	public function __construct() {
		add_action( 'refraction/widgets/ajax_render/query', [ $this, 'switch_for_document' ], 10, 1 );
	}

	public function switch_for_document( $document ): void {
		if ( $document instanceof Theme_Document ) {
			self::enter( $document );
		}
	}

	/** @return array{source: string, id: int, search: string, date: string} */
	public static function get_target( Theme_Document $document ): array {
		return Preview_Target::sanitize( $document->get_location(), $document->get_settings( Preview_Target::SETTING ) );
	}

	/** Replace the global query. Returns false (and changes nothing) when the target has no content to show. */
	public static function enter( Theme_Document $document ): bool {
		$location = $document->get_location();
		$target = self::get_target( $document );
		$parsed = Preview_Target::parse_source( $target['source'] );

		if ( $parsed && 'post' === $parsed['kind'] && $target['id'] && ! current_user_can( 'read_post', $target['id'] ) ) {
			$target['id'] = 0;
		}

		$vars = Preview_Target::query_vars( $location, $target );

		if ( ! empty( $vars['__404'] ) ) {
			$query = new \WP_Query();
			$query->set_404();
		} else {
			$query = new \WP_Query( $vars );

			if ( $parsed && 'post' === $parsed['kind'] && ! $query->have_posts() ) {
				return false;
			}
		}

		$GLOBALS['wp_query'] = $query; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

		unset( $GLOBALS['post'], $GLOBALS['authordata'] );

		if ( $query->is_singular() && $query->have_posts() ) {
			$GLOBALS['post'] = $query->posts[0]; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			setup_postdata( $GLOBALS['post'] );
		}

		if ( $query->is_author() ) {
			$GLOBALS['authordata'] = get_userdata( (int) $query->get( 'author' ) ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		}

		return true;
	}
}
