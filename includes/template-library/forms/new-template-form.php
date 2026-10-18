<?php
namespace Refraction\TemplateLibrary\Forms;

use Refraction\Controls_Manager;
use Refraction\Controls_Stack;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class New_Template_Form extends Controls_Stack {

	public function get_name() {
		return 'add-template-form';
	}

	/**
	 * @throws \Exception If control type is not supported.
	 */
	public function render() {
		foreach ( $this->get_controls() as $control ) {
			switch ( $control['type'] ) {
				case Controls_Manager::SELECT:
					$this->render_select( $control );
					break;
				default:
					throw new \Exception( sprintf( "'%s' control type is not supported.", esc_html( $control['type'] ) ) );
			}
		}
	}

	private function render_select( $control_settings ) {
		$control_id = "refraction-new-template__form__{$control_settings['name']}";
		$wrapper_class = isset( $control_settings['wrapper_class'] ) ? $control_settings['wrapper_class'] : '';
		?>
		<div id="<?php echo esc_attr( $control_id ); ?>__wrapper" class="refraction-form-field <?php echo esc_attr( $wrapper_class ); ?>">
			<label for="<?php echo esc_attr( $control_id ); ?>" class="refraction-form-field__label">
				<?php echo esc_html( $control_settings['label'] ); ?>
			</label>
			<div class="refraction-form-field__select__wrapper">
				<select id="<?php echo esc_attr( $control_id ); ?>" class="refraction-form-field__select" name="meta[<?php echo esc_html( $control_settings['name'] ); ?>]">
					<?php
					foreach ( $control_settings['options'] as $key => $value ) {
						printf( '<option value="%1$s">%2$s</option>', esc_html( $key ), esc_html( $value ) );
					}
					?>
				</select>
			</div>
		</div>
		<?php
	}
}
