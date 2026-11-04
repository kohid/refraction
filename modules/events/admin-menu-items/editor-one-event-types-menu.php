<?php
namespace Refraction\Modules\Events\AdminMenuItems;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Third_Level_Interface;
use Refraction\Core\Admin\Menu\Interfaces\Admin_Menu_Item_With_Page;
use Refraction\Modules\EditorOne\Classes\Menu_Config;
use Refraction\Modules\Events\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Refraction > Event types: the event forms (each one a type of event) and how to use them. */
class Editor_One_Event_Types_Menu implements Menu_Item_Third_Level_Interface, Admin_Menu_Item_With_Page {

	public function get_capability(): string {
		return Menu_Config::CAPABILITY_MANAGE_OPTIONS;
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
		return esc_html__( 'Event types', 'refraction' );
	}

	public function get_position(): int {
		return 39;
	}

	public function get_slug(): string {
		return Module::TYPES_SLUG;
	}

	public function get_icon(): string {
		return 'calendar';
	}

	public function has_children(): bool {
		return false;
	}

	public function get_page_title() {
		return $this->get_label();
	}

	public function render() {
		Module::instance()->render_types_page();
	}
}
