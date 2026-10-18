<?php
namespace Elementor\App\Modules\ImportExportCustomization\Data\Routes;

use Elementor\App\Modules\ImportExportCustomization\Module as ImportExportCustomizationModule;
use Elementor\Plugin;
use Elementor\App\Modules\ImportExportCustomization\Data\Response;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Upload extends Base_Route {
	protected function get_route(): string {
		return 'upload';
	}

	protected function get_method(): string {
		return \WP_REST_Server::CREATABLE;
	}

	/**
	 * @param $request \WP_REST_Request
	 * @return \WP_REST_Response
	 */
	protected function callback( $request ): \WP_REST_Response {
		/**
		 * @var $module ImportExportCustomizationModule
		 */
		$module = Plugin::$instance->app->get_component( 'import-export-customization' );

		try {
			$kit_id = $request->get_param( 'kit_id' );
			$module = Plugin::$instance->app->get_component( 'import-export-customization' );

			$files = $request->get_file_params();
			$file = $files['e_import_file'] ?? null;

			if ( empty( $file ) || empty( $file['tmp_name'] ) ) {
				return Response::error( 'no_file_uploaded', 'No file uploaded or upload error occurred.' );
			}

			$import_result = [
				'file_name' => $file['tmp_name'],
				'referrer' => $module::REFERRER_LOCAL,
			];

			Plugin::$instance->logger->get_logger()->info( 'Uploading Kit via REST API: ', [
				'meta' => [
					'kit_id' => $kit_id,
					'referrer' => $import_result['referrer'] ?? 'unknown',
				],
			] );

			$uploaded_kit = $module->upload_kit( $import_result['file_name'], $import_result['referrer'], $kit_id );

			$result = [
				'session' => $uploaded_kit['session'],
				'manifest' => $uploaded_kit['manifest'],
			];

			if ( ! empty( $uploaded_kit['conflicts'] ) ) {
				$result['conflicts'] = $uploaded_kit['conflicts'];
			}

			return Response::success( $result );

		} catch ( \Error | \Exception $e ) {
			Plugin::$instance->logger->get_logger()->error( $e->getMessage(), [
				'meta' => [
					'trace' => $e->getTraceAsString(),
				],
			] );

			if ( $module->is_third_party_class( $e->getTrace()[0]['class'] ) ) {
				return Response::error( ImportExportCustomizationModule::THIRD_PARTY_ERROR, $e->getMessage() );
			}

			return Response::error( $e->getMessage(), 'upload_error' );
		}
	}

	protected function get_args(): array {
		return [
			'kit_id' => [
				'type' => 'string',
				'description' => 'Kit ID for upload action',
				'required' => false,
			],
		];
	}
}
