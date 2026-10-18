<?php

namespace Refraction\Modules\System_Info\AdminMenuItems;

use Refraction\Core\Admin\Menu\Interfaces\Admin_Menu_Item_With_Page;
use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Interface;
use Refraction\Modules\EditorOne\Classes\Menu_Config;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Editor_One_System_Info_Menu implements Menu_Item_Interface, Admin_Menu_Item_With_Page {

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
		return esc_html__( 'System Info', 'refraction' );
	}

	public function get_position(): int {
		return 10;
	}

	public function get_slug(): string {
		return 'refraction-system-info';
	}

	public function get_group_id(): string {
		return Menu_Config::SYSTEM_GROUP_ID;
	}

	public function get_page_title() {
		return $this->get_label();
	}

	public function render() {
		Plugin::$instance->system_info->display_page();
	}
}
