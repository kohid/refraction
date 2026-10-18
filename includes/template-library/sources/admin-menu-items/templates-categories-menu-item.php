<?php
namespace Refraction\Includes\TemplateLibrary\Sources\AdminMenuItems;

use Refraction\Core\Admin\Menu\Interfaces\Admin_Menu_Item;
use Refraction\Core\Editor\Editor;
use Refraction\TemplateLibrary\Source_Local;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Templates_Categories_Menu_Item implements Admin_Menu_Item {

	public function is_visible() {
		return true;
	}

	public function get_parent_slug() {
		return Source_Local::ADMIN_MENU_SLUG;
	}

	public function get_label() {
		return esc_html__( 'Categories', 'refraction' );
	}

	public function get_capability() {
		return 'manage_categories';
	}
}
