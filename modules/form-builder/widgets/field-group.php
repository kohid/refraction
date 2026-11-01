<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Modules\FormBuilder\Base\Nested_Field;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Fields kept together, saved under the group's key (an address: street, city, code). */
class Field_Group extends Nested_Field {

	protected function field_type(): string {
		return 'group';
	}

	public function get_icon() {
		return 'rficon-container';
	}

	protected function box_selector(): string {
		return '.rfb-group';
	}

	protected function render() {
		$field = $this->current_field();

		if ( ! $field ) {
			return;
		}

		$place = $this->place( $field );
		$this->open_wrapper( $field );
		echo '<fieldset class="rfb-group">' . $this->heading( $field ) . '<div class="rfb-nested-body" data-rfb-scope>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		Editor_Forms::push_scope( $place['name'], $place['path'], $place['value'] );
		$this->print_child( 0 );
		Editor_Forms::pop_scope();
		echo '</div></fieldset></div>';
	}

	protected function content_template() {
		?>
		<div class="rfb-field rfb-w-full rfb-t-group">
			<fieldset class="rfb-group">
				<legend class="rfb-legend"><div class="rfb-legend-text<# if ( 'yes' === settings.hide_label ) { #> rfb-faint<# } #>">{{{ settings.field_label }}}</div></legend>
				<# if ( settings.field_description ) { #><p class="rfb-description">{{{ settings.field_description }}}</p><# } #>
				<div class="rfb-nested-body"></div>
			</fieldset>
		</div>
		<?php
	}
}
