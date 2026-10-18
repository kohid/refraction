<?php
namespace Refraction\Core\Upgrade;

use Refraction\Core\Base\DB_Upgrades_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Manager extends DB_Upgrades_Manager {

	/**
	 * @deprecated 3.17.0
	 */
	const INSTALLS_HISTORY_META = 'refraction_install_history';

	const VERSION_OPTION_NAME = 'refraction_version';

	public static function get_install_history_meta() {
		return 'refraction_install_history';
	}

	/**
	 * TODO: Remove in future releases
	 *
	 * @deprecated 3.1.0
	 */
	public function should_upgrade() {
		if ( ( 'refraction' === $this->get_plugin_name() ) && version_compare( get_option( $this->get_version_option_name() ), '2.4.2', '<' ) ) {
			delete_option( 'refraction_log' );
		}

		return parent::should_upgrade();
	}

	/**
	 * Data migrations inherited from upstream (their version numbers are upstream release numbers).
	 * A Refraction site never needs them: its data is created by this code base. They stay defined for
	 * code that calls them directly, but are never queued by the updater.
	 */
	const LEGACY_UPGRADES = [
		'_v_0_3_2', '_v_0_9_2', '_v_0_11_0', '_v_2_0_0', '_v_2_0_1', '_v_2_0_10', '_v_2_1_0',
		'_v_2_3_0_widget_image', '_v_2_3_0_template_type', '_v_2_6_0_fa4_migration_flag',
		'_v_2_6_6_fa4_migration_button', '_v_2_7_1_remove_old_usage_data', '_v_2_7_1_recalc_usage_data',
		'_v_2_8_3_recalc_usage_data', '_v_3_0_0_move_general_settings_to_kit',
		'_v_3_2_0_migrate_breakpoints_to_new_system', '_v_3_4_8_fix_font_awesome_default_value_from_1_to_yes',
		'_v_3_5_0_remove_old_refraction_scheme', '_v_3_8_0_fix_php8_image_custom_size',
		'_v_3_16_0_container_updates', '_v_3_17_0_site_settings_updates', '_v_3_26_0',
	];

	public function get_upgrade_callbacks() {
		return array_values( array_filter(
			parent::get_upgrade_callbacks(),
			function ( $callback ) {
				return ! in_array( $callback[1], self::LEGACY_UPGRADES, true );
			}
		) );
	}

	public function get_name() {
		return 'upgrade';
	}

	public function get_action() {
		return 'refraction_updater';
	}

	public function get_plugin_name() {
		return 'refraction';
	}

	public function get_plugin_label() {
		return esc_html__( 'Refraction', 'refraction' );
	}

	public function get_updater_label() {
		return esc_html__( 'Refraction Data Updater', 'refraction' );
	}

	public function get_new_version() {
		return REFRACTION_VERSION;
	}

	public function get_version_option_name() {
		return self::VERSION_OPTION_NAME;
	}

	public function get_upgrades_class() {
		return 'Refraction\Core\Upgrade\Upgrades';
	}

	public static function get_installs_history() {
		return get_option( static::get_install_history_meta(), [] );
	}

	/**
	 * The version the site was first installed with, as seen by the inherited upstream feature gates.
	 *
	 * Refraction starts at 0.1.0, which is lower than every upstream version number the gates compare
	 * against (3.16.0, 3.30.0, ...). A Refraction install is a new install of the upstream code base it
	 * was forked from, so it can never be older than REFRACTION_UPSTREAM_VERSION.
	 *
	 * @param string|int|null $first_version Key of the install history, if any.
	 */
	public static function get_effective_install_version( $first_version ): string {
		$first_version = (string) $first_version;

		if ( '' === $first_version || version_compare( $first_version, REFRACTION_UPSTREAM_VERSION, '<' ) ) {
			return REFRACTION_UPSTREAM_VERSION;
		}

		return $first_version;
	}

	public static function install_compare( $version, $operator ) {
		$installs_history = self::get_installs_history();

		return version_compare(
			self::get_effective_install_version( key( $installs_history ) ),
			$version ? $version : '0.0.0', // when no version assigned
			$operator
		);
	}

	protected function update_db_version() {
		parent::update_db_version();

		$installs_history = self::get_installs_history();

		$time = time();

		$installs_history[ $this->get_new_version() ] = $time;

		$old_version = $this->get_current_version();

		// If there was an old version of Refraction, and there's no record for that install yet
		if ( $old_version && empty( $installs_history[ $old_version ] ) ) {
			$installs_history[ $old_version ] = $installs_history[ $this->get_new_version() ] - 1;
		}

		uksort( $installs_history, 'version_compare' );

		update_option( static::get_install_history_meta(), $installs_history );
	}

	public static function is_new_installation(): bool {
		$installs_history = self::get_installs_history();

		// Compares the raw install history (not the effective upstream version): "new" means the site was
		// first installed with the Refraction version that is running now.
		return empty( $installs_history ) || version_compare( (string) key( $installs_history ), REFRACTION_VERSION, '>=' );
	}

	public static function had_install_prior_to( string $version ): bool {
		if ( ! $version ) {
			return false;
		}

		$installs_history = self::get_installs_history();

		if ( empty( $installs_history ) ) {
			return false;
		}

		uksort( $installs_history, 'version_compare' );

		$first_version = array_key_first( $installs_history );

		if ( ! $first_version ) {
			return false;
		}

		return version_compare( self::get_effective_install_version( $first_version ), $version, '<' );
	}
}
