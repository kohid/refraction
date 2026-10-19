<?php
namespace Refraction\Modules\LoopBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Portfolio: image tiles in a grid or a masonry layout, with a filter bar built from a taxonomy. Filtering
 * hides and shows the tiles that are on the page (no request).
 */
class Portfolio extends Base_Loop_Widget {

	/** @var array<int,string> Terms of the printed items, term ID => name. */
	private array $seen_terms = [];

	public function get_name() {
		return 'portfolio';
	}

	public function get_title() {
		return esc_html__( 'Portfolio', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-posts-masonry';
	}

	public function get_keywords() {
		return [ 'portfolio', 'grid', 'masonry', 'gallery', 'filter', 'projects' ];
	}

	protected function get_layout_class(): string {
		return 'refraction-loop--portfolio refraction-portfolio--' . $this->get_settings_for_display( 'layout' );
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'grid',
				'options' => [
					'grid' => esc_html__( 'Grid', 'refraction' ),
					'masonry' => esc_html__( 'Masonry', 'refraction' ),
				],
				'render_type' => 'template',
			]
		);

		$this->register_columns_controls( 3 );

		$this->add_control(
			'image_size',
			[
				'label' => esc_html__( 'Image size', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'medium_large',
				'options' => $this->get_image_size_options(),
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'image_ratio',
			[
				'label' => esc_html__( 'Image ratio', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '4 / 3',
				'options' => [
					'4 / 3' => '4:3',
					'16 / 9' => '16:9',
					'1 / 1' => '1:1',
					'3 / 4' => '3:4',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-portfolio--grid .refraction-portfolio-item img' => 'aspect-ratio: {{VALUE}}; object-fit: cover; width: 100%;',
				],
				'condition' => [ 'layout' => 'grid' ],
			]
		);

		$this->add_control(
			'show_title',
			[
				'label' => esc_html__( 'Title on hover', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->add_control(
			'show_filter',
			[
				'label' => esc_html__( 'Filter bar', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'separator' => 'before',
			]
		);

		$taxonomies = [];

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			$taxonomies[ $taxonomy->name ] = $taxonomy->label;
		}

		$this->add_control(
			'filter_taxonomy',
			[
				'label' => esc_html__( 'Filter by', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'category',
				'options' => $taxonomies,
				'condition' => [ 'show_filter' => 'yes' ],
			]
		);

		$this->add_control(
			'filter_all_label',
			[
				'label' => esc_html__( '"All" label', 'refraction' ),
				'default' => esc_html__( 'All', 'refraction' ),
				'condition' => [ 'show_filter' => 'yes' ],
			]
		);

		$this->end_controls_section();

		$this->register_query_controls();
		$this->register_pagination_controls();

		$this->start_controls_section(
			'section_style_tiles',
			[
				'label' => esc_html__( 'Tiles', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'overlay_color',
			[
				'label' => esc_html__( 'Overlay color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-portfolio-item__overlay' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'title_color',
			[
				'label' => esc_html__( 'Title color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-portfolio-item__title' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'title_typography',
				'selector' => '{{WRAPPER}} .refraction-portfolio-item__title',
			]
		);

		$this->add_responsive_control(
			'tile_radius',
			[
				'label' => esc_html__( 'Border radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-portfolio-item' => 'border-radius: {{SIZE}}{{UNIT}}; overflow: hidden;' ],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_filter',
			[
				'label' => esc_html__( 'Filter bar', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [ 'show_filter' => 'yes' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'filter_typography',
				'selector' => '{{WRAPPER}} .refraction-portfolio-filter__item',
			]
		);

		$this->add_control(
			'filter_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-portfolio-filter__item' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'filter_active_color',
			[
				'label' => esc_html__( 'Active color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-portfolio-filter__item.is-active' => 'color: {{VALUE}}; border-color: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'filter_align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'flex-start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'flex-end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				],
				'default' => 'center',
				'selectors' => [ '{{WRAPPER}} .refraction-portfolio-filter' => 'justify-content: {{VALUE}};' ],
			]
		);

		$this->end_controls_section();

		$this->register_pagination_style_controls();
	}

	protected function render_item( \WP_Post $post, array $settings, int $index, array $opts ): string {
		$image = $this->get_thumbnail_html( $post, (string) ( $settings['image_size'] ?? 'medium_large' ) );

		if ( '' === $image ) {
			return '';
		}

		$taxonomy = sanitize_key( (string) ( $settings['filter_taxonomy'] ?? 'category' ) );
		$term_ids = [];
		$terms = taxonomy_exists( $taxonomy ) ? get_the_terms( $post, $taxonomy ) : [];

		foreach ( is_array( $terms ) ? $terms : [] as $term ) {
			$term_ids[] = $term->term_id;
			$this->seen_terms[ $term->term_id ] = $term->name;
		}

		$title = 'yes' === ( $settings['show_title'] ?? '' ) ? '<span class="refraction-portfolio-item__overlay"><span class="refraction-portfolio-item__title">' . wp_kses_post( get_the_title( $post ) ) . '</span></span>' : '';

		return '<article class="refraction-portfolio-item" data-terms="' . esc_attr( implode( ' ', $term_ids ) ) . '"><a class="refraction-portfolio-item__link" href="' . esc_url( get_permalink( $post ) ) . '" aria-label="' . esc_attr( wp_strip_all_tags( get_the_title( $post ) ) ) . '">' . $image . $title . '</a></article>';
	}

	protected function get_before_items_html( array $result ): string {
		$settings = $this->get_settings_for_display();

		if ( 'yes' !== ( $settings['show_filter'] ?? '' ) || ! $this->seen_terms ) {
			return '';
		}

		asort( $this->seen_terms, SORT_NATURAL | SORT_FLAG_CASE );

		$html = '<div class="refraction-portfolio-filter" role="group" aria-label="' . esc_attr__( 'Filter', 'refraction' ) . '">';
		$html .= '<button type="button" class="refraction-portfolio-filter__item is-active" data-filter-term="" aria-pressed="true">' . esc_html( (string) ( $settings['filter_all_label'] ?? '' ) ) . '</button>';

		foreach ( $this->seen_terms as $id => $name ) {
			$html .= '<button type="button" class="refraction-portfolio-filter__item" data-filter-term="' . esc_attr( (string) $id ) . '" aria-pressed="false">' . esc_html( $name ) . '</button>';
		}

		return $html . '</div>';
	}
}
