<?php
namespace Refraction\Includes\Widgets\Traits;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Dual Heading (Heading widget): a second, highlighted part after the title, in its own color or gradient and with a
 * mark behind it (a highlighter stroke, a rounded highlighter, an underline or a background), which can draw itself
 * when the heading scrolls into view. The heading reads "Title Highlighted text After text", one sentence.
 *
 * Markup: <span class="refraction-heading-dual">…</span> inside the heading. Styles in
 * frontend/partials/_heading-dual.scss (in frontend.css), the drawing in frontend/handlers/heading-dual.js. The widget
 * carries refraction-dual-mark-<style>, refraction-dual-fill-<color|gradient> and refraction-dual-draw-yes.
 */
trait Heading_Dual_Trait {

	/** The Content tab controls, inside the Heading section, after the HTML tag. */
	protected function add_heading_dual_content_controls(): void {
		$this->add_control(
			'rf_dual',
			[
				'label' => esc_html__( 'Dual Heading', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'description' => esc_html__( 'Add a highlighted part after the title, in its own color and with a mark behind it.', 'refraction' ),
				'separator' => 'before',
				'render_type' => 'template',
			]
		);

		$when = [ 'rf_dual' => 'yes' ];

		$this->add_control(
			'rf_dual_text',
			[
				'label' => esc_html__( 'Highlighted Text', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'rows' => 2,
				'dynamic' => [ 'active' => true ],
				'default' => esc_html__( 'highlighted words', 'refraction' ),
				'placeholder' => esc_html__( 'stride with GoPet AI', 'refraction' ),
				'condition' => $when,
			]
		);

		$this->add_control(
			'rf_dual_after',
			[
				'label' => esc_html__( 'Text After', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'dynamic' => [ 'active' => true ],
				'placeholder' => '.',
				'description' => esc_html__( 'In the title color, for example the full stop. Punctuation joins without a space.', 'refraction' ),
				'condition' => $when,
			]
		);

		$this->add_control(
			'rf_dual_break',
			[
				'label' => esc_html__( 'Highlighted Text On A New Line', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'condition' => $when,
			]
		);
	}

	/** The Style tab section "Highlighted Text". */
	protected function add_heading_dual_style_controls(): void {
		$when = [ 'rf_dual' => 'yes' ];
		$part = '{{WRAPPER}} .refraction-heading-dual';

		$this->start_controls_section(
			'section_rf_dual_style',
			[
				'label' => esc_html__( 'Highlighted Text', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => $when,
			]
		);

		$this->add_control(
			'rf_dual_fill',
			[
				'label' => esc_html__( 'Text Fill', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'color' => [
						'title' => esc_html__( 'Color', 'refraction' ),
						'icon' => 'rficon-paint-brush',
					],
					'gradient' => [
						'title' => esc_html__( 'Gradient', 'refraction' ),
						'icon' => 'rficon-barcode',
					],
				],
				'default' => 'color',
				'toggle' => false,
				'prefix_class' => 'refraction-dual-fill-',
			]
		);

		$this->add_control(
			'rf_dual_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $part => 'color: {{VALUE}};' ],
				'condition' => [ 'rf_dual_fill' => 'color' ],
			]
		);

		$this->add_control(
			'rf_dual_grad_a',
			[
				'label' => esc_html__( 'Gradient Start', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#0F766E',
				'selectors' => [ $part => '--rf-dual-ga: {{VALUE}};' ],
				'condition' => [ 'rf_dual_fill' => 'gradient' ],
			]
		);

		$this->add_control(
			'rf_dual_grad_b',
			[
				'label' => esc_html__( 'Gradient End', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#84CC16',
				'selectors' => [ $part => '--rf-dual-gb: {{VALUE}};' ],
				'condition' => [ 'rf_dual_fill' => 'gradient' ],
			]
		);

		$this->add_control(
			'rf_dual_grad_angle',
			[
				'label' => esc_html__( 'Gradient Angle', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'deg' ],
				'range' => [ 'deg' => [ 'min' => 0, 'max' => 360 ] ],
				'selectors' => [ $part => '--rf-dual-gangle: {{SIZE}}deg;' ],
				'condition' => [ 'rf_dual_fill' => 'gradient' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'rf_dual_typography',
				'selector' => $part,
			]
		);

		$this->add_control(
			'rf_dual_mark',
			[
				'label' => esc_html__( 'Mark Behind', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'' => esc_html__( 'None', 'refraction' ),
					'round' => esc_html__( 'Rounded highlighter', 'refraction' ),
					'marker' => esc_html__( 'Highlighter', 'refraction' ),
					'underline' => esc_html__( 'Underline', 'refraction' ),
					'block' => esc_html__( 'Background', 'refraction' ),
				],
				'default' => 'round',
				'prefix_class' => 'refraction-dual-mark-',
				'separator' => 'before',
				'description' => esc_html__( 'With a gradient text fill, only the text is drawn: the mark is left out.', 'refraction' ),
			]
		);

		$marked = [ 'rf_dual_mark!' => '' ];

		$this->add_control(
			'rf_dual_mark_color',
			[
				'label' => esc_html__( 'Mark Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#D4F25A',
				'selectors' => [ $part => '--rf-dual-mc: {{VALUE}};' ],
				'condition' => $marked,
			]
		);

		$this->add_responsive_control(
			'rf_dual_mark_height',
			[
				'label' => esc_html__( 'Mark Thickness', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [
					'em' => [ 'min' => 0.02, 'max' => 1.2, 'step' => 0.01 ],
					'px' => [ 'min' => 1, 'max' => 80 ],
				],
				'selectors' => [ $part => '--rf-dual-mh: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'rf_dual_mark' => [ 'round', 'marker', 'underline' ] ],
			]
		);

		$this->add_responsive_control(
			'rf_dual_mark_offset',
			[
				'label' => esc_html__( 'Distance From The Bottom', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [
					'em' => [ 'min' => -0.5, 'max' => 1, 'step' => 0.01 ],
					'px' => [ 'min' => -20, 'max' => 60 ],
				],
				'selectors' => [ $part => '--rf-dual-mo: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'rf_dual_mark' => [ 'round', 'marker', 'underline' ] ],
			]
		);

		$this->add_responsive_control(
			'rf_dual_mark_extend',
			[
				'label' => esc_html__( 'Reach Past The Words', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [
					'em' => [ 'min' => 0, 'max' => 0.6, 'step' => 0.01 ],
					'px' => [ 'min' => 0, 'max' => 40 ],
				],
				'selectors' => [ $part => '--rf-dual-mx: {{SIZE}}{{UNIT}};' ],
				'condition' => $marked,
			]
		);

		$this->add_responsive_control(
			'rf_dual_mark_radius',
			[
				'label' => esc_html__( 'Corner Radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'em', 'px' ],
				'range' => [
					'em' => [ 'min' => 0, 'max' => 1, 'step' => 0.01 ],
					'px' => [ 'min' => 0, 'max' => 40 ],
				],
				'selectors' => [ $part => '--rf-dual-mr: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'rf_dual_mark' => 'block' ],
			]
		);

		$this->add_control(
			'rf_dual_draw',
			[
				'label' => esc_html__( 'Draw When Scrolled Into View', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'prefix_class' => 'refraction-dual-draw-',
				'render_type' => 'template',
				'condition' => $marked,
			]
		);

		$this->add_control(
			'rf_dual_draw_duration',
			[
				'label' => esc_html__( 'Drawing Time (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 100,
				'max' => 4000,
				'step' => 50,
				'placeholder' => '800',
				'selectors' => [ $part => '--rf-dual-dur: {{VALUE}}ms;' ],
				'condition' => array_merge( $marked, [ 'rf_dual_draw' => 'yes' ] ),
			]
		);

		$this->add_control(
			'rf_dual_draw_delay',
			[
				'label' => esc_html__( 'Delay (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 4000,
				'step' => 50,
				'placeholder' => '150',
				'selectors' => [ $part => '--rf-dual-delay: {{VALUE}}ms;' ],
				'condition' => array_merge( $marked, [ 'rf_dual_draw' => 'yes' ] ),
			]
		);

		$this->end_controls_section();
	}

	/**
	 * The heading's inner HTML: the title, then the highlighted part and the text after it when Dual Heading is on.
	 *
	 * @param string $title The title, already sanitized.
	 */
	protected function heading_dual_html( array $settings, string $title ): string {
		$dual = 'yes' === ( $settings['rf_dual'] ?? '' ) ? trim( (string) ( $settings['rf_dual_text'] ?? '' ) ) : '';

		if ( '' === $dual ) {
			return $title;
		}

		$after = (string) ( $settings['rf_dual_after'] ?? '' );
		$joiner = 'yes' === ( $settings['rf_dual_break'] ?? '' ) ? '<br>' : ( '' === trim( $title ) ? '' : ' ' );

		return $title . $joiner . '<span class="refraction-heading-dual">' . wp_kses_post( $dual ) . '</span>' . self::heading_dual_after( $after );
	}

	/** The text after the highlighted part: punctuation joins it directly, anything else after a space. */
	public static function heading_dual_after( string $after ): string {
		if ( '' === trim( $after ) ) {
			return '';
		}

		$after = wp_kses_post( $after );

		return preg_match( '/^[\s]*[.,!?;:)\]}…%’”\'"»\x{3002}\x{FF01}\x{FF1F}]/u', $after ) ? ltrim( $after ) : ' ' . ltrim( $after );
	}
}
