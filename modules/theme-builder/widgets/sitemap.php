<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Sitemap: an HTML list of pages, posts, custom post types and terms.
 */
class Sitemap extends Theme_Widget_Base {

	const LIMIT = 500;

	public function get_name() {
		return 'theme-sitemap';
	}

	public function get_title() {
		return esc_html__( 'Sitemap', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-sitemap';
	}

	public function get_keywords() {
		return [ 'sitemap', 'pages', 'posts', 'list', 'index' ];
	}

	/** @return array<string, string> `post_type:{name}` and `taxonomy:{name}` options. */
	private function get_source_options(): array {
		$options = [];

		foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $type ) {
			if ( 'attachment' !== $type->name ) {
				$options[ 'post_type:' . $type->name ] = $type->labels->name;
			}
		}

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			if ( 'post_format' !== $taxonomy->name ) {
				/* translators: %s: taxonomy name, for example "Categories". */
				$options[ 'taxonomy:' . $taxonomy->name ] = sprintf( __( '%s (terms)', 'refraction' ), $taxonomy->labels->name );
			}
		}

		return $options;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Sitemap', 'refraction' ),
			]
		);

		$this->add_control(
			'sources',
			[
				'label' => esc_html__( 'Show', 'refraction' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'label_block' => true,
				'options' => $this->get_source_options(),
				'default' => [ 'post_type:page' ],
			]
		);

		$this->add_control(
			'orderby',
			[
				'label' => esc_html__( 'Order By', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'title' => esc_html__( 'Title', 'refraction' ),
					'date' => esc_html__( 'Date', 'refraction' ),
					'menu_order' => esc_html__( 'Menu order', 'refraction' ),
				],
				'default' => 'title',
			]
		);

		$this->add_control(
			'order',
			[
				'label' => esc_html__( 'Order', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'ASC' => esc_html__( 'Ascending', 'refraction' ),
					'DESC' => esc_html__( 'Descending', 'refraction' ),
				],
				'default' => 'ASC',
			]
		);

		$this->add_control(
			'depth',
			[
				'label' => esc_html__( 'Depth', 'refraction' ),
				'description' => esc_html__( '0 shows every level, 1 only the top level.', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 10,
				'default' => 0,
			]
		);

		$this->add_control(
			'show_count',
			[
				'label' => esc_html__( 'Show term count', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
			]
		);

		$this->add_control(
			'title_tag',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [ 'h2' => 'H2', 'h3' => 'H3', 'h4' => 'H4', 'h5' => 'H5', 'h6' => 'H6', 'div' => 'div', 'p' => 'p' ],
				'default' => 'h3',
			]
		);

		$this->add_responsive_control(
			'columns',
			[
				'label' => esc_html__( 'Columns', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [ '1' => '1', '2' => '2', '3' => '3', '4' => '4' ],
				'default' => '1',
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-sitemap__sections' => 'column-count: {{VALUE}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			[
				'label' => esc_html__( 'Sitemap', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'title_typography',
				'label' => esc_html__( 'Title Typography', 'refraction' ),
				'selector' => '{{WRAPPER}} .refraction-theme-sitemap__title',
			]
		);

		$this->add_control(
			'title_color',
			[
				'label' => esc_html__( 'Title Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-sitemap__title' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'item_typography',
				'label' => esc_html__( 'Item Typography', 'refraction' ),
				'selector' => '{{WRAPPER}} .refraction-theme-sitemap li',
			]
		);

		$this->add_control(
			'link_color',
			[
				'label' => esc_html__( 'Link Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-sitemap a' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'link_hover_color',
			[
				'label' => esc_html__( 'Link Hover Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-sitemap a:hover' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'item_space',
			[
				'label' => esc_html__( 'Item Spacing', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'custom' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-sitemap li' => 'margin-block-end: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$sources = array_filter( (array) $settings['sources'], 'is_string' );
		$tag = Utils::validate_html_tag( (string) $settings['title_tag'] );
		$orderby = in_array( $settings['orderby'], [ 'title', 'date', 'menu_order' ], true ) ? $settings['orderby'] : 'title';
		$order = 'DESC' === $settings['order'] ? 'DESC' : 'ASC';
		$depth = max( 0, (int) $settings['depth'] );
		$sections = [];

		foreach ( $sources as $source ) {
			[ $kind, $name ] = array_pad( explode( ':', $source, 2 ), 2, '' );

			if ( 'post_type' === $kind && post_type_exists( $name ) ) {
				$type = get_post_type_object( $name );
				$list = $this->list_posts( $name, $orderby, $order, $depth );
				$title = $type->labels->name;
			} elseif ( 'taxonomy' === $kind && taxonomy_exists( $name ) ) {
				$title = get_taxonomy( $name )->labels->name;
				$list = (string) wp_list_categories( [
					'taxonomy' => $name,
					'title_li' => '',
					'echo' => false,
					'depth' => $depth,
					'orderby' => 'date' === $orderby ? 'id' : ( 'menu_order' === $orderby ? 'name' : 'name' ),
					'order' => $order,
					'show_count' => 'yes' === $settings['show_count'],
					'hierarchical' => true,
				] );
			} else {
				continue;
			}

			if ( '' !== trim( wp_strip_all_tags( $list ) ) ) {
				$sections[] = [ $title, $list ];
			}
		}

		if ( ! $sections ) {
			$this->print_editor_hint( __( 'Choose what the sitemap should list.', 'refraction' ) );

			return;
		}

		echo '<div class="refraction-theme-sitemap"><div class="refraction-theme-sitemap__sections">';

		foreach ( $sections as [ $title, $list ] ) {
			echo '<section class="refraction-theme-sitemap__section">';
			printf( '<%1$s class="refraction-theme-sitemap__title">%2$s</%1$s>', tag_escape( $tag ), esc_html( $title ) );
			echo '<ul class="refraction-theme-sitemap__list">' . $list . '</ul>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built by core list functions or escaped below.
			echo '</section>';
		}

		echo '</div></div>';
	}

	/** Items of a post type as list markup; hierarchical types keep their tree. */
	private function list_posts( string $post_type, string $orderby, string $order, int $depth ): string {
		if ( is_post_type_hierarchical( $post_type ) ) {
			return (string) wp_list_pages( [
				'post_type' => $post_type,
				'title_li' => '',
				'echo' => false,
				'depth' => $depth,
				'sort_column' => 'title' === $orderby ? 'post_title' : ( 'date' === $orderby ? 'post_date' : 'menu_order, post_title' ),
				'sort_order' => $order,
			] );
		}

		$html = '';

		foreach ( get_posts( [
			'post_type' => $post_type,
			'post_status' => 'publish',
			'posts_per_page' => self::LIMIT,
			'orderby' => $orderby,
			'order' => $order,
			'no_found_rows' => true,
			'suppress_filters' => false,
		] ) as $post ) {
			$html .= '<li><a href="' . esc_url( (string) get_permalink( $post ) ) . '">' . esc_html( get_the_title( $post ) ) . '</a></li>';
		}

		return $html;
	}
}
