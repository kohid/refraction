<?php
namespace Refraction\Modules\Events\AdminMenuItems;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Interface;
use Refraction\Modules\EditorOne\Classes\Menu_Config;
use Refraction\Modules\Events\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Refraction > Events: the events table (each event opens in the page editor). */
class Editor_One_Events_Menu implements Menu_Item_Interface {

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
		return esc_html__( 'Events', 'refraction' );
	}

	public function get_position(): int {
		return 39;
	}

	public function get_slug(): string {
		return Module::ADMIN_SLUG;
	}

	public function get_group_id(): string {
		return Menu_Config::TEMPLATES_GROUP_ID;
	}
}
