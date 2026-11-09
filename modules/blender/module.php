<?php
namespace Elementor\Modules\Blender;

use Elementor\Core\Base\Module as BaseModule;
use Elementor\Modules\Blender\Classes\Gltf_Files;
use Elementor\Modules\Blender\Rest\Publish_Controller;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Blender integration.
 *
 * - Lets the media library accept glTF files (.glb / .gltf) after checking their content.
 * - Adds the "3D Model" widget, rendered with a locally bundled <model-viewer>.
 * - Exposes `refraction/v1/blender` so the Blender add-on in `integrations/blender/`
 *   can publish a scene straight into the media library.
 */
class Module extends BaseModule {

	const SCRIPT_HANDLE = 'refraction-model-viewer';

	const MODEL_VIEWER_VERSION = '4.4.0';

	public function get_name(): string {
		return 'blender';
	}

	protected function get_widgets(): array {
		return [
			'Model_3D',
		];
	}

	public function __construct() {
		parent::__construct();

		( new Gltf_Files() )->register_hooks();

		add_action( 'elementor/frontend/after_register_scripts', [ $this, 'register_scripts' ] );
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
	}

	public function register_scripts(): void {
		wp_register_script(
			self::SCRIPT_HANDLE,
			ELEMENTOR_ASSETS_URL . 'lib/model-viewer/model-viewer.min.js',
			[],
			self::MODEL_VIEWER_VERSION,
			true
		);

		// Decode Draco-compressed meshes with the bundled decoder instead of gstatic.com.
		wp_add_inline_script(
			self::SCRIPT_HANDLE,
			sprintf(
				'window.ModelViewerElement && window.ModelViewerElement.ModelViewerElement && ( window.ModelViewerElement.ModelViewerElement.dracoDecoderLocation = %s );',
				wp_json_encode( ELEMENTOR_ASSETS_URL . 'lib/draco/', JSON_UNESCAPED_SLASHES )
			)
		);
	}

	public function register_rest_routes(): void {
		( new Publish_Controller() )->register_routes();
	}
}
