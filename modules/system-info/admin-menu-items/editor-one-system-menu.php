<?php

namespace Refraction\Modules\System_Info\AdminMenuItems;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Third_Level_Interface;
use Refraction\Modules\EditorOne\Classes\Menu_Config;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Editor_One_System_Menu implements Menu_Item_Third_Level_Interface {

	public function get_capability(): string {
		return 'manage_options';
	}

	public function get_parent_slug(): string {
		return Menu_Config::REFRACTION_MENU_SLUG;
	}

	public function is_visible(): bool {
		return true;
	}

	public function get_label(): string {
		return esc_html__( 'System', 'refraction' );
	}

	public function get_position(): int {
		return 90;
	}

	public function get_slug(): string {
		return 'refraction-system';
	}

	public function get_icon(): string {
		return 'file-settings';
	}

	public function get_group_id(): string {
		return Menu_Config::SYSTEM_GROUP_ID;
	}

	public function has_children(): bool {
		return true;
	}
}
