<?php
namespace Refraction\Modules\System_Info\Reporters;

use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction server environment report.
 *
 * Refraction system report handler class responsible for generating a report for
 * the server environment.
 *
 * @since 1.0.0
 */
class Server extends Base {

	const KEY_PATH_WP_CONTENT_DIR = 'wp_content';
	const KEY_PATH_UPLOADS_DIR = 'uploads';
	const KEY_PATH_REFRACTION_UPLOADS_DIR = 'refraction_uploads';
	const KEY_PATH_HTACCESS_FILE = '.htaccess';

	/**
	 * Get server environment reporter title.
	 *
	 * Retrieve server environment reporter title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Reporter title.
	 */
	public function get_title() {
		return 'Server Environment';
	}

	/**
	 * Get server environment report fields.
	 *
	 * Retrieve the required fields for the server environment report.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array Required report fields with field ID and field label.
	 */
	public function get_fields() {
		return [
			'os' => 'Operating System',
			'software' => 'Software',
			'mysql_version' => 'MySQL version',
			'php_version' => 'PHP Version',
			'php_memory_limit' => 'PHP Memory Limit',
			'php_max_input_vars' => 'PHP Max Input Vars',
			'php_max_post_size' => 'PHP Max Post Size',
			'gd_installed' => 'GD Installed',
			'zip_installed' => 'ZIP Installed',
			'write_permissions' => 'Write Permissions',
		];
	}

	/**
	 * Get server operating system.
	 *
	 * Retrieve the server operating system.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value Server operating system.
	 * }
	 */
	public function get_os() {
		return [
			'value' => PHP_OS,
		];
	}

	/**
	 * Get server software.
	 *
	 * Retrieve the server software.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value Server software.
	 * }
	 */
	public function get_software() {
		return [
			'value' => Utils::get_super_global_value( $_SERVER, 'SERVER_SOFTWARE' ),
		];
	}

	/**
	 * Get PHP version.
	 *
	 * Retrieve the PHP version.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value          PHP version.
	 *    @type string $recommendation Minimum PHP version recommendation.
	 *    @type bool   $warning        Whether to display a warning.
	 * }
	 */
	public function get_php_version() {
		$result = [
			'value' => PHP_VERSION,
		];
		$recommended_php_version = '7.4';

		if ( version_compare( $result['value'], $recommended_php_version, '<' ) ) {
			$result['recommendation'] = sprintf(
				/* translators: %s: Recommended PHP version. */
				esc_html__( 'We recommend using PHP version %s or higher.', 'refraction' ),
				$recommended_php_version
			);

			$result['warning'] = true;
		}

		return $result;
	}

	/**
	 * Get PHP memory limit.
	 *
	 * Retrieve the PHP memory limit.
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value          PHP memory limit.
	 *    @type string $recommendation Recommendation memory limit.
	 *    @type bool   $warning        Whether to display a warning. True if the limit
	 *                                 is below the recommended 128M, False otherwise.
	 * }
	 */
	public function get_php_memory_limit() {
		$result = [
			'value' => (string) ini_get( 'memory_limit' ),
		];

		$min_recommended_memory = '128M';
		$preferred_memory = '256M';

		$memory_limit_bytes = wp_convert_hr_to_bytes( $result['value'] );

		$min_recommended_bytes = wp_convert_hr_to_bytes( $min_recommended_memory );

		if ( $memory_limit_bytes < $min_recommended_bytes ) {
			$result['recommendation'] = sprintf(
				/* translators: 1: Minimum recommended_memory, 2: Preferred memory. */
				__( 'We recommend setting memory to at least %1$s. (%2$s or higher is preferred)', 'refraction' ),
				$min_recommended_memory,
				$preferred_memory
			);

			$result['warning'] = true;
		}

		return $result;
	}

	/**
	 * Get PHP `max_input_vars`.
	 *
	 * Retrieve the value of `max_input_vars` from `php.ini` configuration file.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value PHP `max_input_vars`.
	 * }
	 */
	public function get_php_max_input_vars() {
		return [
			'value' => ini_get( 'max_input_vars' ),
		];
	}

	/**
	 * Get PHP `post_max_size`.
	 *
	 * Retrieve the value of `post_max_size` from `php.ini` configuration file.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value PHP `post_max_size`.
	 * }
	 */
	public function get_php_max_post_size() {
		return [
			'value' => ini_get( 'post_max_size' ),
		];
	}

	/**
	 * Get GD installed.
	 *
	 * Whether the GD extension is installed.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value   Yes if the GD extension is installed, No otherwise.
	 *    @type bool   $warning Whether to display a warning. True if the GD extension is installed, False otherwise.
	 * }
	 */
	public function get_gd_installed() {
		$gd_installed = extension_loaded( 'gd' );

		return [
			'value' => $gd_installed ? 'Yes' : 'No',
			'warning' => ! $gd_installed,
		];
	}

