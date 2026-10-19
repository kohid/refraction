<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Headline_Logic;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Animated_Headline extends Pro_Widget {

	public function get_name() {
		return 'refraction-animated-headline';
	}

	public function get_title() {
		return esc_html__( 'Animated Headline', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-animated-headline';
	}

	public function get_keywords() {
		return [ 'headline', 'heading', 'animation', 'rotating', 'typing', 'highlight', 'text' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-animated-headline' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_text', esc_html__( 'Headline', 'refraction' ) );

		$this->add_control(
			'animation_type',
			[
				'label' => esc_html__( 'Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'typing',
				'options' => [
					'typing' => esc_html__( 'Typing', 'refraction' ),
					'clip' => esc_html__( 'Clip', 'refraction' ),
					'flip' => esc_html__( 'Flip', 'refraction' ),
					'swirl' => esc_html__( 'Swirl', 'refraction' ),
					'blinds' => esc_html__( 'Blinds', 'refraction' ),
					'drop-in' => esc_html__( 'Drop-in', 'refraction' ),
					'wave' => esc_html__( 'Wave', 'refraction' ),
					'slide' => esc_html__( 'Slide up', 'refraction' ),
					'slide-down' => esc_html__( 'Slide down', 'refraction' ),
					'fade' => esc_html__( 'Fade', 'refraction' ),
					'highlight' => esc_html__( 'Highlight', 'refraction' ),
					'underline' => esc_html__( 'Underline', 'refraction' ),
					'circle' => esc_html__( 'Circle', 'refraction' ),
					'strikethrough' => esc_html__( 'Strikethrough', 'refraction' ),
				],
				'frontend_available' => true,
				'render_type' => 'template',
			]
		);

		$this->add_control(
			'before_text',
			[
				'label' => esc_html__( 'Text Before', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'This page is', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'highlighted_text',
			[
				'label' => esc_html__( 'Highlighted Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Amazing', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
				'condition' => [ 'animation_type' => [ 'highlight', 'underline', 'circle', 'strikethrough' ] ],
			]
		);

		$this->add_control(
			'rotating_text',
			[
				'label' => esc_html__( 'Rotating Text', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => "Better\nBigger\nFaster",
				'description' => esc_html__( 'One phrase per line (up to 20).', 'refraction' ),
				'rows' => 5,
				'condition' => [ 'animation_type!' => [ 'highlight', 'underline', 'circle', 'strikethrough' ] ],
			]
		);

		$this->add_control(
			'after_text',
			[
				'label' => esc_html__( 'Text After', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'header_tag',
			[
				'label' => esc_html__( 'HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->heading_tag_options(),
				'default' => 'h3',
				'separator' => 'before',
			]
		);

		$this->align_control( 'headline_align', '{{WRAPPER}} .refraction-headline', [] );

		$this->end_section();

		$this->content_section( 'section_timing', esc_html__( 'Timing', 'refraction' ) );

		$this->add_control(
			'animation_delay',
			[
				'label' => esc_html__( 'Time Each Phrase Stays (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 2500,
				'min' => 200,
				'max' => 20000,
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'typing_speed',
			[
				'label' => esc_html__( 'Typing Speed (ms per letter)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 90,
				'min' => 10,
				'max' => 500,
				'condition' => [ 'animation_type' => 'typing' ],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'loop',
			[
				'label' => esc_html__( 'Loop', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'description' => esc_html__( 'Off: rotating text stops on the last phrase; shapes are drawn once.', 'refraction' ),
				'frontend_available' => true,
			]
		);

		$this->end_section();

		$this->style_section( 'style_headline', esc_html__( 'Headline', 'refraction' ) );
		$this->text_style( 'headline', '{{WRAPPER}} .refraction-headline' );
		$this->end_section();

		$this->style_section( 'style_dynamic', esc_html__( 'Animated Text', 'refraction' ) );

		$this->add_control(
			'dynamic_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-headline__dynamic' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'dynamic_typography',
				'selector' => '{{WRAPPER}} .refraction-headline__dynamic',
			]
		);

		$this->add_control(
			'shape_color',
			[
				'label' => esc_html__( 'Shape / Cursor Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#e11d48',
				'selectors' => [ '{{WRAPPER}} .refraction-headline' => '--refraction-hl-shape: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'shape_width',
			[
				'label' => esc_html__( 'Shape Thickness', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 1, 'max' => 20 ] ],
				'default' => [ 'size' => 3, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-headline' => '--refraction-hl-width: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'animation_type' => [ 'underline', 'circle', 'strikethrough' ] ],
			]
		);

		$this->add_control(
			'animation_speed',
			[
				'label' => esc_html__( 'Transition Duration (ms)', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 100, 'max' => 2000, 'step' => 50 ] ],
				'default' => [ 'size' => 500, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-headline' => '--refraction-hl-dur: {{SIZE}}ms;' ],
			]
		);

		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$type = Headline_Logic::sanitize_type( (string) $settings['animation_type'] );
		$is_highlight = Headline_Logic::is_highlight( $type );
		$tag = Utils::validate_html_tag( $settings['header_tag'] ?? 'h3' );

		if ( $is_highlight ) {
			$words = '' !== trim( (string) $settings['highlighted_text'] ) ? [ trim( $settings['highlighted_text'] ) ] : [];
		} else {
			$words = Headline_Logic::lines( (string) $settings['rotating_text'] );
		}

		if ( empty( $words ) && Utils::is_empty( $settings['before_text'] ) && Utils::is_empty( $settings['after_text'] ) ) {
			$this->render_editor_hint( esc_html__( 'Add some headline text.', 'refraction' ) );
			return;
		}

		$this->add_render_attribute( 'headline', 'class', [ 'refraction-headline', 'refraction-headline--type-' . $type ] );
		?>
		<<?php Utils::print_validated_html_tag( $tag ); ?> <?php $this->print_render_attribute_string( 'headline' ); ?>>
			<?php if ( ! Utils::is_empty( $settings['before_text'] ) ) : ?>
				<span class="refraction-headline__before"><?php echo esc_html( $settings['before_text'] ); ?></span>
			<?php endif; ?>
			<?php if ( $words ) : ?>
				<span class="refraction-headline__dynamic">
					<?php foreach ( $words as $i => $word ) : ?>
						<span class="refraction-headline__word<?php echo 0 === $i ? ' is-active' : ''; ?>"><?php echo esc_html( $word ); ?></span>
					<?php endforeach; ?>
				</span>
			<?php endif; ?>
			<?php if ( ! Utils::is_empty( $settings['after_text'] ) ) : ?>
				<span class="refraction-headline__after"><?php echo esc_html( $settings['after_text'] ); ?></span>
			<?php endif; ?>
		</<?php Utils::print_validated_html_tag( $tag ); ?>>
		<?php
	}
}
