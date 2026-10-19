<?php
namespace Refraction;

use Refraction\Core\Files\Fonts\Google_Font;
use Refraction\TemplateLibrary\Source_Local;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Includes\Settings\AdminMenuItems\Editor_One_Home_Menu;
use Refraction\Includes\Settings\AdminMenuItems\Editor_One_Settings_Menu;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction "Settings" page in WordPress Dashboard.
 *
 * Refraction settings page handler class responsible for creating and displaying
 * Refraction "Settings" page in WordPress dashboard.
 *
 * @since 1.0.0
 */
class Settings extends Settings_Page {

	/**
	 * Settings page ID for Refraction settings.
	 */
	const PAGE_ID = 'refraction';

	/**
	 * Settings page field for update time.
	 */
	const UPDATE_TIME_FIELD = '_refraction_settings_update_time';

	/**
	 * Settings page general tab slug.
	 */
	const TAB_GENERAL = 'general';

	/**
	 * Settings page integrations tab slug.
	 */
	const TAB_INTEGRATIONS = 'integrations';

	/**
	 * Settings page advanced tab slug.
	 */
	const TAB_ADVANCED = 'advanced';

	/**
	 * Settings page performance tab slug.
	 */
	const TAB_PERFORMANCE = 'performance';

	const ADMIN_MENU_PRIORITY = 10;

	const MENU_CAPABILITY_EDIT_POSTS = 'edit_posts';

