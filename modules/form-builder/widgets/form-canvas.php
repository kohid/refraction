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

	/** The prefill rows as the shortcode's fill="key=value;key=value". */
	public static function fill_text( array $rows ): string {
		$pairs = [];

		foreach ( $rows as $row ) {
			$key = \Refraction\Modules\FormBuilder\Classes\Schema::key( $row['key'] ?? '' );
			$value = str_replace( [ ';', '=', '"', ']' ], '', (string) ( $row['value'] ?? '' ) );

			if ( '' !== $key ) {
				$pairs[] = $key . '=' . $value;
			}
		}

		return implode( ';', $pairs );
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

		// Prefill (0.90.0): one form for many pages, each opening with its own service or tour already chosen.
		$fill = new \Refraction\Repeater();
		$fill->add_control( 'key', [ 'label' => esc_html__( 'Field key', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'service' ] );
		$fill->add_control( 'value', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'airport', 'description' => esc_html__( 'For choices, the saved value (value|Label: the value); for choice cards, the card\'s field key.', 'refraction' ) ] );
		$this->add_control( 'fill', [
			'label' => esc_html__( 'Answers filled in on this page', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $fill->get_controls(),
			'title_field' => '{{{ key }}} = {{{ value }}}',
			'default' => [],
			'separator' => 'before',
			'description' => esc_html__( 'The form opens with these answers given; visitors can still change them. A link can do the same: ?fill_service=airport.', 'refraction' ),
		] );

		// After sending (0.147.0): the editor shows the confirmation in place of the form, with a sample reference.
		$this->add_control( 'done_preview', [
			'label' => esc_html__( 'Show the message after sending', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'separator' => 'before',
			'description' => esc_html__( 'Editor only: shows what visitors see once they have sent the form, with a sample reference, so you can style it (Style > Message after sending). Its texts are in the form\'s settings, under "After sending".', 'refraction' ),
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
		$this->register_done_style();
	}

	/** Style > Message after sending (0.147.0). */
	private function register_done_style(): void {
		$this->start_controls_section( 'section_style_done', [ 'label' => esc_html__( 'Message after sending', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'done_style_hint', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Turn on "Show the message after sending" (Content tab) to see it here.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
			'condition' => [ 'done_preview!' => 'yes' ],
		] );
		$done = '{{WRAPPER}} .rfb-done';
		$this->add_responsive_control( 'done_align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'eicon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'eicon-text-align-center' ],
			],
			'selectors_dictionary' => [ 'flex-start' => '--rfb-done-align: flex-start; --rfb-done-text-align: left;', 'center' => '--rfb-done-align: center; --rfb-done-text-align: center;' ],
			'selectors' => [ $done => '{{VALUE}}' ],
		] );
		$this->add_responsive_control( 'done_width', [
			'label' => esc_html__( 'Max width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => 240, 'max' => 1200 ], '%' => [ 'min' => 20, 'max' => 100 ] ],
			'selectors' => [ $done => '--rfb-done-max: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_control( 'done_accent', [ 'label' => esc_html__( 'Accent (check and reference box)', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $done => '--rfb-done-accent: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Background::get_type(), [ 'name' => 'done_bg', 'types' => [ 'classic', 'gradient' ], 'selector' => $done ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'done_border', 'selector' => $done ] );
		$this->add_responsive_control( 'done_radius', [
			'label' => esc_html__( 'Corner radius', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'selectors' => [ $done => 'border-radius: {{SIZE}}px;' ],
		] );
		$this->add_responsive_control( 'done_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ $done => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'done_shadow', 'selector' => $done ] );

		$this->add_control( 'done_icon_heading', [ 'label' => esc_html__( 'Check', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->add_control( 'done_icon_show', [
			'label' => esc_html__( 'Check mark', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'yes',
			'options' => [ 'yes' => esc_html__( 'Show', 'refraction' ), 'no' => esc_html__( 'Hide', 'refraction' ) ],
			'selectors_dictionary' => [ 'no' => 'display: none;', 'yes' => 'display: inline-flex;' ],
			'selectors' => [ '{{WRAPPER}} .rfb-done__icon' => '{{VALUE}}' ],
		] );
		$this->add_responsive_control( 'done_icon_size', [
			'label' => esc_html__( 'Size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 12, 'max' => 80 ] ],
			'selectors' => [ $done => '--rfb-done-icon: {{SIZE}}px; --rfb-done-icon-box: calc({{SIZE}}px * 2);' ],
			'condition' => [ 'done_icon_show' => 'yes' ],
		] );
		$this->add_control( 'done_icon_bg', [ 'label' => esc_html__( 'Circle color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-done__icon' => 'background: {{VALUE}};' ], 'condition' => [ 'done_icon_show' => 'yes' ] ] );

		$this->add_control( 'done_text_heading', [ 'label' => esc_html__( 'Heading and message', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->add_control( 'done_heading_color', [ 'label' => esc_html__( 'Heading color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-done__heading' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'done_heading_typography', 'label' => esc_html__( 'Heading typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rfb-done__heading' ] );
		$this->add_control( 'done_message_color', [ 'label' => esc_html__( 'Message color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-done__message' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'done_message_typography', 'label' => esc_html__( 'Message typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rfb-done__message' ] );

		$this->add_control( 'done_ref_heading', [ 'label' => esc_html__( 'Reference box', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$ref = '{{WRAPPER}} .rfb-done__ref';
		$this->add_control( 'done_ref_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $ref => 'background: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'done_ref_border', 'selector' => $ref ] );
		$this->add_responsive_control( 'done_ref_radius', [
			'label' => esc_html__( 'Corner radius', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ $ref => 'border-radius: {{SIZE}}px;' ],
		] );
		$this->add_responsive_control( 'done_ref_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px' ],
			'selectors' => [ $ref => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );
		$this->add_control( 'done_ref_label_color', [ 'label' => esc_html__( 'Label color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-done__ref-label' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'done_ref_label_typography', 'label' => esc_html__( 'Label typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rfb-done__ref-label' ] );
		$this->add_control( 'done_ref_color', [ 'label' => esc_html__( 'Number color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-done .rfb-reference' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'done_ref_typography', 'label' => esc_html__( 'Number typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rfb-done__ref-row .rfb-reference' ] );
		$this->add_control( 'done_copy_color', [ 'label' => esc_html__( 'Copy button text', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-done__copy' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'done_copy_bg', [ 'label' => esc_html__( 'Copy button background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-done__copy' => 'background: {{VALUE}};' ] ] );
		$this->add_control( 'done_note_color', [ 'label' => esc_html__( 'Note color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-done__ref-note' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'done_again_color', [ 'label' => esc_html__( '"Send another" link color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => [ '{{WRAPPER}} .rfb-done__again' => 'color: {{VALUE}};' ] ] );
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
			<?php if ( $editing && 'yes' === ( $settings['done_preview'] ?? '' ) ) : ?>
				<?php echo Module::done_preview_html( $slug ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped where it is built. ?>
			<?php else : ?>
				<?php echo Module::form_html( $slug, self::fill_text( (array) ( $settings['fill'] ?? [] ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- The form shortcode escapes its output. ?>
			<?php endif; ?>
		</div>
		<?php
	}
}
