<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Icons_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Flip_Box extends Pro_Widget {

	public function get_name() {
		return 'refraction-flip-box';
	}

	public function get_title() {
		return esc_html__( 'Flip Box', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-flip-box';
	}

	public function get_keywords() {
		return [ 'flip', 'box', 'card', 'hover', 'rotate' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-flip-box' ];
	}

	private function side_controls( string $side, array $defaults ): void {
		$p = $side . '_';

		$this->add_control(
			$p . 'icon_type',
			[
				'label' => esc_html__( 'Graphic', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'none' => [ 'title' => esc_html__( 'None', 'refraction' ), 'icon' => 'rficon-ban' ],
					'image' => [ 'title' => esc_html__( 'Image', 'refraction' ), 'icon' => 'rficon-image' ],
					'icon' => [ 'title' => esc_html__( 'Icon', 'refraction' ), 'icon' => 'rficon-star' ],
				],
				'default' => $defaults['graphic'],
				'toggle' => false,
			]
		);

		$this->add_control(
			$p . 'image',
			[
				'label' => esc_html__( 'Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'dynamic' => [ 'active' => true ],
				'condition' => [ $p . 'icon_type' => 'image' ],
			]
		);

		$this->add_control(
			$p . 'icon',
			[
				'label' => esc_html__( 'Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'default' => [ 'value' => 'fas fa-star', 'library' => 'fa-solid' ],
				'condition' => [ $p . 'icon_type' => 'icon' ],
			]
		);

		$this->add_control(
			$p . 'title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => $defaults['title'],
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
				'separator' => 'before',
			]
		);

		$this->add_control(
			$p . 'description',
			[
				'label' => esc_html__( 'Description', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => $defaults['description'],
				'dynamic' => [ 'active' => true ],
			]
		);
	}

	protected function register_controls() {
		$this->content_section( 'section_front', esc_html__( 'Front', 'refraction' ) );
		$this->side_controls( 'front', [
			'graphic' => 'icon',
			'title' => esc_html__( 'This is the heading', 'refraction' ),
			'description' => esc_html__( 'Hover or focus the box to see the other side.', 'refraction' ),
		] );
		$this->end_section();

		$this->content_section( 'section_back', esc_html__( 'Back', 'refraction' ) );
		$this->side_controls( 'back', [
			'graphic' => 'none',
			'title' => esc_html__( 'This is the back', 'refraction' ),
			'description' => esc_html__( 'More detail about the thing you are showing off.', 'refraction' ),
		] );
		$this->button_content_controls( 'btn', esc_html__( 'Click Here', 'refraction' ) );
		$this->end_section();

		$this->content_section( 'section_settings', esc_html__( 'Settings', 'refraction' ) );

		$this->add_responsive_control(
			'height',
			[
				'label' => esc_html__( 'Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'vh', 'em' ],
				'range' => [ 'px' => [ 'min' => 100, 'max' => 1000 ], 'vh' => [ 'min' => 10, 'max' => 100 ] ],
				'default' => [ 'size' => 280, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-flip-box' => 'height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'effect',
			[
				'label' => esc_html__( 'Flip Effect', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'flip',
				'options' => [
					'flip' => esc_html__( 'Flip', 'refraction' ),
					'slide' => esc_html__( 'Slide', 'refraction' ),
					'push' => esc_html__( 'Push', 'refraction' ),
					'zoom-in' => esc_html__( 'Zoom In', 'refraction' ),
					'zoom-out' => esc_html__( 'Zoom Out', 'refraction' ),
					'fade' => esc_html__( 'Fade', 'refraction' ),
				],
				'prefix_class' => 'refraction-flip-box--effect-',
			]
		);

		$this->add_control(
			'direction',
			[
				'label' => esc_html__( 'Flip Direction', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'up',
				'options' => [
					'left' => esc_html__( 'Left', 'refraction' ),
					'right' => esc_html__( 'Right', 'refraction' ),
					'up' => esc_html__( 'Up', 'refraction' ),
					'down' => esc_html__( 'Down', 'refraction' ),
				],
				'condition' => [ 'effect!' => [ 'fade', 'zoom-in', 'zoom-out' ] ],
				'prefix_class' => 'refraction-flip-box--direction-',
			]
		);

		$this->add_control(
			'trigger',
			[
				'label' => esc_html__( 'Flip On', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'hover',
				'options' => [
					'hover' => esc_html__( 'Hover and focus', 'refraction' ),
					'click' => esc_html__( 'Click or Enter', 'refraction' ),
				],
				'frontend_available' => true,
				'render_type' => 'template',
				'prefix_class' => 'refraction-flip-box--trigger-',
				'description' => esc_html__( 'Touch screens always flip on tap.', 'refraction' ),
			]
		);

		$this->add_control(
			'duration',
			[
				'label' => esc_html__( 'Duration (ms)', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 100, 'max' => 2000, 'step' => 50 ] ],
				'default' => [ 'size' => 600, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-flip-box' => '--refraction-flip-duration: {{SIZE}}ms;' ],
			]
		);

		$this->add_control(
			'title_tag',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->heading_tag_options(),
				'default' => 'h3',
			]
		);

		$this->add_control(
			'box_label',
			[
				'label' => esc_html__( 'Accessible Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'description' => esc_html__( 'Optional. Describes the box for screen readers when it is a button.', 'refraction' ),
			]
		);

		$this->end_section();

		/* ---------------------------------------------------------------- style */
		foreach ( [
			'front' => [ esc_html__( 'Front', 'refraction' ), '#0f4c5c' ],
			'back' => [ esc_html__( 'Back', 'refraction' ), '#9a3412' ],
		] as $side => $info ) {
			$sel = '{{WRAPPER}} .refraction-flip-box__' . $side;

			$this->style_section( 'style_' . $side, $info[0] );

			$this->add_control(
				$side . '_bg',
				[
					'label' => esc_html__( 'Background Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'default' => $info[1],
					'selectors' => [ $sel => 'background-color: {{VALUE}};' ],
				]
			);

			$this->add_control(
				$side . '_bg_image',
				[
					'label' => esc_html__( 'Background Image', 'refraction' ),
					'type' => Controls_Manager::MEDIA,
					'selectors' => [ $sel => 'background-image: url({{URL}}); background-size: cover; background-position: center;' ],
				]
			);

			$this->add_control(
				$side . '_color',
				[
					'label' => esc_html__( 'Text Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'default' => '#ffffff',
					'selectors' => [ $sel => 'color: {{VALUE}};' ],
				]
			);

			$this->add_responsive_control(
				$side . '_padding',
				[
					'label' => esc_html__( 'Padding', 'refraction' ),
					'type' => Controls_Manager::DIMENSIONS,
					'size_units' => [ 'px', 'em', '%' ],
					'default' => [ 'top' => '24', 'right' => '24', 'bottom' => '24', 'left' => '24', 'unit' => 'px', 'isLinked' => true ],
					'selectors' => [ $sel => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				]
			);

			$this->add_responsive_control(
				$side . '_valign',
				[
					'label' => esc_html__( 'Vertical Align', 'refraction' ),
					'type' => Controls_Manager::SELECT,
					'default' => 'center',
					'options' => [
						'flex-start' => esc_html__( 'Top', 'refraction' ),
						'center' => esc_html__( 'Middle', 'refraction' ),
						'flex-end' => esc_html__( 'Bottom', 'refraction' ),
					],
					'selectors' => [ $sel => 'justify-content: {{VALUE}};' ],
				]
			);

			$this->align_control( $side . '_align', $sel, [] );

			$this->add_group_control(
				Group_Control_Border::get_type(),
				[
					'name' => $side . '_border',
					'selector' => $sel,
				]
			);

			$this->add_control( $side . '_h_title', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
			$this->text_style( $side . '_title', $sel . ' .refraction-flip-box__title' );
			$this->space_control( $side . '_title_space', esc_html__( 'Spacing', 'refraction' ), $sel . ' .refraction-flip-box__title' );
			$this->add_control( $side . '_h_desc', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
			$this->text_style( $side . '_description', $sel . ' .refraction-flip-box__description' );
			$this->add_control( $side . '_h_graphic', [ 'label' => esc_html__( 'Graphic', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
			$this->add_responsive_control(
				$side . '_graphic_size',
				[
					'label' => esc_html__( 'Size', 'refraction' ),
					'type' => Controls_Manager::SLIDER,
					'range' => [ 'px' => [ 'min' => 16, 'max' => 240 ] ],
					'default' => [ 'size' => 56, 'unit' => 'px' ],
					'selectors' => [
						$sel . ' .refraction-flip-box__graphic' => 'font-size: {{SIZE}}{{UNIT}};',
						$sel . ' .refraction-flip-box__graphic img' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
					],
				]
			);
			$this->add_control(
				$side . '_graphic_color',
				[
					'label' => esc_html__( 'Icon Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $sel . ' .refraction-flip-box__graphic' => 'color: {{VALUE}}; fill: {{VALUE}};' ],
				]
			);
			$this->space_control( $side . '_graphic_space', esc_html__( 'Spacing', 'refraction' ), $sel . ' .refraction-flip-box__graphic' );

			$this->end_section();
		}

		$this->style_section( 'style_button', esc_html__( 'Button', 'refraction' ) );
		$this->button_style_controls( 'button', '{{WRAPPER}} .refraction-flip-box__back .refraction-pro-button' );
		$this->end_section();

		$this->style_section( 'style_box_radius', esc_html__( 'Box', 'refraction' ) );
		$this->add_responsive_control(
			'box_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-flip-box__front, {{WRAPPER}} .refraction-flip-box__back' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);
		$this->end_section();
	}

	private function render_side( string $side, array $settings, string $tag ): void {
		$p = $side . '_';
		$type = $settings[ $p . 'icon_type' ] ?? 'none';

		if ( 'image' === $type && ! empty( $settings[ $p . 'image' ]['url'] ) ) {
			echo '<div class="refraction-flip-box__graphic refraction-flip-box__graphic--image"><img src="' . esc_url( $settings[ $p . 'image' ]['url'] ) . '" alt="" loading="lazy" /></div>';
		} elseif ( 'icon' === $type && ! empty( $settings[ $p . 'icon' ]['value'] ) ) {
			echo '<div class="refraction-flip-box__graphic refraction-flip-box__graphic--icon">';
			Icons_Manager::render_icon( $settings[ $p . 'icon' ], [ 'aria-hidden' => 'true' ] );
			echo '</div>';
		}

		if ( ! Utils::is_empty( $settings[ $p . 'title' ] ) ) {
			?>
			<<?php Utils::print_validated_html_tag( $tag ); ?> class="refraction-flip-box__title"><?php echo esc_html( $settings[ $p . 'title' ] ); ?></<?php Utils::print_validated_html_tag( $tag ); ?>>
			<?php
		}

		if ( ! Utils::is_empty( $settings[ $p . 'description' ] ) ) {
			echo '<div class="refraction-flip-box__description">' . wp_kses_post( nl2br( esc_html( $settings[ $p . 'description' ] ) ) ) . '</div>';
		}
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$tag = Utils::validate_html_tag( $settings['title_tag'] ?? 'h3' );
		$is_click = 'click' === ( $settings['trigger'] ?? 'hover' );

		$this->add_render_attribute( 'box', [
			'class' => 'refraction-flip-box',
			// Focusable so keyboard users can reach and flip it; the back's own link is still tabbable.
			'tabindex' => '0',
		] );

		if ( $is_click ) {
			$this->add_render_attribute( 'box', 'role', 'group' );
			$this->add_render_attribute( 'box', 'aria-expanded', 'false' );
		}

		if ( ! Utils::is_empty( $settings['box_label'] ) ) {
			$this->add_render_attribute( 'box', 'aria-label', $settings['box_label'] );
			$this->add_render_attribute( 'box', 'role', 'group' );
		}
		?>
		<div <?php $this->print_render_attribute_string( 'box' ); ?>>
			<div class="refraction-flip-box__layer refraction-flip-box__front">
				<div class="refraction-flip-box__inner"><?php $this->render_side( 'front', $settings, $tag ); ?></div>
			</div>
			<div class="refraction-flip-box__layer refraction-flip-box__back">
				<div class="refraction-flip-box__inner">
					<?php $this->render_side( 'back', $settings, $tag ); ?>
					<?php $this->render_button( $settings, 'btn' ); ?>
				</div>
			</div>
		</div>
		<?php
	}
}
