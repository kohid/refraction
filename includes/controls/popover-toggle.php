<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction popover toggle control.
 *
 * A base control for creating a popover toggle control. By default displays a toggle
 * button to open and close a popover.
 *
 * @since 1.9.0
 */
class Control_Popover_Toggle extends Base_Data_Control {

	/**
	 * Get popover toggle control type.
	 *
	 * Retrieve the control type, in this case `popover_toggle`.
	 *
	 * @since 1.9.0
	 * @access public
	 *
	 * @return string Control type.
	 */
	public function get_type() {
		return 'popover_toggle';
	}

	/**
	 * Get popover toggle control default settings.
	 *
	 * Retrieve the default settings of the popover toggle control. Used to
	 * return the default settings while initializing the popover toggle
	 * control.
	 *
	 * @since 1.9.0
	 * @access protected
	 *
	 * @return array Control default settings.
	 */
	protected function get_default_settings() {
		return [
			'return_value' => 'yes',
		];
	}

	/**
	 * Render popover toggle control output in the editor.
	 *
	 * Used to generate the control HTML in the editor using Underscore JS
	 * template. The variables for the class are available using `data` JS
	 * object.
	 *
	 * @since 1.9.0
	 * @access public
	 */
	public function content_template() {
		?>
		<div class="refraction-control-field">
			<label class="refraction-control-title">{{{ data.label }}}</label>
			<div class="refraction-control-input-wrapper">
				<input id="<?php $this->print_control_uid(); ?>-custom" class="refraction-control-popover-toggle-toggle" type="radio" name="refraction-choose-{{ data.name }}-{{ data._cid }}" value="{{ data.return_value }}">
				<label class="refraction-control-popover-toggle-toggle-label refraction-control-unit-1" for="<?php $this->print_control_uid(); ?>-custom">
					<i class="eicon-edit" aria-hidden="true"></i>
					<span class="refraction-screen-only"><?php echo esc_html__( 'Edit', 'refraction' ); ?></span>
				</label>
				<input id="<?php $this->print_control_uid(); ?>-default" class="refraction-control-popover-toggle-reset" type="radio" name="refraction-choose-{{ data.name }}-{{ data._cid }}" value="">
				<label class="refraction-control-popover-toggle-reset-label tooltip-target" for="<?php $this->print_control_uid(); ?>-default" data-tooltip="<?php echo esc_attr__( 'Back to default', 'refraction' ); ?>" data-tooltip-pos="s">
					<i class="eicon-undo" aria-hidden="true"></i>
					<span class="refraction-screen-only"><?php echo esc_html__( 'Back to default', 'refraction' ); ?></span>
				</label>
			</div>
		</div>
		<# if ( data.description ) { #>
			<div class="refraction-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<?php
	}
}
