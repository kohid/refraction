<?php
namespace Refraction;

use Refraction\Modules\DynamicTags\Module as TagsModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction Icons control.
 *
 * A base control for creating a Icons chooser control.
 * Used to select an Icon.
 *
 *
 * @since 2.6.0
 */
class Control_Icons extends Control_Base_Multiple {

	/**
	 * Get media control type.
	 *
	 * Retrieve the control type, in this case `media`.
	 *
	 * @access public
	 * @since 2.6.0
	 * @return string Control type.
	 */
	public function get_type() {
		return 'icons';
	}

	/**
	 * Get Icons control default values.
	 *
	 * Retrieve the default value of the Icons control. Used to return the default
	 * values while initializing the Icons control.
	 *
	 * @access public
	 * @since 2.6.0
	 * @return array Control default value.
	 */
	public function get_default_value() {
		return [
			'value'   => '',
			'library' => '',
		];
	}

	/**
	 * Render Icons control output in the editor.
	 *
	 * Used to generate the control HTML in the editor using Underscore JS
	 * template. The variables for the class are available using `data` JS
	 * object.
	 *
	 * @since 2.6.0
	 * @access public
	 */
	public function content_template() {
		?>
		<# if ( 'inline' === data.skin ) { #>
			<?php $this->render_inline_skin(); ?>
		<# } else { #>
			<?php $this->render_media_skin(); ?>
		<# } #>
		<?php
	}

	public function render_media_skin() {
		?>
		<div class="refraction-control-field refraction-control-media">
			<label class="refraction-control-title">{{{ data.label }}}</label>
			<div class="refraction-control-input-wrapper">
				<div class="refraction-control-media__content refraction-control-tag-area refraction-control-preview-area">
					<div class="refraction-control-media-upload-button refraction-control-media__content__upload-button">
						<i class="eicon-plus-circle" aria-hidden="true"></i>
						<span class="refraction-screen-only"><?php echo esc_html__( 'Add', 'refraction' ); ?></span>
					</div>
					<div class="refraction-control-media-area">
						<div class="refraction-control-media__remove refraction-control-media__content__remove" data-tooltip="<?php echo esc_attr__( 'Remove', 'refraction' ); ?>">
							<i class="eicon-trash-o" aria-hidden="true"></i>
							<span class="refraction-screen-only"><?php echo esc_html__( 'Remove', 'refraction' ); ?></span>
						</div>
						<div class="refraction-control-media__preview"></div>
					</div>
					<div class="refraction-control-media__tools refraction-control-dynamic-switcher-wrapper">
						<div class="refraction-control-icon-picker refraction-control-media__tool"><?php echo esc_html__( 'Icon Library', 'refraction' ); ?></div>
						<div class="refraction-control-svg-uploader refraction-control-media__tool"><?php echo esc_html__( 'Upload SVG', 'refraction' ); ?></div>
					</div>
				</div>
			</div>
			<# if ( data.description ) { #>
			<div class="refraction-control-field-description">{{{ data.description }}}</div>
			<# } #>
			<input type="hidden" data-setting="{{ data.name }}"/>
		</div>
		<?php
	}

