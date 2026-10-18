<?php
namespace Refraction;

use Refraction\Core\Kits\Manager;
use Refraction\Core\Upgrade\Manager as Upgrade_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction maintenance.
 *
 * Refraction maintenance handler class is responsible for setting up Refraction
 * activation and uninstallation hooks.
 *
 * @since 1.0.0
 */
class Maintenance {

	/**
	 * Activate Refraction.
	 *
	 * Set Refraction activation hook.
	 *
	 * Fired by `register_activation_hook` when the plugin is activated.
	 *
	 * @param bool $network_wide
	 * @since 1.0.0
	 * @access public
	 * @static
	 */
	public static function activation( $network_wide ) {
		flush_rewrite_rules();

		if ( is_multisite() && $network_wide ) {
			static::create_default_kit(
				get_sites( [
					'fields' => 'ids',
				] )
			);

			return;
		}

		static::create_default_kit();
		static::insert_defaults_options();

	}

	public static function insert_defaults_options() {
		$history = Upgrade_Manager::get_installs_history();
		if ( empty( $history ) ) {
			$default_options = [
				'refraction_font_display' => 'swap',
			];
			foreach ( $default_options as $option_name => $option_value ) {
				if ( \Refraction\Utils::is_empty( get_option( $option_name ) ) ) {
					add_option( $option_name, $option_value );
				}
			}
		}
	}

	/**
	 * Init.
	 *
	 * Initialize Refraction Maintenance.
	 *
	 * @since 1.0.0
	 * @access public
	 * @static
	 */
	public static function init() {
		register_activation_hook( REFRACTION_PLUGIN_BASE, [ __CLASS__, 'activation' ] );

		add_action( 'wpmu_new_blog', function ( $site_id ) {
			if ( ! is_plugin_active_for_network( REFRACTION_PLUGIN_BASE ) ) {
				return;
			}

			static::create_default_kit( [ $site_id ] );
		} );
	}

	/**
	 * @param array $site_ids
	 */
	private static function create_default_kit( array $site_ids = [] ) {
		if ( ! empty( $site_ids ) ) {
			foreach ( $site_ids as $site_id ) {
				switch_to_blog( $site_id );

				Manager::create_default_kit();

				restore_current_blog();
			}

			return;
		}

		Manager::create_default_kit();
	}
}
