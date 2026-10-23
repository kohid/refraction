<?php
namespace Refraction\Modules\NestedCarousel\Widgets;

use Refraction\Controls_Manager;
use Refraction\Core\Utils\Icons;
use Refraction\Modules\NestedCarousel\Classes\Carousel_Logic;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Nested Carousel: every slide is a container (any widgets), on the shared Swiper.
 */
class Nested_Carousel extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-nested-carousel';
	}

	public function get_title() {
		return esc_html__( 'Nested Carousel', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-slides';
	}

	public function get_keywords() {
		return [ 'carousel', 'slider', 'slides', 'swiper', 'nested', 'container' ];
	}

	public function get_style_depends(): array {
		return [ 'e-swiper', 'widget-nested-carousel' ];
	}

	public function get_script_depends(): array {
		return [ 'swiper' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-nested-carousel';
	}

	private function slide_container( int $index ): array {
		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Slide index. */
				'_title' => sprintf( __( 'Slide #%d', 'refraction' ), $index ),
				'content_width' => 'full',
			],
		];
	}

	protected function get_default_children_elements() {
		return [ $this->slide_container( 1 ), $this->slide_container( 2 ), $this->slide_container( 3 ) ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'slide_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Slide index. */
		return esc_html__( 'Slide #%d', 'refraction' );
	}

	protected function get_default_children_placeholder_selector() {
		return '.swiper-wrapper';
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_slides', [
			'label' => esc_html__( 'Slides', 'refraction' ),
		] );

		$repeater = new Repeater();

		$repeater->add_control( 'slide_title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Slide', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'Used in the navigator and as the slide name for screen readers.', 'refraction' ),
		] );

		$this->add_control( 'slides', [
			'label' => esc_html__( 'Slides', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'slide_title' => esc_html__( 'Slide #1', 'refraction' ) ],
				[ 'slide_title' => esc_html__( 'Slide #2', 'refraction' ) ],
				[ 'slide_title' => esc_html__( 'Slide #3', 'refraction' ) ],
			],
			'title_field' => '{{{ slide_title }}}',
			'button_text' => esc_html__( 'Add Slide', 'refraction' ),
		] );

		$this->add_control( 'carousel_label', [
			'label' => esc_html__( 'Accessible name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Carousel', 'refraction' ),
			'label_block' => true,
			'separator' => 'before',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_options', [
			'label' => esc_html__( 'Carousel', 'refraction' ),
		] );

		$this->add_responsive_control( 'slides_to_show', [
			'label' => esc_html__( 'Slides to show', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '1',
			'tablet_default' => '1',
			'mobile_default' => '1',
			'options' => [ '1' => '1', '2' => '2', '3' => '3', '4' => '4', '5' => '5', '6' => '6' ],
			'frontend_available' => true,
			'condition' => [ 'effect' => 'slide' ],
		] );

		$this->add_responsive_control( 'spacing', [
			'label' => esc_html__( 'Space between', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 120 ] ],
			'default' => [ 'size' => 20, 'unit' => 'px' ],
			'frontend_available' => true,
			'condition' => [ 'effect' => 'slide' ],
		] );

		$this->add_control( 'effect', [
			'label' => esc_html__( 'Effect', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'slide',
			'options' => [
				'slide' => esc_html__( 'Slide', 'refraction' ),
				'fade' => esc_html__( 'Fade', 'refraction' ),
			],
			'frontend_available' => true,
		] );

		$this->add_control( 'direction', [
			'label' => esc_html__( 'Direction', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'horizontal',
			'options' => [
				'horizontal' => esc_html__( 'Horizontal', 'refraction' ),
				'vertical' => esc_html__( 'Vertical', 'refraction' ),
			],
			'condition' => [ 'effect' => 'slide' ],
			'frontend_available' => true,
		] );

		$this->add_responsive_control( 'vertical_height', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh' ],
			'range' => [ 'px' => [ 'min' => 100, 'max' => 1000 ], 'vh' => [ 'min' => 10, 'max' => 100 ] ],
			'default' => [ 'size' => 420, 'unit' => 'px' ],
			'condition' => [ 'effect' => 'slide', 'direction' => 'vertical' ],
			'selectors' => [ '{{WRAPPER}} .refraction-nc__viewport' => 'height: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'speed', [
			'label' => esc_html__( 'Transition speed (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 500,
			'min' => 100,
			'max' => 5000,
			'step' => 100,
			'frontend_available' => true,
		] );

		$this->add_control( 'loop', [
			'label' => esc_html__( 'Loop', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => '',
			'return_value' => 'yes',
			'description' => esc_html__( 'Goes back to the first slide after the last. Slides are never cloned, so widgets inside keep working.', 'refraction' ),
			'frontend_available' => true,
		] );

		$this->add_control( 'autoplay', [
			'label' => esc_html__( 'Autoplay', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => '',
			'return_value' => 'yes',
			'separator' => 'before',
			'frontend_available' => true,
			'description' => esc_html__( 'Not applied for visitors who prefer reduced motion. A pause button is shown.', 'refraction' ),
		] );

		$this->add_control( 'autoplay_speed', [
			'label' => esc_html__( 'Time per slide (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 5000,
			'min' => 500,
			'max' => 30000,
			'step' => 500,
			'condition' => [ 'autoplay' => 'yes' ],
			'frontend_available' => true,
		] );

		$this->add_control( 'pause_on_hover', [
			'label' => esc_html__( 'Pause on hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
			'condition' => [ 'autoplay' => 'yes' ],
			'frontend_available' => true,
		] );

		$this->add_control( 'arrows', [
			'label' => esc_html__( 'Arrows', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
			'separator' => 'before',
			'frontend_available' => true,
		] );

		$this->add_control( 'pagination', [
			'label' => esc_html__( 'Pagination', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'bullets',
			'options' => [
				'none' => esc_html__( 'None', 'refraction' ),
				'bullets' => esc_html__( 'Bullets', 'refraction' ),
				'fraction' => esc_html__( 'Fraction', 'refraction' ),
				'progress' => esc_html__( 'Progress bar', 'refraction' ),
			],
			'frontend_available' => true,
		] );

		$this->add_control( 'lazy_slides', [
			'label' => esc_html__( 'Skip rendering of off-screen slides', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
			'description' => esc_html__( 'The browser does not lay out or paint slides that are not in view until they are needed.', 'refraction' ),
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_arrows', [
			'label' => esc_html__( 'Arrows', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => [ 'arrows' => 'yes' ],
		] );

		$arrow = '{{WRAPPER}} .refraction-nc__arrow';

		$this->add_responsive_control( 'arrow_size', [
			'label' => esc_html__( 'Size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 24, 'max' => 90 ] ],
			'default' => [ 'size' => 44, 'unit' => 'px' ],
			'selectors' => [ $arrow => 'width: {{SIZE}}px; height: {{SIZE}}px;' ],
		] );

		$this->add_control( 'arrow_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ $arrow => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'arrow_bg', [
			'label' => esc_html__( 'Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ $arrow => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'arrow_placement', [
			'label' => esc_html__( 'Placement', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'inside',
			'options' => [
				'inside' => esc_html__( 'Over the slides', 'refraction' ),
				'outside' => esc_html__( 'Beside the slides', 'refraction' ),
			],
			'prefix_class' => 'refraction-nc-arrows-',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_pagination', [
			'label' => esc_html__( 'Pagination', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => [ 'pagination!' => 'none' ],
		] );

		$this->add_control( 'dots_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--refraction-nc-dot: {{VALUE}};' ],
		] );

		$this->add_control( 'dots_active_color', [
			'label' => esc_html__( 'Active color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--refraction-nc-dot-active: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'dots_size', [
			'label' => esc_html__( 'Bullet size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 4, 'max' => 24 ] ],
			'default' => [ 'size' => 10, 'unit' => 'px' ],
			'condition' => [ 'pagination' => 'bullets' ],
			'selectors' => [ '{{WRAPPER}}' => '--refraction-nc-dot-size: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$o = Carousel_Logic::sanitize( [
			'effect' => $settings['effect'] ?? '',
			'pagination' => $settings['pagination'] ?? '',
			'slides_to_show' => $settings['slides_to_show'] ?? 1,
			'speed' => $settings['speed'] ?? 500,
			'direction' => $settings['direction'] ?? '',
		] );
		$count = count( $this->get_children() );
		$label = '' !== (string) ( $settings['carousel_label'] ?? '' ) ? $settings['carousel_label'] : __( 'Carousel', 'refraction' );
		$autoplay = 'yes' === ( $settings['autoplay'] ?? '' );

		$this->add_render_attribute( 'root', [
			'class' => array_filter( [ 'refraction-nc', 'yes' === ( $settings['lazy_slides'] ?? '' ) ? 'is-lazy' : '', 'vertical' === $o['direction'] && 'slide' === $o['effect'] ? 'is-vertical' : '' ] ),
			'role' => 'region',
			'aria-roledescription' => 'carousel',
			'aria-label' => $label,
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'root' ); ?>>
			<div class="refraction-nc__viewport swiper">
				<div class="refraction-nc__track swiper-wrapper" aria-live="<?php echo $autoplay ? 'off' : 'polite'; ?>">
					<?php foreach ( $this->get_children() as $index => $child ) {
						$this->print_slide( $index, $count, $settings );
					} ?>
				</div>
			</div>
			<?php if ( 'yes' === ( $settings['arrows'] ?? '' ) && $count > 1 ) : ?>
				<button type="button" class="refraction-nc__arrow refraction-nc__prev" aria-label="<?php echo esc_attr__( 'Previous slide', 'refraction' ); ?>"><?php echo Icons::svg( 'arrow-back', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
				<button type="button" class="refraction-nc__arrow refraction-nc__next" aria-label="<?php echo esc_attr__( 'Next slide', 'refraction' ); ?>"><?php echo Icons::svg( 'arrow-forward', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
			<?php endif; ?>
			<?php if ( 'none' !== $o['pagination'] && $count > 1 ) : ?>
				<div class="refraction-nc__pagination swiper-pagination"></div>
			<?php endif; ?>
			<?php if ( $autoplay && $count > 1 ) : ?>
				<button type="button" class="refraction-nc__autoplay" aria-pressed="false" aria-label="<?php echo esc_attr__( 'Pause autoplay', 'refraction' ); ?>" data-label-pause="<?php echo esc_attr__( 'Pause autoplay', 'refraction' ); ?>" data-label-play="<?php echo esc_attr__( 'Start autoplay', 'refraction' ); ?>">
					<span class="refraction-nc__autoplay-pause"><?php echo Icons::svg( 'pause', [ 'size' => 20 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
					<span class="refraction-nc__autoplay-play"><?php echo Icons::svg( 'play-arrow', [ 'size' => 20 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
				</button>
			<?php endif; ?>
		</div>
		<?php
	}

	private function print_slide( int $index, int $count, array $settings ) {
		$children = $this->get_children();
		$title = $settings['slides'][ $index ]['slide_title'] ?? '';

		$target_id = $children[ $index ]->get_id();

		// Only the slide's own container is decorated, not containers nested inside its content.
		$decorate = function ( $should_render, $container ) use ( $index, $count, $title, $target_id ) {
			if ( $container->get_id() !== $target_id ) {
				return $should_render;
			}

			$container->add_render_attribute( '_wrapper', [
				'class' => [ 'swiper-slide', 'refraction-nc__slide' ],
				'role' => 'group',
				'aria-roledescription' => 'slide',
				'aria-label' => sprintf( '%d / %d%s', $index + 1, $count, '' !== (string) $title ? ' - ' . wp_strip_all_tags( $title ) : '' ),
			] );

			return $should_render;
		};

		add_filter( 'refraction/frontend/container/should_render', $decorate, 10, 2 );
		$children[ $index ]->print_element();
		remove_filter( 'refraction/frontend/container/should_render', $decorate, 10 );
	}

	protected function content_template() {
		?>
		<div class="refraction-nc {{ 'yes' === settings.lazy_slides ? 'is-lazy' : '' }} {{ 'vertical' === settings.direction && 'slide' === settings.effect ? 'is-vertical' : '' }}" role="region" aria-roledescription="carousel" aria-label="{{ settings.carousel_label }}">
			<div class="refraction-nc__viewport swiper">
				<div class="refraction-nc__track swiper-wrapper"></div>
			</div>
			<# if ( 'yes' === settings.arrows ) { #>
				<button type="button" class="refraction-nc__arrow refraction-nc__prev" aria-label="Previous slide"><?php echo Icons::svg( 'arrow-back', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
				<button type="button" class="refraction-nc__arrow refraction-nc__next" aria-label="Next slide"><?php echo Icons::svg( 'arrow-forward', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
			<# } #>
			<# if ( 'none' !== settings.pagination ) { #><div class="refraction-nc__pagination swiper-pagination"></div><# } #>
		</div>
		<?php
	}
}
