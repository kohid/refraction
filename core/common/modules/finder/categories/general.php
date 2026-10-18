<?php
namespace Elementor\Core\Common\Modules\Finder\Categories;

use Elementor\Core\Common\Modules\Finder\Base_Category;
use Elementor\Core\RoleManager\Role_Manager;
use Elementor\TemplateLibrary\Source_Local;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * General Category
 *
 * Provides general items related to Elementor Admin.
 */
class General extends Base_Category {

	/**
	 * Get title.
	 *
	 * @since 2.3.0
	 * @access public
	 *
	 * @return string
	 */
	public function get_title() {
		return esc_html__( 'General', 'elementor' );
	}

	public function get_id() {
		return 'general';
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
			'saved-templates' => [
				'title' => esc_html__( 'Saved Templates', 'elementor' ),
				'icon' => 'library-save',
				'url' => Source_Local::get_admin_url(),
				'keywords' => [ 'template', 'section', 'page', 'library' ],
			],
			'system-info' => [
				'title' => esc_html__( 'System Info', 'elementor' ),
				'icon' => 'info-circle-o',
				'url' => admin_url( 'admin.php?page=elementor-system-info' ),
				'keywords' => [ 'system', 'info', 'environment', 'elementor' ],
			],
			'role-manager' => [
				'title' => esc_html__( 'Role Manager', 'elementor' ),
				'icon' => 'person',
				'url' => Role_Manager::get_url(),
				'keywords' => [ 'role', 'manager', 'user', 'elementor' ],
			],
		];
	}
}
