<?php
namespace Refraction\Modules\LoopBuilder\Classes;

use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Modules\LoopBuilder\Documents\Loop_Item;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Prints a Loop Item template once for a post, with that post as the current dynamic context.
 */
class Loop_Renderer {

	/** @var array<int,bool> Templates being printed right now (a template cannot print itself). */
	private static array $active = [];

	public static function render_item( int $template_id, \WP_Post $post, bool $with_css = false ): string {
		if ( isset( self::$active[ $template_id ] ) || ! Loop_Item::is_usable( $template_id ) ) {
			return '';
		}

		self::$active[ $template_id ] = true;

		$previous_post = $GLOBALS['post'] ?? null;
		$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		setup_postdata( $post );
		Context::push_post( $post->ID );

		try {
			$content = Plugin::$instance->frontend->get_builder_content_for_display( $template_id, $with_css );
		} finally {
			Context::pop_post();
			unset( self::$active[ $template_id ] );

			$GLOBALS['post'] = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

			if ( $previous_post instanceof \WP_Post ) {
				setup_postdata( $previous_post );
			} else {
				wp_reset_postdata();
			}
		}

		if ( '' === trim( $content ) ) {
			return '';
		}

		return '<div class="' . esc_attr( implode( ' ', get_post_class( 'refraction-loop-item', $post ) ) ) . '" data-refraction-post-id="' . esc_attr( (string) $post->ID ) . '">' . $content . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput -- Builder output.
	}

	/** Templates a user can choose in the widgets: published Loop Items, id => title. */
	public static function get_template_options(): array {
		$posts = get_posts( [
			'post_type' => \Refraction\TemplateLibrary\Source_Local::CPT,
			'post_status' => 'publish',
			'posts_per_page' => 100,
			'orderby' => 'title',
			'order' => 'ASC',
			'no_found_rows' => true,
			'meta_key' => \Refraction\Core\Base\Document::TYPE_META_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'meta_value' => Loop_Item::TYPE, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
		] );

		$options = [];

		foreach ( $posts as $post ) {
			$options[ $post->ID ] = '' !== $post->post_title ? $post->post_title : '#' . $post->ID;
		}

		return $options;
	}
}
