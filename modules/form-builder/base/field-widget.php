<?php
namespace Refraction\Modules\FormBuilder\Base;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Classes\Field_Renderer;
use Refraction\Modules\FormBuilder\Classes\Money;
use Refraction\Modules\FormBuilder\Classes\Schema;
use Refraction\Modules\FormBuilder\Classes\Shortcodes;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * One Form Builder field as an editor widget: Content holds what the field asks, Style how it looks, and Advanced (next
 * to the editor's own Layout, Motion and Responsive sections) how its answers show in the records table. The markup and
 * the validation are the Form Builder's own (Field_Renderer, Schema), so a field looks and behaves the same everywhere.
 */
abstract class Field_Widget extends Widget_Base {

	/** Every field widget's name starts with this; the Form page reads its fields by it. */
	const PREFIX = 'rfb-field-';

	/** The Form Builder type this widget is (a key of Schema::types()). */
	abstract protected function field_type(): string;

	/** What the Content tab offers for this type. */
	protected function features(): array {
		return [ 'placeholder', 'default', 'required' ];
	}

	public function get_name() {
		return self::PREFIX . $this->field_type();
	}

	public function get_title() {
		return Schema::types()[ $this->field_type() ] ?? $this->field_type();
	}

	public function get_categories() {
		return [ Editor_Forms::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'form', 'field', 'input', $this->field_type() ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-form-builder-front' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-form-builder-front' ];
	}

	/** Only offered while you build a Form page: a field means nothing on an ordinary page. */
	public function show_in_panel() {
		$editor = Plugin::$instance->editor;
		$post_id = $editor ? (int) $editor->get_post_id() : 0;

		return ! $post_id || Plugin::$instance->documents->get( $post_id ) instanceof Form_Document;
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function has( string $feature ): bool {
		return in_array( $feature, $this->features(), true );
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_field', [ 'label' => $this->get_title() ] );

		$this->add_control( 'field_label', [
			'label' => esc_html__( 'Label', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => $this->get_title(),
			'label_block' => true,
		] );
		$this->add_control( 'hide_label', [ 'label' => esc_html__( 'Hide the label', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'It stays for screen readers.', 'refraction' ) ] );

		if ( $this->has( 'required' ) ) {
			$this->add_control( 'field_required', [ 'label' => esc_html__( 'Required', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		}

		if ( $this->has( 'placeholder' ) ) {
			$this->add_control( 'placeholder', [ 'label' => esc_html__( 'Placeholder', 'refraction' ), 'type' => Controls_Manager::TEXT ] );
		}

		if ( $this->has( 'options' ) ) {
			$this->add_control( 'field_options', [
				'label' => esc_html__( 'Choices', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'rows' => 6,
				'default' => "Option 1\nOption 2\nOption 3",
				'description' => esc_html__( 'One per line. To save a different value than the one shown, write value|Label.', 'refraction' ),
			] );
		}

		if ( $this->has( 'limits' ) ) {
			$this->add_control( 'field_min', [ 'label' => esc_html__( 'Lowest', 'refraction' ), 'type' => Controls_Manager::NUMBER ] );
			$this->add_control( 'field_max', [ 'label' => esc_html__( 'Highest', 'refraction' ), 'type' => Controls_Manager::NUMBER ] );
		}

		if ( $this->has( 'per' ) ) {
			$this->add_control( 'field_per', [ 'label' => esc_html__( 'Price period', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => '', 'options' => Money::periods() ] );
			$this->add_control( 'field_per_label', [ 'label' => esc_html__( 'Period text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'field_per' => 'custom' ] ] );
		}

		if ( $this->has( 'parts' ) ) {
			$this->add_control( 'name_parts', [
				'label' => esc_html__( 'Parts of the name', 'refraction' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'default' => [ 'first', 'last' ],
				'options' => [ 'prefix' => esc_html__( 'Prefix', 'refraction' ), 'first' => esc_html__( 'First name', 'refraction' ), 'middle' => esc_html__( 'Middle name', 'refraction' ), 'last' => esc_html__( 'Last name', 'refraction' ) ],
			] );
		}

		if ( $this->has( 'source' ) ) {
			$this->add_control( 'hidden_source', [
				'label' => esc_html__( 'Value comes from', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'static',
				'options' => [
					'static' => esc_html__( 'Fixed value', 'refraction' ),
					'query' => esc_html__( 'URL parameter', 'refraction' ),
					'page_url' => esc_html__( 'Page address', 'refraction' ),
					'referrer' => esc_html__( 'Referring page', 'refraction' ),
					'user_id' => esc_html__( 'Logged-in user ID', 'refraction' ),
					'user_email' => esc_html__( 'Logged-in user email', 'refraction' ),
					'date' => esc_html__( 'Today\'s date', 'refraction' ),
				],
			] );
		}

		if ( $this->has( 'default' ) ) {
			$this->add_control( 'default_value', [
				'label' => $this->has( 'source' ) ? esc_html__( 'Value (or URL parameter name)', 'refraction' ) : esc_html__( 'Default value', 'refraction' ),
				'type' => Controls_Manager::TEXT,
			] );
		}

		$this->add_control( 'field_description', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true, 'separator' => 'before', 'description' => esc_html__( 'Shown under the label.', 'refraction' ) ] );
		$this->add_control( 'field_help', [ 'label' => esc_html__( 'Help text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true, 'description' => esc_html__( 'Shown under the field.', 'refraction' ) ] );

		$this->end_controls_section();

		$this->register_style_controls();
		$this->register_record_controls();
	}

	/** Style tab: label, input (normal, hover, focus), description and help, and the choices of a choice field. */
	protected function register_style_controls(): void {
		$this->start_controls_section( 'section_style_label', [ 'label' => esc_html__( 'Label', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$label = '{{WRAPPER}} .rfb-label, {{WRAPPER}} .rfb-switch-text';
		$this->add_control( 'label_color', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $label => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'label_typography', 'selector' => $label ] );
		$this->add_responsive_control( 'label_spacing', [
			'label' => esc_html__( 'Space below', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rfb-label' => 'margin-bottom: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_control( 'required_color', [ 'label' => esc_html__( 'Required mark', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-label.is-required::after' => 'color: {{VALUE}};' ] ] );
		$this->end_controls_section();

		if ( $this->has( 'input' ) || $this->has( 'placeholder' ) ) {
			$this->register_input_style();
		}

		if ( $this->has( 'options' ) && in_array( $this->field_type(), [ 'radio', 'checkbox' ], true ) ) {
			$this->start_controls_section( 'section_style_choices', [ 'label' => esc_html__( 'Choices', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
			$choice = '{{WRAPPER}} .rfb-check';
			$this->add_control( 'choice_color', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $choice => 'color: {{VALUE}};' ] ] );
			$this->add_control( 'choice_accent', [ 'label' => esc_html__( 'Radio / checkbox color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-check input' => 'accent-color: {{VALUE}};' ] ] );
			$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'choice_typography', 'selector' => $choice ] );
			$this->add_responsive_control( 'choice_gap', [
				'label' => esc_html__( 'Space between', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'selectors' => [ '{{WRAPPER}} .rfb-choice-options' => 'display: flex; flex-direction: column; gap: {{SIZE}}{{UNIT}};' ],
			] );
			$this->add_control( 'choice_inline', [
				'label' => esc_html__( 'Side by side', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'selectors' => [ '{{WRAPPER}} .rfb-choice-options' => 'display: flex; flex-direction: row; flex-wrap: wrap; column-gap: 20px;' ],
			] );
			$this->end_controls_section();
		}

		$this->start_controls_section( 'section_style_help', [ 'label' => esc_html__( 'Description and help', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$help = '{{WRAPPER}} .rfb-description, {{WRAPPER}} .rfb-help';
		$this->add_control( 'help_color', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $help => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'help_typography', 'selector' => $help ] );
		$this->end_controls_section();
	}

	protected function register_input_style(): void {
		$input = '{{WRAPPER}} .rfb-input';
		$this->start_controls_section( 'section_style_input', [ 'label' => esc_html__( 'Input', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'input_typography', 'selector' => $input ] );
		$this->add_responsive_control( 'input_height', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 24, 'max' => 120 ] ],
			'selectors' => [ '{{WRAPPER}} input.rfb-input, {{WRAPPER}} select.rfb-input' => 'min-height: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'input_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ $input => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'input_radius', [
			'label' => esc_html__( 'Border radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'selectors' => [ $input => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->start_controls_tabs( 'input_states' );

		foreach ( [ 'normal' => [ esc_html__( 'Normal', 'refraction' ), '' ], 'hover' => [ esc_html__( 'Hover', 'refraction' ), ':hover' ], 'focus' => [ esc_html__( 'Focus', 'refraction' ), ':focus' ] ] as $state => $spec ) {
			$selector = $input . $spec[1];
			$this->start_controls_tab( 'input_' . $state, [ 'label' => $spec[0] ] );
			$this->add_control( 'input_color_' . $state, [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $selector => 'color: {{VALUE}};' ] ] );
			$this->add_control( 'input_bg_' . $state, [ 'label' => esc_html__( 'Background color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $selector => 'background-color: {{VALUE}};' ] ] );
			$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'input_border_' . $state, 'selector' => $selector ] );
			$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'input_shadow_' . $state, 'selector' => $selector ] );
			$this->end_controls_tab();
		}

		$this->end_controls_tabs();
		$this->end_controls_section();
	}

	/** Advanced tab: the key answers are saved under, and how they show in Refraction > Builder and the public list. */
	protected function register_record_controls(): void {
		$this->start_controls_section( 'section_records', [ 'label' => esc_html__( 'Records table', 'refraction' ), 'tab' => Controls_Manager::TAB_ADVANCED ] );
		$this->add_control( 'field_key', [
			'label' => esc_html__( 'Field key', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'description' => esc_html__( 'Used in exports, rules, notifications and webhooks. Leave empty to make one from the label; once given it does not change, so saved answers keep matching.', 'refraction' ),
		] );

		if ( Schema::is_scalar_type( $this->field_type() ) || 'name' === $this->field_type() ) {
			$this->add_control( 'in_table', [ 'label' => esc_html__( 'Show as a column in the records table', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
			$this->add_control( 'show_public', [ 'label' => esc_html__( 'Show publicly (in the public list)', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		}

		if ( in_array( $this->field_type(), [ 'select', 'radio' ], true ) ) {
			$this->add_control( 'add_filter', [ 'label' => esc_html__( 'Add a filter above the table', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		}

		$this->end_controls_section();
	}

	/** The field as the Form Builder sees it, before cleaning (Schema::clean_field cleans it). */
	public function raw_field(): array {
		$s = $this->get_settings();
		$yes = static function ( $key ) use ( $s ): bool {
			return 'yes' === ( $s[ $key ] ?? '' );
		};

		return [
			'type' => $this->field_type(),
			'label' => (string) ( $s['field_label'] ?? '' ),
			'key' => (string) ( $s['field_key'] ?? '' ),
			'hide_label' => $yes( 'hide_label' ),
			'required' => $yes( 'field_required' ),
			'placeholder' => (string) ( $s['placeholder'] ?? '' ),
			'options' => (string) ( $s['field_options'] ?? '' ),
			'min' => $s['field_min'] ?? null,
			'max' => $s['field_max'] ?? null,
			'per' => (string) ( $s['field_per'] ?? '' ),
			'per_label' => (string) ( $s['field_per_label'] ?? '' ),
			'parts' => (array) ( $s['name_parts'] ?? [ 'first', 'last' ] ),
			'source' => (string) ( $s['hidden_source'] ?? 'static' ),
			'default' => (string) ( $s['default_value'] ?? '' ),
			'description' => (string) ( $s['field_description'] ?? '' ),
			'help' => (string) ( $s['field_help'] ?? '' ),
			'in_table' => $yes( 'in_table' ),
			'public' => $yes( 'show_public' ),
			'filter' => $yes( 'add_filter' ),
		];
	}

	/**
	 * Prints the field. On the site it is the collection's own cleaned field with the visitor's answers and errors; in the
	 * editor it is built from the settings you are editing, so the preview follows you.
	 */
	protected function render() {
		$state = Editor_Forms::rendering();
		$field = null;

		if ( $state ) {
			$key = $state['keys'][ $this->get_id() ] ?? '';
			$field = '' !== $key ? Schema::field( $state['definition'], $key ) : null;
		}

		if ( ! $field ) {
			$raw = $this->raw_field();
			$raw['key'] = '' !== $raw['key'] ? $raw['key'] : ( '' !== $raw['label'] ? $raw['label'] : $raw['type'] );
			$field = Schema::clean_field( $raw );
		}

		if ( ! $field ) {
			return;
		}

		if ( ! $state ) {
			$document = Plugin::$instance->documents->get( (int) get_the_ID() );
			$money = $document instanceof Form_Document ? $document->form_settings()['settings'] : [];
			$state = [ 'values' => [], 'errors' => [], 'ctx' => [ 'money' => $money ] ];
			Shortcodes::enqueue();
		}

		$key = $field['key'];
		Field_Renderer::render( $field, $state['values'][ $key ] ?? null, 'values[' . $key . ']', (array) $state['errors'], (array) $state['ctx'], $key );
	}
}
