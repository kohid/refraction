<?php
namespace Refraction\Modules\Forms\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\Forms\Classes\Form_Definition;
use Refraction\Modules\Forms\Classes\Form_Renderer;
use Refraction\Plugin;
use Refraction\Repeater;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Form widget: fields, steps, actions after submit and spam protection. See docs/refraction/forms.md.
 */
class Form extends Widget_Base {

	public function get_name() {
		return 'refraction-form';
	}

	public function get_title() {
		return esc_html__( 'Form', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-form-horizontal';
	}

	public function get_categories() {
		return [ 'general' ];
	}

	public function get_keywords() {
		return [ 'form', 'contact', 'email', 'field', 'input', 'submit', 'subscribe' ];
	}

	public function get_script_depends() {
		return [ 'refraction-forms' ];
	}

	public function get_style_depends() {
		return [ 'refraction-forms' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	private function width_options(): array {
		return [
			'100' => '100%',
			'80' => '80%',
			'75' => '75%',
			'66' => '66%',
			'60' => '60%',
			'50' => '50%',
			'40' => '40%',
			'33' => '33%',
			'25' => '25%',
			'20' => '20%',
		];
	}

	protected function register_controls() {
		$this->register_fields_controls();
		$this->register_button_controls();
		$this->register_steps_controls();
		$this->register_actions_controls();
		$this->register_options_controls();
		$this->register_style_controls();
	}

	private function register_fields_controls(): void {
		$this->start_controls_section( 'section_form_fields', [ 'label' => esc_html__( 'Form Fields', 'refraction' ) ] );

		$this->add_control( 'form_name', [
			'label' => esc_html__( 'Form Name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'New Form', 'refraction' ),
			'placeholder' => esc_html__( 'Form Name', 'refraction' ),
			'description' => esc_html__( 'Shown in the Submissions list and available as [form_name].', 'refraction' ),
		] );

		$repeater = new Repeater();

		$repeater->add_control( 'field_type', [
			'label' => esc_html__( 'Type', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'text',
			'options' => [
				'text' => esc_html__( 'Text', 'refraction' ),
				'email' => esc_html__( 'Email', 'refraction' ),
				'textarea' => esc_html__( 'Textarea', 'refraction' ),
				'url' => esc_html__( 'URL', 'refraction' ),
				'tel' => esc_html__( 'Tel', 'refraction' ),
				'number' => esc_html__( 'Number', 'refraction' ),
				'select' => esc_html__( 'Select', 'refraction' ),
				'radio' => esc_html__( 'Radio', 'refraction' ),
				'checkbox' => esc_html__( 'Checkbox', 'refraction' ),
				'acceptance' => esc_html__( 'Acceptance', 'refraction' ),
				'date' => esc_html__( 'Date', 'refraction' ),
				'time' => esc_html__( 'Time', 'refraction' ),
				'file' => esc_html__( 'File Upload', 'refraction' ),
				'password' => esc_html__( 'Password', 'refraction' ),
				'html' => esc_html__( 'HTML', 'refraction' ),
				'hidden' => esc_html__( 'Hidden', 'refraction' ),
				'step' => esc_html__( 'Step', 'refraction' ),
				'honeypot' => esc_html__( 'Honeypot', 'refraction' ),
			],
		] );

		$repeater->add_control( 'field_label', [
			'label' => esc_html__( 'Label', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '',
			'description' => esc_html__( 'For a Step this is the step title.', 'refraction' ),
		] );

		$repeater->add_control( 'placeholder', [
			'label' => esc_html__( 'Placeholder', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '',
			'condition' => [ 'field_type' => [ 'text', 'email', 'textarea', 'url', 'tel', 'number', 'select', 'password' ] ],
		] );

		$repeater->add_control( 'required', [
			'label' => esc_html__( 'Required', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'return_value' => 'true',
			'default' => '',
			'condition' => [ 'field_type!' => [ 'html', 'step', 'hidden', 'honeypot' ] ],
		] );

		$repeater->add_control( 'field_options', [
			'label' => esc_html__( 'Options', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'default' => '',
			'description' => esc_html__( 'One option per line. Use "Label|value" to show a different text than the stored value.', 'refraction' ),
			'condition' => [ 'field_type' => [ 'select', 'radio', 'checkbox' ] ],
		] );

		$repeater->add_control( 'inline_list', [
			'label' => esc_html__( 'Inline List', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'return_value' => 'true',
			'default' => '',
			'condition' => [ 'field_type' => [ 'radio', 'checkbox' ] ],
		] );

		$repeater->add_control( 'field_html', [
			'label' => esc_html__( 'HTML', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'default' => '',
			'condition' => [ 'field_type' => 'html' ],
		] );

		$repeater->add_control( 'file_types', [
			'label' => esc_html__( 'Allowed File Types', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => 'jpg, jpeg, png, gif, pdf, doc, docx, txt',
			'description' => esc_html__( 'Comma separated extensions. Script, HTML and SVG files are always refused. Files are kept only when the "Collect Submissions" action is on.', 'refraction' ),
			'condition' => [ 'field_type' => 'file' ],
		] );

		$repeater->add_control( 'file_max_size', [
			'label' => esc_html__( 'Max. File Size (MB)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 2,
			'min' => 0.1,
			'max' => 64,
			'step' => 0.1,
			'condition' => [ 'field_type' => 'file' ],
		] );

		$repeater->add_control( 'min_value', [
			'label' => esc_html__( 'Min. Value', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'condition' => [ 'field_type' => 'number' ],
		] );

		$repeater->add_control( 'max_value', [
			'label' => esc_html__( 'Max. Value', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'condition' => [ 'field_type' => 'number' ],
		] );

		$repeater->add_control( 'rows', [
			'label' => esc_html__( 'Rows', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 4,
			'min' => 2,
			'max' => 30,
			'condition' => [ 'field_type' => 'textarea' ],
		] );

		$repeater->add_control( 'field_value', [
			'label' => esc_html__( 'Default Value', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '',
			'dynamic' => [ 'active' => true ],
			'condition' => [ 'field_type' => [ 'text', 'email', 'textarea', 'url', 'tel', 'number', 'select', 'radio', 'checkbox', 'acceptance', 'date', 'time', 'hidden' ] ],
		] );

		$repeater->add_responsive_control( 'field_width', [
			'label' => esc_html__( 'Column Width', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => $this->width_options(),
			'default' => '100',
			'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}' => 'width: {{VALUE}}%;' ],
			'condition' => [ 'field_type!' => [ 'hidden', 'honeypot', 'step' ] ],
		] );

		$repeater->add_control( 'custom_id', [
			'label' => esc_html__( 'ID', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '',
			'description' => esc_html__( 'Used in [field id="..."] tags, the CSV export and webhooks. Letters, numbers, dash and underscore.', 'refraction' ),
			'condition' => [ 'field_type!' => 'step' ],
		] );

		$this->add_control( 'form_fields', [
			'type' => Controls_Manager::REPEATER,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'custom_id' => 'name', 'field_type' => 'text', 'field_label' => esc_html__( 'Name', 'refraction' ), 'placeholder' => esc_html__( 'Name', 'refraction' ), 'required' => 'true', 'field_width' => '100' ],
				[ 'custom_id' => 'email', 'field_type' => 'email', 'field_label' => esc_html__( 'Email', 'refraction' ), 'placeholder' => esc_html__( 'Email', 'refraction' ), 'required' => 'true', 'field_width' => '100' ],
				[ 'custom_id' => 'message', 'field_type' => 'textarea', 'field_label' => esc_html__( 'Message', 'refraction' ), 'placeholder' => esc_html__( 'Message', 'refraction' ), 'required' => 'true', 'field_width' => '100' ],
			],
			'title_field' => '{{{ field_label || field_type }}} ({{{ field_type }}})',
		] );

		$this->add_control( 'input_size', [
			'label' => esc_html__( 'Input Size', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'md',
			'options' => [
				'xs' => esc_html__( 'Extra Small', 'refraction' ),
				'sm' => esc_html__( 'Small', 'refraction' ),
				'md' => esc_html__( 'Medium', 'refraction' ),
				'lg' => esc_html__( 'Large', 'refraction' ),
				'xl' => esc_html__( 'Extra Large', 'refraction' ),
			],
			'separator' => 'before',
		] );

		$this->add_control( 'show_labels', [
			'label' => esc_html__( 'Label', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'label_on' => esc_html__( 'Show', 'refraction' ),
			'label_off' => esc_html__( 'Hide', 'refraction' ),
			'return_value' => 'true',
			'default' => 'true',
		] );

		$this->add_control( 'label_position', [
			'label' => esc_html__( 'Label Position', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'above',
			'options' => [
				'above' => esc_html__( 'Above', 'refraction' ),
				'inline' => esc_html__( 'Inline', 'refraction' ),
				'hidden' => esc_html__( 'Hidden (screen readers only)', 'refraction' ),
			],
			'condition' => [ 'show_labels!' => '' ],
		] );

		$this->add_control( 'mark_required', [
			'label' => esc_html__( 'Required Mark', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'label_on' => esc_html__( 'Show', 'refraction' ),
			'label_off' => esc_html__( 'Hide', 'refraction' ),
			'return_value' => 'true',
			'default' => 'true',
		] );

		$this->end_controls_section();
	}

	private function register_button_controls(): void {
		$this->start_controls_section( 'section_button', [ 'label' => esc_html__( 'Submit Button', 'refraction' ) ] );

		$this->add_control( 'button_text', [
			'label' => esc_html__( 'Text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Send', 'refraction' ),
		] );

		$this->add_control( 'button_size', [
			'label' => esc_html__( 'Size', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'md',
			'options' => [
				'xs' => esc_html__( 'Extra Small', 'refraction' ),
				'sm' => esc_html__( 'Small', 'refraction' ),
				'md' => esc_html__( 'Medium', 'refraction' ),
				'lg' => esc_html__( 'Large', 'refraction' ),
				'xl' => esc_html__( 'Extra Large', 'refraction' ),
			],
			'prefix_class' => 'refraction-button-size-',
		] );

		$this->add_responsive_control( 'button_width', [
			'label' => esc_html__( 'Column Width', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [ '' => esc_html__( 'Auto', 'refraction' ) ] + $this->width_options(),
			'default' => '',
			'selectors' => [ '{{WRAPPER}} .refraction-form__submit' => 'width: {{VALUE}}%;' ],
		] );

		$this->add_responsive_control( 'button_align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'flex-end' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
			],
			'default' => 'flex-start',
			'selectors' => [ '{{WRAPPER}} .refraction-form__actions' => 'justify-content: {{VALUE}};' ],
		] );

		$this->add_control( 'button_icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'skin' => 'inline',
			'label_block' => false,
		] );

		$this->add_control( 'button_icon_align', [
			'label' => esc_html__( 'Icon Position', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'left',
			'options' => [ 'left' => esc_html__( 'Before', 'refraction' ), 'right' => esc_html__( 'After', 'refraction' ) ],
			'condition' => [ 'button_icon[value]!' => '' ],
		] );

		$this->add_control( 'button_icon_indent', [
			'label' => esc_html__( 'Icon Spacing', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 50 ] ],
			'selectors' => [ '{{WRAPPER}} .refraction-form__submit-content' => 'gap: {{SIZE}}{{UNIT}};' ],
			'condition' => [ 'button_icon[value]!' => '' ],
		] );

		$this->end_controls_section();
	}

	private function register_steps_controls(): void {
		$this->start_controls_section( 'section_steps', [ 'label' => esc_html__( 'Steps', 'refraction' ) ] );

		$this->add_control( 'steps_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Add a field of type "Step" to split the form into several pages. The fields after a Step belong to that step.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );

		$this->add_control( 'step_type', [
			'label' => esc_html__( 'Progress Indicator', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'number_text',
			'options' => [
				'number_text' => esc_html__( 'Number and Title', 'refraction' ),
				'number' => esc_html__( 'Number', 'refraction' ),
				'text' => esc_html__( 'Title', 'refraction' ),
				'bar' => esc_html__( 'Progress Bar', 'refraction' ),
				'none' => esc_html__( 'None', 'refraction' ),
			],
		] );

		$this->add_control( 'step_prev_text', [ 'label' => esc_html__( 'Previous Button', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Previous', 'refraction' ) ] );
		$this->add_control( 'step_next_text', [ 'label' => esc_html__( 'Next Button', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Next', 'refraction' ) ] );

		$this->end_controls_section();
	}

	private function register_actions_controls(): void {
		$this->start_controls_section( 'section_actions', [ 'label' => esc_html__( 'Actions After Submit', 'refraction' ) ] );

		$r = new Repeater();

		$r->add_control( 'action_type', [
			'label' => esc_html__( 'Action', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'email',
			'options' => [
				'collect' => esc_html__( 'Collect Submissions', 'refraction' ),
				'email' => esc_html__( 'Email', 'refraction' ),
				'email2' => esc_html__( 'Email 2 (auto-responder)', 'refraction' ),
				'redirect' => esc_html__( 'Redirect', 'refraction' ),
				'webhook' => esc_html__( 'Webhook', 'refraction' ),
				'discord' => esc_html__( 'Discord (incoming webhook)', 'refraction' ),
				'slack' => esc_html__( 'Slack (incoming webhook)', 'refraction' ),
			],
		] );

		$r->add_control( 'collect_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Stores every submission in the database (Refraction > Submissions). Uploaded files are kept in a protected folder. Passwords are never stored.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
			'condition' => [ 'action_type' => 'collect' ],
		] );

		foreach ( [ 'email', 'email2' ] as $prefix ) {
			$is2 = 'email2' === $prefix;
			$cond = [ 'action_type' => $prefix ];
			$p = $prefix . '_';

			$r->add_control( $p . 'to', [
				'label' => esc_html__( 'To', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => $is2 ? '[field id="email"]' : get_option( 'admin_email' ),
				'description' => esc_html__( 'Separate several addresses with commas. A [field id="..."] tag must hold exactly one address.', 'refraction' ),
				'condition' => $cond,
			] );
			$r->add_control( $p . 'subject', [
				'label' => esc_html__( 'Subject', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => $is2 ? esc_html__( 'Thank you for contacting [site_name]', 'refraction' ) : esc_html__( 'New message from [site_name]', 'refraction' ),
				'condition' => $cond,
			] );
			$r->add_control( $p . 'content', [
				'label' => esc_html__( 'Message', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => $is2 ? esc_html__( "Hi,\n\nThanks for your message. We received the following and will get back to you soon:\n\n[all-fields]", 'refraction' ) : '[all-fields]',
				'description' => esc_html__( 'Tags: [all-fields], [field id="..."], [form_name], [site_name], [site_url], [page_url], [date], [time].', 'refraction' ),
				'condition' => $cond,
			] );
			$r->add_control( $p . 'from', [
				'label' => esc_html__( 'From Email', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '',
				'description' => esc_html__( 'Leave empty to use the WordPress default sender.', 'refraction' ),
				'condition' => $cond,
			] );
			$r->add_control( $p . 'from_name', [ 'label' => esc_html__( 'From Name', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => '', 'condition' => $cond ] );
			$r->add_control( $p . 'reply_to', [ 'label' => esc_html__( 'Reply-To', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => $is2 ? '' : '[field id="email"]', 'condition' => $cond ] );
			$r->add_control( $p . 'cc', [ 'label' => esc_html__( 'Cc', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => '', 'condition' => $cond ] );
			$r->add_control( $p . 'bcc', [ 'label' => esc_html__( 'Bcc', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => '', 'condition' => $cond ] );
			$r->add_control( $p . 'format', [
				'label' => esc_html__( 'Send As', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'html',
				'options' => [ 'html' => esc_html__( 'HTML', 'refraction' ), 'plain' => esc_html__( 'Plain', 'refraction' ) ],
				'condition' => $cond,
			] );
		}

		$r->add_control( 'redirect_url', [
			'label' => esc_html__( 'Redirect To', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'https://your-link.com or /thank-you/', 'refraction' ),
			'description' => esc_html__( 'Field tags are URL-encoded when used here.', 'refraction' ),
			'condition' => [ 'action_type' => 'redirect' ],
		] );

		$r->add_control( 'webhook_url', [
			'label' => esc_html__( 'Webhook URL', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => 'https://example.com/hook',
			'description' => esc_html__( 'The submission is sent from your server to this address when the form is submitted. This is the only data Refraction ever sends out, and only where you point it.', 'refraction' ),
			'condition' => [ 'action_type' => [ 'webhook', 'discord', 'slack' ] ],
		] );
		$r->add_control( 'webhook_format', [
			'label' => esc_html__( 'Format', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'json',
			'options' => [ 'json' => 'JSON', 'form' => esc_html__( 'Form (urlencoded)', 'refraction' ) ],
			'condition' => [ 'action_type' => 'webhook' ],
		] );
		$r->add_control( 'webhook_message', [
			'label' => esc_html__( 'Message', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'default' => "New submission from [form_name]:\n[all-fields]",
			'condition' => [ 'action_type' => [ 'discord', 'slack' ] ],
		] );
		$r->add_control( 'webhook_timeout', [
			'label' => esc_html__( 'Timeout (seconds)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 10,
			'min' => 1,
			'max' => 30,
			'condition' => [ 'action_type' => [ 'webhook', 'discord', 'slack' ] ],
		] );

		$this->add_control( 'submit_actions', [
			'type' => Controls_Manager::REPEATER,
			'fields' => $r->get_controls(),
			'default' => [
				[ 'action_type' => 'collect' ],
				[ 'action_type' => 'email' ],
			],
			'title_field' => '{{{ action_type }}}',
		] );

		$this->end_controls_section();
	}

	private function register_options_controls(): void {
		$this->start_controls_section( 'section_options', [ 'label' => esc_html__( 'Messages and Spam Protection', 'refraction' ) ] );

		$this->add_control( 'success_message', [ 'label' => esc_html__( 'Success Message', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'The form was sent successfully.', 'refraction' ) ] );
		$this->add_control( 'error_message', [ 'label' => esc_html__( 'Error Message', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'An error occurred. Please try again.', 'refraction' ) ] );
		$this->add_control( 'invalid_message', [ 'label' => esc_html__( 'Invalid Form Message', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Please check the highlighted fields.', 'refraction' ) ] );

		$this->add_control( 'spam_heading', [ 'label' => esc_html__( 'Spam Protection', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );

		$this->add_control( 'honeypot', [ 'label' => esc_html__( 'Honeypot', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'return_value' => 'true', 'default' => 'true', 'description' => esc_html__( 'A hidden field that people leave empty and bots fill in.', 'refraction' ) ] );
		$this->add_control( 'min_submit_time', [ 'label' => esc_html__( 'Minimum Fill Time (seconds)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 3, 'min' => 0, 'max' => 120, 'description' => esc_html__( 'Submissions sent faster than this are refused. 0 turns the check off.', 'refraction' ) ] );
		$this->add_control( 'rate_limit_max', [ 'label' => esc_html__( 'Max. Submissions per Visitor', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 5, 'min' => 0, 'max' => 1000, 'description' => esc_html__( 'Per IP address in the time window below. 0 turns the limit off.', 'refraction' ) ] );
		$this->add_control( 'rate_limit_window', [ 'label' => esc_html__( 'Time Window (minutes)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 10, 'min' => 1, 'max' => 1440 ] );
		$this->add_control( 'math_question', [ 'label' => esc_html__( 'Math Question', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'return_value' => 'true', 'default' => '', 'description' => esc_html__( 'Asks a simple addition. Runs entirely on your site.', 'refraction' ) ] );
		$this->add_control( 'captcha', [
			'label' => esc_html__( 'reCAPTCHA / hCaptcha / Turnstile', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'return_value' => 'true',
			'default' => '',
			'description' => esc_html__( 'Uses the service and keys you set in Refraction > Submissions > Settings. These are external services: visitors load the provider script. Does nothing until a provider is configured.', 'refraction' ),
		] );

		$this->end_controls_section();
	}

	private function field_style( string $prefix, string $selector ): void {
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => $prefix . '_typography', 'selector' => $selector ] );
	}

	private function register_style_controls(): void {
		$wrap = '{{WRAPPER}} .refraction-form';

		$this->start_controls_section( 'section_style_form', [ 'label' => esc_html__( 'Form', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'column_gap', [ 'label' => esc_html__( 'Columns Gap', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px' ], 'range' => [ 'px' => [ 'max' => 80 ] ], 'default' => [ 'size' => 10, 'unit' => 'px' ], 'selectors' => [ $wrap => '--rf-col-gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'row_gap', [ 'label' => esc_html__( 'Rows Gap', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px' ], 'range' => [ 'px' => [ 'max' => 80 ] ], 'default' => [ 'size' => 16, 'unit' => 'px' ], 'selectors' => [ $wrap => '--rf-row-gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_labels', [ 'label' => esc_html__( 'Labels', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'label_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .refraction-form__label, {{WRAPPER}} .refraction-form__option' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'mark_color', [ 'label' => esc_html__( 'Required Mark Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .refraction-form__required' => 'color: {{VALUE}};' ] ] );
		$this->field_style( 'label', '{{WRAPPER}} .refraction-form__label, {{WRAPPER}} .refraction-form__option' );
		$this->add_responsive_control( 'label_spacing', [ 'label' => esc_html__( 'Spacing', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'max' => 40 ] ], 'selectors' => [ $wrap => '--rf-label-gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_fields', [ 'label' => esc_html__( 'Fields', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$input = '{{WRAPPER}} .refraction-form__input';
		$this->field_style( 'field', $input );
		$this->add_control( 'field_text_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $input => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'field_bg_color', [ 'label' => esc_html__( 'Background Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $input => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'field_focus_color', [ 'label' => esc_html__( 'Focus Border Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $input . ':focus' => 'border-color: {{VALUE}}; outline-color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'field_border', 'selector' => $input, 'separator' => 'before' ] );
		$this->add_responsive_control( 'field_radius', [ 'label' => esc_html__( 'Border Radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%', 'em' ], 'selectors' => [ $input => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'field_padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $input => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_button', [ 'label' => esc_html__( 'Buttons', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$btn = '{{WRAPPER}} .refraction-form__submit, {{WRAPPER}} .refraction-form__nav';
		$this->field_style( 'button', $btn );
		$this->start_controls_tabs( 'button_tabs' );
		$this->start_controls_tab( 'button_normal', [ 'label' => esc_html__( 'Normal', 'refraction' ) ] );
		$this->add_control( 'button_text_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $btn => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'button_bg_color', [ 'label' => esc_html__( 'Background Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $btn => 'background-color: {{VALUE}};' ] ] );
		$this->end_controls_tab();
		$this->start_controls_tab( 'button_hover', [ 'label' => esc_html__( 'Hover', 'refraction' ) ] );
		$hover = '{{WRAPPER}} .refraction-form__submit:hover, {{WRAPPER}} .refraction-form__submit:focus, {{WRAPPER}} .refraction-form__nav:hover, {{WRAPPER}} .refraction-form__nav:focus';
		$this->add_control( 'button_hover_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $hover => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'button_hover_bg', [ 'label' => esc_html__( 'Background Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $hover => 'background-color: {{VALUE}};' ] ] );
		$this->end_controls_tab();
		$this->end_controls_tabs();
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'button_border', 'selector' => $btn, 'separator' => 'before' ] );
		$this->add_responsive_control( 'button_radius', [ 'label' => esc_html__( 'Border Radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%', 'em' ], 'selectors' => [ $btn => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'button_shadow', 'selector' => $btn ] );
		$this->add_responsive_control( 'button_padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $btn => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_messages', [ 'label' => esc_html__( 'Messages', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->field_style( 'message', '{{WRAPPER}} .refraction-form__message, {{WRAPPER}} .refraction-form__error' );
		$this->add_control( 'success_color', [ 'label' => esc_html__( 'Success Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .refraction-form__message--success' => 'color: {{VALUE}}; border-color: {{VALUE}};' ] ] );
		$this->add_control( 'error_color', [ 'label' => esc_html__( 'Error Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .refraction-form__message--error, {{WRAPPER}} .refraction-form__error' => 'color: {{VALUE}};', '{{WRAPPER}} .refraction-form__message--error' => 'border-color: {{VALUE}};', '{{WRAPPER}} .has-error .refraction-form__input' => 'border-color: {{VALUE}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_steps', [ 'label' => esc_html__( 'Steps', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->field_style( 'step', '{{WRAPPER}} .refraction-form__progress-item, {{WRAPPER}} .refraction-form__bar-text, {{WRAPPER}} .refraction-form__step-title' );
		$this->add_control( 'step_color', [ 'label' => esc_html__( 'Inactive Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $wrap => '--rf-step-color: {{VALUE}};' ] ] );
		$this->add_control( 'step_active_color', [ 'label' => esc_html__( 'Active / Completed Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $wrap => '--rf-step-active: {{VALUE}};' ] ] );
		$this->add_control( 'step_bar_height', [ 'label' => esc_html__( 'Bar Height', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 2, 'max' => 30 ] ], 'selectors' => [ $wrap => '--rf-bar-height: {{SIZE}}{{UNIT}};' ], 'condition' => [ 'step_type' => 'bar' ] ] );
		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$def = Form_Definition::from_settings( $settings );
		$document = Plugin::$instance->documents->get_current();
		$post_id = $document ? (int) $document->get_main_id() : (int) get_the_ID();
		$icon = '';

		if ( ! empty( $settings['button_icon']['value'] ) ) {
			ob_start();
			Icons_Manager::render_icon( $settings['button_icon'], [ 'aria-hidden' => 'true' ] );
			$icon = (string) ob_get_clean();
		}

		( new Form_Renderer( $def, $settings, [
			'element_id' => $this->get_id(),
			'post_id' => $post_id,
			'edit' => Plugin::$instance->editor->is_edit_mode() || Plugin::$instance->preview->is_preview_mode(),
			'button_icon_html' => $icon,
		] ) )->render();
	}
}
