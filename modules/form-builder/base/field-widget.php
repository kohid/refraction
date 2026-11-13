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
abstract class Field_Widget extends Widget_Base implements Form_Field {

	use Field_Settings;

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


	public function get_keywords() {
		return [ 'form', 'field', 'input', $this->field_type() ];
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
				'description' => esc_html__( 'One per line. To save a different value than the one shown, write value|Label. For a Total, add the number this choice counts: value|Label|number (loch-ness|Loch Ness Tour (4 hours)|4).', 'refraction' ),
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

		if ( $this->has( 'upload' ) ) {
			$this->add_control( 'file_accept', [
				'label' => esc_html__( 'Allowed file types', 'refraction' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'default' => [ 'jpg', 'jpeg', 'png', 'pdf' ],
				'options' => array_combine( Schema::FILE_TYPES, array_map( 'strtoupper', Schema::FILE_TYPES ) ),
			] );
			$this->add_control( 'file_max_size', [ 'label' => esc_html__( 'Max size per file (MB)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0.1, 'max' => 64, 'step' => 0.1, 'default' => 5 ] );
			$this->add_control( 'file_max_files', [ 'label' => esc_html__( 'Max files', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 10, 'default' => 1, 'description' => esc_html__( 'Uploads are private: only administrators can download them.', 'refraction' ) ] );
		}

		if ( $this->has( 'pad' ) ) {
			$this->add_control( 'sig_height', [ 'label' => esc_html__( 'Pad height (px)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 100, 'max' => 400, 'default' => 180 ] );
		}

		if ( $this->has( 'date_limits' ) ) {
			$this->add_control( 'when_heading', [ 'label' => esc_html__( 'Which dates can be chosen', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
			$this->add_control( 'notice_hours', [ 'label' => esc_html__( 'Notice needed (hours)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 8760, 'description' => esc_html__( 'The earliest choice is now plus this many hours; earlier dates can not be picked. 0: no limit.', 'refraction' ) ] );
			$this->add_control( 'max_days', [ 'label' => esc_html__( 'Bookable up to (days ahead)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 1095, 'description' => esc_html__( '0: no limit.', 'refraction' ) ] );
			$this->add_control( 'closed_days', [
				'label' => esc_html__( 'Closed on', 'refraction' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'options' => [ '1' => esc_html__( 'Monday', 'refraction' ), '2' => esc_html__( 'Tuesday', 'refraction' ), '3' => esc_html__( 'Wednesday', 'refraction' ), '4' => esc_html__( 'Thursday', 'refraction' ), '5' => esc_html__( 'Friday', 'refraction' ), '6' => esc_html__( 'Saturday', 'refraction' ), '0' => esc_html__( 'Sunday', 'refraction' ) ],
			] );
		}

		if ( $this->has( 'time_limits' ) ) {
			$this->add_control( 'hours_heading', [ 'label' => esc_html__( 'Which times can be chosen', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
			$this->add_control( 'time_min', [ 'label' => esc_html__( 'From', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '08:00', 'description' => esc_html__( '24-hour time; empty: any time.', 'refraction' ) ] );
			$this->add_control( 'time_max', [ 'label' => esc_html__( 'Until', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '20:00' ] );
			$this->add_control( 'time_step', [ 'label' => esc_html__( 'Minutes between choices', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 240, 'placeholder' => '15', 'description' => esc_html__( 'For example 15 or 30. 0: any minute.', 'refraction' ) ] );
		}

		if ( $this->has( 'stepper' ) ) {
			$this->add_control( 'stepper', [ 'label' => esc_html__( 'Minus and plus buttons', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'For counts such as passengers or suitcases (whole numbers).', 'refraction' ) ] );
		}

		if ( $this->has( 'suggestions' ) ) {
			$this->add_control( 'suggestions', [
				'label' => esc_html__( 'Suggestions while typing', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'rows' => 5,
				'description' => esc_html__( 'One per line (places, addresses...). Visitors can pick one or type their own. They come from this list only: no outside address service.', 'refraction' ),
			] );
		}

		$this->register_extra_controls();

		$this->add_control( 'field_description', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true, 'separator' => 'before', 'description' => esc_html__( 'Shown under the label.', 'refraction' ) ] );
		$this->add_control( 'field_help', [ 'label' => esc_html__( 'Help text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true, 'description' => esc_html__( 'Shown under the field.', 'refraction' ) ] );

		$this->end_controls_section();

		$this->register_style_controls();
		$this->register_condition_controls();
		$this->register_record_controls( Schema::is_scalar_type( $this->field_type() ) || 'name' === $this->field_type(), in_array( $this->field_type(), [ 'select', 'radio' ], true ) );
	}

	/** More Content settings of one type (Total). */
	protected function register_extra_controls(): void {}

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

	/** The field as the Form Builder sees it, before cleaning (Schema::clean_field cleans it). */
	public function raw_field(): array {
		$s = $this->get_settings();
		$yes = static function ( $key ) use ( $s ): bool {
			return 'yes' === ( $s[ $key ] ?? '' );
		};

		return $this->shared_raw() + [
			'type' => $this->field_type(),
			'accept' => (array) ( $s['file_accept'] ?? [] ),
			'max_size' => $s['file_max_size'] ?? 5,
			'max_files' => $s['file_max_files'] ?? 1,
			'sig_height' => $s['sig_height'] ?? 180,
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
			'help' => (string) ( $s['field_help'] ?? '' ),
			'notice_hours' => $s['notice_hours'] ?? 0,
			'max_days' => $s['max_days'] ?? 0,
			'closed_days' => (array) ( $s['closed_days'] ?? [] ),
			'time_min' => (string) ( $s['time_min'] ?? '' ),
			'time_max' => (string) ( $s['time_max'] ?? '' ),
			'time_step' => $s['time_step'] ?? 0,
			'stepper' => $yes( 'stepper' ),
			'suggestions' => (string) ( $s['suggestions'] ?? '' ),
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

			// A field whose page was edited but not saved since is not in the collection yet: it is left out, as on submit.
			if ( ! $field ) {
				return;
			}
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

		// Inside a Group or a Repeater row the names, paths and answers are that container's (see Editor_Forms::scope()).
		$scope = Editor_Forms::scope();
		$values = $scope ? $scope['values'] : (array) $state['values'];
		$key = $field['key'];
		$name = ( $scope ? $scope['name'] : 'values' ) . '[' . $key . ']';
		$path = $scope ? $scope['path'] . '.' . $key : $key;

		Field_Renderer::render( $field, array_key_exists( $key, $values ) ? $values[ $key ] : null, $name, (array) $state['errors'], (array) $state['ctx'], $path );
	}
}
