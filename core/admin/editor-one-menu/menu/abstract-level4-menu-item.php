<?php

namespace Refraction\Core\Admin\EditorOneMenu\Menu;

use Refraction\Core\Admin\EditorOneMenu\Interfaces\Menu_Item_Interface;
use Refraction\Modules\EditorOne\Classes\Menu_Config;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class Abstract_Level4_Menu_Item implements Menu_Item_Interface {

	public function get_capability(): string {
		return Menu_Config::CAPABILITY_MANAGE_OPTIONS;
	}

	public function get_parent_slug(): string {
		return Menu_Config::REFRACTION_MENU_SLUG;
	}

	public function is_visible(): bool {
		return true;
	}

	abstract public function get_label(): string;

	abstract public function get_position(): int;

	abstract public function get_slug(): string;

	abstract public function get_group_id(): string;
}
