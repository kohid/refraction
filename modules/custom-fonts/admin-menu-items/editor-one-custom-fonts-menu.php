<?php
namespace Refraction\Modules\CustomFonts\AdminMenuItems;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Third_Level_Interface;
use Refraction\Core\Admin\Menu\Interfaces\Admin_Menu_Item_With_Page;
use Refraction\Modules\CustomFonts\Classes\Admin_Page;
use Refraction\Modules\CustomFonts\Module;
use Refraction\Modules\EditorOne\Classes\Menu_Config;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Editor_One_Custom_Fonts_Menu implements Menu_Item_Third_Level_Interface, Admin_Menu_Item_With_Page {

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
		return esc_html__( 'Custom Fonts', 'refraction' );
	}

	public function get_position(): int {
		return 60;
	}

	public function get_slug(): string {
		return Admin_Page::SLUG;
	}

	public function get_icon(): string {
		return 'typography';
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
