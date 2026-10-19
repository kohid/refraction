<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Slides extends Pro_Widget {

	public function get_name() {
		return 'refraction-slides';
	}

	public function get_title() {
		return esc_html__( 'Slides', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-slides';
	}

	public function get_keywords() {
		return [ 'slides', 'slider', 'carousel', 'hero', 'banner' ];
	}

	public function get_style_depends(): array {
		return [ 'e-swiper', 'widget-slides' ];
	}

	public function get_script_depends(): array {
		return [ 'swiper' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_slides', esc_html__( 'Slides', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'heading',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Slide Heading', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'description',
			[
				'label' => esc_html__( 'Description', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'Short text that supports the heading.', 'refraction' ),
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'button_text',
			[
				'label' => esc_html__( 'Button Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Click Here', 'refraction' ),
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'button_link',
			[
				'label' => esc_html__( 'Button Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [ 'active' => true ],
				'placeholder' => esc_html__( 'https://your-link.com', 'refraction' ),
			]
		);

		$repeater->add_control(
			'background_color',
			[
				'label' => esc_html__( 'Background Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#1f2937',
				'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}} .refraction-slide__bg' => 'background-color: {{VALUE}};' ],
			]
		);

		$repeater->add_control(
			'background_image',
			[
				'label' => esc_html__( 'Background Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'image_alt',
			[
				'label' => esc_html__( 'Image Description', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'description' => esc_html__( 'Leave empty when the image is only decoration.', 'refraction' ),
				'condition' => [ 'background_image[url]!' => '' ],
			]
		);

		$repeater->add_control(
			'custom_overlay',
			[
				'label' => esc_html__( 'Overlay Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}} .refraction-slide__overlay' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'slides',
			[
				'label' => esc_html__( 'Slides', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'title_field' => '{{{ heading }}}',
				'default' => [
					[
						'heading' => esc_html__( 'Slide 1 Heading', 'refraction' ),
						'description' => esc_html__( 'Click the edit button to change this text.', 'refraction' ),
						'button_text' => esc_html__( 'Click Here', 'refraction' ),
						'background_color' => '#1f2937',
					],
					[
						'heading' => esc_html__( 'Slide 2 Heading', 'refraction' ),
						'description' => esc_html__( 'Click the edit button to change this text.', 'refraction' ),
						'button_text' => esc_html__( 'Click Here', 'refraction' ),
						'background_color' => '#0f766e',
					],
					[
						'heading' => esc_html__( 'Slide 3 Heading', 'refraction' ),
						'description' => esc_html__( 'Click the edit button to change this text.', 'refraction' ),
						'button_text' => esc_html__( 'Click Here', 'refraction' ),
						'background_color' => '#9a3412',
					],
				],
			]
		);

		$this->add_control(
			'title_tag',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->heading_tag_options(),
				'default' => 'h2',
			]
		);

		$this->add_control(
			'slider_label',
			[
				'label' => esc_html__( 'Slider Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Slides', 'refraction' ),
				'description' => esc_html__( 'Read by screen readers.', 'refraction' ),
			]
		);

		$this->end_section();

		$this->content_section( 'section_options', esc_html__( 'Slider Options', 'refraction' ) );

		$this->add_responsive_control(
			'slides_height',
			[
				'label' => esc_html__( 'Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'vh', 'em' ],
				'range' => [
					'px' => [ 'min' => 100, 'max' => 1000 ],
					'vh' => [ 'min' => 10, 'max' => 100 ],
				],
				'default' => [ 'size' => 400, 'unit' => 'px' ],
				'tablet_default' => [ 'size' => 360, 'unit' => 'px' ],
				'mobile_default' => [ 'size' => 320, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-slide' => 'height: {{SIZE}}{{UNIT}};' ],
			]
		);

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
			'transition',
			[
				'label' => esc_html__( 'Transition', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'slide',
				'options' => [
					'slide' => esc_html__( 'Slide', 'refraction' ),
					'fade' => esc_html__( 'Fade', 'refraction' ),
				],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'transition_speed',
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
				'default' => 'yes',
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
			'content_heading',
			[
				'label' => esc_html__( 'Content Position', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'content_h',
			[
				'label' => esc_html__( 'Horizontal', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'default' => 'center',
				'options' => [
					'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
					'flex-end' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				],
				'selectors' => [ '{{WRAPPER}} .refraction-slide__inner' => 'justify-content: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'content_v',
			[
				'label' => esc_html__( 'Vertical', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'default' => 'center',
				'options' => [
					'flex-start' => [ 'title' => esc_html__( 'Top', 'refraction' ), 'icon' => 'rficon-v-align-top' ],
					'center' => [ 'title' => esc_html__( 'Middle', 'refraction' ), 'icon' => 'rficon-v-align-middle' ],
					'flex-end' => [ 'title' => esc_html__( 'Bottom', 'refraction' ), 'icon' => 'rficon-v-align-bottom' ],
				],
				'selectors' => [ '{{WRAPPER}} .refraction-slide__inner' => 'align-items: {{VALUE}};' ],
			]
		);

		$this->align_control( 'content_text_align', '{{WRAPPER}} .refraction-slide__content', [], esc_html__( 'Text Alignment', 'refraction' ) );

		$this->end_section();

		/* ---------------------------------------------------------------- style */
		$this->style_section( 'style_slide', esc_html__( 'Slide', 'refraction' ) );

		$this->add_responsive_control(
			'content_width',
			[
				'label' => esc_html__( 'Content Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'range' => [ 'px' => [ 'min' => 100, 'max' => 1400 ], '%' => [ 'min' => 10, 'max' => 100 ] ],
				'default' => [ 'size' => 640, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-slide__content' => 'max-width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'slide_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'default' => [ 'top' => '40', 'right' => '64', 'bottom' => '40', 'left' => '64', 'unit' => 'px', 'isLinked' => false ],
				'selectors' => [ '{{WRAPPER}} .refraction-slide__inner' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'overlay_color',
			[
				'label' => esc_html__( 'Overlay Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => 'rgba(0,0,0,0.35)',
				'selectors' => [ '{{WRAPPER}} .refraction-slide__overlay' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'image_position',
			[
				'label' => esc_html__( 'Image Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'center center',
				'options' => [
					'center center' => esc_html__( 'Center', 'refraction' ),
					'top center' => esc_html__( 'Top', 'refraction' ),
					'bottom center' => esc_html__( 'Bottom', 'refraction' ),
					'center left' => esc_html__( 'Left', 'refraction' ),
					'center right' => esc_html__( 'Right', 'refraction' ),
				],
				'selectors' => [ '{{WRAPPER}} .refraction-slide__bg' => 'background-position: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'image_size',
			[
				'label' => esc_html__( 'Image Size', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'cover',
				'options' => [
					'cover' => esc_html__( 'Cover', 'refraction' ),
					'contain' => esc_html__( 'Contain', 'refraction' ),
					'auto' => esc_html__( 'Auto', 'refraction' ),
				],
				'selectors' => [ '{{WRAPPER}} .refraction-slide__bg' => 'background-size: {{VALUE}};' ],
			]
		);

		$this->end_section();

		$this->style_section( 'style_title', esc_html__( 'Title', 'refraction' ) );
		$this->text_style( 'title', '{{WRAPPER}} .refraction-slide__title' );
		$this->space_control( 'title_space', esc_html__( 'Spacing', 'refraction' ), '{{WRAPPER}} .refraction-slide__title' );
		$this->end_section();

		$this->style_section( 'style_description', esc_html__( 'Description', 'refraction' ) );
		$this->text_style( 'description', '{{WRAPPER}} .refraction-slide__description' );
		$this->space_control( 'description_space', esc_html__( 'Spacing', 'refraction' ), '{{WRAPPER}} .refraction-slide__description' );
		$this->end_section();

		$this->style_section( 'style_button', esc_html__( 'Button', 'refraction' ) );
		$this->button_style_controls( 'button', '{{WRAPPER}} .refraction-slide__content .refraction-pro-button' );
		$this->end_section();

		$this->style_section( 'style_arrows', esc_html__( 'Arrows', 'refraction' ), [ 'navigation' => [ 'both', 'arrows' ] ] );

		$this->add_responsive_control(
			'arrows_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 16, 'max' => 80 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-swiper-button' => 'width: {{SIZE}}px; height: {{SIZE}}px;' ],
			]
		);

		$this->add_control(
			'arrows_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-swiper-button' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'arrows_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-swiper-button' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->end_section();

		$this->style_section( 'style_dots', esc_html__( 'Dots', 'refraction' ), [ 'navigation' => [ 'both', 'dots' ] ] );

		$this->add_control(
			'dots_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 4, 'max' => 30 ] ],
				'selectors' => [ '{{WRAPPER}} .swiper-pagination-bullet' => 'width: {{SIZE}}px; height: {{SIZE}}px;' ],
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

		$this->end_section();
	}

	private function arrow_svg( string $direction ): string {
		$d = 'next' === $direction ? 'M9 5l7 7-7 7' : 'M15 5l-7 7 7 7';

		return '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' . esc_attr( $d ) . '"/></svg>';
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$slides = $settings['slides'] ?? [];

		if ( empty( $slides ) ) {
			$this->render_editor_hint( esc_html__( 'Add at least one slide.', 'refraction' ) );
			return;
		}

		$total = count( $slides );
		$multiple = $total > 1;
		$autoplay = 'yes' === ( $settings['autoplay'] ?? '' );
		$show_arrows = $multiple && in_array( $settings['navigation'], [ 'arrows', 'both' ], true );
		$show_dots = $multiple && in_array( $settings['navigation'], [ 'dots', 'both' ], true );
		$tag = Utils::validate_html_tag( $settings['title_tag'] ?? 'h2' );

		$this->add_render_attribute( 'wrapper', [
			'class' => 'refraction-slides-wrapper swiper',
			'role' => 'region',
			'aria-roledescription' => 'carousel',
			'aria-label' => '' !== trim( (string) $settings['slider_label'] ) ? $settings['slider_label'] : __( 'Slides', 'refraction' ),
		] );
		$this->add_render_attribute( 'track', [
			'class' => 'refraction-slides swiper-wrapper',
			'aria-live' => $autoplay ? 'off' : 'polite',
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'wrapper' ); ?>>
			<div <?php $this->print_render_attribute_string( 'track' ); ?>>
				<?php foreach ( $slides as $index => $slide ) : ?>
					<?php
					$slide_key = 'slide_' . $index;
					$this->add_render_attribute( $slide_key, [
						'class' => [ 'refraction-slide', 'swiper-slide', 'refraction-repeater-item-' . $slide['_id'] ],
						'role' => 'group',
						'aria-roledescription' => 'slide',
						/* translators: 1: slide number, 2: total slides */
						'aria-label' => sprintf( __( '%1$d of %2$d', 'refraction' ), $index + 1, $total ),
					], null, true );

					$image_url = ! empty( $slide['background_image']['url'] ) ? $slide['background_image']['url'] : '';
					?>
					<div <?php $this->print_render_attribute_string( $slide_key ); ?>>
						<div class="refraction-slide__bg"<?php echo $image_url ? ' style="background-image:url(' . esc_url( $image_url ) . ')"' : ''; ?><?php echo ( $image_url && ! empty( $slide['image_alt'] ) ) ? ' role="img" aria-label="' . esc_attr( $slide['image_alt'] ) . '"' : ''; ?>></div>
						<div class="refraction-slide__overlay"></div>
						<div class="refraction-slide__inner">
							<div class="refraction-slide__content">
								<?php if ( ! Utils::is_empty( $slide['heading'] ) ) : ?>
									<<?php Utils::print_validated_html_tag( $tag ); ?> class="refraction-slide__title"><?php echo esc_html( $slide['heading'] ); ?></<?php Utils::print_validated_html_tag( $tag ); ?>>
								<?php endif; ?>
								<?php if ( ! Utils::is_empty( $slide['description'] ) ) : ?>
									<div class="refraction-slide__description"><?php echo wp_kses_post( nl2br( esc_html( $slide['description'] ) ) ); ?></div>
								<?php endif; ?>
								<?php
								$this->render_button( [
									'btn_text' => $slide['button_text'] ?? '',
									'btn_link' => $slide['button_link'] ?? [],
								], 'btn', '', 'btn_' . $index );
								?>
							</div>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
			<?php if ( $show_arrows ) : ?>
				<div class="refraction-swiper-button refraction-swiper-button-prev" role="button" tabindex="0" aria-label="<?php esc_attr_e( 'Previous slide', 'refraction' ); ?>"><?php echo $this->arrow_svg( 'prev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG with an escaped path. ?></div>
				<div class="refraction-swiper-button refraction-swiper-button-next" role="button" tabindex="0" aria-label="<?php esc_attr_e( 'Next slide', 'refraction' ); ?>"><?php echo $this->arrow_svg( 'next' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG with an escaped path. ?></div>
			<?php endif; ?>
			<?php if ( $show_dots ) : ?>
				<div class="swiper-pagination"></div>
			<?php endif; ?>
		</div>
		<?php
	}
}
