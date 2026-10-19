<?php
namespace Refraction\Modules\Forms;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\Forms\AdminMenuItems\Editor_One_Submissions_Menu;
use Refraction\Modules\Forms\Classes\Admin_Page;
use Refraction\Modules\Forms\Classes\Login_Handler;
use Refraction\Modules\Forms\Classes\Privacy;
use Refraction\Modules\Forms\Classes\Schema;
use Refraction\Modules\Forms\Classes\Settings;
use Refraction\Modules\Forms\Classes\Submissions_Repository;
use Refraction\Modules\Forms\Classes\Submit_Handler;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Forms: Form widget, Login widget, submissions storage and admin. See docs/refraction/forms.md.
 */
class Module extends BaseModule {

	const PURGE_HOOK = 'refraction_forms_purge';

	private ?Submissions_Repository $repo = null;
	private ?Admin_Page $admin_page = null;

	public function get_name() {
		return 'forms';
	}

	/** Who may see submissions: they hold personal data, so administrators by default. */
	public static function capability(): string {
		return (string) apply_filters( 'refraction/forms/capability', 'manage_options' );
	}

	public function get_widgets() {
		return [ 'Form', 'Login' ];
	}

	public function get_repository(): Submissions_Repository {
		return $this->repo ??= new Submissions_Repository();
	}

	public function get_admin_page(): Admin_Page {
		return $this->admin_page ??= new Admin_Page( $this->get_repository() );
	}

	public function __construct() {
		parent::__construct();

		add_action( 'init', [ Schema::class, 'maybe_upgrade' ], 5 );
		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_scripts' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_styles' ] );
		add_action( 'refraction/editor-one/menu/register', [ $this, 'register_menu' ] );
		add_action( self::PURGE_HOOK, [ $this, 'purge' ] );
		add_action( 'init', [ $this, 'schedule_purge' ] );

		new Submit_Handler( $this->get_repository() );
		new Login_Handler();
		new Privacy( $this->get_repository() );
		$this->get_admin_page();
	}

	public function register_scripts(): void {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_register_script( 'refraction-forms', REFRACTION_ASSETS_URL . 'js/forms-frontend' . $suffix . '.js', [], REFRACTION_VERSION, true );
	}

	public function register_styles(): void {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_register_style( 'refraction-forms', REFRACTION_ASSETS_URL . 'css/modules/forms/frontend' . $suffix . '.css', [], REFRACTION_VERSION );
	}

	public function register_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_Submissions_Menu() );
	}

	/** Daily clean-up while a retention period is set. */
	public function schedule_purge(): void {
		$scheduled = wp_next_scheduled( self::PURGE_HOOK );

		if ( Settings::get()['retention_days'] > 0 && ! $scheduled ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::PURGE_HOOK );
		} elseif ( Settings::get()['retention_days'] <= 0 && $scheduled ) {
			wp_clear_scheduled_hook( self::PURGE_HOOK );
		}
	}

	public function purge(): void {
		$days = Settings::get()['retention_days'];

		if ( $days > 0 ) {
			$this->get_repository()->purge_older_than( $days );
		}
	}
}
