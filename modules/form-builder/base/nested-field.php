<?php
namespace Refraction\Modules\FormBuilder\Base;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Typography;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Classes\Field_Renderer;
use Refraction\Modules\FormBuilder\Classes\Schema;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A Form Builder field that holds other fields (Group, Repeater): an editor widget with one container inside, where you
 * drop the fields. Its answers are stored under its own key, so the fields inside are printed with its name and path.
 */
abstract class Nested_Field extends Widget_Nested_Base implements Form_Field {

	use Field_Settings;

	abstract protected function field_type(): string;

	public function get_name() {
		return Field_Widget::PREFIX . $this->field_type();
	}

	public function get_title() {
		return Schema::types()[ $this->field_type() ] ?? $this->field_type();
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function get_default_children_elements() {
		return [ [ 'elType' => 'container', 'settings' => [ '_title' => $this->get_title(), 'content_width' => 'full' ] ] ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'field_label';
	}

	protected function get_default_children_placeholder_selector() {
		return '.rfb-nested-body';
	}

	protected function get_initial_config(): array {
		return array_merge( parent::get_initial_config(), [ 'target_container' => [ '.rfb-nested-body' ] ] );
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_field', [ 'label' => $this->get_title() ] );
		$this->add_control( 'field_label', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => $this->get_title(), 'label_block' => true ] );
		$this->add_control( 'hide_label', [ 'label' => esc_html__( 'Hide the title on the form', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'It stays for screen readers.', 'refraction' ) ] );
		$this->add_control( 'label_tag', [
			'label' => esc_html__( 'Title tag', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'div',
			'options' => array_combine( Schema::LABEL_TAGS, Schema::LABEL_TAGS ),
		] );
		$this->add_control( 'field_description', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true ] );
		$this->register_own_controls();
		$this->add_control( 'nested_hint', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Drop the fields into the box on the page. Groups and repeaters can not go inside each other.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_box', [ 'label' => esc_html__( 'Box', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$box = '{{WRAPPER}} ' . $this->box_selector();
		$this->add_control( 'box_bg', [ 'label' => esc_html__( 'Background color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $box => 'background-color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'box_border', 'selector' => $box ] );
		$this->add_responsive_control( 'box_radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%' ], 'selectors' => [ $box => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'box_padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $box => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_title', [ 'label' => esc_html__( 'Title and description', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'title_color', [ 'label' => esc_html__( 'Title color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-legend-text' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'title_typography', 'selector' => '{{WRAPPER}} .rfb-legend-text' ] );
		$this->add_control( 'desc_color', [ 'label' => esc_html__( 'Description color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-description' => 'color: {{VALUE}};' ] ] );
		$this->end_controls_section();

		$this->register_own_style_controls();
		$this->register_condition_controls();
		$this->register_record_controls();
	}

	/** Extra Content controls of the type. */
	protected function register_own_controls(): void {}

	/** Extra Style sections of the type. */
	protected function register_own_style_controls(): void {}

	abstract protected function box_selector(): string;

	public function raw_field(): array {
		$s = $this->get_settings();

		return $this->shared_raw() + [
			'type' => $this->field_type(),
			'label_tag' => (string) ( $s['label_tag'] ?? 'div' ),
			'min_rows' => $s['min_rows'] ?? 0,
			'max_rows' => $s['max_rows'] ?? 10,
			'add_label' => (string) ( $s['add_label'] ?? '' ),
		];
	}

	/** The field this widget prints: the collection's own on the site, or one built from the settings in the editor. */
	protected function current_field(): ?array {
		$state = Editor_Forms::rendering();

		if ( $state ) {
			$key = $state['keys'][ $this->get_id() ] ?? '';

			return '' !== $key ? Schema::field( $state['definition'], $key ) : null;
		}

		$raw = $this->raw_field();
		$raw['key'] = '' !== $raw['key'] ? $raw['key'] : $raw['label'];

		return Schema::clean_field( $raw );
	}

	/** Name, path and saved answers of this container, under the container it sits in (if any). */
	protected function place( array $field ): array {
		$state = Editor_Forms::rendering();
		$scope = Editor_Forms::scope();
		$values = $scope ? $scope['values'] : (array) ( $state['values'] ?? [] );

		return [
			'name' => ( $scope ? $scope['name'] : 'values' ) . '[' . $field['key'] . ']',
			'path' => $scope ? $scope['path'] . '.' . $field['key'] : $field['key'],
			'value' => is_array( $values[ $field['key'] ] ?? null ) ? $values[ $field['key'] ] : [],
		];
	}

	/** The wrapper every Builder field has: type class, key and visibility rules. */
	protected function open_wrapper( array $field ): void {
		$cond = ! empty( $field['conditions']['enabled'] ) ? ' data-rfb-cond="' . esc_attr( (string) wp_json_encode( $field['conditions'] ) ) . '"' : '';
		echo '<div class="rfb-field rfb-w-full rfb-t-' . esc_attr( $field['type'] ) . '" data-rfb-key="' . esc_attr( $field['key'] ) . '" data-rfb-type="' . esc_attr( $field['type'] ) . '"' . $cond . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
	}

	protected function heading( array $field ): string {
		return '<legend class="rfb-legend">' . Field_Renderer::heading( $field, 'rfb-legend-text' ) . '</legend>' . Field_Renderer::description( $field, 'rfb-' . $field['key'] );
	}

	/** The error of this field (a repeater's "add at least" message), if any. */
	protected function error( string $path ): string {
		$state = Editor_Forms::rendering();
		$error = (string) ( $state['errors'][ $path ] ?? '' );

		return '' !== $error ? '<p class="rfb-error" role="alert">' . esc_html( $error ) . '</p>' : '';
	}
}
