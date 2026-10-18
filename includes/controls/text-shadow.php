<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction text shadow control.
 *
 * A base control for creating text shadows control. Displays input fields for
 * horizontal shadow, vertical shadow, shadow blur and shadow color.
 *
 * @since 1.6.0
 */
class Control_Text_Shadow extends Control_Base_Multiple {

	/**
	 * Get text shadow control type.
	 *
	 * Retrieve the control type, in this case `text_shadow`.
	 *
	 * @since 1.6.0
	 * @access public
	 *
	 * @return string Control type.
	 */
	public function get_type() {
		return 'text_shadow';
	}

	/**
	 * Get text shadow control default values.
	 *
	 * Retrieve the default value of the text shadow control. Used to return the
	 * default values while initializing the text shadow control.
	 *
	 * @since 1.6.0
	 * @access public
	 *
	 * @return array Control default value.
	 */
	public function get_default_value() {
		return [
			'horizontal' => 0,
			'vertical' => 0,
			'blur' => 10,
			'color' => 'rgba(0,0,0,0.3)',
		];
	}

	/**
	 * Get text shadow control sliders.
	 *
	 * Retrieve the sliders of the text shadow control. Sliders are used while
	 * rendering the control output in the editor.
	 *
	 * @since 1.6.0
	 * @access public
	 *
	 * @return array Control sliders.
	 */
	public function get_sliders() {
		return [
			'blur' => [
				'label' => esc_html__( 'Blur', 'refraction' ),
				'min' => 0,
				'max' => 100,
			],
			'horizontal' => [
				'label' => esc_html__( 'Horizontal', 'refraction' ),
				'min' => -100,
				'max' => 100,
			],
			'vertical' => [
				'label' => esc_html__( 'Vertical', 'refraction' ),
				'min' => -100,
				'max' => 100,
			],
		];
	}

	/**
	 * Render text shadow control output in the editor.
	 *
	 * Used to generate the control HTML in the editor using Underscore JS
	 * template. The variables for the class are available using `data` JS
	 * object.
	 *
	 * @since 1.6.0
	 * @access public
	 */
	public function content_template() {
		?>
		<div class="refraction-shadow-box">
			<div class="refraction-control-field refraction-color-picker-wrapper">
				<label class="refraction-control-title"><?php echo esc_html__( 'Color', 'refraction' ); ?></label>
				<div class="refraction-control-input-wrapper refraction-control-unit-1">
					<div class="refraction-color-picker-placeholder"></div>
				</div>
			</div>
			<?php
			foreach ( $this->get_sliders() as $slider_name => $slider ) :
				?>
				<div class="refraction-shadow-slider refraction-control-type-slider">
					<label for="<?php $this->print_control_uid( $slider_name ); ?>" class="refraction-control-title"><?php echo esc_html( $slider['label'] ); ?></label>
					<div class="refraction-control-input-wrapper">
						<div class="refraction-slider" data-input="<?php echo esc_attr( $slider_name ); ?>"></div>
						<div class="refraction-slider-input refraction-control-unit-2">
							<input id="<?php $this->print_control_uid( $slider_name ); ?>" type="number" min="<?php echo esc_attr( $slider['min'] ); ?>" max="<?php echo esc_attr( $slider['max'] ); ?>" data-setting="<?php echo esc_attr( $slider_name ); ?>"/>
						</div>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	}
}
