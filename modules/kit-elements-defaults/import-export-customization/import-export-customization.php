<?php
namespace Refraction\Modules\KitElementsDefaults\ImportExportCustomization;

use Refraction\App\Modules\ImportExportCustomization\Processes\Export;
use Refraction\App\Modules\ImportExportCustomization\Processes\Import;
use Refraction\Modules\KitElementsDefaults\ImportExportCustomization\Runners\Export as Export_Runner;
use Refraction\Modules\KitElementsDefaults\ImportExportCustomization\Runners\Import as Import_Runner;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Import_Export_Customization {
	const FILE_NAME = 'kit-elements-defaults';

	public function register() {
		// Revert kit is working by default, using the site-settings runner.

		add_action( 'refraction/import-export-customization/export-kit', function ( Export $export ) {
			$export->register( new Export_Runner() );
		} );

		add_action( 'refraction/import-export-customization/import-kit', function ( Import $import ) {
			$import->register( new Import_Runner() );
		} );
	}
}
