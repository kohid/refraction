<?php

namespace Refraction\Core\Common\Modules\Finder\Categories;

use Refraction\Core\Common\Modules\Finder\Base_Category;
use Refraction\Tools as RefractionTools;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Tools Category
 *
 * Provides items related to Refraction's tools.
 */
class Tools extends Base_Category {

	/**
	 * Get title.
	 *
	 * @since 2.3.0
	 * @access public
	 *
	 * @return string
	 */
	public function get_title() {
		return esc_html__( 'Tools', 'refraction' );
	}

	public function get_id() {
		return 'tools';
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
		$tools_url = RefractionTools::get_url();

		$items = [
			'tools' => [
				'title' => esc_html__( 'Tools', 'refraction' ),
				'icon' => 'tools',
				'url' => $tools_url,
				'keywords' => [ 'tools', 'regenerate css', 'safe mode', 'debug bar', 'sync library', 'refraction' ],
			],
			'replace-url' => [
				'title' => esc_html__( 'Replace URL', 'refraction' ),
				'icon' => 'tools',
				'url' => $tools_url . '#tab-replace_url',
				'keywords' => [ 'tools', 'replace url', 'domain', 'refraction' ],
			],
			'maintenance-mode' => [
				'title' => esc_html__( 'Maintenance Mode', 'refraction' ),
				'icon' => 'tools',
				'url' => $tools_url . '#tab-maintenance_mode',
				'keywords' => [ 'tools', 'maintenance', 'coming soon', 'refraction' ],
			],
			'import-export' => [
				'title' => esc_html__( 'Import Export', 'refraction' ),
				'icon' => 'import-export',
				'url' => $tools_url . '#tab-import-export-kit',
				'keywords' => [ 'tools', 'import export', 'import', 'export', 'kit' ],
			],
		];

		return $items;
	}
}
