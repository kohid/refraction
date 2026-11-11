<?php
namespace Refraction\Modules\OrganicFx\AdminMenuItems;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Third_Level_Interface;
use Refraction\Core\Admin\Menu\Interfaces\Admin_Menu_Item_With_Page;
use Refraction\Modules\EditorOne\Classes\Menu_Config;
use Refraction\Modules\OrganicFx\Classes\Admin_Page;
use Refraction\Modules\OrganicFx\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Editor_One_My_Shapes_Menu implements Menu_Item_Third_Level_Interface, Admin_Menu_Item_With_Page {

	public function get_capability(): string {
		return Module::capability();
	}

	public function get_parent_slug(): string {
		return Menu_Config::REFRACTION_MENU_SLUG;
	}

	public function is_visible(): bool {
		return true;
	}

	public function get_group_id(): string {
		return Menu_Config::TEMPLATES_GROUP_ID;
	}

	public function get_label(): string {
		return esc_html__( 'My Shapes', 'refraction' );
	}

	public function get_position(): int {
		return 62;
	}

	public function get_slug(): string {
		return Admin_Page::SLUG;
	}

	public function get_icon(): string {
		return 'interests';
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
