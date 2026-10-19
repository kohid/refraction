<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Page_Context;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Breadcrumbs: the path from the home page to the page being viewed.
 */
class Breadcrumbs extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-breadcrumbs';
	}

	public function get_title() {
		return esc_html__( 'Breadcrumbs', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-product-breadcrumbs';
	}

	public function get_keywords() {
		return [ 'breadcrumbs', 'trail', 'path', 'navigation' ];
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Breadcrumbs', 'refraction' ),
			]
		);

		$this->add_control(
			'home_label',
			[
				'label' => esc_html__( 'Home Label', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Home', 'refraction' ),
			]
		);

		$this->add_control(
			'separator',
			[
				'label' => esc_html__( 'Separator', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'/' => '/',
					'›' => '›',
					'»' => '»',
					'>' => '>',
					'-' => '-',
					'|' => '|',
				],
				'default' => '›',
			]
		);

		$this->add_control(
			'show_current',
			[
				'label' => esc_html__( 'Show current page', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Breadcrumbs', 'refraction' ), '{{WRAPPER}} .refraction-theme-breadcrumbs', '{{WRAPPER}} .refraction-theme-breadcrumbs a' );

		$this->start_controls_section(
			'section_style_separator',
			[
				'label' => esc_html__( 'Separator', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'separator_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-breadcrumbs__sep' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'separator_space',
			[
				'label' => esc_html__( 'Space', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'custom' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-breadcrumbs__sep' => 'margin-inline: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings();
		$home = '' !== trim( (string) $settings['home_label'] ) ? (string) $settings['home_label'] : __( 'Home', 'refraction' );
		$trail = Page_Context::breadcrumb_trail( $home );

		if ( 'yes' !== $settings['show_current'] ) {
			$trail = array_values( array_filter( $trail, fn( $crumb ) => '' !== $crumb[1] ) );
		}

		if ( ! $trail ) {
			$this->print_editor_hint( __( 'There is no trail to show on the front page.', 'refraction' ) );

			return;
		}

		$separator = (string) $settings['separator'];
		$last = count( $trail ) - 1;

		echo '<nav class="refraction-theme-breadcrumbs" aria-label="' . esc_attr__( 'Breadcrumbs', 'refraction' ) . '"><ol>';

		foreach ( $trail as $index => $crumb ) {
			echo '<li>';

			if ( '' !== $crumb[1] ) {
				echo '<a href="' . esc_url( $crumb[1] ) . '">' . esc_html( $crumb[0] ) . '</a>';
			} else {
				echo '<span aria-current="page">' . esc_html( $crumb[0] ) . '</span>';
			}

			if ( $index < $last ) {
				echo '<span class="refraction-theme-breadcrumbs__sep" aria-hidden="true">' . esc_html( $separator ) . '</span>';
			}

			echo '</li>';
		}

		echo '</ol></nav>';
	}
}
