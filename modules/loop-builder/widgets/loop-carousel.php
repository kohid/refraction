<?php
namespace Refraction\Modules\LoopBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Icons_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Loop Carousel: a Swiper carousel that prints a Loop Item template in every slide.
 */
class Loop_Carousel extends Template_Loop_Widget {

	public function get_name() {
		return 'loop-carousel';
	}

	public function get_title() {
		return esc_html__( 'Loop Carousel', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-posts-carousel';
	}

	public function get_keywords() {
		return [ 'loop', 'carousel', 'slider', 'posts', 'query', 'template' ];
	}

	public function get_style_depends(): array {
		return [ 'e-swiper', 'refraction-loop-frontend' ];
	}

	public function get_script_depends(): array {
		return [ 'swiper', 'refraction-loop-frontend' ];
	}

	protected function get_layout_class(): string {
		return 'refraction-loop--carousel';
	}

	protected function register_controls() {
		$this->register_template_controls();

		$this->register_query_controls();

		$this->start_controls_section(
			'section_carousel',
			[
				'label' => esc_html__( 'Carousel', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$slides = [ '1' => '1', '2' => '2', '3' => '3', '4' => '4', '5' => '5', '6' => '6' ];

		$this->add_responsive_control(
			'slides_to_show',
			[
				'label' => esc_html__( 'Slides to show', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '3',
				'tablet_default' => '2',
				'mobile_default' => '1',
				'options' => $slides,
				'frontend_available' => true,
				'render_type' => 'template',
			]
		);

		$this->add_responsive_control(
			'slides_to_scroll',
			[
				'label' => esc_html__( 'Slides to scroll', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '1',
				'options' => $slides,
				'frontend_available' => true,
			]
		);

		$this->add_responsive_control(
			'image_spacing_custom',
			[
				'label' => esc_html__( 'Space between slides', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
				'default' => [ 'size' => 24 ],
				'frontend_available' => true,
				'render_type' => 'none',
			]
		);

		$this->add_control(
			'navigation',
			[
				'label' => esc_html__( 'Navigation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'both',
				'options' => [
					'both' => esc_html__( 'Arrows and dots', 'refraction' ),
					'arrows' => esc_html__( 'Arrows', 'refraction' ),
					'dots' => esc_html__( 'Dots', 'refraction' ),
					'none' => esc_html__( 'None', 'refraction' ),
				],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'autoplay',
			[
				'label' => esc_html__( 'Autoplay', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'pause_on_interaction',
			[
				'label' => esc_html__( 'Pause on interaction', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default' => 'yes',
				'condition' => [ 'autoplay' => 'yes' ],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'autoplay_speed',
			[
				'label' => esc_html__( 'Autoplay speed (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 5000,
				'condition' => [ 'autoplay' => 'yes' ],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'infinite',
			[
				'label' => esc_html__( 'Infinite loop', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default' => 'yes',
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'speed',
			[
				'label' => esc_html__( 'Animation speed (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 500,
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'carousel_name',
			[
				'label' => esc_html__( 'Accessible name', 'refraction' ),
				'default' => esc_html__( 'Loop carousel', 'refraction' ),
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_navigation',
			[
				'label' => esc_html__( 'Navigation', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [ 'navigation!' => 'none' ],
			]
		);

		$this->add_control(
			'arrows_color',
			[
				'label' => esc_html__( 'Arrow color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-swiper-button' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'dots_color',
			[
				'label' => esc_html__( 'Dots color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .swiper-pagination-bullet' => 'background: {{VALUE}};',
				],
			]
		);

		$this->end_controls_section();
	}

	protected function render_item( \WP_Post $post, array $settings, int $index, array $opts ): string {
		$html = parent::render_item( $post, $settings, $index, $opts );

		return '' === $html ? '' : '<div class="swiper-slide">' . $html . '</div>';
	}

	protected function get_items_class(): string {
		return 'refraction-loop-items swiper-wrapper';
	}

	protected function render() {
		if ( $this->render_missing_template() ) {
			return;
		}

		$settings = $this->get_settings_for_display();
		$result = $this->render_page( 1, null, [] );
		$count = $result['count'];
		$navigation = (string) ( $settings['navigation'] ?? 'both' );

		if ( 0 === $count ) {
			echo '<p class="refraction-loop-empty">' . esc_html( (string) ( $settings['nothing_found_message'] ?? '' ) ) . '</p>';
			return;
		}

		?>
		<div class="refraction-loop refraction-loop--carousel" data-pagination="none" data-widget-type="loop-carousel">
			<div class="refraction-loop-carousel-wrapper swiper" role="region" aria-roledescription="carousel" aria-label="<?php echo esc_attr( (string) ( $settings['carousel_name'] ?? '' ) ); ?>">
				<div class="<?php echo esc_attr( $this->get_items_class() ); ?>">
					<?php echo $result['items']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts and builder output. ?>
				</div>
				<?php if ( $count > 1 && in_array( $navigation, [ 'arrows', 'both' ], true ) ) : ?>
					<div class="refraction-swiper-button refraction-swiper-button-prev" role="button" tabindex="0" aria-label="<?php echo esc_attr__( 'Previous', 'refraction' ); ?>">
						<?php Icons_Manager::render_icon( [ 'library' => 'rficons', 'value' => 'rficon-chevron-left' ], [ 'aria-hidden' => 'true' ] ); ?>
					</div>
					<div class="refraction-swiper-button refraction-swiper-button-next" role="button" tabindex="0" aria-label="<?php echo esc_attr__( 'Next', 'refraction' ); ?>">
						<?php Icons_Manager::render_icon( [ 'library' => 'rficons', 'value' => 'rficon-chevron-right' ], [ 'aria-hidden' => 'true' ] ); ?>
					</div>
				<?php endif; ?>
				<?php if ( $count > 1 && in_array( $navigation, [ 'dots', 'both' ], true ) ) : ?>
					<div class="swiper-pagination"></div>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}
}