	/**
	 * Get ZIP installed.
	 *
	 * Whether the ZIP extension is installed.
	 *
	 * @since 2.1.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value   Yes if the ZIP extension is installed, No otherwise.
	 *    @type bool   $warning Whether to display a warning. True if the ZIP extension is installed, False otherwise.
	 * }
	 */
	public function get_zip_installed() {
		$zip_installed = extension_loaded( 'zip' );

		return [
			'value' => $zip_installed ? 'Yes' : 'No',
			'warning' => ! $zip_installed,
		];
	}

	/**
	 * Get MySQL version.
	 *
	 * Retrieve the MySQL version.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value MySQL version.
	 * }
	 */
	public function get_mysql_version() {
		global $wpdb;

		$db_server_version = $wpdb->get_results( "SHOW VARIABLES WHERE `Variable_name` IN ( 'version_comment', 'innodb_version' )", OBJECT_K );

		$db_server_version_string = $db_server_version['version_comment']->Value . ' v';

		// On some hosts, `innodb_version` is empty, in PHP 8.1.
		if ( isset( $db_server_version['innodb_version'] ) ) {
			$db_server_version_string .= $db_server_version['innodb_version']->Value;
		} else {
			$db_server_version_string .= $wpdb->get_var( 'SELECT VERSION() AS version' );
		}

		return [
			'value' => $db_server_version_string,
		];
	}

	/**
	 * Get write permissions.
	 * Check whether the required paths for have writing permissions.
	 *
	 * @since 1.9.0
	 * @access public
	 *
	 * @return array {
	 *    Report data.
	 *
	 *    @type string $value   Writing permissions status.
	 *    @type bool   $warning Whether to display a warning. True if some required
	 *                          folders don't have writing permissions, False otherwise.
	 * }
	 */
	public function get_write_permissions(): array {
		$paths_to_check = [
			static::KEY_PATH_HTACCESS_FILE => $this->get_system_path( static::KEY_PATH_HTACCESS_FILE ),
			static::KEY_PATH_UPLOADS_DIR => $this->get_system_path( static::KEY_PATH_UPLOADS_DIR ),
			static::KEY_PATH_REFRACTION_UPLOADS_DIR => $this->get_system_path( static::KEY_PATH_REFRACTION_UPLOADS_DIR ),
		];

		$paths_permissions = $this->get_paths_permissions( $paths_to_check );

		$write_problems = [];

		if ( ! $paths_permissions[ static::KEY_PATH_UPLOADS_DIR ]['write'] ) {
			$write_problems[] = 'WordPress uploads directory';
		}

		if ( $paths_permissions[ self::KEY_PATH_REFRACTION_UPLOADS_DIR ]['exists'] && ! $paths_permissions[ self::KEY_PATH_REFRACTION_UPLOADS_DIR ]['write'] ) {
			$write_problems[] = 'Refraction uploads directory';
		}

		if ( $paths_permissions[ self::KEY_PATH_HTACCESS_FILE ]['exists'] && ! $paths_permissions[ self::KEY_PATH_HTACCESS_FILE ]['write'] ) {
			$write_problems[] = '.htaccess file';
		}

		if ( $write_problems ) {
			$value = 'There are some writing permissions issues with the following directories/files:' . "\n\t\t - ";

			$value .= implode( "\n\t\t - ", $write_problems );
		} else {
			$value = 'All right';
		}

		return [
			'value' => $value,
			'warning' => (bool) $write_problems,
		];
	}

	/**
	 * @param $paths [] Paths to check permissions.
	 * @return array []{exists: bool, read: bool, write: bool, execute: bool}
	 */
	public function get_paths_permissions( $paths ): array {
		$permissions = [];

		foreach ( $paths as $key_path => $path ) {
			$permissions[ $key_path ] = $this->get_path_permissions( $path );
		}

		return $permissions;
	}

	/**
	 * Get path by path key.
	 *
	 * @param $path_key
	 * @return string
	 */
	public function get_system_path( $path_key ): string {
		switch ( $path_key ) {
			case static::KEY_PATH_WP_CONTENT_DIR:
				return WP_CONTENT_DIR;

			case static::KEY_PATH_HTACCESS_FILE:
				return file_exists( ABSPATH . '/.htaccess' ) ? ABSPATH . '/.htaccess' : '';

			case static::KEY_PATH_UPLOADS_DIR:
				return wp_upload_dir()['basedir'] ?? '';

			case static::KEY_PATH_REFRACTION_UPLOADS_DIR:
				if ( empty( wp_upload_dir()['basedir'] ) ) {
					return '';
				}

				$refraction_uploads_dir = wp_upload_dir()['basedir'] . '/refraction';

				return is_dir( $refraction_uploads_dir ) ? $refraction_uploads_dir : '';

			default:
				return '';
		}
	}

	/**
	 * Check the permissions of a path.
	 *
	 * @param $path
	 * @return array{exists: bool, read: bool, write: bool, execute: bool}
	 */
	public function get_path_permissions( $path ): array {
		if ( empty( $path ) ) {
			return [
				'exists' => false,
				'read' => false,
				'write' => false,
				'execute' => false,
			];
		}

		return [
			'exists' => true,
			'read' => is_readable( $path ),
			'write' => is_writeable( $path ),
			'execute' => is_executable( $path ),
		];
	}
}
