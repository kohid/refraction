<?php
namespace Refraction\Modules\LoopBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\LoopBuilder\Classes\Query_Runner;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Archive Posts: the Posts widget with the query of the current page (category, tag, author, date, search or
 * post type archive, and the blog page). On any other page it shows the latest posts, which is what the
 * editor preview needs.
 */
class Archive_Posts extends Posts {

	public function get_name() {
		return 'archive-posts';
	}

	public function get_title() {
		return esc_html__( 'Archive Posts', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-archive-posts';
	}

	public function get_keywords() {
		return [ 'archive', 'posts', 'query', 'category', 'tag', 'search', 'loop' ];
	}

	protected function uses_archive_query(): bool {
		return true;
	}

	protected function get_layout_class(): string {
		return 'refraction-loop--posts refraction-loop--archive';
	}

	protected function register_query_controls( array $exclude = [] ): void {
		$this->start_controls_section(
			'section_query',
			[
				'label' => esc_html__( 'Query', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'archive_notice',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'This widget lists the posts of the archive being viewed (category, tag, author, date, search, post type archive or blog page). Elsewhere it shows the latest posts.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);

		$this->add_control(
			'archive_posts_per_page',
			[
				'label' => esc_html__( 'Posts per page', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 9,
				'min' => 1,
				'max' => 100,
			]
		);

		$this->end_controls_section();
	}

	protected function get_query_args( int $paged, ?array $filter, array $opts ): array {
		$per_page = max( 1, (int) $this->get_settings_for_display( 'archive_posts_per_page' ) );
		$vars = $opts['archive_vars'] ?? ( ( is_archive() || is_home() || is_search() ) && ! is_singular() ? Query_Runner::archive_vars() : [] );

		return Query_Runner::apply_filter( Query_Runner::archive_args( (array) $vars, $per_page, $paged ), Query_Runner::sanitize_filter( $filter ) );
	}
}
