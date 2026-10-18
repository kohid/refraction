<?php
namespace Refraction\Modules\ElementManager;

use Refraction\Core\Admin\Menu\Interfaces\Admin_Menu_Item_With_Page;
use Refraction\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Admin_Menu_App implements Admin_Menu_Item_With_Page {

	public function is_visible() {
		return true;
	}

	public function get_parent_slug() {
		return Settings::PAGE_ID;
	}

	public function get_label() {
		return esc_html__( 'Element Manager', 'refraction' );
	}

	public function get_page_title() {
		return esc_html__( 'Element Manager', 'refraction' );
	}

	public function get_capability() {
		return 'manage_options';
	}

	public function render() {
		echo '<div class="wrap">';
		echo '<h3 class="wp-heading-inline">' . esc_html__( 'Element Manager', 'refraction' ) . '</h3>';
		echo '<div id="refraction-element-manager-wrap"></div>';
		echo '</div>';
	}
}
