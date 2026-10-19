<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction dimension control.
 *
 * A base control for creating dimension control. Displays input fields for top,
 * right, bottom, left and the option to link them together.
 *
 * @since 1.0.0
 */
class Control_Dimensions extends Control_Base_Units {

	/**
	 * Get dimensions control type.
	 *
	 * Retrieve the control type, in this case `dimensions`.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Control type.
	 */
	public function get_type() {
		return 'dimensions';
	}

	/**
	 * Get dimensions control default values.
	 *
	 * Retrieve the default value of the dimensions control. Used to return the
	 * default values while initializing the dimensions control.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array Control default value.
	 */
	public function get_default_value() {
		return array_merge(
			parent::get_default_value(), [
				'top' => '',
				'right' => '',
				'bottom' => '',
				'left' => '',
				'isLinked' => true,
			]
		);
	}

	public function get_singular_name() {
		return 'dimension';
	}

	/**
	 * Get dimensions control default settings.
	 *
	 * Retrieve the default settings of the dimensions control. Used to return the
	 * default settings while initializing the dimensions control.
	 *
	 * @since 1.0.0
	 * @access protected
	 *
	 * @return array Control default settings.
	 */
	protected function get_default_settings() {
		return array_merge(
			parent::get_default_settings(), [
				'label_block' => true,
				'allowed_dimensions' => 'all',
				'placeholder' => '',
			]
		);
	}

	protected function get_dimensions() {
		return [
			'top' => __( 'Top', 'refraction' ),
			'right' => __( 'Right', 'refraction' ),
			'bottom' => __( 'Bottom', 'refraction' ),
			'left' => __( 'Left', 'refraction' ),
		];
	}

	/**
	 * Render dimensions control output in the editor.
	 *
	 * Used to generate the control HTML in the editor using Underscore JS
	 * template. The variables for the class are available using `data` JS
	 * object.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function content_template() {
		$class_name = $this->get_singular_name();
		?>
		<div class="refraction-control-field">
			<label class="refraction-control-title">{{{ data.label }}}</label>
			<?php $this->print_units_template(); ?>
			<div class="refraction-control-input-wrapper">
				<ul class="refraction-control-<?php echo esc_attr( $class_name ); ?>s">
					<?php
					foreach ( $this->get_dimensions() as $dimension_key => $dimension_title ) :
						?>
						<li class="refraction-control-<?php echo esc_attr( $class_name ); ?>">
							<input id="<?php $this->print_control_uid( $dimension_key ); ?>" type="text" data-setting="<?php
								// PHPCS - the variable $dimension_key is a plain text.
								echo $dimension_key; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
							?>" placeholder="<#
									placeholder = view.getControlPlaceholder();
									if ( _.isObject( placeholder ) && ! _.isUndefined( placeholder.<?php
										// PHPCS - the variable $dimension_key is a plain text.
										echo $dimension_key; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
									?> ) ) {
											print( encodeURIComponent( placeholder.<?php
											// PHPCS - the variable $dimension_key is a plain text.
											echo $dimension_key; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
											?> ) );
									} else {
										print( placeholder ? encodeURIComponent( placeholder ) : '' );
									} #>"
							<# if ( -1 === _.indexOf( allowed_dimensions, '<?php
								// PHPCS - the variable $dimension_key is a plain text.
								echo $dimension_key; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
							?>' ) ) { #>
								disabled
								<# } #>
									/>
							<label for="<?php $this->print_control_uid( $dimension_key ); ?>" class="refraction-control-<?php echo esc_attr( $class_name ); ?>-label"><?php
								// PHPCS - the variable $dimension_title holds an escaped translated value.
								echo $dimension_title; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
							?></label>
						</li>
					<?php endforeach; ?>
					<li>
						<button class="refraction-link-<?php echo esc_attr( $class_name ); ?>s tooltip-target" data-tooltip="<?php echo esc_attr__( 'Link values together', 'refraction' ); ?>">
							<span class="refraction-linked">
								<i class="rficon-link" aria-hidden="true"></i>
								<span class="refraction-screen-only"><?php echo esc_html__( 'Link values together', 'refraction' ); ?></span>
							</span>
							<span class="refraction-unlinked">
								<i class="rficon-chain-broken" aria-hidden="true"></i>
								<span class="refraction-screen-only"><?php echo esc_html__( 'Unlinked values', 'refraction' ); ?></span>
							</span>
						</button>
					</li>
				</ul>
			</div>
		</div>
		<# if ( data.description ) { #>
		<div class="refraction-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<?php
	}
}
