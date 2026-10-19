<?php
namespace Refraction\Modules\LoopBuilder\Controls;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Base;
use Refraction\Modules\LoopBuilder\Classes\Query_Lookup;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The reusable Query group control: what to list (post type, specific posts or related posts), which terms
 * and authors to include or leave out, order, offset, how many, and how to treat duplicates and sticky posts.
 *
 * Use it with `$this->add_group_control( Group_Control_Query::get_type(), [ 'name' => 'query' ] )`; the
 * settings (`query_post_type`, `query_orderby`, ...) are turned into WP_Query arguments by
 * `Query_Runner::args_from_settings( $settings, 'query' )`. Fields can be left out with `exclude`.
 */
class Group_Control_Query extends Group_Control_Base {

	protected static $fields;

	public static function get_type() {
		return 'refraction-query';
	}

	protected function init_fields() {
		$sources = [];

		foreach ( Query_Lookup::post_types() as $post_type ) {
			$object = get_post_type_object( $post_type );
			$sources[ $post_type ] = $object ? $object->labels->name : $post_type;
		}

		$sources['by_id'] = esc_html__( 'Manual selection', 'refraction' );
		$sources['related'] = esc_html__( 'Related posts', 'refraction' );

		$taxonomies = [];

		foreach ( Query_Lookup::taxonomies() as $taxonomy ) {
			$object = get_taxonomy( $taxonomy );
			$taxonomies[ $taxonomy ] = $object ? $object->labels->name : $taxonomy;
		}

		$fields = [];

		$fields['post_type'] = [
			'label' => esc_html__( 'Source', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => $sources,
			'default' => isset( $sources['post'] ) ? 'post' : (string) key( $sources ),
		];

		$fields['posts_ids'] = [
			'label' => esc_html__( 'Search and select', 'refraction' ),
			'type' => 'refraction_autocomplete',
			'query' => [ 'kind' => 'post', 'subtype' => 'any' ],
			'condition' => [ 'post_type' => 'by_id' ],
		];

		$fields['related_taxonomies'] = [
			'label' => esc_html__( 'Related by', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'options' => $taxonomies,
			'multiple' => true,
			'label_block' => true,
			'default' => array_values( array_intersect( [ 'category', 'post_tag' ], array_keys( $taxonomies ) ) ),
			'condition' => [ 'post_type' => 'related' ],
			'description' => esc_html__( 'Posts that share a term with the current post.', 'refraction' ),
		];

		$fields['include_term_ids'] = [
			'label' => esc_html__( 'Only these terms', 'refraction' ),
			'type' => 'refraction_autocomplete',
			'query' => [ 'kind' => 'term', 'subtype' => 'any' ],
			'condition' => [ 'post_type!' => 'by_id' ],
		];

		$fields['include_authors'] = [
			'label' => esc_html__( 'Only these authors', 'refraction' ),
			'type' => 'refraction_autocomplete',
			'query' => [ 'kind' => 'user' ],
			'condition' => [ 'post_type!' => 'by_id' ],
		];

		$fields['exclude_ids'] = [
			'label' => esc_html__( 'Leave out posts', 'refraction' ),
			'type' => 'refraction_autocomplete',
			'query' => [ 'kind' => 'post', 'subtype' => 'any' ],
			'separator' => 'before',
		];

		$fields['exclude_term_ids'] = [
			'label' => esc_html__( 'Leave out terms', 'refraction' ),
			'type' => 'refraction_autocomplete',
			'query' => [ 'kind' => 'term', 'subtype' => 'any' ],
		];

		$fields['exclude_authors'] = [
			'label' => esc_html__( 'Leave out authors', 'refraction' ),
			'type' => 'refraction_autocomplete',
			'query' => [ 'kind' => 'user' ],
		];

		$fields['exclude_current'] = [
			'label' => esc_html__( 'Leave out the current post', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'post_type!' => 'related' ],
		];

		$fields['avoid_duplicates'] = [
			'label' => esc_html__( 'Avoid duplicates', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Leave out posts already shown by an earlier widget on this page.', 'refraction' ),
		];

		$fields['ignore_sticky_posts'] = [
			'label' => esc_html__( 'Ignore sticky posts', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		];

		$fields['orderby'] = [
			'label' => esc_html__( 'Order by', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'separator' => 'before',
			'default' => 'date',
			'options' => [
				'date' => esc_html__( 'Date', 'refraction' ),
				'modified' => esc_html__( 'Last modified', 'refraction' ),
				'title' => esc_html__( 'Title', 'refraction' ),
				'rand' => esc_html__( 'Random', 'refraction' ),
				'comment_count' => esc_html__( 'Comment count', 'refraction' ),
				'menu_order' => esc_html__( 'Menu order', 'refraction' ),
				'ID' => esc_html__( 'ID', 'refraction' ),
				'author' => esc_html__( 'Author', 'refraction' ),
			],
		];

		$fields['order'] = [
			'label' => esc_html__( 'Order', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'DESC',
			'options' => [
				'DESC' => esc_html__( 'Descending', 'refraction' ),
				'ASC' => esc_html__( 'Ascending', 'refraction' ),
			],
		];

		$fields['offset'] = [
			'label' => esc_html__( 'Offset', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 0,
			'min' => 0,
			'description' => esc_html__( 'Skip this many posts at the start.', 'refraction' ),
		];

		$fields['posts_per_page'] = [
			'label' => esc_html__( 'Posts per page', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 6,
			'min' => 1,
			'max' => 100,
		];

		return $fields;
	}
}
