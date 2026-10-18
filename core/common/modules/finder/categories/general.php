<?php
namespace Refraction\Core\Common\Modules\Finder\Categories;

use Refraction\Core\Common\Modules\Finder\Base_Category;
use Refraction\Core\RoleManager\Role_Manager;
use Refraction\TemplateLibrary\Source_Local;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * General Category
 *
 * Provides general items related to Refraction Admin.
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
		return esc_html__( 'General', 'refraction' );
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
				'title' => esc_html__( 'Saved Templates', 'refraction' ),
				'icon' => 'library-save',
				'url' => Source_Local::get_admin_url(),
				'keywords' => [ 'template', 'section', 'page', 'library' ],
			],
			'system-info' => [
				'title' => esc_html__( 'System Info', 'refraction' ),
				'icon' => 'info-circle-o',
				'url' => admin_url( 'admin.php?page=refraction-system-info' ),
				'keywords' => [ 'system', 'info', 'environment', 'refraction' ],
			],
			'role-manager' => [
				'title' => esc_html__( 'Role Manager', 'refraction' ),
				'icon' => 'person',
				'url' => Role_Manager::get_url(),
				'keywords' => [ 'role', 'manager', 'user', 'refraction' ],
			],
		];
	}
}
