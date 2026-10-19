<?php
namespace Refraction;

use Refraction\Modules\DynamicTags\Module as TagsModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction gallery control.
 *
 * A base control for creating gallery chooser control. Based on the WordPress
 * media library galleries. Used to select images from the WordPress media library.
 *
 * @since 1.0.0
 */
class Control_Gallery extends Base_Data_Control {

	/**
	 * Get gallery control type.
	 *
	 * Retrieve the control type, in this case `gallery`.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Control type.
	 */
	public function get_type() {
		return 'gallery';
	}

	public function on_export( $settings ) {
		foreach ( $settings as $attachment ) {
			if ( ! empty( $attachment['url'] ) ) {
				do_action( 'refraction/templates/collect_media_url', $attachment['url'], $attachment );
			}
		}

		return $settings;
	}

	/**
	 * Import gallery images.
	 *
	 * Used to import gallery control files from external sites while importing
	 * Refraction template JSON file, and replacing the old data.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param array $settings Control settings.
	 *
	 * @return array Control settings.
	 */
	public function on_import( $settings ) {
		foreach ( $settings as &$attachment ) {
			if ( empty( $attachment['url'] ) ) {
				continue;
			}

			$local_file_path = \Refraction\TemplateLibrary\Classes\Media_Mapper::get_local_file_path( $attachment['url'] );
			$imported_attachment = false;

			if ( $local_file_path !== $attachment['url'] && file_exists( $local_file_path ) ) {
				$imported_attachment = Plugin::$instance->templates_manager->get_import_images_instance()->import_local_file( $local_file_path );
			}

			if ( ! $imported_attachment ) {
				$imported_attachment = Plugin::$instance->templates_manager->get_import_images_instance()->import( $attachment );
			}

			$attachment = $imported_attachment;
		}

		// Filter out attachments that don't exist
		$settings = array_filter( $settings );

		return $settings;
	}

	/**
	 * Render gallery control output in the editor.
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
			<div class="refraction-control-title">{{{ data.label }}}</div>
			<div class="refraction-control-input-wrapper">
				<# if ( data.description ) { #>
				<div class="refraction-control-field-description">{{{ data.description }}}</div>
				<# } #>
				<div class="refraction-control-media__content refraction-control-tag-area">
					<div class="refraction-control-gallery-status refraction-control-dynamic-switcher-wrapper">
						<span class="refraction-control-gallery-status-title"></span>
						<button class="refraction-control-gallery-clear refraction-control-unit-1 tooltip-target" data-tooltip="<?php echo esc_attr__( 'Clear gallery', 'refraction' ); ?>" aria-label="<?php echo esc_attr__( 'Clear gallery', 'refraction' ); ?>">
							<i class="rficon-trash-o" aria-hidden="true"></i>
						</button>
					</div>
					<div class="refraction-control-gallery-content">
						<div class="refraction-control-gallery-thumbnails" tabindex="0"></div>
						<div class="refraction-control-gallery-edit">
							<span><i class="rficon-pencil" aria-hidden="true"></i></span>
							<span class="refraction-screen-only"><?php echo esc_html__( 'Edit gallery', 'refraction' ); ?></span>
						</div>
						<button class="refraction-button refraction-control-gallery-add tooltip-target" data-tooltip="<?php echo esc_attr__( 'Add Images', 'refraction' ); ?>" aria-label="<?php echo esc_attr__( 'Add Images', 'refraction' ); ?>">
							<i class="rficon-plus-circle" aria-hidden="true"></i>
						</button>
					</div>
				</div>

			</div>
		</div>
		<?php
	}

	/**
	 * Get gallery control default settings.
	 *
	 * Retrieve the default settings of the gallery control. Used to return the
	 * default settings while initializing the gallery control.
	 *
	 * @since 1.0.0
	 * @access protected
	 *
	 * @return array Control default settings.
	 */
	protected function get_default_settings() {
		return [
			'label_block' => true,
			'dynamic' => [
				'categories' => [ TagsModule::GALLERY_CATEGORY ],
				'returnType' => 'object',
			],
		];
	}

	/**
	 * Get gallery control default values.
	 *
	 * Retrieve the default value of the gallery control. Used to return the default
	 * values while initializing the gallery control.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array Control default value.
	 */
	public function get_default_value() {
		return [];
	}
}
