<?php
namespace Refraction\Modules\Migration\AdminMenuItems;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Third_Level_Interface;
use Refraction\Core\Admin\Menu\Interfaces\Admin_Menu_Item_With_Page;
use Refraction\Modules\EditorOne\Classes\Menu_Config;
use Refraction\Modules\Migration\Classes\Admin;
use Refraction\Modules\Migration\Classes\Importer;
use Refraction\Modules\Migration\Classes\Upstream;
use Refraction\Modules\Migration\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Refraction > Move from ...: only on sites with pages of the other builder. */
class Migration_Menu implements Menu_Item_Third_Level_Interface, Admin_Menu_Item_With_Page {

	public function get_capability(): string {
		return Admin::capability();
	}

	public function get_parent_slug(): string {
		return Menu_Config::REFRACTION_MENU_SLUG;
	}

	public function is_visible(): bool {
		return Importer::has_anything();
	}

	public function get_group_id(): string {
		return Menu_Config::SYSTEM_GROUP_ID;
	}

	public function get_label(): string {
		/* translators: %s: the other page builder's name. */
		return esc_html( sprintf( __( 'Move from %s', 'refraction' ), Upstream::label() ) );
	}

	public function get_position(): int {
		return 90;
	}

	public function get_slug(): string {
		return Admin::SLUG;
	}

	public function get_icon(): string {
		return 'import';
	}

	public function has_children(): bool {
		return false;
	}

	public function get_page_title() {
		return $this->get_label();
	}

	public function render() {
		Module::instance()->get_admin()->render();
	}
}
