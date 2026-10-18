<?php
namespace Refraction;

use Refraction\Modules\DynamicTags\Module as TagsModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction code control.
 *
 * A base control for creating code control. Displays a code editor textarea.
 * Based on Ace editor (@see https://ace.c9.io/).
 *
 * @since 1.0.0
 */
class Control_Code extends Base_Data_Control {

	/**
	 * Get code control type.
	 *
	 * Retrieve the control type, in this case `code`.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Control type.
	 */
	public function get_type() {
		return 'code';
	}

	/**
	 * Get code control default settings.
	 *
	 * Retrieve the default settings of the code control. Used to return the default
	 * settings while initializing the code control.
	 *
	 * @since 1.0.0
	 * @access protected
	 *
	 * @return array Control default settings.
	 */
	protected function get_default_settings() {
		return [
			'label_block' => true,
			'language' => 'html', // html/css
			'rows' => 10,
			'ai' => [
				'active' => true,
				'type' => 'code',
			],
			'dynamic' => [
				'categories' => [ TagsModule::TEXT_CATEGORY ],
			],
		];
	}

	/**
	 * Render code control output in the editor.
	 *
	 * Used to generate the control HTML in the editor using Underscore JS
	 * template. The variables for the class are available using `data` JS
	 * object.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function content_template() {
		?>
		<div class="refraction-control-field">
			<label for="<?php $this->print_control_uid(); ?>" class="refraction-control-title">{{{ data.label }}}</label>
			<div class="refraction-control-input-wrapper refraction-control-dynamic-switcher-wrapper">
				<textarea id="<?php $this->print_control_uid(); ?>" rows="{{ data.rows }}" class="e-input-style refraction-code-editor" data-setting="{{ data.name }}"></textarea>
			</div>
		</div>
		<# if ( data.description ) { #>
			<div class="refraction-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<?php
	}
}