	public function render_inline_skin() {
		?>
		<#
			const defaultSkinSettings = {
				none: {
					label: '<?php echo esc_html__( 'None', 'refraction' ); ?>',
					icon: 'eicon-ban',
				},
				svg: {
					label: '<?php echo esc_html__( 'Upload SVG', 'refraction' ); ?>',
					icon: 'eicon-upload',
				},
				icon: {
					label: '<?php echo esc_html__( 'Icon Library', 'refraction' ); ?>',
					icon: 'eicon-circle',
				}
			};

			const skinSettings = data.skin_settings.inline;

			const get = ( type, key ) => {
				if ( skinSettings[ type ] ) {
					return skinSettings[ type ]?.[ key ] || defaultSkinSettings[ type ][ key ];
				}

				return defaultSkinSettings[ type ][ key ];
			}
		#>
		<div class="refraction-control-field refraction-control-inline-icon">
			<label class="refraction-control-title">{{{ data.label }}}</label>
			<div class="refraction-control-input-wrapper">
				<div class="refraction-choices">
					<# if ( ! data.exclude_inline_options.includes( 'none' ) ) { #>
						<input id="<?php $this->print_control_uid(); ?>-none" type="radio" value="none">
						<label class="refraction-choices-label refraction-control-unit-1 tooltip-target refraction-control-icons--inline__none" for="<?php $this->print_control_uid(); ?>-none" data-tooltip="{{ get( 'none', 'label' ) }}">
							<i class="{{ get( 'none', 'icon' ) }}" aria-hidden="true"></i>
							<span class="refraction-screen-only">{{ get( 'none', 'label' ) }}</span>
						</label>
					<# }
					if ( ! data.exclude_inline_options.includes( 'svg' ) ) { #>
						<input id="<?php $this->print_control_uid(); ?>-svg" type="radio" value="svg">
						<label class="refraction-choices-label refraction-control-unit-1 tooltip-target refraction-control-icons--inline__svg" for="<?php $this->print_control_uid(); ?>-svg" data-tooltip="{{ get( 'svg', 'label' ) }}">
							<i class="{{ get( 'svg', 'icon' ) }}" aria-hidden="true"></i>
							<span class="refraction-screen-only">{{ get( 'svg', 'label' ) }}</span>
						</label>
					<# }
					if ( ! data.exclude_inline_options.includes( 'icon' ) ) { #>
						<input id="<?php $this->print_control_uid(); ?>-icon" type="radio" value="icon">
						<label class="refraction-choices-label refraction-control-unit-1 tooltip-target refraction-control-icons--inline__icon" for="<?php $this->print_control_uid(); ?>-icon" data-tooltip="{{ get( 'icon', 'label' ) }}">
							<span class="refraction-control-icons--inline__displayed-icon">
								<i class="{{ get( 'icon', 'icon' ) }}" aria-hidden="true"></i>
							</span>
							<span class="refraction-screen-only">{{ get( 'icon', 'label' ) }}</span>
						</label>
					<# } #>
				</div>
			</div>
		</div>

		<# if ( data.description ) { #>
		<div class="refraction-control-field-description">{{{ data.description }}}</div>
		<# } #>
		<?php
	}

	/**
	 * Get Icons control default settings.
	 *
	 * Retrieve the default settings of the Icons control. Used to return the default
	 * settings while initializing the Icons control.
	 *
	 * @since 2.6.0
	 * @access protected
	 *
	 * @return array Control default settings.
	 */
	protected function get_default_settings() {
		return [
			'label_block' => true,
			'dynamic' => [
				'categories' => [ TagsModule::IMAGE_CATEGORY ],
				'returnType' => 'object',
			],
			'search_bar' => true,
			'recommended' => false,
			'skin' => 'media',
			'exclude_inline_options' => [],
			'disable_initial_active_state' => false,
			'skin_settings' => [
				'inline' => [
					'none' => [
						'label' => esc_html__( 'None', 'refraction' ),
						'icon' => 'eicon-ban',
					],
					'svg' => [
						'label' => esc_html__( 'Upload SVG', 'refraction' ),
						'icon' => 'eicon-upload',
					],
					'icon' => [
						'label' => esc_html__( 'Icon Library', 'refraction' ),
						'icon' => 'eicon-circle',
					],
				],
			],
		];
	}

	/**
	 * Support SVG Import
	 *
	 * @param array $mimes
	 * @return array
	 * @deprecated 3.5.0
	 */
	public function support_svg_import( $mimes ) {
		Plugin::$instance->modules_manager->get_modules( 'dev-tools' )->deprecation->deprecated_function( __METHOD__, '3.5.0' );

		$mimes['svg'] = 'image/svg+xml';
		return $mimes;
	}

	public function on_import( $settings ) {
		if ( empty( $settings['library'] ) || 'svg' !== $settings['library'] || empty( $settings['value']['url'] ) ) {
			return $settings;
		}

		$imported = Plugin::$instance->templates_manager->get_import_images_instance()->import( $settings['value'] );

		if ( ! $imported ) {
			$settings['value'] = '';
			$settings['library'] = '';
		} else {
			$settings['value'] = $imported;
		}
		return $settings;
	}
}
