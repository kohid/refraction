<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Modules\FormBuilder\Module;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Form Canvas: shows a form made in Refraction > Builder on any page, inside a box you style (width, alignment,
 * spacing, background, border, shadow), with an optional title and text above it. The form itself is the one
 * [refraction_form] prints, so it is sent, checked and saved exactly the same way, and keeps its own design.
 */
class Form_Canvas extends Widget_Base {

	public function get_name() {
		return 'rfb-form-canvas';
	}

	public function get_title() {
		return esc_html__( 'Form Canvas', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-form-horizontal';
	}

	public function get_categories() {
		return [ Editor_Forms::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'form', 'builder', 'canvas', 'contact', 'booking', 'submit', 'collection' ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-form-builder-front' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-form-builder-front' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	/** Its answers, errors and security token change with every visitor: never kept in the page cache. */
	protected function is_dynamic_content(): bool {
		return true;
	}

	/** Every page except a Form page itself (a form does not hold another form). */
	public function show_in_panel() {
		$editor = Plugin::$instance->editor;
		$post_id = $editor ? (int) $editor->get_post_id() : 0;

		return ! $post_id || ! Plugin::$instance->documents->get( $post_id ) instanceof Form_Document;
	}

	private static function forms(): array {
		$module = Plugin::$instance->modules_manager->get_modules( 'form-builder' );

		return $module ? $module->form_options() : [];
	}

	protected function register_controls() {
		$forms = self::forms();

		$this->start_controls_section( 'section_form', [ 'label' => esc_html__( 'Form', 'refraction' ) ] );

		$this->add_control( 'form', [
			'label' => esc_html__( 'Form', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [ '' => esc_html__( 'Choose a form', 'refraction' ) ] + $forms,
			'default' => $forms ? (string) array_key_first( $forms ) : '',
			'description' => $forms
				? esc_html__( 'Forms are made in Refraction > Builder (New form). Its fields, design, messages and spam checks come with it.', 'refraction' )
				: esc_html__( 'There is no form yet: make one in Refraction > Builder (New form).', 'refraction' ),
		] );

		$this->add_control( 'title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
			'separator' => 'before',
			'dynamic' => [ 'active' => true ],
		] );

		$this->add_control( 'title_tag', [
			'label' => esc_html__( 'Title HTML tag', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'h3',
			'options' => [ 'h2' => 'H2', 'h3' => 'H3', 'h4' => 'H4', 'h5' => 'H5', 'h6' => 'H6', 'div' => 'div', 'p' => 'p' ],
			'condition' => [ 'title!' => '' ],
		] );

		$this->add_control( 'description', [
			'label' => esc_html__( 'Text above the form', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'dynamic' => [ 'active' => true ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_canvas', [
			'label' => esc_html__( 'Canvas', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$canvas = '{{WRAPPER}} .rfb-canvas';

		$this->add_responsive_control( 'width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%', 'vw' ],
			'range' => [ 'px' => [ 'min' => 240, 'max' => 1600 ], '%' => [ 'min' => 20, 'max' => 100 ], 'vw' => [ 'min' => 20, 'max' => 100 ] ],
			'selectors' => [ $canvas => 'max-width: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'selectors_dictionary' => [ 'left' => 'margin-left: 0; margin-right: auto;', 'center' => 'margin-left: auto; margin-right: auto;', 'right' => 'margin-left: auto; margin-right: 0;' ],
			'selectors' => [ $canvas => '{{VALUE}}' ],
		] );

		$this->add_responsive_control( 'padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em', '%' ],
			'selectors' => [ $canvas => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'background',
			'types' => [ 'classic', 'gradient' ],
			'selector' => $canvas,
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'border',
			'selector' => $canvas,
		] );

		$this->add_responsive_control( 'radius', [
			'label' => esc_html__( 'Border radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'selectors' => [ $canvas => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}; overflow: hidden;' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'shadow',
			'selector' => $canvas,
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_heading', [
			'label' => esc_html__( 'Title and text', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_responsive_control( 'heading_align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
			],
			'selectors' => [ '{{WRAPPER}} .rfb-canvas__head' => 'text-align: {{VALUE}};' ],
		] );

		$this->add_control( 'title_color', [
			'label' => esc_html__( 'Title color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rfb-canvas__title' => 'color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'title_typography',
			'label' => esc_html__( 'Title', 'refraction' ),
			'selector' => '{{WRAPPER}} .rfb-canvas__title',
		] );

		$this->add_control( 'text_color', [
			'label' => esc_html__( 'Text color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rfb-canvas__text' => 'color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'text_typography',
			'label' => esc_html__( 'Text', 'refraction' ),
			'selector' => '{{WRAPPER}} .rfb-canvas__text',
		] );

		$this->add_responsive_control( 'head_space', [
			'label' => esc_html__( 'Space below', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rfb-canvas__head' => 'margin-bottom: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();

		// The form's own design is set in its page settings (the cog); these override it on this page only. Its colors
		// are written on the form itself, so the overrides need !important to win.
		$this->start_controls_section( 'section_style_form', [
			'label' => esc_html__( 'Form colors on this page', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		// The form box and, inside it, the Form page's own container (which writes the form's colors again).
		$form = '{{WRAPPER}} .rfb-form-wrap, {{WRAPPER}} .rfb-form-wrap .rfb-front';

		foreach ( [
			'form_primary' => [ esc_html__( 'Main color (buttons, focus)', 'refraction' ), '--rfb-primary: {{VALUE}} !important; --rfb-button-bg: {{VALUE}} !important; --rfb-focus: {{VALUE}} !important;' ],
			'form_button_text' => [ esc_html__( 'Button text', 'refraction' ), '--rfb-button-text: {{VALUE}} !important;' ],
			'form_label' => [ esc_html__( 'Labels', 'refraction' ), '--rfb-label: {{VALUE}} !important; --rfb-ink: {{VALUE}} !important;' ],
			'form_input_bg' => [ esc_html__( 'Field background', 'refraction' ), '--rfb-input-bg: {{VALUE}} !important;' ],
			'form_input_border' => [ esc_html__( 'Field border', 'refraction' ), '--rfb-input-border: {{VALUE}} !important;' ],
			'form_input_text' => [ esc_html__( 'Field text', 'refraction' ), '--rfb-input-text: {{VALUE}} !important;' ],
			'form_bg' => [ esc_html__( 'Form background', 'refraction' ), '--rfb-form-bg: {{VALUE}} !important;' ],
		] as $key => [ $label, $css ] ) {
			$this->add_control( $key, [
				'label' => $label,
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $form => $css ],
			] );
		}

		$this->add_control( 'form_radius', [
			'label' => esc_html__( 'Field and button corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ $form => '--rfb-radius: {{SIZE}}px !important;' ],
		] );

		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$slug = (string) ( $settings['form'] ?? '' );
		$forms = self::forms();
		$editing = Plugin::$instance->editor->is_edit_mode() || Plugin::$instance->preview->is_preview_mode();

		if ( '' === $slug || ! isset( $forms[ $slug ] ) ) {
			if ( $editing || current_user_can( 'manage_options' ) ) {
				echo '<div class="rfb-front"><div class="rfb-alert rfb-alert-warning" role="status">' . esc_html( $forms ? __( 'Form Canvas: choose a form in the widget settings.', 'refraction' ) : __( 'Form Canvas: make a form in Refraction > Builder first (New form).', 'refraction' ) ) . '</div></div>';
			}

			return;
		}

		$title = trim( (string) ( $settings['title'] ?? '' ) );
		$text = trim( (string) ( $settings['description'] ?? '' ) );
		$tag = in_array( $settings['title_tag'] ?? '', [ 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p' ], true ) ? $settings['title_tag'] : 'h3';
		?>
		<div class="rfb-canvas">
			<?php if ( '' !== $title || '' !== $text ) : ?>
				<div class="rfb-canvas__head">
					<?php if ( '' !== $title ) : ?>
						<<?php echo esc_html( $tag ); ?> class="rfb-canvas__title"><?php echo esc_html( $title ); ?></<?php echo esc_html( $tag ); ?>>
					<?php endif; ?>
					<?php if ( '' !== $text ) : ?>
						<div class="rfb-canvas__text"><?php echo wp_kses_post( nl2br( esc_html( $text ) ) ); ?></div>
					<?php endif; ?>
				</div>
			<?php endif; ?>
			<?php echo Module::form_html( $slug ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- The form shortcode escapes its output. ?>
		</div>
		<?php
	}
}
