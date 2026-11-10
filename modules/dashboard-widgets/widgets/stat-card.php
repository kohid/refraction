<?php
namespace Refraction\Modules\DashboardWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\DashboardWidgets\Classes\Pure_Dashboard as D;
use Refraction\Modules\DashboardWidgets\Module;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Stat Card: a dashboard tile. An icon on a tinted square, a label, a big number (counting up when shown), its change
 * as a tinted badge (up or down, green or red, or the other way round when down is good) and a sparkline. Every
 * value is open to Dynamic Tags (for example the Site Statistic tag).
 */
class Stat_Card extends Widget_Base {

	public function get_name() {
		return 'refraction-stat-card';
	}

	public function get_title() {
		return esc_html__( 'Stat Card', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-counter-circle';
	}

	public function get_categories() {
		return [ Module::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'stat', 'kpi', 'number', 'metric', 'dashboard', 'counter', 'sparkline', 'card' ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-dashboard' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-dashboard' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_stat', [ 'label' => esc_html__( 'Stat', 'refraction' ) ] );

		$this->add_control( 'icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'skin' => 'inline',
			'label_block' => false,
			'default' => [ 'value' => 'fas fa-chart-line', 'library' => 'fa-solid' ],
		] );

		$this->add_control( 'label', [ 'label' => esc_html__( 'Label', 'refraction' ), 'type' => Controls_Manager::TEXT, 'dynamic' => [ 'active' => true ], 'default' => esc_html__( 'Total revenue', 'refraction' ), 'label_block' => true ] );

		$this->add_control( 'value', [
			'label' => esc_html__( 'Value', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'default' => '48250',
			'description' => esc_html__( 'A number (it is formatted and counts up), or any text. Try the Site Statistic tag.', 'refraction' ),
			'label_block' => true,
		] );

		$this->add_control( 'prefix', [ 'label' => esc_html__( 'Before The Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => '$' ] );
		$this->add_control( 'suffix', [ 'label' => esc_html__( 'After The Value', 'refraction' ), 'type' => Controls_Manager::TEXT ] );
		$this->add_control( 'decimals', [ 'label' => esc_html__( 'Decimals', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 0, 'min' => 0, 'max' => 4 ] );
		$this->add_control( 'compact', [ 'label' => esc_html__( 'Short Number (1.2K, 3.4M)', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'count_up', [ 'label' => esc_html__( 'Count Up When Shown', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );

		$this->add_control( 'change', [
			'label' => esc_html__( 'Change', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'default' => '12.5',
			'description' => esc_html__( 'A number: positive goes up, negative down. Empty: no badge.', 'refraction' ),
			'separator' => 'before',
		] );
		$this->add_control( 'change_suffix', [ 'label' => esc_html__( 'After The Change', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => '%', 'condition' => [ 'change!' => '' ] ] );
		$this->add_control( 'change_text', [ 'label' => esc_html__( 'Beside The Change', 'refraction' ), 'type' => Controls_Manager::TEXT, 'dynamic' => [ 'active' => true ], 'default' => esc_html__( 'vs last month', 'refraction' ), 'condition' => [ 'change!' => '' ] ] );
		$this->add_control( 'down_is_good', [ 'label' => esc_html__( 'Down Is Good', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'For costs or waiting times: a fall shows green.', 'refraction' ), 'condition' => [ 'change!' => '' ] ] );

		$this->add_control( 'spark', [
			'label' => esc_html__( 'Sparkline', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 2,
			'dynamic' => [ 'active' => true ],
			'default' => '12, 19, 14, 25, 22, 30, 28, 36',
			'description' => esc_html__( 'Numbers separated by commas. Empty: no sparkline.', 'refraction' ),
			'separator' => 'before',
		] );
		$this->add_control( 'spark_type', [
			'label' => esc_html__( 'Sparkline Type', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'area',
			'options' => [ 'area' => esc_html__( 'Area', 'refraction' ), 'line' => esc_html__( 'Line', 'refraction' ), 'bars' => esc_html__( 'Bars', 'refraction' ) ],
			'condition' => [ 'spark!' => '' ],
		] );

		$this->add_control( 'tone', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'primary',
			'options' => [
				'primary' => esc_html__( 'Blue', 'refraction' ),
				'success' => esc_html__( 'Teal', 'refraction' ),
				'info' => esc_html__( 'Violet', 'refraction' ),
				'warning' => esc_html__( 'Amber', 'refraction' ),
				'danger' => esc_html__( 'Rose', 'refraction' ),
				'dark' => esc_html__( 'Dark', 'refraction' ),
			],
			'separator' => 'before',
		] );

		$this->add_control( 'layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'stacked',
			'options' => [ 'stacked' => esc_html__( 'Icon above', 'refraction' ), 'inline' => esc_html__( 'Icon beside', 'refraction' ), 'filled' => esc_html__( 'Filled with the color', 'refraction' ) ],
		] );

		$this->end_controls_section();

		// ---------------------------------------------------------------- style
		$this->start_controls_section( 'section_style_card', [ 'label' => esc_html__( 'Card', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$card = '{{WRAPPER}} .rf-stat';

		$this->add_group_control( Group_Control_Background::get_type(), [ 'name' => 'card_bg', 'types' => [ 'classic', 'gradient' ], 'exclude' => [ 'image' ], 'selector' => $card ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'card_border', 'selector' => $card ] );
		$this->add_responsive_control( 'card_radius', [ 'label' => esc_html__( 'Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'max' => 40 ] ], 'selectors' => [ $card => 'border-radius: {{SIZE}}px;' ] ] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'card_shadow', 'selector' => $card ] );
		$this->add_responsive_control( 'card_padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em', 'rem' ], 'selectors' => [ $card => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_control( 'accent', [ 'label' => esc_html__( 'Own Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card => '--tone: {{VALUE}};' ], 'description' => esc_html__( 'Instead of the color chosen in Content.', 'refraction' ) ] );
		$this->add_control( 'accent_light', [ 'label' => esc_html__( 'Own Light Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $card => '--tone-light: {{VALUE}};' ] ] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_text', [ 'label' => esc_html__( 'Value And Label', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'value_color', [ 'label' => esc_html__( 'Value Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-stat__value' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'value_typography', 'label' => esc_html__( 'Value Typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-stat__value' ] );
		$this->add_control( 'label_color', [ 'label' => esc_html__( 'Label Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-stat__label' => 'color: {{VALUE}};' ], 'separator' => 'before' ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'label_typography', 'label' => esc_html__( 'Label Typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-stat__label' ] );
		$this->add_control( 'note_color', [ 'label' => esc_html__( 'Text Beside The Change', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-stat__note' => 'color: {{VALUE}};' ], 'separator' => 'before' ] );
		$this->add_control( 'up_color', [ 'label' => esc_html__( 'Good Change', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-stat' => '--rf-stat-good: {{VALUE}};' ] ] );
		$this->add_control( 'down_color', [ 'label' => esc_html__( 'Bad Change', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-stat' => '--rf-stat-bad: {{VALUE}};' ] ] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_icon', [ 'label' => esc_html__( 'Icon And Sparkline', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_responsive_control( 'icon_size', [ 'label' => esc_html__( 'Icon Size', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 10, 'max' => 60 ] ], 'selectors' => [ '{{WRAPPER}} .rf-stat__icon' => 'font-size: {{SIZE}}px;' ] ] );
		$this->add_responsive_control( 'icon_box', [ 'label' => esc_html__( 'Icon Square', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 24, 'max' => 120 ] ], 'selectors' => [ '{{WRAPPER}} .rf-stat__icon' => 'width: {{SIZE}}px; height: {{SIZE}}px;' ] ] );
		$this->add_control( 'icon_radius', [ 'label' => esc_html__( 'Icon Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', '%' ], 'range' => [ 'px' => [ 'max' => 60 ], '%' => [ 'max' => 50 ] ], 'selectors' => [ '{{WRAPPER}} .rf-stat__icon' => 'border-radius: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'spark_height', [ 'label' => esc_html__( 'Sparkline Height', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 20, 'max' => 160 ] ], 'selectors' => [ '{{WRAPPER}} .rf-stat__spark' => 'height: {{SIZE}}px;' ], 'separator' => 'before' ] );

		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$tone = array_key_exists( $s['tone'] ?? '', D::THEMES ) ? $s['tone'] : 'primary';
		$layout = in_array( $s['layout'] ?? '', [ 'stacked', 'inline', 'filled' ], true ) ? $s['layout'] : 'stacked';
		$raw = trim( wp_strip_all_tags( (string) ( $s['value'] ?? '' ) ) );
		$number = D::number( $raw );
		$decimals = (int) ( $s['decimals'] ?? 0 );
		$prefix = (string) ( $s['prefix'] ?? '' );
		$suffix = (string) ( $s['suffix'] ?? '' );
		$compact = 'yes' === ( $s['compact'] ?? '' );
		$shown = null === $number ? $raw : D::format( $number, $decimals, $prefix, $suffix, $compact );
		$count = null !== $number && 'yes' === ( $s['count_up'] ?? 'yes' ) && ! $compact;
		$icon = ! empty( $s['icon']['value'] ) ? (string) Icons_Manager::try_get_icon_html( $s['icon'], [ 'aria-hidden' => 'true' ] ) : '';

		printf( '<div class="rf-stat rf-stat--%1$s rf-dash-tone--%2$s">', esc_attr( $layout ), esc_attr( $tone ) );

		if ( '' !== $icon ) {
			echo '<span class="rf-stat__icon">' . $icon . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Icon markup from the icons manager.
		}

		echo '<div class="rf-stat__main">';

		if ( '' !== trim( (string) ( $s['label'] ?? '' ) ) ) {
			echo '<div class="rf-stat__label">' . esc_html( $s['label'] ) . '</div>';
		}

		printf(
			'<div class="rf-stat__value"%1$s>%2$s</div>',
			$count ? ' data-rf-count="' . esc_attr( wp_json_encode( [ 'to' => $number, 'decimals' => $decimals, 'prefix' => $prefix, 'suffix' => $suffix ] ) ) . '"' : '',
			esc_html( $shown )
		);

		$change = D::number( (string) ( $s['change'] ?? '' ) );

		if ( null !== $change ) {
			$dir = D::direction( $change );
			$rises = 'up' === $dir;
			$down_good = 'yes' === ( $s['down_is_good'] ?? '' );
			$good = 'flat' === $dir ? 'flat' : ( $rises !== $down_good ? 'good' : 'bad' );
			$arrow = [ 'up' => '▲', 'down' => '▼', 'flat' => '•' ][ $dir ];
			$label = sprintf( /* translators: 1: up or down, 2: the change. */ __( '%1$s %2$s', 'refraction' ), 'up' === $dir ? __( 'Up', 'refraction' ) : ( 'down' === $dir ? __( 'Down', 'refraction' ) : __( 'No change', 'refraction' ) ), abs( $change ) . (string) ( $s['change_suffix'] ?? '' ) );

			printf(
				'<div class="rf-stat__change"><span class="rf-stat__badge is-%1$s" aria-label="%2$s"><span aria-hidden="true">%3$s %4$s</span></span>%5$s</div>',
				esc_attr( $good ),
				esc_attr( $label ),
				esc_html( $arrow ),
				esc_html( D::format( abs( $change ), max( 0, min( 2, strlen( (string) substr( strrchr( (string) $change, '.' ) ?: '', 1 ) ) ) ) ) . (string) ( $s['change_suffix'] ?? '' ) ),
				'' !== trim( (string) ( $s['change_text'] ?? '' ) ) ? '<span class="rf-stat__note">' . esc_html( $s['change_text'] ) . '</span>' : ''
			);
		}

		echo '</div>';
		echo $this->sparkline( $s ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		echo '</div>';
	}

	/** The sparkline: an area, a line or bars across the card's foot, in the tone color. */
	private function sparkline( array $s ): string {
		$values = array_values( array_filter( D::numbers( (string) ( $s['spark'] ?? '' ) ), static fn( $v ) => null !== $v ) );

		if ( count( $values ) < 2 ) {
			return '';
		}

		$min = min( $values );
		$max = max( $values );
		$span = $max - $min ?: 1;
		$n = count( $values );
		$type = in_array( $s['spark_type'] ?? '', [ 'area', 'line', 'bars' ], true ) ? $s['spark_type'] : 'area';

		if ( 'bars' === $type ) {
			$bars = '';

			foreach ( $values as $v ) {
				$bars .= '<i style="height:' . esc_attr( (string) round( 12 + ( ( $v - $min ) / $span * 88 ), 2 ) ) . '%"></i>';
			}

			return '<div class="rf-stat__spark rf-stat__spark--bars" aria-hidden="true">' . $bars . '</div>';
		}

		$points = [];

		foreach ( $values as $i => $v ) {
			$points[] = [ $i / ( $n - 1 ) * 1000, 950 - ( ( $v - $min ) / $span * 850 ) ];
		}

		$line = D::line_path( $points, true );
		$area = 'area' === $type ? '<path class="rf-stat__spark-fill" d="' . esc_attr( $line . 'L1000 1000L0 1000Z' ) . '"/>' : '';

		return '<svg class="rf-stat__spark" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">' . $area . '<path class="rf-stat__spark-line" d="' . esc_attr( $line ) . '"/></svg>';
	}

	public function render_plain_content() {
		$s = $this->get_settings_for_display();
		echo esc_html( trim( ( $s['label'] ?? '' ) . ': ' . ( $s['value'] ?? '' ) ) );
	}
}
