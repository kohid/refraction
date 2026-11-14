<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The form's submit button, placed and styled where you want it. Without one, the form prints a plain button at the end. */
class Submit_Button extends Widget_Base {

	public function get_name() {
		return 'rfb-submit';
	}

	public function get_title() {
		return esc_html__( 'Submit button', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-button';
	}

	public function get_categories() {
		return [ Editor_Forms::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'form', 'submit', 'send', 'button' ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-form-builder-front' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	public function show_in_panel() {
		$editor = Plugin::$instance->editor;
		$post_id = $editor ? (int) $editor->get_post_id() : 0;

		return ! $post_id || Plugin::$instance->documents->get( $post_id ) instanceof Form_Document;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_button', [ 'label' => esc_html__( 'Submit button', 'refraction' ) ] );
		$this->add_control( 'text', [ 'label' => esc_html__( 'Text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Submit', 'refraction' ) ] );
		$this->add_responsive_control( 'align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'flex-end' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				'stretch' => [ 'title' => esc_html__( 'Full width', 'refraction' ), 'icon' => 'rficon-text-align-justify' ],
			],
			// A column of one: align-items places the button, and "stretch" makes it full width.
			'selectors' => [ '{{WRAPPER}} .rfb-actions' => 'display: flex; flex-direction: column; align-items: {{VALUE}};' ],
		] );
		// An icon beside the text (0.95.0), on the left or the right.
		$this->add_control( 'icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'skin' => 'inline',
			'label_block' => false,
			'exclude_inline_options' => [ 'svg' ],
			'separator' => 'before',
		] );
		$this->add_control( 'icon_position', [
			'label' => esc_html__( 'Icon position', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'default' => 'left',
			'toggle' => false,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'condition' => [ 'icon[value]!' => '' ],
		] );
		$this->add_responsive_control( 'icon_gap', [
			'label' => esc_html__( 'Space between icon and text', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rfb-submit' => 'gap: {{SIZE}}{{UNIT}};' ],
			'condition' => [ 'icon[value]!' => '' ],
		] );
		$this->add_responsive_control( 'icon_size', [
			'label' => esc_html__( 'Icon size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 8, 'max' => 48 ] ],
			'selectors' => [ '{{WRAPPER}} .rfb-submit-icon' => 'font-size: {{SIZE}}{{UNIT}};' ],
			'condition' => [ 'icon[value]!' => '' ],
		] );
		$this->end_controls_section();

		$button = '{{WRAPPER}} .rfb-submit';
		$this->start_controls_section( 'section_button_style', [ 'label' => esc_html__( 'Button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'typography', 'selector' => $button ] );
		$this->start_controls_tabs( 'button_states' );

		foreach ( [ 'normal' => [ esc_html__( 'Normal', 'refraction' ), '' ], 'hover' => [ esc_html__( 'Hover', 'refraction' ), ':hover' ] ] as $state => $spec ) {
			$this->start_controls_tab( 'button_' . $state, [ 'label' => $spec[0] ] );
			$this->add_control( 'color_' . $state, [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . $spec[1] => 'color: {{VALUE}};' ] ] );
			$this->add_control( 'bg_' . $state, [ 'label' => esc_html__( 'Background color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . $spec[1] => 'background-color: {{VALUE}};' ] ] );
			$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'border_' . $state, 'selector' => $button . $spec[1] ] );
			$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'shadow_' . $state, 'selector' => $button . $spec[1] ] );
			$this->end_controls_tab();
		}

		$this->end_controls_tabs();
		$this->add_responsive_control( 'radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%' ], 'separator' => 'before', 'selectors' => [ $button => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $button => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->end_controls_section();
	}

	protected function render() {
		$text = (string) $this->get_settings_for_display( 'text' );
		$text = '' !== trim( $text ) ? $text : __( 'Submit', 'refraction' );
		$settings = $this->get_settings_for_display();
		$icon = '';

		if ( ! empty( $settings['icon']['value'] ) ) {
			$icon = (string) Icons_Manager::try_get_icon_html( $settings['icon'], [ 'aria-hidden' => 'true' ] );
			$icon = '' !== $icon ? '<span class="rfb-submit-icon" aria-hidden="true">' . $icon . '</span>' : '';
		}

		$right = 'right' === ( $settings['icon_position'] ?? 'left' );
		$label = '<span class="rfb-submit-text">' . esc_html( $text ) . '</span>';

		// In the editor the button does nothing; on the site it sends the form it sits in.
		echo '<div class="rfb-actions"><button type="submit" class="rfb-btn rfb-btn-primary rfb-submit' . ( '' !== $icon ? ' has-icon' : '' ) . '">' . ( $right ? $label . $icon : $icon . $label ) . '</button></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
	}
}
