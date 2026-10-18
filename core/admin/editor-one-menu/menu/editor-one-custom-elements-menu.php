<?php

namespace Refraction\Core\Admin\EditorOneMenu\Menu;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Third_Level_Interface;
use Refraction\Modules\EditorOne\Classes\Menu_Config;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Editor_One_Custom_Elements_Menu implements Menu_Item_Third_Level_Interface {

	public function get_capability(): string {
		return Menu_Config::CAPABILITY_MANAGE_OPTIONS;
	}

	public function get_parent_slug(): string {
		return Menu_Config::REFRACTION_MENU_SLUG;
	}

	public function is_visible(): bool {
		return true;
	}

	public function get_label(): string {
		return esc_html__( 'Custom Elements', 'refraction' );
	}

	public function get_position(): int {
		return 80;
	}

	public function get_slug(): string {
		return 'refraction-custom-elements';
	}

	public function get_icon(): string {
		return 'adjustments';
	}

	public function get_group_id(): string {
		return Menu_Config::CUSTOM_ELEMENTS_GROUP_ID;
	}

	public function has_children(): bool {
		return true;
	}
}
