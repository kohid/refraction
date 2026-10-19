<?php
namespace Refraction\Modules\ProWidgets\Base;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Shared Swiper plumbing for Media Carousel, Testimonial Carousel and Reviews: the same option controls,
 * navigation style controls and wrapper/arrows/dots markup. The behaviour lives in the lazy `pro-carousel` handler.
 * Use inside a class that extends Pro_Widget.
 */
trait Carousel_Kit {

	/**
	 * Slides per view, spacing, navigation, autoplay, loop.
	 *
	 * @param array $args `default_per_view` (int), `effects` (array value => label), `condition` (array).
	 */
	protected function carousel_options_section( array $args = [] ): void {
		$args += [
			'default_per_view' => 1,
			'effects' => [],
			'condition' => [],
			'tablet_per_view' => 1,
		];

		$this->content_section( 'section_carousel_options', esc_html__( 'Carousel Options', 'refraction' ), $args['condition'] );

		$options = [];
		for ( $i = 1; $i <= 6; $i++ ) {
			$options[ (string) $i ] = (string) $i;
		}

		$this->add_responsive_control(
			'slides_to_show',
			[
				'label' => esc_html__( 'Slides to Show', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $options,
				'default' => (string) $args['default_per_view'],
				'tablet_default' => (string) min( $args['default_per_view'], 2 ),
				'mobile_default' => '1',
				'frontend_available' => true,
			]
		);

		$this->add_responsive_control(
			'space_between',
			[
				'label' => esc_html__( 'Space Between', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
				'default' => [ 'size' => 16, 'unit' => 'px' ],
				'frontend_available' => true,
			]
		);

		if ( $args['effects'] ) {
			$this->add_control(
				'effect',
				[
					'label' => esc_html__( 'Effect', 'refraction' ),
					'type' => Controls_Manager::SELECT,
					'options' => $args['effects'],
					'default' => (string) array_key_first( $args['effects'] ),
					'frontend_available' => true,
				]
			);
		}

		$this->add_control(
			'navigation',
			[
				'label' => esc_html__( 'Navigation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'both',
				'options' => [
					'both' => esc_html__( 'Arrows and Dots', 'refraction' ),
					'arrows' => esc_html__( 'Arrows', 'refraction' ),
					'dots' => esc_html__( 'Dots', 'refraction' ),
					'none' => esc_html__( 'None', 'refraction' ),
				],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'speed',
			[
				'label' => esc_html__( 'Transition Duration (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 500,
				'min' => 100,
				'max' => 5000,
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'autoplay',
			[
				'label' => esc_html__( 'Autoplay', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
				'return_value' => 'yes',
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'autoplay_speed',
			[
				'label' => esc_html__( 'Autoplay Speed (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 5000,
				'min' => 1000,
				'condition' => [ 'autoplay' => 'yes' ],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'pause_on_hover',
			[
				'label' => esc_html__( 'Pause on Hover', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'condition' => [ 'autoplay' => 'yes' ],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'infinite',
			[
				'label' => esc_html__( 'Infinite Loop', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'carousel_label',
			[
				'label' => esc_html__( 'Carousel Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '',
				'description' => esc_html__( 'Read by screen readers.', 'refraction' ),
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->end_section();
	}

	/**
	 * Arrow and dot styling.
	 */
	protected function carousel_nav_style_section( array $condition = [] ): void {
		$this->style_section( 'section_carousel_nav_style', esc_html__( 'Navigation', 'refraction' ), $condition );

		$arrow = '{{WRAPPER}} .refraction-swiper-button';

		$this->add_control(
			'arrows_heading',
			[
				'label' => esc_html__( 'Arrows', 'refraction' ),
				'type' => Controls_Manager::HEADING,
			]
		);

		$this->add_responsive_control(
			'arrows_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 20, 'max' => 80 ] ],
				'selectors' => [
					$arrow => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}}; margin-top: calc({{SIZE}}{{UNIT}} / -2); font-size: calc({{SIZE}}{{UNIT}} / 2);',
				],
			]
		);

		$this->add_control(
			'arrows_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $arrow => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'arrows_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $arrow => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'arrows_bg_hover',
			[
				'label' => esc_html__( 'Hover Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $arrow . ':hover, ' . $arrow . ':focus-visible' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'dots_heading',
			[
				'label' => esc_html__( 'Dots', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'dots_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .swiper-pagination-bullet' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'dots_active_color',
			[
				'label' => esc_html__( 'Active Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .swiper-pagination-bullet-active' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'dots_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 4, 'max' => 30 ] ],
				'selectors' => [ '{{WRAPPER}} .swiper-pagination-bullet' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->end_section();
	}

	protected function carousel_arrow_svg( string $direction ): string {
		$d = 'next' === $direction ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7';

		return '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' . esc_attr( $d ) . '"/></svg>';
	}

	/**
	 * Attribute set of the Swiper container; print with print_render_attribute_string( 'carousel' ).
	 */
	protected function add_carousel_attributes( array $settings, string $default_label, string $extra_class = '' ): void {
		$label = isset( $settings['carousel_label'] ) && '' !== trim( (string) $settings['carousel_label'] ) ? $settings['carousel_label'] : $default_label;

		$this->add_render_attribute( 'carousel', [
			'class' => array_filter( [ 'refraction-pc', 'swiper', $extra_class ] ),
			'role' => 'region',
			'aria-roledescription' => 'carousel',
			'aria-label' => $label,
		] );
	}

	/**
	 * Attributes of one slide ("n of N").
	 */
	protected function add_slide_attributes( string $key, int $index, int $total, array $classes = [] ): void {
		$this->add_render_attribute( $key, [
			'class' => array_merge( [ 'refraction-pc__slide', 'swiper-slide' ], $classes ),
			'role' => 'group',
			'aria-roledescription' => 'slide',
			/* translators: 1: slide number, 2: total slides */
			'aria-label' => sprintf( __( '%1$d of %2$d', 'refraction' ), $index + 1, $total ),
		], null, true );
	}

	/**
	 * Arrows and dots; prints nothing for a single slide.
	 */
	protected function render_carousel_nav( array $settings, int $total ): void {
		if ( $total < 2 ) {
			return;
		}

		$navigation = $settings['navigation'] ?? 'both';

		if ( in_array( $navigation, [ 'arrows', 'both' ], true ) ) {
			?>
			<button type="button" class="refraction-swiper-button refraction-swiper-button-prev" aria-label="<?php esc_attr_e( 'Previous slide', 'refraction' ); ?>"><?php echo $this->carousel_arrow_svg( 'prev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG with an escaped path. ?></button>
			<button type="button" class="refraction-swiper-button refraction-swiper-button-next" aria-label="<?php esc_attr_e( 'Next slide', 'refraction' ); ?>"><?php echo $this->carousel_arrow_svg( 'next' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG with an escaped path. ?></button>
			<?php
		}

		if ( in_array( $navigation, [ 'dots', 'both' ], true ) ) {
			echo '<div class="swiper-pagination"></div>';
		}
	}
}
