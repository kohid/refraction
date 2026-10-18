<?php
namespace Refraction\Modules\KitElementsDefaults;

use Refraction\Core\Experiments\Manager as Experiments_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\KitElementsDefaults\Data\Controller;
use Refraction\Plugin;
use Refraction\Modules\KitElementsDefaults\ImportExport\Import_Export;
use Refraction\Modules\KitElementsDefaults\ImportExportCustomization\Import_Export_Customization;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends BaseModule {

	const META_KEY = '_refraction_elements_default_values';

	public function get_name() {
		return 'kit-elements-defaults';
	}

	private function enqueue_scripts() {
		wp_enqueue_script(
			'refraction-kit-elements-defaults-editor',
			$this->get_js_assets_url( 'kit-elements-defaults-editor' ),
			[
				'refraction-common',
				'refraction-editor-modules',
				'refraction-editor-document',
				'wp-i18n',
			],
			REFRACTION_VERSION,
			true
		);

		wp_set_script_translations( 'refraction-kit-elements-defaults-editor', 'refraction' );
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/editor/before_enqueue_scripts', function () {
			$this->enqueue_scripts();
		} );

		Plugin::$instance->data_manager_v2->register_controller( new Controller() );


		if ( is_admin() ) {
			( new Import_Export() )->register();
			( new Import_Export_Customization() )->register();
		}
	}
}
