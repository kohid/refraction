<?php
namespace Refraction\Modules\LoopBuilder\Control;

use Refraction\Base_Data_Control;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Editor control that picks posts, terms or authors by searching. The interface is built in
 * modules/loop-builder/assets/js/editor.js.
 *
 * Settings: `query` = [ 'kind' => 'post'|'term'|'user', 'subtype' => post type / taxonomy / 'any' ],
 * `multiple` (default true). Value: an array of IDs, or one ID when `multiple` is false.
 */
class Control_Autocomplete extends Base_Data_Control {

	const TYPE = 'refraction_autocomplete';

	public function get_type() {
		return self::TYPE;
	}

	public function get_default_value() {
		return [];
	}

	protected function get_default_settings() {
		return [
			'query' => [ 'kind' => 'post', 'subtype' => 'any' ],
			'multiple' => true,
			'label_block' => true,
		];
	}

	public function content_template() {
		?>
		<div class="refraction-control-field">
			<label class="refraction-control-title">{{{ data.label }}}</label>
			<div class="refraction-control-input-wrapper">
				<div class="refraction-ac" data-ac-mount></div>
			</div>
		</div>
		<# if ( data.description ) { #>
			<div class="refraction-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<?php
	}
}
