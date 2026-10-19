<?php
namespace Refraction\Modules\ThemeBuilder\Control;

use Refraction\Base_Data_Control;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Editor control for Preview Settings: what a Theme Builder template is designed against.
 * The value is `[ 'source' => 'post:page', 'id' => 7, 'search' => '', 'date' => '' ]`. The interface is built in
 * modules/theme-builder/assets/js/preview-control.js.
 */
class Control_Preview_Target extends Base_Data_Control {

	const TYPE = 'refraction_preview_target';

	public function get_type() {
		return self::TYPE;
	}

	public function get_default_value() {
		return [];
	}

	protected function get_default_settings() {
		return [
			'sources' => [],
			'location' => '',
			'default_source' => '',
		];
	}

	public function content_template() {
		?>
		<div class="refraction-tb-preview" data-tb-preview-mount></div>
		<?php
	}
}
