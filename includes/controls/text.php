<?php
namespace Refraction;

use Refraction\Modules\DynamicTags\Module as TagsModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction text control.
 *
 * A base control for creating text control. Displays a simple text input.
 *
 * @since 1.0.0
 */
class Control_Text extends Base_Data_Control {

	/**
	 * Get text control type.
	 *
	 * Retrieve the control type, in this case `text`.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Control type.
	 */
	public function get_type() {
		return 'text';
	}

	/**
	 * Render text control output in the editor.
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
			<# if ( data.label ) {#>
				<label for="<?php $this->print_control_uid(); ?>" class="refraction-control-title">{{{ data.label }}}</label>
			<# } #>
			<div class="refraction-control-input-wrapper refraction-control-unit-5 refraction-control-dynamic-switcher-wrapper">
				<input id="<?php $this->print_control_uid(); ?>" type="{{ data.input_type }}" class="tooltip-target refraction-control-tag-area" data-tooltip="{{ data.title }}" data-setting="{{ data.name }}" placeholder="{{ view.getControlPlaceholder() }}" />
			</div>
		</div>
		<# if ( data.description ) { #>
			<div class="refraction-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<?php
	}

	/**
	 * Get text control default settings.
	 *
	 * Retrieve the default settings of the text control. Used to return the
	 * default settings while initializing the text control.
	 *
	 * @since 1.0.0
	 * @access protected
	 *
	 * @return array Control default settings.
	 */
	protected function get_default_settings() {
		return [
			'input_type' => 'text',
			'placeholder' => '',
			'title' => '',
			'ai' => [
				'active' => true,
				'type' => 'text',
			],
			'dynamic' => [
				'categories' => [
					TagsModule::TEXT_CATEGORY,
				],
			],
		];
	}
}