	/**
	 * Render the Refraction home screen (the first page of the top-level "Refraction" admin menu).
	 *
	 * Local only: it links to pages that exist in this plugin and loads no remote content.
	 */
	public function display_home_screen() {
		$links = [
			[
				'cap' => 'edit_posts',
				'url' => admin_url( 'edit.php?post_type=refraction_library&tabs_group=library' ),
				'title' => esc_html__( 'My Templates', 'refraction' ),
				'text' => esc_html__( 'Open, import and export your saved templates.', 'refraction' ),
			],
			[
				'cap' => 'manage_options',
				'url' => admin_url( 'admin.php?page=refraction-settings' ),
				'title' => esc_html__( 'Settings', 'refraction' ),
				'text' => esc_html__( 'Editor behavior, performance and integrations.', 'refraction' ),
			],
			[
				'cap' => 'manage_options',
				'url' => admin_url( 'admin.php?page=refraction-tools' ),
				'title' => esc_html__( 'Tools', 'refraction' ),
				'text' => esc_html__( 'Regenerate CSS, replace URLs, roll back versions.', 'refraction' ),
			],
			[
				'cap' => 'manage_options',
				'url' => admin_url( 'admin.php?page=refraction-system-info' ),
				'title' => esc_html__( 'System Info', 'refraction' ),
				'text' => esc_html__( 'Server and plugin details for troubleshooting.', 'refraction' ),
			],
		];
		?>
		<style>
			.refraction-home { max-width: 760px; margin: 24px 20px 0 2px; }
			.refraction-home h1 { font-size: 28px; font-weight: 600; margin: 0 0 6px; padding: 0; }
			.refraction-home__lead { font-size: 15px; color: #50575e; margin: 0 0 20px; }
			.refraction-home__links { list-style: none; margin: 28px 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
			.refraction-home__links a { display: block; padding: 14px 16px; background: #fff; border: 1px solid #dcdcde; border-inline-start: 3px solid var(--wp-admin-theme-color, #2271b1); border-radius: 2px; text-decoration: none; color: #1d2327; }
			.refraction-home__links a:hover, .refraction-home__links a:focus { border-color: var(--wp-admin-theme-color, #2271b1); box-shadow: 0 0 0 1px var(--wp-admin-theme-color, #2271b1); }
			.refraction-home__links strong { display: block; font-size: 14px; margin-bottom: 2px; color: var(--wp-admin-theme-color, #2271b1); }
			.refraction-home__links span { color: #50575e; font-size: 13px; }
		</style>
		<div class="wrap refraction-home">
			<h1><?php echo esc_html__( 'Refraction', 'refraction' ); ?></h1>
			<p class="refraction-home__lead"><?php echo esc_html__( 'Build and edit pages visually. Everything runs on your own site.', 'refraction' ); ?></p>
			<?php if ( current_user_can( 'edit_pages' ) ) : ?>
				<p>
					<a class="button button-primary button-hero" href="<?php echo esc_url( Plugin::$instance->documents->get_create_new_post_url( 'page' ) ); ?>"><?php echo esc_html__( 'Create new page', 'refraction' ); ?></a>
				</p>
			<?php endif; ?>
			<ul class="refraction-home__links">
				<?php foreach ( $links as $link ) : ?>
					<?php if ( current_user_can( $link['cap'] ) ) : ?>
						<li>
							<a href="<?php echo esc_url( $link['url'] ); ?>">
								<strong><?php echo esc_html( $link['title'] ); ?></strong>
								<span><?php echo esc_html( $link['text'] ); ?></span>
							</a>
						</li>
					<?php endif; ?>
				<?php endforeach; ?>
			</ul>
		</div>
		<?php
	}

	private function register_editor_one_settings_menu( Menu_Data_Provider $menu_data_provider ) {
		$menu_data_provider->register_menu( new Editor_One_Settings_Menu() );
	}

	private function register_editor_one_home_menu( Menu_Data_Provider $menu_data_provider ) {
		$menu_data_provider->register_menu( new Editor_One_Home_Menu() );
	}

	/**
	 * On admin init.
	 *
	 * Preform actions on WordPress admin initialization.
	 *
	 * Fired by `admin_init` action.
	 *
	 * @since 2.0.0
	 * @access public
	 */
	public function on_admin_init() {
		$this->maybe_remove_all_admin_notices();
	}

	/**
	 * Update CSS print method.
	 *
	 * Clear post CSS cache.
	 *
	 * Fired by `add_option_refraction_css_print_method` and
	 * `update_option_refraction_css_print_method` actions.
	 *
	 * @since 1.7.5
	 * @access public
	 * @deprecated 3.0.0 Use `Plugin::$instance->files_manager->clear_cache()` method instead.
	 */
	public function update_css_print_method() {
		Plugin::$instance->files_manager->clear_cache();
	}

	/**
	 * Create tabs.
	 *
	 * Return the settings page tabs, sections and fields.
	 *
	 * @since 1.5.0
	 * @access protected
	 *
	 * @return array An array with the settings page tabs, sections and fields.
	 */
	protected function create_tabs() {
		$validations_class_name = __NAMESPACE__ . '\Settings_Validations';

		return [
			self::TAB_GENERAL => [
				'label' => esc_html__( 'General', 'refraction' ),
				'sections' => [
					'general' => [
						'label' => esc_html__( 'General', 'refraction' ),
						'callback' => function() {
							printf(
								'<p>%s</p><br><hr><br>',
								esc_html__( 'Tailor how Refraction enhances your site, from post types to other functions.', 'refraction' )
							);
						},
						'fields' => [
							self::UPDATE_TIME_FIELD => [
								'full_field_id' => self::UPDATE_TIME_FIELD,
								'field_args' => [
									'type' => 'hidden',
								],
								'setting_args' => [ $validations_class_name, 'current_time' ],
							],
							'cpt_support' => [
								'label' => esc_html__( 'Post Types', 'refraction' ),
								'field_args' => [
									'type' => 'checkbox_list_cpt',
									'std' => [ 'page', 'post' ],
									'exclude' => [ 'attachment', 'refraction_library' ],
								],
								'setting_args' => [ $validations_class_name, 'checkbox_list' ],
							],
							'disable_color_schemes' => [
								'label' => esc_html__( 'Disable Default Colors', 'refraction' ),
								'field_args' => [
									'type' => 'checkbox',
									'value' => 'yes',
									'sub_desc' => esc_html__( 'Checking this box will disable Refraction\'s Default Colors, and make Refraction inherit the colors from your theme.', 'refraction' ),
								],
							],
							'disable_typography_schemes' => [
								'label' => esc_html__( 'Disable Default Fonts', 'refraction' ),
								'field_args' => [
									'type' => 'checkbox',
									'value' => 'yes',
									'sub_desc' => esc_html__( 'Checking this box will disable Refraction\'s Default Fonts, and make Refraction inherit the fonts from your theme.', 'refraction' ),
								],
							],
						],
					],
				],
			],
			self::TAB_INTEGRATIONS => [
				'label' => esc_html__( 'Integrations', 'refraction' ),
				'sections' => [
					'google_maps' => [
						'label' => esc_html__( 'Google Maps Embed API', 'refraction' ),
						'callback' => function() {
							printf(
								/* translators: 1: Link open tag, 2: Link close tag */
								esc_html__( 'Google Maps Embed API is a free service by Google that allows embedding Google Maps in your site. For more details, visit Google Maps\' %1$sUsing API Keys%2$s page.', 'refraction' ),
								'<a target="_blank" href="https://developers.google.com/maps/documentation/embed/get-api-key">',
								'</a>'
							);
						},
						'fields' => [
							'google_maps_api_key' => [
								'label' => esc_html__( 'API Key', 'refraction' ),
								'field_args' => [
									'class' => 'refraction_google_maps_api_key',
									'type' => 'text',
								],
							],
						],
					],
				],
			],
			self::TAB_ADVANCED => [
				'label' => esc_html__( 'Advanced', 'refraction' ),
				'sections' => [
					'advanced' => [
						'label' => esc_html__( 'Advanced', 'refraction' ),
						'callback' => function() {
							printf(
								'<p>%s</p><br><hr><br>',
								esc_html__( 'Personalize the way Refraction works on your website by choosing the advanced features and how they operate.', 'refraction' )
							);
						},
						'fields' => [
							'editor_break_lines' => [
								'label' => esc_html__( 'Switch Editor Loader Method', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => '',
									'options' => [
										'' => esc_html__( 'Disable', 'refraction' ),
										'1' => esc_html__( 'Enable', 'refraction' ),
									],
									'desc' => esc_html__( 'For troubleshooting server configuration conflicts.', 'refraction' ),
								],
							],
							'unfiltered_files_upload' => [
								'label' => esc_html__( 'Enable Unfiltered File Uploads', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => '',
									'options' => [
										'' => esc_html__( 'Disable', 'refraction' ),
										'1' => esc_html__( 'Enable', 'refraction' ),
									],
									'desc' => esc_html__( 'Please note! Allowing uploads of any files (SVG & JSON included) is a potential security risk.', 'refraction' ) . '<br>' . esc_html__( 'Refraction will try to sanitize the unfiltered files, removing potential malicious code and scripts.', 'refraction' ) . '<br>' . esc_html__( 'We recommend you only enable this feature if you understand the security risks involved.', 'refraction' ),
								],
							],
							'google_font' => [
								'label' => esc_html__( 'Google Fonts', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => '1',
									'options' => [
										'1' => esc_html__( 'Enable', 'refraction' ),
										'0' => esc_html__( 'Disable', 'refraction' ),
									],
									'desc' => sprintf(
										/* translators: 1: Link opening tag, 2: Link closing tag */
										esc_html__( 'Disable this option if you want to prevent Google Fonts from being loaded. This setting is recommended when loading fonts from a different source (plugin, theme or %1$scustom fonts%2$s).', 'refraction' ),
										'<a href="' . admin_url( 'admin.php?page=refraction_custom_fonts' ) . '">',
										'</a>'
									),
								],
							],
							'font_display' => [
								'label' => esc_html__( 'Google Fonts Load', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => 'auto',
									'options' => [
										'auto' => esc_html__( 'Default', 'refraction' ),
										'block' => esc_html__( 'Blocking', 'refraction' ),
										'swap' => esc_html__( 'Swap', 'refraction' ),
										'fallback' => esc_html__( 'Fallback', 'refraction' ),
										'optional' => esc_html__( 'Optional', 'refraction' ),
									],
									'desc' => esc_html__( 'Font-display property defines how font files are loaded and displayed by the browser.', 'refraction' ) . '<br>' . esc_html__( 'Set the way Google Fonts are being loaded by selecting the font-display property (Recommended: Swap).', 'refraction' ),
								],
							],
						],
					],
				],
			],
			self::TAB_PERFORMANCE => [
				'label' => esc_html__( 'Performance', 'refraction' ),
				'sections' => [
					'performance' => [
						'label' => esc_html__( 'Performance', 'refraction' ),
						'callback' => function() {
							printf(
								'<p>%s</p><br><hr><br>',
								esc_html__( 'Improve loading times on your site by selecting the optimization tools that best fit your requirements.', 'refraction' )
							);
						},
						'fields' => [
							'css_print_method' => [
								'label' => esc_html__( 'CSS Print Method', 'refraction' ),
								'field_args' => [
									'class' => 'refraction_css_print_method',
									'type' => 'select',
									'std' => 'external',
									'options' => [
										'external' => esc_html__( 'External File', 'refraction' ),
										'internal' => esc_html__( 'Internal Embedding', 'refraction' ),
									],
									'desc' => sprintf(
										/* translators: %s: <head> tag. */
										esc_html__( 'Internal Embedding places all CSS in the %s which works great for troubleshooting, while External File uses external CSS file for better performance (recommended).', 'refraction' ),
										'<code>&lt;head&gt;</code>',
									),
								],
							],
							'optimized_image_loading' => [
								'label' => esc_html__( 'Optimized Image Loading', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => '1',
									'options' => [
										'1' => esc_html__( 'Enable', 'refraction' ),
										'0' => esc_html__( 'Disable', 'refraction' ),
									],
									'desc' => sprintf(
										/* translators: 1: fetchpriority attribute, 2: lazy loading attribute. */
										esc_html__( 'Improve performance by applying %1$s on LCP image and %2$s on images below the fold.', 'refraction' ),
										'<code>fetchpriority="high"</code>',
										'<code>loading="lazy"</code>'
									),
								],
							],
							'optimized_gutenberg_loading' => [
								'label' => esc_html__( 'Optimized Gutenberg Loading', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => '1',
									'options' => [
										'1' => esc_html__( 'Enable', 'refraction' ),
										'0' => esc_html__( 'Disable', 'refraction' ),
									],
									'desc' => esc_html__( 'Reduce unnecessary render-blocking loads by dequeuing unused Gutenberg block editor scripts and styles.', 'refraction' ),
								],
							],
							'lazy_load_background_images' => [
								'label' => esc_html__( 'Lazy Load Background Images', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => '1',
									'options' => [
										'1' => esc_html__( 'Enable', 'refraction' ),
										'0' => esc_html__( 'Disable', 'refraction' ),
									],
									'desc' => esc_html__( 'Improve initial page load performance by lazy loading all background images except the first one.', 'refraction' ),
								],
							],
							'local_google_fonts' => [
								'label' => esc_html__( 'Load Google Fonts Locally', 'refraction' ),
								'field_args' => [
									'type' => 'select',
									'std' => '0',
									'options' => [
										'1' => esc_html__( 'Enable', 'refraction' ),
										'0' => esc_html__( 'Disable', 'refraction' ),
									],
									'desc' => esc_html__( 'Load Google fonts locally to benefit from faster performance and ensure GDPR compliance. Fonts will be served from your own server instead of Google’s. Only the very first load (in the editor and on the front end) may take slightly longer.', 'refraction' ),
								],
							],
						],
					],
				],
			],
		];
	}

	/**
	 * Get settings page title.
	 *
	 * Retrieve the title for the settings page.
	 *
	 * @since 1.5.0
	 * @access protected
	 *
	 * @return string Settings page title.
	 */
	protected function get_page_title() {
		return esc_html__( 'Refraction', 'refraction' );
	}

	/**
	 * @since 2.2.0
	 * @access private
	 */
	private function maybe_remove_all_admin_notices() {
		$refraction_pages = [
			'refraction-system-info',
			'e-form-submissions',
			'refraction_custom_fonts',
			'refraction_custom_icons',
			'refraction-license',
			'refraction_custom_code',
			'popup_templates',
			'refraction-apps',
		];

		if ( empty( $_GET['page'] ) || ! in_array( $_GET['page'], $refraction_pages, true ) ) {
			return;
		}

		remove_all_actions( 'admin_notices' );
	}

	public function add_generator_tag_settings( $settings ) {
		$css_print_method = get_option( 'refraction_css_print_method', 'external' );
		$settings[] = 'css_print_method-' . $css_print_method;

		$google_font = Fonts::is_google_fonts_enabled() ? 'enabled' : 'disabled';
		$settings[] = 'google_font-' . $google_font;

		$font_display = Fonts::get_font_display_setting();
		$settings[] = 'font_display-' . $font_display;

		return $settings;
	}

	/**
	 * Settings page constructor.
	 *
	 * Initializing Refraction "Settings" page.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function __construct() {
		parent::__construct();

		add_action( 'admin_init', [ $this, 'on_admin_init' ] );
		add_filter( 'refraction/generator_tag/settings', [ $this, 'add_generator_tag_settings' ] );

		add_action( 'refraction/editor-one/menu/register', function ( Menu_Data_Provider $menu_data_provider ) {
			$this->register_editor_one_settings_menu( $menu_data_provider );
			$this->register_editor_one_home_menu( $menu_data_provider );
		} );

		$clear_cache_callback = [ Plugin::$instance->files_manager, 'clear_cache' ];

		// Clear CSS Meta after change css related methods.
		$css_settings = [
			'refraction_disable_color_schemes',
			'refraction_disable_typography_schemes',
			'refraction_css_print_method',
			'refraction_local_google_fonts',
		];

		foreach ( $css_settings as $option_name ) {
			add_action( "add_option_{$option_name}", $clear_cache_callback );
			add_action( "update_option_{$option_name}", $clear_cache_callback );
		}

		add_action( 'update_option_refraction_font_display', [ Google_Font::class, 'clear_cache' ] );
	}
}
