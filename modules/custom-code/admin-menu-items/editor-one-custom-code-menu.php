<?php
namespace Refraction\Modules\CustomCode\AdminMenuItems;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Third_Level_Interface;
use Refraction\Core\Admin\Menu\Interfaces\Admin_Menu_Item_With_Page;
use Refraction\Modules\CustomCode\Classes\Admin_Page;
use Refraction\Modules\CustomCode\Module;
use Refraction\Modules\EditorOne\Classes\Menu_Config;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Editor_One_Custom_Code_Menu implements Menu_Item_Third_Level_Interface, Admin_Menu_Item_With_Page {

	public function get_capability(): string {
		return Menu_Config::CAPABILITY_MANAGE_OPTIONS;
	}

	public function get_parent_slug(): string {
		return Menu_Config::REFRACTION_MENU_SLUG;
	}

	public function is_visible(): bool {
		return Module::can_manage();
	}

	public function get_group_id(): string {
		return Menu_Config::TEMPLATES_GROUP_ID;
	}

	public function get_label(): string {
		return esc_html__( 'Custom Code', 'refraction' );
	}

	public function get_position(): int {
		return 45;
	}

	public function get_slug(): string {
		return Admin_Page::SLUG;
	}

	public function get_icon(): string {
		return 'code';
	}

	public function has_children(): bool {
		return false;
	}

	public function get_page_title() {
		return $this->get_label();
	}

	public function render() {
		Module::instance()->get_admin_page()->render();
	}
}
