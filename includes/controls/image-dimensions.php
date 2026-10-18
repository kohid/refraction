<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction image dimensions control.
 *
 * A base control for creating image dimension control. Displays image width
 * input, image height input and an apply button.
 *
 * @since 1.0.0
 */
class Control_Image_Dimensions extends Control_Base_Multiple {

	/**
	 * Get image dimensions control type.
	 *
	 * Retrieve the control type, in this case `image_dimensions`.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Control type.
	 */
	public function get_type() {
		return 'image_dimensions';
	}

	/**
	 * Get image dimensions control default values.
	 *
	 * Retrieve the default value of the image dimensions control. Used to return the
	 * default values while initializing the image dimensions control.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array Control default value.
	 */
	public function get_default_value() {
		return [
			'width' => '',
			'height' => '',
		];
	}

	/**
	 * Get image dimensions control default settings.
	 *
	 * Retrieve the default settings of the image dimensions control. Used to return
	 * the default settings while initializing the image dimensions control.
	 *
	 * @since 1.0.0
	 * @access protected
	 *
	 * @return array Control default settings.
	 */
	protected function get_default_settings() {
		return [
			'show_label' => false,
			'label_block' => true,
		];
	}

	/**
	 * Render image dimensions control output in the editor.
	 *
	 * Used to generate the control HTML in the editor using Underscore JS
	 * template. The variables for the class are available using `data` JS
	 * object.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function content_template() {
		if ( ! $this->is_image_editor_supports() ) : ?>
			<div class="refraction-panel-alert refraction-panel-alert-danger">
				<?php echo esc_html__( 'The server does not have ImageMagick or GD installed and/or enabled! Any of these libraries are required for WordPress to be able to resize images. Please contact your server administrator to enable this before continuing.', 'refraction' ); ?>
			</div>
			<?php
			return;
		endif;
		?>
		<# if ( data.description ) { #>
			<div class="refraction-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<div class="refraction-control-field">
			<label class="refraction-control-title">{{{ data.label }}}</label>
			<div class="refraction-control-input-wrapper">
				<div class="refraction-image-dimensions-field refraction-control-unit-2">
					<input id="<?php $this->print_control_uid( 'width' ); ?>" type="number" data-setting="width" />
					<label for="<?php $this->print_control_uid( 'width' ); ?>" class="refraction-image-dimensions-field-description"><?php echo esc_html__( 'Width', 'refraction' ); ?></label>
				</div>
				<div class="refraction-image-dimensions-separator">x</div>
				<div class="refraction-image-dimensions-field refraction-control-unit-2">
					<input id="<?php $this->print_control_uid( 'height' ); ?>" type="number" data-setting="height" />
					<label for="<?php $this->print_control_uid( 'height' ); ?>" class="refraction-image-dimensions-field-description"><?php echo esc_html__( 'Height', 'refraction' ); ?></label>
				</div>
				<button class="refraction-button refraction-image-dimensions-apply-button"><?php echo esc_html__( 'Apply', 'refraction' ); ?></button>
			</div>
		</div>
		<?php
	}

	/**
	 * Image editor support.
	 *
	 * Used to determine whether the editor supports a given image mime-type.
	 *
	 * @since 2.0.0
	 * @access private
	 *
	 * @return bool Whether the editor supports the given mime-type.
	 */
	private function is_image_editor_supports() {
		$arg = [
			'mime_type' => 'image/jpeg',
		];
		return ( wp_image_editor_supports( $arg ) );
	}
}
