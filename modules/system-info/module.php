<?php
namespace Refraction\Modules\System_Info;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\System_Info\AdminMenuItems\Editor_One_System_Info_Menu;
use Refraction\Modules\System_Info\AdminMenuItems\Editor_One_System_Menu;
use Refraction\Modules\System_Info\Helpers\Model_Helper;
use Refraction\Modules\System_Info\Reporters\Base;
use Refraction\Modules\System_Info\Rest\Rest_Api;
use Refraction\Plugin;
use Refraction\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction system info module.
 *
 * Refraction system info module handler class is responsible for registering and
 * managing Refraction system info reports.
 *
 * @since 2.9.0
 */
class Module extends BaseModule {

	/**
	 * Get module name.
	 *
	 * Retrieve the system info module name.
	 *
	 * @since 2.9.0
	 * @access public
	 *
	 * @return string Module name.
	 */
	public function get_name() {
		return 'system-info';
	}

	/**
	 * Required user capabilities.
	 *
	 * Holds the user capabilities required to manage Refraction menus.
	 *
	 * @since 2.9.0
	 * @access private
	 *
	 * @var string
	 */
	private $capability = 'manage_options';

	/**
	 * Refraction system info reports.
	 *
	 * Holds an array of available reports in Refraction system info page.
	 *
	 * @since 2.9.0
	 * @access private
	 *
	 * @var array
	 */
	private static $reports = [
		'server' => [],
		'wordpress' => [],
		'theme' => [],
		'user' => [],
		'plugins' => [],
		'network_plugins' => [],
		'mu_plugins' => [],
	];

	public function get_capability() {
		return $this->capability;
	}

	/**
	 * Main system info page constructor.
	 *
	 * Initializing Refraction system info page.
	 *
	 * @since 2.9.0
	 * @access public
	 */
	public function __construct() {
		$this->add_actions();
	}

	/**
	 * Get default settings.
	 *
	 * Retrieve the default settings. Used to reset the report settings on
	 * initialization.
	 *
	 * @since 2.9.0
	 * @access protected
	 *
	 * @return array Default settings.
	 */
	protected function get_init_settings() {
		$settings = [];

		$reporter_properties = Base::get_properties_keys();

		array_push( $reporter_properties, 'category', 'name', 'class_name' );

		$settings['reporter_properties'] = $reporter_properties;

		$settings['reportFilePrefix'] = '';

		return $settings;
	}

