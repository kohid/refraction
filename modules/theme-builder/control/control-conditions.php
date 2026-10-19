<?php
namespace Refraction\Modules\ThemeBuilder\Control;

use Refraction\Base_Data_Control;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Editor control that edits a list of display rule strings, for example
 * `[ 'include/general', 'exclude/singular/page/7' ]`. The interface is built in
 * modules/theme-builder/assets/js/editor.js.
 */
class Control_Conditions extends Base_Data_Control {

	const TYPE = 'refraction_conditions';

	public function get_type() {
		return self::TYPE;
	}

	public function get_default_value() {
		return [];
	}

	public function content_template() {
		?>
		<div class="refraction-tb-conditions" data-tb-mount></div>
		<?php
	}
}
