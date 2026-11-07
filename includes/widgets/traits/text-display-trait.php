<?php
namespace Refraction\Includes\Widgets\Traits;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * How a widget shows its description or main text: as text, cut to a number of lines (with a Show more / Show less
 * toggle and the full text in a tooltip, each if wanted), or as a tooltip. Used by Text Editor, Icon Box, Image Box,
 * Testimonial, Alert, Call to Action and Author Box. Styles in frontend/partials/_text-display.scss (in frontend.css),
 * the toggle in frontend/handlers/read-more.js. The control names start with box_ (they began in the box widgets).
 *
 * The widget gives its text element the classes from text_display_classes() and prints text_display_after_html()
 * after it; in tooltip mode, a widget with nothing else to hover prints text_display_trigger_html() too.
 */
trait Text_Display_Trait {

	/** Whether the widget offers the tooltip modes (add_text_display_controls()'s tooltip argument). */
	private bool $text_display_tooltips = true;

	/**
	 * @param array $args label: the select's label; trigger: whether tooltip mode needs a trigger text (the widget has
	 *                    nothing else to hover); tooltip: false where a tooltip would be cut off (a box that clips
	 *                    what overflows it); condition: when the controls show.
	 */
	protected function add_text_display_controls( array $args = [] ): void {
		$condition = $args['condition'] ?? [];
		$when = static fn( array $more ) => array_merge( $condition, $more );
		$tooltips = $args['tooltip'] ?? true;
		$this->text_display_tooltips = $tooltips;
		$options = [
			'text' => esc_html__( 'As text', 'refraction' ),
			'clamp' => esc_html__( 'Cut to a number of lines', 'refraction' ),
		];

		if ( $tooltips ) {
			$options['tooltip'] = esc_html__( 'As a tooltip (on hover)', 'refraction' );
		}

		$this->add_control(
			'box_description_display',
			[
				'label' => $args['label'] ?? esc_html__( 'Show The Description', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'text',
				'options' => $options,
				'prefix_class' => 'refraction-box-desc-',
				'separator' => 'before',
				'condition' => $condition,
			]
		);

		$this->add_responsive_control(
			'box_description_lines',
			[
				'label' => esc_html__( 'Lines', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 1,
				'max' => 30,
				'default' => 3,
				'selectors' => [ '{{WRAPPER}}' => '--rf-box-lines: {{VALUE}};' ],
				'condition' => $when( [ 'box_description_display' => 'clamp' ] ),
			]
		);

		$this->add_control(
			'box_read_more',
			[
				'label' => esc_html__( 'Show More Toggle', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'description' => esc_html__( 'A text link or button under the cut text that opens the whole text (and closes it again). Hidden when the text is short enough not to be cut.', 'refraction' ),
				'condition' => $when( [ 'box_description_display' => 'clamp' ] ),
			]
		);

		$read_more = $when( [ 'box_description_display' => 'clamp', 'box_read_more' => 'yes' ] );

		$this->add_control(
			'box_read_more_text',
			[
				'label' => esc_html__( 'Show More Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Show more', 'refraction' ),
				'condition' => $read_more,
			]
		);

		$this->add_control(
			'box_read_less_text',
			[
				'label' => esc_html__( 'Show Less Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Show less', 'refraction' ),
				'description' => esc_html__( 'Empty: the toggle disappears once the text is open.', 'refraction' ),
				'condition' => $read_more,
			]
		);

		$this->add_control(
			'box_read_more_style',
			[
				'label' => esc_html__( 'Toggle Style', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'button',
				'options' => [
					'button' => esc_html__( 'Button', 'refraction' ),
					'text' => esc_html__( 'Text link', 'refraction' ),
				],
				'condition' => $read_more,
			]
		);

		$this->add_control(
			'box_read_more_icon',
			[
				'label' => esc_html__( 'Toggle Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'skin' => 'inline',
				'label_block' => false,
				'default' => [ 'value' => 'fas fa-chevron-down', 'library' => 'fa-solid' ],
				'description' => esc_html__( 'Turns upside down when the text is open.', 'refraction' ),
				'condition' => $read_more,
			]
		);

		if ( ! $tooltips ) {
			return;
		}

		$this->add_control(
			'box_description_full_tooltip',
			[
				'label' => esc_html__( 'Full Text In A Tooltip', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'description' => esc_html__( 'Hovering shows the whole text.', 'refraction' ),
				'condition' => $when( [ 'box_description_display' => 'clamp' ] ),
			]
		);

		if ( ! empty( $args['trigger'] ) ) {
			$this->add_control(
				'box_tooltip_trigger',
				[
					'label' => esc_html__( 'Tooltip Trigger Text', 'refraction' ),
					'type' => Controls_Manager::TEXT,
					'dynamic' => [ 'active' => true ],
					'default' => esc_html__( 'More info', 'refraction' ),
					'description' => esc_html__( 'Shown in place of the text; hovering it (or reaching it with the keyboard) shows the text.', 'refraction' ),
					'condition' => $when( [ 'box_description_display' => 'tooltip' ] ),
				]
			);

			$this->add_control(
				'box_tooltip_trigger_icon',
				[
					'label' => esc_html__( 'Trigger Icon', 'refraction' ),
					'type' => Controls_Manager::ICONS,
					'skin' => 'inline',
					'label_block' => false,
					'default' => [ 'value' => 'fas fa-info-circle', 'library' => 'fa-solid' ],
					'condition' => $when( [ 'box_description_display' => 'tooltip' ] ),
				]
			);
		}

		$this->add_control(
			'box_tooltip_position',
			[
				'label' => esc_html__( 'Tooltip Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'bottom',
				'options' => [
					'bottom' => esc_html__( 'Under it', 'refraction' ),
					'top' => esc_html__( 'Above it', 'refraction' ),
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
	}

	/** Style > Show More Toggle and Style > Tooltip, after the widget's last style section. */
	protected function add_text_display_style_controls(): void {
		$toggle = '{{WRAPPER}} .refraction-read-more';

		$this->start_controls_section(
			'section_style_read_more',
			[
				'label' => esc_html__( 'Show More Toggle', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [ 'box_description_display' => 'clamp', 'box_read_more' => 'yes' ],
			]
		);

		$this->add_responsive_control(
			'box_read_more_align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
					'end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
					'stretch' => [ 'title' => esc_html__( 'Full width', 'refraction' ), 'icon' => 'rficon-h-align-stretch' ],
				],
				'selectors_dictionary' => [
					'start' => '--rf-read-more-justify: flex-start; --rf-read-more-width: auto;',
					'center' => '--rf-read-more-justify: center; --rf-read-more-width: auto;',
					'end' => '--rf-read-more-justify: flex-end; --rf-read-more-width: auto;',
					'stretch' => '--rf-read-more-justify: stretch; --rf-read-more-width: 100%;',
				],
				'selectors' => [ '{{WRAPPER}} .refraction-read-more-wrap' => '{{VALUE}}' ],
				'description' => esc_html__( 'Default: a button runs the full width, a text link sits at the start.', 'refraction' ),
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'box_read_more_typography',
				'selector' => $toggle,
			]
		);

		$this->start_controls_tabs( 'box_read_more_tabs' );

		foreach ( [ 'normal' => esc_html__( 'Normal', 'refraction' ), 'hover' => esc_html__( 'Hover', 'refraction' ) ] as $state => $label ) {
			$selector = 'hover' === $state ? $toggle . ':hover, ' . $toggle . ':focus-visible' : $toggle;

			$this->start_controls_tab( 'box_read_more_tab_' . $state, [ 'label' => $label ] );

			$this->add_control( 'box_read_more_color_' . $state, [
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $selector => 'color: {{VALUE}}; fill: {{VALUE}};' ],
			] );

			$this->add_control( 'box_read_more_bg_' . $state, [
				'label' => esc_html__( 'Background Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $selector => 'background-color: {{VALUE}};' ],
			] );

			$this->add_control( 'box_read_more_border_color_' . $state, [
				'label' => esc_html__( 'Border Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $selector => 'border-color: {{VALUE}};' ],
			] );

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_responsive_control(
			'box_read_more_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem' ],
				'selectors' => [ $toggle => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'box_read_more_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em' ],
				'selectors' => [ $toggle => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'box_read_more_border_width',
			[
				'label' => esc_html__( 'Border Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 10 ] ],
				'selectors' => [ $toggle => 'border-width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'box_read_more_spacing',
			[
				'label' => esc_html__( 'Space Above', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-read-more-wrap' => 'margin-block-start: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'box_read_more_icon_size',
			[
				'label' => esc_html__( 'Icon Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 6, 'max' => 40 ] ],
				'selectors' => [ $toggle . ' .refraction-read-more__icon' => 'font-size: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'box_read_more_icon[value]!' => '' ],
			]
		);

		$this->end_controls_section();

		if ( ! $this->text_display_tooltips ) {
			return;
		}

		$tooltip = '{{WRAPPER}} .refraction-box-tooltip.refraction-box-tooltip';

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
			'selectors' => [ $tooltip . '.refraction-box-tooltip, ' . $tooltip . '.refraction-box-tooltip *' => 'color: {{VALUE}};' ],
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
				'selectors' => [ $tooltip => 'width: {{SIZE}}{{UNIT}}; max-width: 90vw;' ],
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

		$this->add_control( 'box_tooltip_trigger_color', [
			'label' => esc_html__( 'Trigger Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'separator' => 'before',
			'selectors' => [ '{{WRAPPER}} .refraction-text-tooltip-trigger' => 'color: {{VALUE}}; fill: {{VALUE}};' ],
			'condition' => [ 'box_description_display' => 'tooltip', 'box_tooltip_trigger!' => '' ],
		] );

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'box_tooltip_trigger_typography',
				'label' => esc_html__( 'Trigger Typography', 'refraction' ),
				'selector' => '{{WRAPPER}} .refraction-text-tooltip-trigger',
				'condition' => [ 'box_description_display' => 'tooltip', 'box_tooltip_trigger!' => '' ],
			]
		);

		$this->end_controls_section();
	}

	protected function text_display_mode( array $settings ): string {
		$mode = $settings['box_description_display'] ?? 'text';

		return in_array( $mode, [ 'clamp', 'tooltip' ], true ) ? $mode : 'text';
	}

	/** The text element's classes for its display (in tooltip mode the text itself is the tooltip). */
	protected function text_display_classes( array $settings ): array {
		$classes = [ 'refraction-box-description' ];

		if ( 'tooltip' === $this->text_display_mode( $settings ) ) {
			$classes[] = 'refraction-box-tooltip';
		}

		return $classes;
	}

	/** After the text: its full text as a tooltip and the Show more toggle (when cut to lines). */
	protected function text_display_after_html( array $settings, string $text ): string {
		if ( 'clamp' !== $this->text_display_mode( $settings ) || '' === trim( $text ) ) {
			return '';
		}

		$html = '';

		if ( 'yes' === ( $settings['box_description_full_tooltip'] ?? '' ) ) {
			$html .= '<span class="refraction-box-tooltip refraction-box-tooltip--full" role="tooltip">' . $text . '</span>';
		}

		if ( 'yes' === ( $settings['box_read_more'] ?? '' ) ) {
			$more = (string) ( $settings['box_read_more_text'] ?? '' );
			$less = (string) ( $settings['box_read_less_text'] ?? '' );
			$icon = ! empty( $settings['box_read_more_icon']['value'] ) ? (string) Icons_Manager::try_get_icon_html( $settings['box_read_more_icon'], [ 'aria-hidden' => 'true' ] ) : '';

			$html .= '<div class="refraction-read-more-wrap"><button type="button" class="refraction-read-more refraction-read-more--' . ( 'text' === ( $settings['box_read_more_style'] ?? '' ) ? 'text' : 'button' ) . ( '' === trim( $less ) ? ' refraction-read-more--once' : '' ) . '" aria-expanded="false">'
				. '<span class="refraction-read-more__more">' . esc_html( '' !== trim( $more ) ? $more : __( 'Show more', 'refraction' ) ) . '</span>'
				. '<span class="refraction-read-more__less">' . esc_html( $less ) . '</span>'
				. ( '' !== $icon ? '<span class="refraction-read-more__icon">' . $icon . '</span>' : '' )
				. '</button></div>';
		}

		return $html;
	}

	/** In tooltip mode, for a widget with nothing else to hover: the trigger, then the tooltip text inside the anchor. */
	protected function text_display_trigger_html( array $settings ): string {
		$text = (string) ( $settings['box_tooltip_trigger'] ?? '' );
		$icon = ! empty( $settings['box_tooltip_trigger_icon']['value'] ) ? (string) Icons_Manager::try_get_icon_html( $settings['box_tooltip_trigger_icon'], [ 'aria-hidden' => 'true' ] ) : '';

		return '<span class="refraction-text-tooltip-trigger" tabindex="0">'
			. ( '' !== $icon ? '<span class="refraction-text-tooltip-trigger__icon">' . $icon . '</span>' : '' )
			. esc_html( '' !== trim( $text ) ? $text : __( 'More info', 'refraction' ) ) . '</span>';
	}

	/**
	 * The same in the editor's template: defines textDisplay, textDescClass, textAfter and textTrigger.
	 *
	 * @param string $text_js The text, as a JavaScript expression already safe to print.
	 */
	protected function print_text_display_template( string $text_js ): void {
		?>
		<#
		var textDisplay = -1 !== [ 'clamp', 'tooltip' ].indexOf( settings.box_description_display ) ? settings.box_description_display : 'text',
			textDescClass = 'refraction-box-description' + ( 'tooltip' === textDisplay ? ' refraction-box-tooltip' : '' ),
			textValue = <?php echo $text_js; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- A JavaScript expression given by the widget. ?>,
			textAfter = '',
			textTrigger = '';

		if ( 'clamp' === textDisplay && textValue ) {
			if ( 'yes' === settings.box_description_full_tooltip ) {
				textAfter += '<span class="refraction-box-tooltip refraction-box-tooltip--full" role="tooltip">' + textValue + '</span>';
			}

			if ( 'yes' === settings.box_read_more ) {
				var textMoreIcon = settings.box_read_more_icon && settings.box_read_more_icon.value ? refraction.helpers.renderIcon( view, settings.box_read_more_icon, { 'aria-hidden': true }, 'i', 'object' ) : null,
					textLess = ( settings.box_read_less_text || '' ).trim();

				textAfter += '<div class="refraction-read-more-wrap"><button type="button" class="refraction-read-more refraction-read-more--' + ( 'text' === settings.box_read_more_style ? 'text' : 'button' ) + ( textLess ? '' : ' refraction-read-more--once' ) + '" aria-expanded="false">'
					+ '<span class="refraction-read-more__more">' + _.escape( ( settings.box_read_more_text || '' ).trim() || 'Show more' ) + '</span>'
					+ '<span class="refraction-read-more__less">' + _.escape( textLess ) + '</span>'
					+ ( textMoreIcon && textMoreIcon.rendered ? '<span class="refraction-read-more__icon">' + textMoreIcon.value + '</span>' : '' )
					+ '</button></div>';
			}
		}

		if ( 'tooltip' === textDisplay ) {
			var textTriggerIcon = settings.box_tooltip_trigger_icon && settings.box_tooltip_trigger_icon.value ? refraction.helpers.renderIcon( view, settings.box_tooltip_trigger_icon, { 'aria-hidden': true }, 'i', 'object' ) : null;

			textTrigger = '<span class="refraction-text-tooltip-trigger" tabindex="0">'
				+ ( textTriggerIcon && textTriggerIcon.rendered ? '<span class="refraction-text-tooltip-trigger__icon">' + textTriggerIcon.value + '</span>' : '' )
				+ _.escape( ( settings.box_tooltip_trigger || '' ).trim() || 'More info' ) + '</span>';
		}
		#>
		<?php
	}
}
