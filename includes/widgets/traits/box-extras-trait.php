<?php
namespace Refraction\Includes\Widgets\Traits;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Image Box and Icon Box: a button under the text, and the description shown as text, cut to a number of lines (with
 * its full text in a tooltip if wanted) or as a tooltip of the box. Styles in widgets/_box-extras.scss.
 */
trait Box_Extras_Trait {

	/** At the end of the widget's content section. */
	protected function add_box_extras_content_controls(): void {
		$this->add_control(
			'box_description_display',
			[
				'label' => esc_html__( 'Show The Description', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'text',
				'options' => [
					'text' => esc_html__( 'As text', 'refraction' ),
					'clamp' => esc_html__( 'Cut to a number of lines', 'refraction' ),
					'tooltip' => esc_html__( 'As a tooltip (on hover)', 'refraction' ),
				],
				'prefix_class' => 'refraction-box-desc-',
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'box_description_lines',
			[
				'label' => esc_html__( 'Lines', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 1,
				'max' => 20,
				'default' => 3,
				'selectors' => [ '{{WRAPPER}}' => '--rf-box-lines: {{VALUE}};' ],
				'condition' => [ 'box_description_display' => 'clamp' ],
			]
		);

		$this->add_control(
			'box_description_full_tooltip',
			[
				'label' => esc_html__( 'Full Text In A Tooltip', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'description' => esc_html__( 'Hovering the box shows the whole description.', 'refraction' ),
				'condition' => [ 'box_description_display' => 'clamp' ],
			]
		);

		$this->add_control(
			'box_tooltip_position',
			[
				'label' => esc_html__( 'Tooltip Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'bottom',
				'options' => [
					'bottom' => esc_html__( 'Under the box', 'refraction' ),
					'top' => esc_html__( 'Above the box', 'refraction' ),
				],
				'prefix_class' => 'refraction-box-tooltip-',
				'conditions' => [
					'relation' => 'or',
					'terms' => [
						[ 'name' => 'box_description_display', 'value' => 'tooltip' ],
						[
							'relation' => 'and',
							'terms' => [
								[ 'name' => 'box_description_display', 'value' => 'clamp' ],
								[ 'name' => 'box_description_full_tooltip', 'value' => 'yes' ],
							],
						],
					],
				],
			]
		);

		$this->add_control(
			'box_button_heading',
			[
				'label' => esc_html__( 'Button', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'box_button_text',
			[
				'label' => esc_html__( 'Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'dynamic' => [ 'active' => true ],
				'placeholder' => esc_html__( 'Learn more', 'refraction' ),
				'description' => esc_html__( 'Empty: no button.', 'refraction' ),
			]
		);

		$this->add_control(
			'box_button_link',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [ 'active' => true ],
				'condition' => [ 'box_button_text!' => '' ],
			]
		);

		$this->add_control(
			'box_button_style',
			[
				'label' => esc_html__( 'Style', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'filled',
				'options' => [
					'filled' => esc_html__( 'Filled', 'refraction' ),
					'outline' => esc_html__( 'Outline', 'refraction' ),
					'text' => esc_html__( 'Text link', 'refraction' ),
				],
				'condition' => [ 'box_button_text!' => '' ],
			]
		);

		$this->add_control(
			'box_button_icon',
			[
				'label' => esc_html__( 'Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'skin' => 'inline',
				'label_block' => false,
				'condition' => [ 'box_button_text!' => '' ],
			]
		);

		$this->add_control(
			'box_button_icon_position',
			[
				'label' => esc_html__( 'Icon Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'after',
				'options' => [
					'before' => esc_html__( 'Before', 'refraction' ),
					'after' => esc_html__( 'After', 'refraction' ),
				],
				'condition' => [ 'box_button_text!' => '', 'box_button_icon[value]!' => '' ],
			]
		);
	}

	/** After the widget's last style section. */
	protected function add_box_extras_style_controls(): void {
		$button = '{{WRAPPER}} .refraction-box-button';

		$this->start_controls_section(
			'section_style_box_button',
			[
				'label' => esc_html__( 'Button', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [ 'box_button_text!' => '' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'box_button_typography',
				'selector' => $button,
			]
		);

		$this->start_controls_tabs( 'box_button_tabs' );

		foreach ( [ 'normal' => esc_html__( 'Normal', 'refraction' ), 'hover' => esc_html__( 'Hover', 'refraction' ) ] as $state => $label ) {
			$selector = 'hover' === $state ? $button . ':hover, ' . $button . ':focus-visible' : $button;

			$this->start_controls_tab( 'box_button_tab_' . $state, [ 'label' => $label ] );

			$this->add_control( 'box_button_color_' . $state, [
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $selector => 'color: {{VALUE}}; fill: {{VALUE}};' ],
			] );

			$this->add_control( 'box_button_bg_' . $state, [
				'label' => esc_html__( 'Background Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $selector => 'background-color: {{VALUE}};' ],
			] );

			$this->add_control( 'box_button_border_color_' . $state, [
				'label' => esc_html__( 'Border Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $selector => 'border-color: {{VALUE}};' ],
			] );

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_responsive_control(
			'box_button_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem' ],
				'selectors' => [ $button => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'box_button_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em' ],
				'selectors' => [ $button => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'box_button_border_width',
			[
				'label' => esc_html__( 'Border Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 10 ] ],
				'selectors' => [ $button => 'border-width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'box_button_spacing',
			[
				'label' => esc_html__( 'Space Above', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-box-button-wrap' => 'margin-block-start: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'box_button_icon_gap',
			[
				'label' => esc_html__( 'Icon Spacing', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'selectors' => [ $button => 'gap: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'box_button_icon[value]!' => '' ],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'box_button_shadow',
				'selector' => $button,
			]
		);

		$this->end_controls_section();

		$tooltip = '{{WRAPPER}} .refraction-box-tooltip';

		$this->start_controls_section(
			'section_style_box_tooltip',
			[
				'label' => esc_html__( 'Tooltip', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'conditions' => [
					'relation' => 'or',
					'terms' => [
						[ 'name' => 'box_description_display', 'value' => 'tooltip' ],
						[ 'name' => 'box_description_full_tooltip', 'value' => 'yes' ],
					],
				],
			]
		);

		$this->add_control( 'box_tooltip_bg', [
			'label' => esc_html__( 'Background Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-box-tooltip-bg: {{VALUE}};' ],
		] );

		$this->add_control( 'box_tooltip_color', [
			'label' => esc_html__( 'Text Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .refraction-icon-box-wrapper .refraction-box-tooltip, {{WRAPPER}} .refraction-image-box-wrapper .refraction-box-tooltip' => 'color: {{VALUE}};' ],
		] );

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'box_tooltip_typography',
				'selector' => $tooltip,
			]
		);

		$this->add_responsive_control(
			'box_tooltip_width',
			[
				'label' => esc_html__( 'Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'range' => [ 'px' => [ 'min' => 100, 'max' => 600 ] ],
				'selectors' => [ $tooltip => 'width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'box_tooltip_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ $tooltip => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'box_tooltip_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ $tooltip => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'box_tooltip_border',
				'selector' => $tooltip,
			]
		);

		$this->end_controls_section();
	}

	/** Whether the box shows anything besides its title and description. */
	protected function box_has_button( array $settings ): bool {
		return '' !== trim( (string) ( $settings['box_button_text'] ?? '' ) );
	}

	/** The description's classes for its display (a tooltip is the description itself). */
	protected function box_description_classes( array $settings ): array {
		$classes = [ 'refraction-box-description' ];

		if ( 'tooltip' === ( $settings['box_description_display'] ?? 'text' ) ) {
			$classes[] = 'refraction-box-tooltip';
		}

		return $classes;
	}

	/** After the description: its full text as a tooltip (when cut to lines), then the button. */
	protected function box_after_description_html( array $settings, string $description ): string {
		$html = '';

		if ( 'clamp' === ( $settings['box_description_display'] ?? 'text' ) && 'yes' === ( $settings['box_description_full_tooltip'] ?? '' ) && '' !== trim( $description ) ) {
			$html .= '<span class="refraction-box-tooltip refraction-box-tooltip--full" role="tooltip">' . $description . '</span>';
		}

		if ( ! $this->box_has_button( $settings ) ) {
			return $html;
		}

		$this->add_render_attribute( 'box_button', 'class', [
			'refraction-box-button',
			'refraction-box-button--' . ( in_array( $settings['box_button_style'] ?? '', [ 'outline', 'text' ], true ) ? $settings['box_button_style'] : 'filled' ),
			'refraction-box-button--icon-' . ( 'before' === ( $settings['box_button_icon_position'] ?? 'after' ) ? 'before' : 'after' ),
		] );

		if ( ! empty( $settings['box_button_link']['url'] ) ) {
			$this->add_link_attributes( 'box_button', $settings['box_button_link'] );
		}

		$icon = ! empty( $settings['box_button_icon']['value'] ) ? (string) Icons_Manager::try_get_icon_html( $settings['box_button_icon'], [ 'aria-hidden' => 'true' ] ) : '';

		return $html . '<div class="refraction-box-button-wrap"><a ' . $this->get_render_attribute_string( 'box_button' ) . '>'
			. ( '' !== $icon ? '<span class="refraction-box-button__icon">' . $icon . '</span>' : '' )
			. '<span class="refraction-box-button__text">' . esc_html( $settings['box_button_text'] ) . '</span></a></div>';
	}

	/** The same in the editor's template: defines boxDescClass and boxAfter. */
	protected function print_box_extras_template(): void {
		?>
		<#
		var boxDisplay = settings.box_description_display || 'text',
			boxDescClass = 'refraction-box-description' + ( 'tooltip' === boxDisplay ? ' refraction-box-tooltip' : '' ),
			boxAfter = '';

		if ( 'clamp' === boxDisplay && 'yes' === settings.box_description_full_tooltip && settings.description_text ) {
			boxAfter += '<span class="refraction-box-tooltip refraction-box-tooltip--full" role="tooltip">' + refraction.helpers.sanitize( settings.description_text ) + '</span>';
		}

		if ( settings.box_button_text ) {
			var boxIcon = settings.box_button_icon && settings.box_button_icon.value ? refraction.helpers.renderIcon( view, settings.box_button_icon, { 'aria-hidden': true }, 'i', 'object' ) : null,
				boxStyle = -1 !== [ 'outline', 'text' ].indexOf( settings.box_button_style ) ? settings.box_button_style : 'filled',
				boxIconAt = 'before' === settings.box_button_icon_position ? 'before' : 'after';

			boxAfter += '<div class="refraction-box-button-wrap"><a class="refraction-box-button refraction-box-button--' + boxStyle + ' refraction-box-button--icon-' + boxIconAt + '" href="' + refraction.helpers.sanitizeUrl( settings.box_button_link?.url || '' ) + '">'
				+ ( boxIcon && boxIcon.rendered ? '<span class="refraction-box-button__icon">' + boxIcon.value + '</span>' : '' )
				+ '<span class="refraction-box-button__text">' + _.escape( settings.box_button_text ) + '</span></a></div>';
		}
		#>
		<?php
	}
}
