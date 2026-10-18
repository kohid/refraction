<?php

namespace Refraction\Core\Common\Modules\Finder\Categories;

use Refraction\Core\Common\Modules\Finder\Base_Category;
use Refraction\Modules\ElementManager\Module as ElementManagerModule;
use Refraction\Settings as RefractionSettings;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Settings Category
 *
 * Provides items related to Refraction's settings.
 */
class Settings extends Base_Category {

	/**
	 * Get title.
	 *
	 * @since 2.3.0
	 * @access public
	 *
	 * @return string
	 */
	public function get_title() {
		return esc_html__( 'Settings', 'refraction' );
	}

	public function get_id() {
		return 'settings';
	}

	/**
	 * Get category items.
	 *
	 * @since 2.3.0
	 * @access public
	 *
	 * @param array $options
	 *
	 * @return array
	 */
	public function get_category_items( array $options = [] ) {
		return [
			'general-settings' => [
				'title' => esc_html__( 'General Settings', 'refraction' ),
				'url' => RefractionSettings::get_settings_tab_url( 'general' ),
				'keywords' => [ 'general', 'settings', 'refraction' ],
			],
			'integrations' => [
				'title' => esc_html__( 'Integrations', 'refraction' ),
				'url' => RefractionSettings::get_settings_tab_url( 'integrations' ),
				'keywords' => [ 'integrations', 'settings', 'refraction' ],
			],
			'advanced' => [
				'title' => esc_html__( 'Advanced', 'refraction' ),
				'url' => RefractionSettings::get_settings_tab_url( 'advanced' ),
				'keywords' => [ 'advanced', 'settings', 'refraction' ],
			],
			'performance' => [
				'title' => esc_html__( 'Performance', 'refraction' ),
				'url' => RefractionSettings::get_settings_tab_url( 'performance' ),
				'keywords' => [ 'performance', 'settings', 'refraction' ],
			],
			'experiments' => [
				'title' => esc_html__( 'Experiments', 'refraction' ),
				'url' => RefractionSettings::get_settings_tab_url( 'experiments' ),
				'keywords' => [ 'settings', 'refraction', 'experiments' ],
			],
			'features' => [
				'title' => esc_html__( 'Features', 'refraction' ),
				'url' => RefractionSettings::get_settings_tab_url( 'experiments' ),
				'keywords' => [ 'settings', 'refraction', 'features' ],
			],
			'element-manager' => [
				'title' => esc_html__( 'Element Manager', 'refraction' ),
				'url' => admin_url( 'admin.php?page=' . ElementManagerModule::PAGE_ID ),
				'keywords' => [ 'settings', 'elements', 'widgets', 'manager' ],
			],
		];
	}
}
