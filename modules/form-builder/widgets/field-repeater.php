<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\FormBuilder\Base\Nested_Field;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Classes\Form_Buttons;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Rows visitors add and remove (guests, items, previous jobs). The container inside is one row; on the site it is printed
 * once per row, and once more as the template the script copies when a row is added.
 */
class Field_Repeater extends Nested_Field {

	/** The buttons, with repeated parts so the Style tab wins over the form's own look and the theme's. */
	const ADD = '{{WRAPPER}} .rfb-btn[data-rfb-add][data-rfb-add][data-rfb-add]';
	const REMOVE = '{{WRAPPER}} .rfb-rep-remove.rfb-rep-remove.rfb-rep-remove.rfb-rep-remove';

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
		// The buttons' Button widget settings (icons and animations 0.97.0; type, size, ID, position 0.99.0).
		Form_Buttons::controls( $this, 'add', self::ADD, [ 'heading' => esc_html__( 'Add button', 'refraction' ) ] );
		$this->add_responsive_control( 'add_align', [
			'label' => esc_html__( 'Position', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				'justify' => [ 'title' => esc_html__( 'Stretch', 'refraction' ), 'icon' => 'rficon-h-align-stretch' ],
			],
			'selectors_dictionary' => [
				'left' => 'margin-inline: 0 auto; width: auto;',
				'center' => 'margin-inline: auto; width: auto;',
				'right' => 'margin-inline: auto 0; width: auto;',
				'justify' => 'margin-inline: 0; width: 100%;',
			],
			'selectors' => [ self::ADD => 'display: flex; {{VALUE}}' ],
		] );
		Form_Buttons::controls( $this, 'remove', self::REMOVE, [ 'heading' => esc_html__( 'Remove button', 'refraction' ), 'text' => false, 'look' => false, 'css_id' => false ] );
	}

	protected function register_own_style_controls(): void {
		$this->start_controls_section( 'section_style_rows', [ 'label' => esc_html__( 'Rows', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'row_bg', [ 'label' => esc_html__( 'Row background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-rep-row' => 'background-color: {{VALUE}};' ] ] );
		$this->add_responsive_control( 'row_padding', [ 'label' => esc_html__( 'Row padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ '{{WRAPPER}} .rfb-rep-row' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'row_gap', [ 'label' => esc_html__( 'Space between rows', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ], 'selectors' => [ '{{WRAPPER}} .rfb-rows' => 'gap: {{SIZE}}{{UNIT}};' ] ] );
		// Before 0.99.0: three plain colors. They still apply (now over the form's own look), and show only while they hold a value.
		$this->add_control( 'add_bg', [ 'label' => esc_html__( 'Add button background (earlier setting)', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => [ self::ADD => 'background-color: {{VALUE}};' ], 'condition' => [ 'add_bg!' => '' ] ] );
		$this->add_control( 'add_color', [ 'label' => esc_html__( 'Add button text (earlier setting)', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ self::ADD => 'color: {{VALUE}};' ], 'condition' => [ 'add_color!' => '' ] ] );
		$this->add_control( 'remove_color', [ 'label' => esc_html__( 'Remove button color (earlier setting)', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ self::REMOVE => 'color: {{VALUE}};' ], 'condition' => [ 'remove_color!' => '' ] ] );
		$this->end_controls_section();

		// The Button widget's Style tab for each button (0.99.0).
		$this->start_controls_section( 'section_style_add', [ 'label' => esc_html__( 'Add button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		Form_Buttons::style_controls( $this, 'add', self::ADD );
		$this->end_controls_section();
		$this->start_controls_section( 'section_style_remove', [ 'label' => esc_html__( 'Remove button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		Form_Buttons::style_controls( $this, 'remove', self::REMOVE, [ 'text' => false ] );
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
		$settings = $this->get_settings_for_display();
		echo '</template><button type="button"' . Form_Buttons::id_attribute( $settings, 'add' ) . ' class="rfb-btn rfb-btn-light-primary' . esc_attr( Form_Buttons::classes( $settings, 'add' ) ) . '" data-rfb-add>' . Form_Buttons::inner( $settings, 'add', $field['add_label'] ) . '</button>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		echo $this->error( $place['path'] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped inside.
		echo '</fieldset></div>';
	}

	private function row( array $place, string $index, array $values ): void {
		echo '<div class="rfb-rep-row" data-rfb-scope><div class="rfb-nested-body">';
		Editor_Forms::push_scope( $place['name'] . '[' . $index . ']', $place['path'] . '.' . $index, $values );
		$this->print_child( 0 );
		Editor_Forms::pop_scope();
		$settings = $this->get_settings_for_display();
		$icon = Form_Buttons::icon( $settings, 'remove' );
		echo '</div><button type="button" class="rfb-icon-btn rfb-rep-remove' . esc_attr( Form_Buttons::classes( $settings, 'remove' ) ) . '" data-rfb-remove aria-label="' . esc_attr__( 'Remove this row', 'refraction' ) . '">' . ( '' !== $icon ? $icon : '&times;' ) . '</button></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
	}

	protected function content_template() {
		?>
		<div class="rfb-field rfb-w-full rfb-t-repeater">
			<fieldset class="rfb-repeater">
				<legend class="rfb-legend"><div class="rfb-legend-text">{{{ settings.field_label }}}</div></legend>
				<# if ( settings.field_description ) { #><p class="rfb-description">{{{ settings.field_description }}}</p><# } #>
				<div class="rfb-rows"><div class="rfb-rep-row"><div class="rfb-nested-body"></div></div></div>
				<#
				var addIcon = settings.add_icon && settings.add_icon.value ? refraction.helpers.renderIcon( view, settings.add_icon, { 'aria-hidden': true }, 'i', 'object' ) : null;
				var addIconHtml = addIcon && addIcon.rendered ? '<span class="rfb-btn-icon" aria-hidden="true">' + addIcon.value + '</span>' : '';
				var addText = '<span class="rfb-btn-text">' + _.escape( settings.add_label ) + '</span>';
				var addAnimation = settings.add_hover_animation ? ' refraction-animation-' + settings.add_hover_animation : '';
				addAnimation += settings.add_button_type ? ' rfb-type-' + settings.add_button_type : '';
				addAnimation += settings.add_size ? ' rfb-size-' + settings.add_size : '';
				#>
				<span<# if ( settings.add_css_id ) { #> id="{{ settings.add_css_id }}"<# } #> class="rfb-btn rfb-btn-light-primary{{ addIconHtml ? ' has-icon' : '' }}{{ addAnimation }}" data-rfb-add>{{{ 'right' === settings.add_icon_position ? addText + addIconHtml : addIconHtml + addText }}}</span>
			</fieldset>
		</div>
		<?php
	}
}
