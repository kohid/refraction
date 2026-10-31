<?php
namespace Refraction\Modules\FormBuilder;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\FormBuilder\AdminMenuItems\Editor_One_Builder_Menu;
use Refraction\Modules\FormBuilder\Classes\Admin_Page;
use Refraction\Modules\FormBuilder\Classes\Collections;
use Refraction\Modules\FormBuilder\Classes\Records;
use Refraction\Modules\FormBuilder\Classes\Shortcodes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Form Builder: design your own collections (Bookings, Listings, Transactions...) with fields and statuses, manage
 * their records in an admin table, and optionally take submissions or show records on the site with shortcodes.
 * See docs/refraction/form-builder.md.
 */
class Module extends BaseModule {

	private ?Collections $collections = null;
	private ?Records $records = null;
	private ?Admin_Page $admin_page = null;

	public function get_name() {
		return 'form-builder';
	}

	public static function can_manage(): bool {
		return current_user_can( 'manage_options' );
	}

	public function get_collections(): Collections {
		return $this->collections ??= new Collections();
	}

	public function get_records(): Records {
		return $this->records ??= new Records();
	}

	public function get_admin_page(): Admin_Page {
		return $this->admin_page ??= new Admin_Page( $this->get_collections(), $this->get_records() );
	}

	public function __construct() {
		parent::__construct();

		add_action( 'init', [ $this->get_records(), 'register_post_type' ] );
		new Shortcodes( $this->get_collections(), $this->get_records() );

		if ( is_admin() ) {
			$this->get_admin_page();
		}

		add_action( 'refraction/editor-one/menu/register', [ $this, 'register_menu' ] );
	}

	public function register_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_Builder_Menu() );
	}
}
