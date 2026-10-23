<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Refraction\Group_Control_Border;
use Refraction\Modules\Woocommerce\Classes\Product_Context;
use Refraction\Modules\Woocommerce\Classes\Settings;

/**
 * Product Categories: a grid of product categories with their image, name and product count.
 */
class Product_Categories extends Woo_Widget_Base {

	public function get_name() {
		return 'woo-product-categories';
	}

	public function get_title() {
		return esc_html__( 'Product Categories', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-categories';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'categories', 'shop', 'grid', 'departments' ];
	}

	protected function needs_product(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_content', [ 'label' => esc_html__( 'Categories', 'refraction' ) ] );

		$this->add_control( 'parent', [ 'label' => esc_html__( 'Show', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'top', 'options' => [ 'top' => esc_html__( 'Top level categories', 'refraction' ), 'all' => esc_html__( 'All categories', 'refraction' ), 'children' => esc_html__( 'Subcategories of the current category', 'refraction' ), 'selected' => esc_html__( 'Only selected categories', 'refraction' ) ] ] );
		$this->add_control( 'selected', [ 'label' => esc_html__( 'Categories', 'refraction' ), 'type' => 'refraction_autocomplete', 'multiple' => true, 'query' => [ 'kind' => 'term', 'subtype' => 'product_cat' ], 'label_block' => true, 'condition' => [ 'parent' => 'selected' ] ] );
		$this->add_control( 'orderby', [ 'label' => esc_html__( 'Order by', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'name', 'options' => [ 'name' => esc_html__( 'Name', 'refraction' ), 'count' => esc_html__( 'Product count', 'refraction' ), 'menu_order' => esc_html__( 'Menu order', 'refraction' ), 'id' => esc_html__( 'ID', 'refraction' ) ] ] );
		$this->add_control( 'order', [ 'label' => esc_html__( 'Order', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'ASC', 'options' => [ 'ASC' => esc_html__( 'Ascending', 'refraction' ), 'DESC' => esc_html__( 'Descending', 'refraction' ) ] ] );
		$this->add_control( 'number', [ 'label' => esc_html__( 'Categories to show', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 100, 'default' => 8 ] );
		$this->add_control( 'hide_empty', [ 'label' => esc_html__( 'Hide empty categories', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_responsive_control( 'columns', [ 'label' => esc_html__( 'Columns', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 6, 'default' => 4, 'tablet_default' => 3, 'mobile_default' => 2, 'selectors' => [ '{{WRAPPER}} ul.products' => '--refraction-woo-columns: {{VALUE}};' ] ] );
		$this->add_control( 'show_image', [ 'label' => esc_html__( 'Image', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'show_count', [ 'label' => esc_html__( 'Product count', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_grid', [ 'label' => esc_html__( 'Grid', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'column_gap', [ 'label' => esc_html__( 'Column gap', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ], 'selectors' => [ '{{WRAPPER}} ul.products' => 'column-gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'row_gap', [ 'label' => esc_html__( 'Row gap', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ], 'selectors' => [ '{{WRAPPER}} ul.products' => 'row-gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'card_border', 'selector' => '{{WRAPPER}} li.product-category' ] );
		$this->add_responsive_control( 'card_radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ], 'selectors' => [ '{{WRAPPER}} li.product-category' => 'border-radius: {{SIZE}}{{UNIT}}; overflow: hidden;' ] ] );
		$this->end_controls_section();

		$this->add_text_style_section( 'section_style_title', esc_html__( 'Title', 'refraction' ), '{{WRAPPER}} .woocommerce-loop-category__title' );
	}

	private function get_terms(): array {
		$s = $this->get_all_settings();
		$args = [
			'taxonomy' => 'product_cat',
			'hide_empty' => 'yes' === $s['hide_empty'],
			'number' => Settings::limit( $s['number'] ?: 8 ),
			'order' => Settings::order( $s['order'] ),
			'exclude' => [ (int) get_option( 'default_product_cat' ) ],
		];

		switch ( $s['orderby'] ) {
			case 'count':
				$args['orderby'] = 'count';
				break;
			case 'id':
				$args['orderby'] = 'id';
				break;
			case 'menu_order':
				$args['orderby'] = 'meta_value_num';
				$args['meta_key'] = 'order'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				break;
			default:
				$args['orderby'] = 'name';
		}

		switch ( $s['parent'] ) {
			case 'top':
				$args['parent'] = 0;
				break;
			case 'children':
				$current = is_tax( 'product_cat' ) ? (int) get_queried_object_id() : 0;

				if ( ! $current ) {
					return [];
				}

				$args['parent'] = $current;
				break;
			case 'selected':
				$ids = Settings::ids( $s['selected'] );

				if ( ! $ids ) {
					return [];
				}

				$args['include'] = $ids;
				$args['exclude'] = [];
				$args['orderby'] = 'include';
				break;
		}

		$terms = get_terms( $args );

		return is_wp_error( $terms ) ? [] : array_values( array_filter( $terms, fn( $term ) => $term instanceof \WP_Term ) );
	}

	protected function render_widget(): void {
		$terms = $this->get_terms();

		if ( ! $terms ) {
			$this->print_editor_hint( __( 'There are no product categories to show.', 'refraction' ) );

			return;
		}

		$s = $this->get_all_settings();
		$hidden = [];

		if ( 'yes' !== $s['show_image'] ) {
			$hidden[] = [ 'woocommerce_before_subcategory_title', 'woocommerce_subcategory_thumbnail' ];
		}

		if ( 'yes' !== $s['show_count'] ) {
			add_filter( 'woocommerce_subcategory_count_html', '__return_empty_string', 99 );
		}

		wc_set_loop_prop( 'columns', Settings::columns( ( $s['columns'] ?? 4 ) ?: 4 ) );
		woocommerce_product_loop_start();

		Product_Context::without_hooks(
			$hidden,
			function () use ( $terms ) {
				foreach ( $terms as $term ) {
					wc_get_template( 'content-product_cat.php', [ 'category' => $term ] );
				}
			}
		);

		woocommerce_product_loop_end();
		wc_reset_loop();

		if ( 'yes' !== $s['show_count'] ) {
			remove_filter( 'woocommerce_subcategory_count_html', '__return_empty_string', 99 );
		}
	}
}
