<?php
namespace Refraction\Modules\CustomCode;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\CustomCode\Classes\Admin_Page;
use Refraction\Modules\CustomCode\Classes\Output;
use Refraction\Modules\CustomCode\Classes\Snippets;
use Refraction\Modules\CustomCode\AdminMenuItems\Editor_One_Custom_Code_Menu;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Custom Code: HTML, JavaScript and CSS snippets printed in the head, after the opening body tag or in the footer,
 * with the Theme Builder display conditions. See docs/refraction/extras-a.md.
 *
 * Snippets run on the front end for every visitor of the matching pages. Only users who can both manage options
 * and use unfiltered HTML (administrators on a single site) can create or edit them.
 */
class Module extends BaseModule {

	/** Define in wp-config.php to turn every snippet off. */
	const KILL_SWITCH = 'REFRACTION_DISABLE_CUSTOM_CODE';

	/** Admins can add this to any front end URL to see the page without snippets. */
	const SAFE_PARAM = 'refraction-disable-code';

	private ?Snippets $snippets = null;
	private ?Admin_Page $admin_page = null;

	public function get_name() {
		return 'custom-code';
	}

	public static function can_manage(): bool {
		return current_user_can( 'manage_options' ) && current_user_can( 'unfiltered_html' );
	}

	public function get_snippets(): Snippets {
		return $this->snippets ??= new Snippets();
	}

	public function get_admin_page(): Admin_Page {
		return $this->admin_page ??= new Admin_Page( $this->get_snippets() );
	}

	public function __construct() {
		parent::__construct();

		add_action( 'init', [ $this->get_snippets(), 'register_post_type' ] );

		if ( is_admin() ) {
			$this->get_admin_page();
		} else {
			new Output( $this->get_snippets() );
		}

		add_action( 'refraction/editor-one/menu/register', [ $this, 'register_menu' ] );
	}

	public function register_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_Custom_Code_Menu() );
	}
}
