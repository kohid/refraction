<?php

namespace Refraction\Core\Files\Assets;

use Refraction\Core\Files\File_Types\Svg;
use Refraction\Core\Files\Uploads_Manager;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Files Upload Handler
 *
 * @deprecated 3.5.0 Use `Refraction\Core\Files\Uploads_Manager` class instead.
 */
abstract class Files_Upload_Handler {

	/**
	 * @deprecated 3.5.0
	 */
	const OPTION_KEY = 'refraction_unfiltered_files_upload';

	/**
	 * @deprecated 3.5.0
	 */
	abstract public function get_mime_type();

	/**
	 * @deprecated 3.5.0
	 */
	abstract public function get_file_type();

	/**
	 * Is Refraction Media Upload
	 *
	 * @deprecated 3.5.0 Use `Refraction\Plugin::$instance->uploads_manager->are_unfiltered_uploads_enabled()` instead.
	 *
	 * @return bool
	 */
	private function is_refraction_media_upload() {
		Plugin::$instance->modules_manager->get_modules( 'dev-tools' )->deprecation->deprecated_function( __METHOD__, '3.5.0', 'Refraction\Plugin::$instance->uploads_manager->are_unfiltered_uploads_enabled()' );

		return Plugin::$instance->uploads_manager->is_refraction_media_upload();
	}

	/**
	 * Is Enabled
	 *
	 * @deprecated 3.5.0 Use `Refraction\Plugin::$instance->uploads_manager->are_unfiltered_uploads_enabled()` instead.
	 *
	 * @return bool
	 */
	final public static function is_enabled() {
		Plugin::$instance->modules_manager->get_modules( 'dev-tools' )->deprecation->deprecated_function( __METHOD__, '3.5.0', 'Refraction\Plugin::$instance->uploads_manager->are_unfiltered_uploads_enabled()' );

		return Plugin::$instance->uploads_manager->are_unfiltered_uploads_enabled();
	}

	/**
	 * @deprecated 3.5.0 Use `Refraction\Plugin::$instance->uploads_manager->are_unfiltered_uploads_enabled()` instead.
	 */
	final public function support_unfiltered_files_upload( $existing_mimes ) {
		Plugin::$instance->modules_manager->get_modules( 'dev-tools' )->deprecation->deprecated_function( __METHOD__, '3.5.0', 'Refraction\Plugin::$instance->uploads_manager->support_unfiltered_file_uploads()' );

		return Plugin::$instance->uploads_manager->support_unfiltered_refraction_file_uploads( $existing_mimes );
	}

	/**
	 * Handle_upload_prefilter
	 *
	 * @deprecated 3.5.0 Use `Refraction\Plugin::$instance->uploads_manager->handle_refraction_wp_media_upload()` instead.
	 *
	 * @param $file
	 *
	 * @return mixed
	 */
	public function handle_upload_prefilter( $file ) {
		Plugin::$instance->modules_manager->get_modules( 'dev-tools' )->deprecation->deprecated_function( __METHOD__, '3.5.0', 'Refraction\Plugin::$instance->uploads_manager->handle_refraction_wp_media_upload()' );

		return Plugin::$instance->uploads_manager->handle_refraction_wp_media_upload( $file );
	}

	/**
	 * Is_file_should_handled
	 *
	 * @deprecated 3.5.0
	 *
	 * @param $file
	 *
	 * @return bool
	 */
	protected function is_file_should_handled( $file ) {
		Plugin::$instance->modules_manager->get_modules( 'dev-tools' )->deprecation->deprecated_function( __METHOD__, '3.5.0' );

		$ext = pathinfo( $file['name'], PATHINFO_EXTENSION );

		return $this->is_refraction_media_upload() && $this->get_file_type() === $ext;
	}

	/**
	 * File_sanitizer_can_run
	 *
	 * @deprecated 3.5.0 Use `Refraction\Core\Files\File_Types\Svg::file_sanitizer_can_run()` instead.
	 *
	 * @return bool
	 */
	public static function file_sanitizer_can_run() {
		Plugin::$instance->modules_manager->get_modules( 'dev-tools' )->deprecation->deprecated_function( __METHOD__, '3.5.0', 'Refraction\Core\Files\File_Types\Svg::file_sanitizer_can_run()' );

		return Svg::file_sanitizer_can_run();
	}

	/**
	 * Check filetype and ext
	 *
	 * A workaround for upload validation which relies on a PHP extension (fileinfo)
	 * with inconsistent reporting behaviour.
	 * ref: https://core.trac.wordpress.org/ticket/39550
	 * ref: https://core.trac.wordpress.org/ticket/40175
	 *
	 * @deprecated 3.5.0 Use `Refraction\Plugin::$instance->uploads_manager->check_filetype_and_ext()` instead.
	 *
	 * @param $data
	 * @param $file
	 * @param $filename
	 * @param $mimes
	 *
	 * @return mixed
	 */
	public function check_filetype_and_ext( $data, $file, $filename, $mimes ) {
		Plugin::$instance->modules_manager->get_modules( 'dev-tools' )->deprecation->deprecated_function( __METHOD__, '3.5.0', 'Refraction\Plugin::$instance->uploads_manager->check_filetype_and_ext()' );

		Plugin::$instance->uploads_manager->check_filetype_and_ext( $data, $file, $filename, $mimes );
	}
}
