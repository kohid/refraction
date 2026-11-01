<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\FormBuilder\Base\Nested_Field;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Rows visitors add and remove (guests, items, previous jobs). The container inside is one row; on the site it is printed
 * once per row, and once more as the template the script copies when a row is added.
 */
class Field_Repeater extends Nested_Field {

	protected function field_type(): string {
		return 'repeater';
	}

	public function get_icon() {
		return 'rficon-sync';
	}

	protected function box_selector(): string {
		return '.rfb-repeater';
	}

	protected function register_own_controls(): void {
		$this->add_control( 'min_rows', [ 'label' => esc_html__( 'Minimum rows', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 20, 'default' => 0, 'separator' => 'before' ] );
		$this->add_control( 'max_rows', [ 'label' => esc_html__( 'Maximum rows', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 50, 'default' => 10 ] );
		$this->add_control( 'add_label', [ 'label' => esc_html__( 'Add button text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Add row', 'refraction' ) ] );
	}

	protected function register_own_style_controls(): void {
		$this->start_controls_section( 'section_style_rows', [ 'label' => esc_html__( 'Rows and buttons', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'row_bg', [ 'label' => esc_html__( 'Row background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-rep-row' => 'background-color: {{VALUE}};' ] ] );
		$this->add_responsive_control( 'row_padding', [ 'label' => esc_html__( 'Row padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ '{{WRAPPER}} .rfb-rep-row' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'row_gap', [ 'label' => esc_html__( 'Space between rows', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ], 'selectors' => [ '{{WRAPPER}} .rfb-rows' => 'gap: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_control( 'add_bg', [ 'label' => esc_html__( 'Add button background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => [ '{{WRAPPER}} [data-rfb-add]' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'add_color', [ 'label' => esc_html__( 'Add button text', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} [data-rfb-add]' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'remove_color', [ 'label' => esc_html__( 'Remove button color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-rep-remove' => 'color: {{VALUE}};' ] ] );
		$this->end_controls_section();
	}

	protected function render() {
		$field = $this->current_field();

		if ( ! $field ) {
			return;
		}

		$place = $this->place( $field );
		$rows = array_values( array_filter( $place['value'], 'is_array' ) );
		$shown = max( count( $rows ), max( $field['min_rows'], 1 ) );

		$this->open_wrapper( $field );
		echo '<fieldset class="rfb-repeater" data-rfb-min="' . (int) $field['min_rows'] . '" data-rfb-max="' . (int) $field['max_rows'] . '">' . $this->heading( $field ) . '<div class="rfb-rows">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

		for ( $i = 0; $i < $shown; $i++ ) {
			$this->row( $place, (string) $i, $rows[ $i ] ?? [] );
		}

		echo '</div><template class="rfb-row-template">';
		$this->row( $place, '__INDEX__', [] );
		echo '</template><button type="button" class="rfb-btn rfb-btn-light-primary" data-rfb-add>' . esc_html( $field['add_label'] ) . '</button>';
		echo $this->error( $place['path'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped inside.
		echo '</fieldset></div>';
	}

	private function row( array $place, string $index, array $values ): void {
		echo '<div class="rfb-rep-row" data-rfb-scope><div class="rfb-nested-body">';
		Editor_Forms::push_scope( $place['name'] . '[' . $index . ']', $place['path'] . '.' . $index, $values );
		$this->print_child( 0 );
		Editor_Forms::pop_scope();
		echo '</div><button type="button" class="rfb-icon-btn rfb-rep-remove" data-rfb-remove aria-label="' . esc_attr__( 'Remove this row', 'refraction' ) . '">&times;</button></div>';
	}

	protected function content_template() {
		?>
		<div class="rfb-field rfb-w-full rfb-t-repeater">
			<fieldset class="rfb-repeater">
				<legend class="rfb-legend"><div class="rfb-legend-text">{{{ settings.field_label }}}</div></legend>
				<# if ( settings.field_description ) { #><p class="rfb-description">{{{ settings.field_description }}}</p><# } #>
				<div class="rfb-rows"><div class="rfb-rep-row"><div class="rfb-nested-body"></div></div></div>
				<span class="rfb-btn rfb-btn-light-primary" data-rfb-add>{{{ settings.add_label }}}</span>
			</fieldset>
		</div>
		<?php
	}
}
