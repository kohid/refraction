<?php
namespace Refraction\Modules\DashboardWidgets\Classes;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The dashboard card around a Chart or Data Table: a white panel with soft corners and a faint shadow, a bold title,
 * a muted subtitle and a tinted badge at the right (a dashboard look), all optional and styled in Style > Card.
 * Markup: .rf-dash (.rf-dash--card) > .rf-dash__head + .rf-dash__body.
 */
trait Card_Controls {

	/** Content > Card. */
	protected function add_card_content_controls( string $title, string $subtitle, string $badge = '' ): void {
		$this->start_controls_section( 'section_card', [ 'label' => esc_html__( 'Card', 'refraction' ) ] );

		$this->add_control( 'card', [
			'label' => esc_html__( 'Show As A Card', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'A white panel with soft corners and shadow. Off: just the content.', 'refraction' ),
		] );

		$this->add_control( 'card_title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'default' => $title,
			'label_block' => true,
		] );

		$this->add_control( 'card_title_tag', [
			'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'h3',
			'options' => [ 'h2' => 'H2', 'h3' => 'H3', 'h4' => 'H4', 'h5' => 'H5', 'h6' => 'H6', 'div' => 'div' ],
			'condition' => [ 'card_title!' => '' ],
		] );

		$this->add_control( 'card_subtitle', [
			'label' => esc_html__( 'Subtitle', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'default' => $subtitle,
			'label_block' => true,
		] );

		$this->add_control( 'card_badge', [
			'label' => esc_html__( 'Badge', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'default' => $badge,
			'description' => esc_html__( 'A short tag at the top right, for example "+12.5%" or "Live".', 'refraction' ),
		] );

		$this->add_control( 'card_badge_tone', [
			'label' => esc_html__( 'Badge Color', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'success',
			'options' => self::tone_options(),
			'condition' => [ 'card_badge!' => '' ],
		] );

		$this->end_controls_section();
	}

	protected static function tone_options(): array {
		return [
			'primary' => esc_html__( 'Blue', 'refraction' ),
			'success' => esc_html__( 'Teal', 'refraction' ),
			'info' => esc_html__( 'Violet', 'refraction' ),
			'warning' => esc_html__( 'Amber', 'refraction' ),
			'danger' => esc_html__( 'Rose', 'refraction' ),
			'dark' => esc_html__( 'Dark', 'refraction' ),
		];
	}

	/** Style > Card. */
	protected function add_card_style_controls(): void {
		$this->start_controls_section( 'section_style_card', [
			'label' => esc_html__( 'Card', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$card = '{{WRAPPER}} .rf-dash';

		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'card_bg',
			'types' => [ 'classic', 'gradient' ],
			'exclude' => [ 'image' ],
			'selector' => $card . '.rf-dash--card',
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'card_border',
			'selector' => $card . '.rf-dash--card',
		] );

		$this->add_responsive_control( 'card_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'max' => 40 ] ],
			'selectors' => [ $card . '.rf-dash--card' => 'border-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'card_shadow',
			'selector' => $card . '.rf-dash--card',
		] );

		$this->add_responsive_control( 'card_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em', 'rem' ],
			'selectors' => [ $card . '.rf-dash--card' => '--rf-dash-pad-top: {{TOP}}{{UNIT}}; --rf-dash-pad-right: {{RIGHT}}{{UNIT}}; --rf-dash-pad-bottom: {{BOTTOM}}{{UNIT}}; --rf-dash-pad-left: {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_control( 'card_title_heading', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->add_control( 'card_title_color', [ 'label' => esc_html__( 'Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-dash__title' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'card_title_typography', 'selector' => '{{WRAPPER}} .rf-dash__title' ] );
		$this->add_control( 'card_subtitle_color', [ 'label' => esc_html__( 'Subtitle Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-dash__subtitle' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'card_subtitle_typography', 'label' => esc_html__( 'Subtitle Typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-dash__subtitle' ] );

		$this->add_responsive_control( 'card_head_gap', [
			'label' => esc_html__( 'Space Under The Title', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'max' => 80 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-dash__head' => 'margin-bottom: {{SIZE}}{{UNIT}};' ],
		] );

		$this->end_controls_section();
	}

	/** The card's opening markup and head, with the body opened. */
	protected function card_open( array $s, string $class ): string {
		$card = 'yes' === ( $s['card'] ?? 'yes' );
		$title = trim( (string) ( $s['card_title'] ?? '' ) );
		$subtitle = trim( (string) ( $s['card_subtitle'] ?? '' ) );
		$badge = trim( (string) ( $s['card_badge'] ?? '' ) );
		$tone = array_key_exists( $s['card_badge_tone'] ?? '', self::tone_options() ) ? $s['card_badge_tone'] : 'success';
		$html = '<div class="rf-dash ' . esc_attr( $class ) . ( $card ? ' rf-dash--card' : '' ) . '">';

		if ( '' !== $title || '' !== $subtitle || '' !== $badge ) {
			$tag = Utils::validate_html_tag( $s['card_title_tag'] ?? 'h3' );
			$html .= '<div class="rf-dash__head"><div class="rf-dash__heading">';
			$html .= '' !== $title ? sprintf( '<%1$s class="rf-dash__title">%2$s</%1$s>', $tag, esc_html( $title ) ) : '';
			$html .= '' !== $subtitle ? '<div class="rf-dash__subtitle">' . esc_html( $subtitle ) . '</div>' : '';
			$html .= '</div>';
			$html .= '' !== $badge ? '<span class="rf-dash__badge rf-dash-tone--' . esc_attr( $tone ) . '">' . esc_html( $badge ) . '</span>' : '';
			$html .= '</div>';
		}

		return $html . '<div class="rf-dash__body">';
	}

	protected function card_close(): string {
		return '</div></div>';
	}
}
