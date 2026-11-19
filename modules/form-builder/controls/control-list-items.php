<?php
namespace Refraction\Modules\FormBuilder\Controls;

use Refraction\Base_Data_Control;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A list of items inside a repeater row (0.127.0): each item a line of text and its own icon, added, removed and moved
 * in the panel. Used by Icon List > Changes with the answers, where each row is a whole list for its answers. The
 * interface is built in assets/js/editor/list-items.js.
 *
 * Value: [ [ 'text' => string, 'icon' => [ 'value' => ..., 'library' => ... ] ], ... ]. **Bold** in a text is bold.
 */
class Control_List_Items extends Base_Data_Control {

	const TYPE = 'rfb_list_items';

	public function get_type() {
		return self::TYPE;
	}

	public function get_default_value() {
		return [];
	}

	protected function get_default_settings() {
		return [ 'label_block' => true ];
	}

	public function content_template() {
		?>
		<div class="refraction-control-field">
			<label class="refraction-control-title">{{{ data.label }}}</label>
			<div class="refraction-control-input-wrapper">
				<div class="rfb-list-items" data-rfb-items-mount></div>
			</div>
		</div>
		<# if ( data.description ) { #>
			<div class="refraction-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<?php
	}
}
