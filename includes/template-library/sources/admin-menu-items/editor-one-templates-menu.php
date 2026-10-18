<?php

namespace Refraction\Includes\TemplateLibrary\Sources\AdminMenuItems;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Third_Level_Interface;
use Refraction\Modules\EditorOne\Classes\Menu_Config;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Editor_One_Templates_Menu implements Menu_Item_Third_Level_Interface {

	public function get_capability(): string {
		return 'edit_posts';
	}

	public function get_parent_slug(): string {
		return Menu_Config::REFRACTION_MENU_SLUG;
	}

	public function is_visible(): bool {
		return true;
	}

	public function get_label(): string {
		return esc_html__( 'Templates', 'refraction' );
	}

	public function get_position(): int {
		return 40;
	}

	public function get_slug(): string {
		return 'refraction-templates';
	}

	public function get_icon(): string {
		return 'folder';
	}

	public function get_group_id(): string {
		return Menu_Config::TEMPLATES_GROUP_ID;
	}

	public function has_children(): bool {
		return true;
	}
}
