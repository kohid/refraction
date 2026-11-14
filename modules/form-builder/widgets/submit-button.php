<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\FormBuilder\Classes\Form_Buttons;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The form's submit button, placed and styled where you want it. Without one, the form prints a plain button at the end. */
class Submit_Button extends Widget_Base {

	/** The button, its class repeated so the Style tab wins over the form's own button look and the theme's. */
	const BUTTON = '{{WRAPPER}} .rfb-btn.rfb-submit.rfb-submit.rfb-submit';

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
		// The Button widget's Content settings (0.99.0): type, size, icon, its place and space, the button's ID. Links do
		// not apply: this button sends the form.
		Form_Buttons::controls( $this, '', self::BUTTON, [ 'heading' => esc_html__( 'Look and icon', 'refraction' ) ] );
		$this->end_controls_section();

		// The Button widget's Style tab (0.99.0). Setting names stay those of 0.91 (typography, color_normal...).
		$this->start_controls_section( 'section_button_style', [ 'label' => esc_html__( 'Button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		Form_Buttons::style_controls( $this, '', self::BUTTON, [ 'legacy' => true ] );
		$this->end_controls_section();
	}

	protected function render() {
		$text = (string) $this->get_settings_for_display( 'text' );
		$text = '' !== trim( $text ) ? $text : __( 'Submit', 'refraction' );
		$settings = $this->get_settings_for_display();

		// In the editor the button does nothing; on the site it sends the form it sits in.
		echo '<div class="rfb-actions"><button type="submit"' . Form_Buttons::id_attribute( $settings, '' ) . ' class="rfb-btn rfb-btn-primary rfb-submit' . esc_attr( Form_Buttons::classes( $settings, '' ) ) . '">' . Form_Buttons::inner( $settings, '', $text, 'rfb-submit-icon', 'rfb-submit-text' ) . '</button></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
	}
}