	/**
	 * Add actions.
	 *
	 * Register filters and actions for the main system info page.
	 *
	 * @since 2.9.0
	 * @access private
	 */
	private function add_actions() {
		add_action( 'refraction/editor-one/menu/register', function ( Menu_Data_Provider $menu_data_provider ) {
			$this->register_editor_one_menu( $menu_data_provider );
		} );

		add_action( 'wp_ajax_refraction_system_info_download_file', [ $this, 'download_file' ] );
		add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );
	}

	public function register_rest_routes(): void {
		( new Rest_Api() )->register_routes();
	}

	public function get_reports_data( string $format = '' ): array {
		$reports = $this->load_reports( self::get_allowed_reports() );

		return $this->build_reports_data( $reports, $format );
	}

	private function build_reports_data( array $reports, string $format ): array {
		$data = [];

		foreach ( $reports as $report_name => $report_details ) {
			$report = $report_details['report']->get_report( $format );

			if ( is_wp_error( $report ) ) {
				continue;
			}

			$report_data = [
				'label' => $report_details['label'],
				'report' => $report,
			];

			if ( ! empty( $report_details['sub'] ) ) {
				$report_data['sub'] = $this->build_reports_data( $report_details['sub'], $format );
			}

			$data[ $report_name ] = $report_data;
		}

		return $data;
	}

	private function register_editor_one_menu( Menu_Data_Provider $menu_data_provider ) {
		$menu_data_provider->register_menu( new Editor_One_System_Menu() );
		$menu_data_provider->register_menu( new Editor_One_System_Info_Menu() );
	}

	/**
	 * Display page.
	 *
	 * Output the content for the main system info page.
	 *
	 * @since 2.9.0
	 * @access public
	 */
	public function display_page() {
		$reports_info = self::get_allowed_reports();

		$reports = $this->load_reports( $reports_info );
		?>
		<div id="refraction-system-info">
			<div class="refraction-system-info-header">
				<h1 class="wp-heading-inline"><?php echo esc_html__( 'System Info', 'refraction' ); ?></h1>
				<form action="<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>" method="post">
					<input type="hidden" name="action" value="refraction_system_info_download_file">
					<input type="submit" data-id="refraction-system-info-download-file" class="button button-primary" value="<?php echo esc_attr__( 'Download System Info', 'refraction' ); ?>">
				</form>
			</div>
			<div><?php $this->print_report( $reports, 'html' ); ?></div>
			<h2><?php echo esc_html__( 'Copy & Paste Info', 'refraction' ); ?></h2>
			<div id="refraction-system-info-raw">
				<label id="refraction-system-info-raw-code-label" for="refraction-system-info-raw-code"><?php echo esc_html__( 'You can copy the below info as simple text with Ctrl+C / Ctrl+V:', 'refraction' ); ?></label>
				<textarea id="refraction-system-info-raw-code" readonly>
					<?php
						$this->print_report( $reports, 'raw' );
					?>
				</textarea>
				<script>
					var textarea = document.getElementById( 'refraction-system-info-raw-code' );
					var selectRange = function() {
						textarea.setSelectionRange( 0, textarea.value.length );
					};
					textarea.onfocus = textarea.onblur = textarea.onclick = selectRange;
					textarea.onfocus();
				</script>
			</div>
			<hr>
			<form action="<?php echo esc_url( admin_url( 'admin-ajax.php' ) ); ?>" method="post">
				<input type="hidden" name="action" value="refraction_system_info_download_file">
				<input type="submit" data-id="refraction-system-info-download-file" class="button button-primary" value="<?php echo esc_attr__( 'Download System Info', 'refraction' ); ?>">
			</form>
		</div>
		<?php
	}

	/**
	 * Download file.
	 *
	 * Download the reports files.
	 *
	 * Fired by `wp_ajax_refraction_system_info_download_file` action.
	 *
	 * @since 2.9.0
	 * @access public
	 */
	public function download_file() {
		if ( ! current_user_can( $this->capability ) ) {
			wp_die( esc_html__( 'You do not have permission to download this file.', 'refraction' ) );
		}

		$reports_info = self::get_allowed_reports();
		$reports = $this->load_reports( $reports_info );

		$domain = parse_url( site_url(), PHP_URL_HOST );

		header( 'Content-Type: text/plain' );
		header( 'Content-Disposition:attachment; filename=system-info-' . $domain . '-' . gmdate( 'd-m-Y' ) . '.txt' );

		$this->print_report( $reports );

		die;
	}

	/**
	 * Get report class.
	 *
	 * Retrieve the class of the report for any given report type.
	 *
	 * @since 2.9.0
	 * @access public
	 *
	 * @param string $reporter_type The type of the report.
	 *
	 * @return string The class of the report.
	 */
	public function get_reporter_class( $reporter_type ) {
		return __NAMESPACE__ . '\Reporters\\' . ucfirst( $reporter_type );
	}

	/**
	 * Load reports.
	 *
	 * Retrieve the system info reports.
	 *
	 * @since 2.9.0
	 * @access public
	 *
	 * @param array $reports An array of system info reports.
	 *
	 * @return array An array of system info reports.
	 */
	public function load_reports( $reports ) {
		$result = [];

		foreach ( $reports as $report_name => $report_info ) {
			$reporter_params = [
				'name' => $report_name,
			];

			$reporter_params = array_merge( $reporter_params, $report_info );

			$reporter = $this->create_reporter( $reporter_params );

			if ( ! $reporter instanceof Base ) {
				continue;
			}

			$result[ $report_name ] = [
				'report' => $reporter,
				'label' => $reporter->get_title(),
			];

			if ( ! empty( $report_info['sub'] ) ) {
				$result[ $report_name ]['sub'] = $this->load_reports( $report_info['sub'] );
			}
		}

		return $result;
	}

	/**
	 * Create a report.
	 *
	 * Register a new report that will be displayed in Refraction system info page.
	 *
	 * @param array $properties Report properties.
	 *
	 * @return \WP_Error|false|Base Base instance if the report was created,
	 *                                       False or WP_Error otherwise.
	 * @since 2.9.0
	 * @access public
	 */
	public function create_reporter( array $properties ) {
		$properties = Model_Helper::prepare_properties( $this->get_settings( 'reporter_properties' ), $properties );

		$reporter_class = $properties['class_name'] ? $properties['class_name'] : $this->get_reporter_class( $properties['name'] );

		$reporter = new $reporter_class( $properties );

		if ( ! ( $reporter instanceof Base ) ) {
			return new \WP_Error( 'Each reporter must to be an instance or sub-instance of `Base` class.' );
		}

		if ( ! $reporter->is_enabled() ) {
			return false;
		}

		return $reporter;
	}

	/**
	 * Print report.
	 *
	 * Output the system info page reports using an output template.
	 *
	 * @since 2.9.0
	 * @access public
	 *
	 * @param array  $reports  An array of system info reports.
	 * @param string $template Output type from the templates folder. Available
	 *                         templates are `raw` and `html`. Default is `raw`.
	 */
	public function print_report( $reports, $template = 'raw' ) {
		static $tabs_count = 0;

		$template_path = __DIR__ . '/templates/' . $template . '.php';

		require $template_path;
	}

	/**
	 * Get allowed reports.
	 *
	 * Retrieve the available reports in Refraction system info page.
	 *
	 * @since 2.9.0
	 * @access public
	 * @static
	 *
	 * @return array Available reports in Refraction system info page.
	 */
	public static function get_allowed_reports() {
		do_action( 'refraction/system_info/get_allowed_reports' );

		return self::$reports;
	}

	/**
	 * Add report.
	 *
	 * Register a new report to Refraction system info page.
	 *
	 * @since 2.9.0
	 * @access public
	 * @static
	 *
	 * @param string $report_name The name of the report.
	 * @param array  $report_info Report info.
	 */
	public static function add_report( $report_name, $report_info ) {
		self::$reports[ $report_name ] = $report_info;
	}
}
