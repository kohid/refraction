<?php
namespace Refraction\Modules\Woocommerce\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Modules\LoopBuilder\Classes\Query_Runner;
use Refraction\Modules\LoopBuilder\Controls\Group_Control_Query;
use Refraction\Modules\Woocommerce\Classes\Product_Context;
use Refraction\Modules\Woocommerce\Classes\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Products: a grid of products from the Query control (category, tag, sale, featured, best selling, top rated,
 * price order) or the products of the current shop, category or tag page.
 */
class Products extends Woo_Widget_Base {

	const QUERY_PREFIX = 'query_';

	public function get_name() {
		return 'woo-products';
	}

	public function get_title() {
		return esc_html__( 'Products', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-products';
	}

	public function get_keywords() {
		return [ 'woocommerce', 'shop', 'store', 'products', 'grid', 'archive', 'sale', 'featured' ];
	}

	protected function needs_product(): bool {
		return false;
	}

	protected function get_woo_scripts(): array {
		return [ 'wc-add-to-cart', 'wc-cart-fragments' ];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_query', [ 'label' => esc_html__( 'Query', 'refraction' ), 'tab' => Controls_Manager::TAB_CONTENT ] );

		$this->add_control(
			'source',
			[
				'label' => esc_html__( 'Source', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'query',
				'options' => [
					'query' => esc_html__( 'Custom query', 'refraction' ),
					'current' => esc_html__( 'Current archive (shop, category, tag, search)', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'filter',
			[
				'label' => esc_html__( 'Show', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'all',
				'options' => [
					'all' => esc_html__( 'All products', 'refraction' ),
					'sale' => esc_html__( 'Products on sale', 'refraction' ),
					'featured' => esc_html__( 'Featured products', 'refraction' ),
				],
				'condition' => [ 'source' => 'query' ],
			]
		);

		$this->add_control(
			'orderby',
			[
				'label' => esc_html__( 'Order by', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'date',
				'options' => [
					'date' => esc_html__( 'Date', 'refraction' ),
					'popularity' => esc_html__( 'Best selling', 'refraction' ),
					'rating' => esc_html__( 'Top rated', 'refraction' ),
					'price' => esc_html__( 'Price', 'refraction' ),
					'title' => esc_html__( 'Title', 'refraction' ),
					'menu_order' => esc_html__( 'Menu order', 'refraction' ),
					'rand' => esc_html__( 'Random', 'refraction' ),
				],
				'condition' => [ 'source' => 'query' ],
			]
		);

		$this->add_control(
			'order',
			[
				'label' => esc_html__( 'Order', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'DESC',
				'options' => [ 'DESC' => esc_html__( 'Descending', 'refraction' ), 'ASC' => esc_html__( 'Ascending', 'refraction' ) ],
				'condition' => [ 'source' => 'query' ],
			]
		);

		$this->add_group_control(
			Group_Control_Query::get_type(),
			[
				'name' => 'query',
				'exclude' => [ 'post_type', 'posts_ids', 'related_taxonomies', 'include_authors', 'exclude_authors', 'orderby', 'order', 'ignore_sticky_posts' ],
				'condition' => [ 'source' => 'query' ],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section( 'section_layout', [ 'label' => esc_html__( 'Layout', 'refraction' ), 'tab' => Controls_Manager::TAB_CONTENT ] );

		$this->add_responsive_control( 'columns', [ 'label' => esc_html__( 'Columns', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 6, 'default' => 4, 'tablet_default' => 3, 'mobile_default' => 2, 'selectors' => [ '{{WRAPPER}} ul.products' => '--refraction-woo-columns: {{VALUE}};' ] ] );

		$this->add_control( 'pagination', [ 'label' => esc_html__( 'Pagination', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'none', 'options' => [ 'none' => esc_html__( 'None', 'refraction' ), 'numbers' => esc_html__( 'Page numbers', 'refraction' ) ] ] );
		$this->add_control( 'show_result_count', [ 'label' => esc_html__( 'Result count', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'condition' => [ 'source' => 'current' ] ] );
		$this->add_control( 'show_ordering', [ 'label' => esc_html__( 'Sorting dropdown', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'condition' => [ 'source' => 'current' ] ] );

		$this->add_control( 'show_image', [ 'label' => esc_html__( 'Image', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'separator' => 'before' ] );
		$this->add_control( 'show_badge', [ 'label' => esc_html__( 'Sale badge', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'show_title', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'show_rating', [ 'label' => esc_html__( 'Rating', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'show_price', [ 'label' => esc_html__( 'Price', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'show_button', [ 'label' => esc_html__( 'Add to cart button', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'empty_message', [ 'label' => esc_html__( 'Message when nothing is found', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'No products were found.', 'refraction' ), 'separator' => 'before' ] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_grid', [ 'label' => esc_html__( 'Grid', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'column_gap', [ 'label' => esc_html__( 'Column gap', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ], 'selectors' => [ '{{WRAPPER}} ul.products' => 'column-gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'row_gap', [ 'label' => esc_html__( 'Row gap', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ], 'selectors' => [ '{{WRAPPER}} ul.products' => 'row-gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'align', [ 'label' => esc_html__( 'Text alignment', 'refraction' ), 'type' => Controls_Manager::CHOOSE, 'options' => [ 'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ], 'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ], 'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ] ], 'selectors' => [ '{{WRAPPER}} li.product' => 'text-align: {{VALUE}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_card', [ 'label' => esc_html__( 'Card', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_color_control( 'card_bg', esc_html__( 'Background', 'refraction' ), '{{WRAPPER}} li.product', 'background-color' );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'card_border', 'selector' => '{{WRAPPER}} li.product' ] );
		$this->add_responsive_control( 'card_radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ], 'selectors' => [ '{{WRAPPER}} li.product' => 'border-radius: {{SIZE}}{{UNIT}}; overflow: hidden;' ] ] );
		$this->add_responsive_control( 'card_padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ '{{WRAPPER}} li.product' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'card_shadow', 'selector' => '{{WRAPPER}} li.product' ] );
		$this->add_responsive_control( 'image_ratio', [ 'label' => esc_html__( 'Image ratio', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => '', 'options' => [ '' => esc_html__( 'Original', 'refraction' ), '1 / 1' => '1:1', '4 / 3' => '4:3', '3 / 4' => '3:4', '16 / 9' => '16:9' ], 'selectors' => [ '{{WRAPPER}} li.product img.attachment-woocommerce_thumbnail' => 'aspect-ratio: {{VALUE}}; object-fit: cover; width: 100%;' ] ] );
		$this->end_controls_section();

		$this->add_text_style_section( 'section_style_title', esc_html__( 'Title', 'refraction' ), '{{WRAPPER}} .woocommerce-loop-product__title', '{{WRAPPER}} li.product a' );
		$this->add_text_style_section( 'section_style_price', esc_html__( 'Price', 'refraction' ), '{{WRAPPER}} li.product .price' );

		$btn = '{{WRAPPER}} li.product .button';
		$this->start_controls_section( 'section_style_button', [ 'label' => esc_html__( 'Button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_typography( 'button_typography', $btn );
		$this->add_color_control( 'button_color', esc_html__( 'Text color', 'refraction' ), $btn );
		$this->add_color_control( 'button_bg', esc_html__( 'Background', 'refraction' ), $btn, 'background-color' );
		$this->add_color_control( 'button_hover_color', esc_html__( 'Hover text color', 'refraction' ), $btn . ':hover' );
		$this->add_color_control( 'button_hover_bg', esc_html__( 'Hover background', 'refraction' ), $btn . ':hover', 'background-color' );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_badge', [ 'label' => esc_html__( 'Sale badge', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_color_control( 'badge_color', esc_html__( 'Text color', 'refraction' ), '{{WRAPPER}} .onsale' );
		$this->add_color_control( 'badge_bg', esc_html__( 'Background', 'refraction' ), '{{WRAPPER}} .onsale', 'background-color' );
		$this->end_controls_section();
	}

	/** True on a shop, product category, product tag or product search page (or its editor preview). */
	private function is_product_archive_request(): bool {
		return ( function_exists( 'is_shop' ) && is_shop() ) || ( function_exists( 'is_product_taxonomy' ) && is_product_taxonomy() ) || is_post_type_archive( 'product' ) || ( is_search() && 'product' === get_query_var( 'post_type' ) );
	}

	private function page_param(): string {
		return 'rwoo-' . $this->get_id();
	}

	/** WP_Query arguments for a custom query. Only published, visible products, whatever the settings say. */
	private function build_args( array $settings, int $paged ): array {
		$settings[ self::QUERY_PREFIX . 'post_type' ] = 'product';
		$args = Query_Runner::args_from_settings( $settings, self::QUERY_PREFIX, $paged );

		$args['post_type'] = 'product';
		$args['post_status'] = 'publish';
		$args['has_password'] = false;

		$ordering = Settings::orderby( $settings['orderby'] ?? 'date' );
		$args['order'] = Settings::order( $settings['order'] ?? 'DESC' );

		switch ( $ordering ) {
			case 'popularity':
				$args['meta_key'] = 'total_sales'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				$args['orderby'] = 'meta_value_num';
				break;
			case 'rating':
				$args['meta_key'] = '_wc_average_rating'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				$args['orderby'] = 'meta_value_num';
				break;
			case 'price':
				$args['meta_key'] = '_price'; // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				$args['orderby'] = 'meta_value_num';
				break;
			case 'menu_order':
				$args['orderby'] = 'menu_order title';
				break;
			default:
				$args['orderby'] = $ordering;
		}

		$visibility = wc_get_product_visibility_term_ids();
		$hidden = [ $visibility['exclude-from-catalog'] ];

		if ( 'yes' === get_option( 'woocommerce_hide_out_of_stock_items' ) ) {
			$hidden[] = $visibility['outofstock'];
		}

		$clauses = [ [ 'taxonomy' => 'product_visibility', 'field' => 'term_taxonomy_id', 'terms' => $hidden, 'operator' => 'NOT IN' ] ];

		if ( 'featured' === ( $settings['filter'] ?? '' ) ) {
			$clauses[] = [ 'taxonomy' => 'product_visibility', 'field' => 'term_taxonomy_id', 'terms' => [ $visibility['featured'] ], 'operator' => 'IN' ];
		}

		$existing = ! empty( $args['tax_query'] ) && is_array( $args['tax_query'] ) ? [ $args['tax_query'] ] : [];
		$args['tax_query'] = array_merge( [ 'relation' => 'AND' ], $existing, $clauses ); // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query

		if ( 'sale' === ( $settings['filter'] ?? '' ) ) {
			$sale = array_map( 'intval', wc_get_product_ids_on_sale() );
			$args['post__in'] = isset( $args['post__in'] ) ? array_values( array_intersect( $sale, (array) $args['post__in'] ) ) : $sale;

			if ( ! $args['post__in'] ) {
				$args['post__in'] = [ 0 ];
			}
		}

		return $args;
	}

	/** Which parts of the product card are hidden. */
	private function hidden_parts(): array {
		$s = $this->get_settings_for_display();
		$map = [
			'show_image' => [ 'woocommerce_before_shop_loop_item_title', 'woocommerce_template_loop_product_thumbnail' ],
			'show_badge' => [ 'woocommerce_before_shop_loop_item_title', 'woocommerce_show_product_loop_sale_flash' ],
			'show_title' => [ 'woocommerce_shop_loop_item_title', 'woocommerce_template_loop_product_title' ],
			'show_rating' => [ 'woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_rating' ],
			'show_price' => [ 'woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_price' ],
			'show_button' => [ 'woocommerce_after_shop_loop_item', 'woocommerce_template_loop_add_to_cart' ],
		];
		$hidden = [];

		foreach ( $map as $key => $hook ) {
			if ( 'yes' !== ( $s[ $key ] ?? '' ) ) {
				$hidden[] = $hook;
			}
		}

		return $hidden;
	}

	protected function render_widget(): void {
		$s = $this->get_settings_for_display();
		$columns = Settings::columns( $s['columns'] ?: 4 );
		$current = 'current' === $s['source'];
		$paged = isset( $_GET[ $this->page_param() ] ) ? max( 1, absint( wp_unslash( $_GET[ $this->page_param() ] ) ) ) : 1; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( $current ) {
			if ( ! $this->is_product_archive_request() ) {
				$this->print_editor_hint( __( 'Current archive shows the products of the shop, a product category, a product tag or a product search. Use it in a Product Archive template.', 'refraction' ) );

				return;
			}

			$query = $GLOBALS['wp_query'];
			$total_pages = (int) $query->max_num_pages;
			$paged = max( 1, (int) get_query_var( 'paged' ) );
		} else {
			$query = new \WP_Query( $this->build_args( $s, $paged ) );
			$total_pages = (int) $query->max_num_pages;
		}

		$products = array_values( array_filter( (array) $query->posts, fn( $post ) => $post instanceof \WP_Post && 'product' === $post->post_type ) );

		if ( ! $products ) {
			echo '<p class="woocommerce-info refraction-woo-empty">' . esc_html( (string) $s['empty_message'] ) . '</p>';

			return;
		}

		wc_setup_loop(
			[
				'columns' => $columns,
				'name' => 'refraction_products',
				'is_shortcode' => ! $current,
				'is_search' => $current && is_search(),
				'is_paginated' => true,
				'total' => (int) $query->found_posts,
				'total_pages' => $total_pages,
				'per_page' => (int) $query->get( 'posts_per_page' ),
				'current_page' => $paged,
			]
		);

		if ( $current && 'yes' === $s['show_result_count'] ) {
			woocommerce_result_count();
		}

		if ( $current && 'yes' === $s['show_ordering'] ) {
			woocommerce_catalog_ordering();
		}

		$previous_post = $GLOBALS['post'] ?? null;
		$previous_product = $GLOBALS['product'] ?? null;

		woocommerce_product_loop_start();

		Product_Context::without_hooks(
			$this->hidden_parts(),
			function () use ( $products ) {
				foreach ( $products as $post ) {
					$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
					setup_postdata( $post );
					wc_setup_product_data( $post );
					wc_get_template_part( 'content', 'product' );
				}
			}
		);

		woocommerce_product_loop_end();

		if ( $previous_post ) {
			$GLOBALS['post'] = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			setup_postdata( $previous_post );
		} else {
			unset( $GLOBALS['post'] );
		}

		if ( $previous_product ) {
			$GLOBALS['product'] = $previous_product; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		} else {
			unset( $GLOBALS['product'] );
		}

		wc_reset_loop();

		if ( 'numbers' === $s['pagination'] && $total_pages > 1 ) {
			if ( $current ) {
				woocommerce_pagination();
			} else {
				$base = remove_query_arg( $this->page_param() );
				echo wp_kses_post(
					(string) paginate_links(
						[
							'base' => esc_url_raw( add_query_arg( $this->page_param(), '%#%', $base ) ),
							'format' => '',
							'current' => $paged,
							'total' => $total_pages,
							'type' => 'list',
							'prev_text' => '&larr;',
							'next_text' => '&rarr;',
							'add_args' => false,
						]
					)
				);
			}
		}
	}
}
