<?php
namespace Refraction\Modules\WpCli;

use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction Page Builder cli tools.
 */
class Command extends \WP_CLI_Command {

	/**
	 * Flush the Refraction Page Builder CSS Cache.
	 *
	 * [--network]
	 *      Flush CSS Cache for all the sites in the network.
	 *
	 * [--regenerate]
	 *      Re-create the CSS files. Otherwise they will be created by a page visit.
	 *
	 * ## EXAMPLES
	 *
	 *  1. wp refraction flush-css
	 *      - This will flush the CSS files for refraction page builder.
	 *
	 *  2. wp refraction flush-css --network
	 *      - This will flush the CSS files for refraction page builder for all the sites in the network.
	 *
	 *  3. wp refraction flush-css --regenerate
	 *      - This will flush the CSS files for refraction page builder and re-create the new CSS files.
	 *
	 * @since 2.1.0
	 * @access public
	 * @alias flush-css
	 */
	public function flush_css( $args, $assoc_args ) {
		$network = ! empty( $assoc_args['network'] ) && is_multisite();
		$should_regenerate = ! empty( $assoc_args['regenerate'] );

		if ( $network ) {
			$blog_ids = get_sites( [
				'fields' => 'ids',
				'number' => 0,
			] );

			foreach ( $blog_ids as $blog_id ) {
				switch_to_blog( $blog_id );

				$this->handle_flush( $should_regenerate, 'Flushed the Refraction CSS Cache for site - ' . get_option( 'home' ) );

				restore_current_blog();
			}
		} else {
			$this->handle_flush( $should_regenerate, 'Flushed the Refraction CSS Cache' );
		}
	}

	private function handle_flush( bool $should_regenerate, string $success_message ): void {
		Plugin::$instance->files_manager->clear_cache();

		if ( $should_regenerate ) {
			Plugin::$instance->files_manager->generate_css();
		}

		\WP_CLI::success( $success_message );
	}

	/**
	 * Replace old URLs with new URLs in all Refraction pages.
	 *
	 * [--force]
	 *      Suppress error messages. instead, return "0 database rows affected.".
	 *
	 * ## EXAMPLES
	 *
	 *  1. wp refraction replace-urls <old> <new>
	 *      - This will replace all <old> URLs with the <new> URL.
	 *
	 *  2. wp refraction replace-urls <old> <new> --force
	 *      - This will replace all <old> URLs with the <new> URL without throw errors.
	 *
	 * @access public
	 * @alias replace-urls
	 */
	public function replace_urls( $args, $assoc_args ) {
		if ( empty( $args[0] ) ) {
			\WP_CLI::error( 'Please set the `old` URL' );
		}

		if ( empty( $args[1] ) ) {
			\WP_CLI::error( 'Please set the `new` URL' );
		}

		try {
			$results = Utils::replace_urls( $args[0], $args[1] );
			\WP_CLI::success( $results );
		} catch ( \Exception $e ) {
			if ( isset( $assoc_args['force'] ) ) {
				\WP_CLI::success( '0 database rows affected.' );
			} else {
				\WP_CLI::error( $e->getMessage() );
			}
		}
	}

	/**
	 * Import template files to the Library.
	 *
	 * ## EXAMPLES
	 *
	 *  1. wp refraction import-library <file-path>
	 *      - This will import a file or a zip of multiple files to the library.
	 *
	 * @since 2.1.0
	 * @access public
	 * @alias import-library
	 */
	public function import_library( $args, $assoc_args ) {
		// TODO:
		// \WP_CLI::warning( 'command is deprecated since 2.8.0 Please use: wp refraction library import' );

		if ( empty( $args[0] ) ) {
			\WP_CLI::error( 'Please set file path.' );
		}

		/** @var Source_Local $source */
		$source = Plugin::$instance->templates_manager->get_source( 'local' );

		$imported_items = $source->import_template( basename( $args[0] ), $args[0] );

		if ( is_wp_error( $imported_items ) ) {
			\WP_CLI::error( $imported_items->get_error_message() );
		}

		\WP_CLI::success( count( $imported_items ) . ' item(s) has been imported.' );
	}
}
