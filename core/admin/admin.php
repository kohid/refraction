<?php
namespace Refraction\Core\Admin;

use Refraction\Core\Base\App;
use Refraction\Core\Utils\Assets_Config_Provider;
use Refraction\Core\Utils\Collection;
use Refraction\Modules\FloatingButtons\Module as Floating_Buttons_Module;
use Refraction\Plugin;
use Refraction\Settings;
use Refraction\User;
use Refraction\Utils;
use Refraction\Core\DocumentTypes\Page;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Admin extends App {

	private $menus = [];

	/**
	 * Get module name.
	 *
	 * Retrieve the module name.
	 *
	 * @since 2.3.0
	 * @access public
	 *
	 * @return string Module name.
	 */
	public function get_name() {
		return 'admin';
	}

	/**
	 * Check if current page is a Refraction admin page.
	 *
	 * @param \WP_Screen|null $current_screen Optional. Screen object to check. Defaults to current screen.
	 *
	 * @return bool Whether current page is a Refraction admin page.
	 */
	public static function is_refraction_admin_page( $current_screen = null ) {
		if ( ! $current_screen ) {
			$current_screen = get_current_screen();
		}

		if ( ! $current_screen ) {
			return false;
		}

		$screen_id = $current_screen->id ?? '';
		$post_type = $current_screen->post_type ?? '';

		$is_refraction_screen = strpos( $screen_id, 'refraction' ) !== false
			|| strpos( $screen_id, Floating_Buttons_Module::CPT_FLOATING_BUTTONS ) !== false;

		$is_refraction_post_type = strpos( $post_type, 'refraction' ) !== false
			|| strpos( $post_type, Floating_Buttons_Module::CPT_FLOATING_BUTTONS ) !== false;

		return $is_refraction_screen || $is_refraction_post_type;
	}

	private function register_packages() {
		$assets_config_provider = ( new Assets_Config_Provider() )
			->set_path_resolver( function ( $name ) {
				return REFRACTION_ASSETS_PATH . "js/packages/{$name}/{$name}.asset.php";
			} );

		Collection::make( [ 'ui', 'icons', 'query' ] )
			->each( function( $package ) use ( $assets_config_provider ) {
				$suffix = Utils::is_script_debug() ? '' : '.min';
				$config = $assets_config_provider->load( $package )->get( $package );

				if ( ! $config ) {
					return;
				}

				wp_register_script(
					$config['handle'],
					REFRACTION_ASSETS_URL . "js/packages/{$package}/{$package}{$suffix}.js",
					$config['deps'],
					REFRACTION_VERSION,
					true
				);
			} );
	}

	/**
	 * Enqueue admin scripts.
	 *
	 * Registers all the admin scripts and enqueues them.
	 *
	 * Fired by `admin_enqueue_scripts` action.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function enqueue_scripts() {
		wp_register_script(
			'refraction-admin-modules',
			$this->get_js_assets_url( 'admin-modules' ),
			[],
			REFRACTION_VERSION,
			true
		);

		$this->register_packages();

		wp_register_script(
			'refraction-admin',
			$this->get_js_assets_url( 'admin' ),
			[
				'refraction-common',
				'refraction-admin-modules',
			],
			REFRACTION_VERSION,
			true
		);

		wp_enqueue_script( 'refraction-admin' );

		wp_set_script_translations( 'refraction-admin', 'refraction' );

		$this->print_config();
	}

	/**
	 * Enqueue admin styles.
	 *
	 * Registers all the admin styles and enqueues them.
	 *
	 * Fired by `admin_enqueue_scripts` action.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function enqueue_styles() {
		wp_register_style(
			'refraction-admin',
			$this->get_css_assets_url( 'admin' ),
			[
				'refraction-common',
			],
			REFRACTION_VERSION
		);

		wp_enqueue_style( 'refraction-admin' );

		// It's for upgrade notice.
		// TODO: enqueue this just if needed.
		add_thickbox();
	}

	/**
	 * Print switch mode button.
	 *
	 * Adds a switch button in post edit screen (which has cpt support). To allow
	 * the user to switch from the native WordPress editor to Refraction builder.
	 *
	 * Fired by `edit_form_after_title` action.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param \WP_Post $post The current post object.
	 */
	public function print_switch_mode_button( $post ) {
		// Exit if Gutenberg are active.
		if ( did_action( 'enqueue_block_editor_assets' ) ) {
			return;
		}

		$document = Plugin::$instance->documents->get( $post->ID );

		if ( ! $document || ! $document->is_editable_by_current_user() ) {
			return;
		}

		wp_nonce_field( basename( __FILE__ ), '_refraction_edit_mode_nonce' );
		?>
		<div id="refraction-switch-mode">
			<input id="refraction-switch-mode-input" type="hidden" name="_refraction_post_mode" value="<?php echo esc_attr( $document->is_built_with_refraction() ); ?>" />
			<button id="refraction-switch-mode-button" type="button" class="button button-primary button-hero">
				<span class="refraction-switch-mode-on">
					<i class="eicon-wordpress" aria-hidden="true"></i>
					<?php echo esc_html__( 'Edit with WordPress', 'refraction' ); ?>
				</span>
				<span class="refraction-switch-mode-off">
					<i class="eicon-refraction-square" aria-hidden="true"></i>
					<?php echo esc_html__( 'Edit with Refraction', 'refraction' ); ?>
				</span>
			</button>
		</div>
		<div id="refraction-editor">
			<a id="refraction-go-to-edit-page-link" href="<?php echo esc_url( $document->get_edit_url() ); ?>">
				<div id="refraction-editor-button" class="button button-primary button-hero">
					<i class="eicon-refraction-square" aria-hidden="true"></i>
					<?php echo esc_html__( 'Edit with Refraction', 'refraction' ); ?>
				</div>
				<div class="refraction-loader-wrapper">
					<div class="refraction-loader">
						<div class="refraction-loader-boxes">
							<div class="refraction-loader-box"></div>
							<div class="refraction-loader-box"></div>
							<div class="refraction-loader-box"></div>
							<div class="refraction-loader-box"></div>
						</div>
					</div>
					<div class="refraction-loading-title"><?php echo esc_html__( 'Loading', 'refraction' ); ?></div>
				</div>
			</a>
		</div>
		<?php
	}

	/**
	 * Save post.
	 *
	 * Flag the post mode when the post is saved.
	 *
	 * Fired by `save_post` action.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param int $post_id Post ID.
	 */
	public function save_post( $post_id ) {
		if ( ! wp_verify_nonce( Utils::get_super_global_value( $_POST, '_refraction_edit_mode_nonce' ), basename( __FILE__ ) ) ) {
			return;
		}

		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}

		Plugin::$instance->documents->get( $post_id )->set_is_built_with_refraction( ! empty( $_POST['_refraction_post_mode'] ) );
	}

	/**
	 * Add Refraction post state.
	 *
	 * Adds a new "Refraction" post state to the post table.
	 *
	 * Fired by `display_post_states` filter.
	 *
	 * @since 1.8.0
	 * @access public
	 *
	 * @param array    $post_states An array of post display states.
	 * @param \WP_Post $post        The current post object.
	 *
	 * @return array A filtered array of post display states.
	 */
	public function add_refraction_post_state( $post_states, $post ) {
		$document = Plugin::$instance->documents->get( $post->ID );

		if ( $document && $document->is_built_with_refraction() && $document->is_editable_by_current_user() ) {
			$post_states['refraction'] = esc_html__( 'Refraction', 'refraction' );
		}

		return $post_states;
	}

	/**
	 * Body status classes.
	 *
	 * Adds CSS classes to the admin body tag.
	 *
	 * Fired by `admin_body_class` filter.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param string $classes Space-separated list of CSS classes.
	 *
	 * @return string Space-separated list of CSS classes.
	 */
	public function body_status_classes( $classes ) {
		global $pagenow;

		if ( in_array( $pagenow, [ 'post.php', 'post-new.php' ], true ) && Utils::is_post_support() ) {
			$post = get_post();

			$document = Plugin::$instance->documents->get( $post->ID );

			$mode_class = $document && $document->is_built_with_refraction() ? 'refraction-editor-active' : 'refraction-editor-inactive';

			$classes .= ' ' . $mode_class;
		}

		return $classes;
	}

	/**
	 * Plugin action links.
	 *
	 * Adds action links to the plugin list table
	 *
	 * Fired by `plugin_action_links` filter.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @param array $links An array of plugin action links.
	 *
	 * @return array An array of plugin action links.
	 */
	public function plugin_action_links( $links ) {
		$settings_link = sprintf( '<a href="%1$s">%2$s</a>', admin_url( 'admin.php?page=' . Settings::PAGE_ID ), esc_html__( 'Settings', 'refraction' ) );

		array_unshift( $links, $settings_link );

		return $links;
	}

	/**
	 * Register dashboard widgets.
	 *
	 * Adds a new Refraction widgets to WordPress dashboard.
	 *
	 * Fired by `wp_dashboard_setup` action.
	 *
	 * @since 1.9.0
	 * @access public
	 */
	public function register_dashboard_widgets() {
		wp_add_dashboard_widget( 'e-dashboard-overview', esc_html__( 'Refraction Overview', 'refraction' ), [ $this, 'refraction_dashboard_overview_widget' ] );

		// Move our widget to top.
		global $wp_meta_boxes;

		$dashboard = $wp_meta_boxes['dashboard']['normal']['core'];
		$ours = [
			'e-dashboard-overview' => $dashboard['e-dashboard-overview'],
		];

		$wp_meta_boxes['dashboard']['normal']['core'] = array_merge( $ours, $dashboard ); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
	}

	/**
	 * Displays the Refraction dashboard widget.
	 *
	 * Fired by `wp_add_dashboard_widget` function.
	 *
	 * @since 1.9.0
	 * @access public
	 */
	public function refraction_dashboard_overview_widget() {
		?>
		<div class="e-dashboard-overview e-dashboard-widget">
			<?php
			self::refraction_dashboard_overview_header();
			self::refraction_dashboard_overview_recently_edited();
			?>
		</div>
		<?php
	}

	/**
	 * Displays the Refraction dashboard widget - header section.
	 * Fired by `refraction_dashboard_overview_widget` function.
	 *
	 * @param bool $show_versions
	 * @param bool $is_create_post_enabled
	 *
	 * @return void
	 * @since 3.12.0
	 */
	public static function refraction_dashboard_overview_header( bool $show_versions = true, bool $is_create_post_enabled = true ) {
		if ( User::is_current_user_can_edit_post_type( 'page' ) ) {
			$create_new_label = esc_html__( 'Create New Page', 'refraction' );
			$create_new_post_type = 'page';
		} elseif ( User::is_current_user_can_edit_post_type( 'post' ) ) {
			$create_new_label = esc_html__( 'Create New Post', 'refraction' );
			$create_new_post_type = 'post';
		}
		?>
		<div class="e-overview__header">
			<?php if ( $show_versions ) { ?>
				<div class="e-overview__logo">
					<div class="e-logo-wrapper"><i class="eicon-refraction-circle"></i></div>
				</div>
				<div class="e-overview__versions">
					<span class="e-overview__version"><?php echo esc_html__( 'Refraction', 'refraction' ); ?> v<?php echo REFRACTION_VERSION; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
					<?php
					/**
					 * Refraction dashboard widget after the version.
					 * Fires after Refraction version display in the dashboard widget.
					 *
					 * @since 1.9.0
					 */
					do_action( 'refraction/admin/dashboard_overview_widget/after_version' );
					?>
				</div>
			<?php } ?>
			<?php if ( ! empty( $create_new_post_type ) && $is_create_post_enabled ) { ?>
				<div class="e-overview__create">
					<a href="<?php echo esc_url( Plugin::$instance->documents->get_create_new_post_url( $create_new_post_type ) ); ?>" class="button"><span aria-hidden="true" class="dashicons dashicons-plus"></span> <?php echo esc_html( $create_new_label ); ?></a>
				</div>
			<?php } ?>
		</div>
		<?php
	}

	/**
	 * Displays the Refraction dashboard widget - recently edited section.
	 * Fired by `refraction_dashboard_overview_widget` function.
	 *
	 * @param array $args
	 * @param bool  $show_heading
	 *
	 * @return void
	 * @since 3.12.0
	 */
	public static function refraction_dashboard_overview_recently_edited( array $args = [], bool $show_heading = true ) {
		$recently_edited_query = Utils::get_recently_edited_posts_query( $args );

		if ( $recently_edited_query->have_posts() ) { ?>
			<div class="e-overview__recently-edited">
				<?php if ( $show_heading ) { ?>
					<h3 class="e-heading e-divider_bottom"><?php echo esc_html__( 'Recently Edited', 'refraction' ); ?></h3>
				<?php } ?>
				<ul class="e-overview__posts">
					<?php
					while ( $recently_edited_query->have_posts() ) {
						$recently_edited_query->the_post();
						$document = Plugin::$instance->documents->get( get_the_ID() );

						$date = date_i18n( _x( 'M jS', 'Dashboard Overview Widget Recently Date', 'refraction' ), get_the_modified_time( 'U' ) );
						?>
						<li class="e-overview__post">
							<a href="<?php echo esc_url( $document->get_edit_url() ); ?>" class="e-overview__post-link"><?php echo esc_html( get_the_title() ); ?>
								<span class="dashicons dashicons-edit"></span></a>
							<span><?php echo $date; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>, <?php the_modified_time(); ?></span>
						</li>
					<?php } ?>
				</ul>
			</div>
		<?php }
	}

	/**
	 * Admin action new post.
	 *
	 * When a new post action is fired the title is set to 'Refraction' and the post ID.
	 *
	 * Fired by `admin_action_refraction_new_post` action.
	 *
	 * @since 1.9.0
	 * @access public
	 */
	public function admin_action_new_post() {
		check_admin_referer( 'refraction_action_new_post' );

		$post_type = Utils::get_super_global_value( $_GET, 'post_type' ) ?? 'post';

		if ( ! User::is_current_user_can_edit_post_type( $post_type ) ) {
			return;
		}

		if ( empty( $_GET['template_type'] ) ) {
			$type = 'post';
		} else {
			$type = sanitize_text_field( wp_unslash( $_GET['template_type'] ) );
		}

		$post_data = Utils::get_super_global_value( $_GET, 'post_data' ) ?? [];

		$post_data = $this->filter_post_data( $post_data );

		/**
		 * Create new post meta data.
		 *
		 * Filters the meta data of any new post created.
		 *
		 * @since 2.0.0
		 *
		 * @param array $meta Post meta data.
		 */
		$meta = [];

		if ( isset( $_GET['meta'] ) && is_array( $_GET['meta'] ) ) {
			$meta = array_map( 'sanitize_text_field', wp_unslash( $_GET['meta'] ) );
		}

		$meta = apply_filters( 'refraction/admin/create_new_post/meta', $meta );

		$post_data['post_type'] = $post_type;

		$document = Plugin::$instance->documents->create( $type, $post_data, $meta );

		if ( is_wp_error( $document ) ) {
			wp_die( $document ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		wp_safe_redirect( $document->get_edit_url() );

		die;
	}

	public function admin_action_site_settings_redirect() {
		check_admin_referer( 'refraction_action_site_settings_redirect' );

		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'refraction' ) );
		}

		$active_tab = filter_input( INPUT_GET, 'active-tab', FILTER_SANITIZE_ENCODED );

		$site_settings_url_config = Page::get_site_settings_url_config( $active_tab );

		if ( empty( $site_settings_url_config['url'] ) ) {
			wp_die( esc_html__( 'Unable to create or access Site Settings page.', 'refraction' ) );
		}

		wp_safe_redirect( $site_settings_url_config['url'] );

		die;
	}

	/**
	 * Admin action edit website.
	 *
	 * Redirects to the homepage edit URL if it exists and is built with Refraction,
	 * otherwise redirects to create a new page.
	 *
	 * Fired by `admin_action_refraction_edit_website` action.
	 *
	 * @since 3.x.x
	 * @access public
	 */
	public function admin_action_edit_website_redirect() {
		check_admin_referer( 'refraction_action_edit_website' );

		if ( ! User::is_current_user_can_edit_post_type( 'page' ) ) {
			wp_die( esc_html__( 'You do not have sufficient permissions to access this page.', 'refraction' ) );
		}

		$homepage_id = $this->get_homepage_id();
		$edit_url = $this->get_edit_website_url( $homepage_id );

		wp_safe_redirect( $edit_url );

		die;
	}

	private function get_homepage_id(): ?int {
		if ( get_option( 'show_on_front' ) !== 'page' ) {
			return null;
		}

		$homepage_id = get_option( 'page_on_front' );

		return $homepage_id ? (int) $homepage_id : null;
	}

	private function get_edit_website_url( ?int $homepage_id ): string {
		if ( ! $homepage_id ) {
			return Plugin::$instance->documents->get_create_new_post_url( 'page' );
		}

		$document = Plugin::$instance->documents->get( $homepage_id );

		if ( ! $document || ! $document->is_built_with_refraction() ) {
			return Plugin::$instance->documents->get_create_new_post_url( 'page' );
		}

		return $document->get_edit_url();
	}

	private function get_allowed_fields_for_role() {
		$allowed_fields = [
			'post_title',
			'post_content',
			'post_excerpt',
			'post_category',
			'post_type',
			'tags_input',
		];

		if ( current_user_can( 'publish_posts' ) ) {
			$allowed_fields[] = 'post_status';
		}

		if ( current_user_can( 'edit_others_posts' ) ) {
			$allowed_fields[] = 'post_author';
		}

		return $allowed_fields;
	}

	private function filter_post_data( $post_data ) {
		$allowed_fields = $this->get_allowed_fields_for_role();
		return array_filter(
			$post_data,
			function( $key ) use ( $allowed_fields ) {
				return in_array( $key, $allowed_fields, true );
			},
			ARRAY_FILTER_USE_KEY
		);
	}
	/**
	 * @since 2.3.0
	 * @access public
	 */
	public function add_new_template_template() {
		Plugin::$instance->common->add_template( REFRACTION_PATH . 'includes/admin-templates/new-template.php' );
	}

	public function add_new_floating_elements_template() {
		Plugin::$instance->common->add_template( REFRACTION_PATH . 'includes/admin-templates/new-floating-elements.php' );
	}

	public function enqueue_new_floating_elements_scripts() {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_script(
			'refraction-floating-elements-modal',
			REFRACTION_ASSETS_URL . 'js/floating-elements-modal' . $suffix . '.js',
			[],
			REFRACTION_VERSION,
			true
		);

		wp_set_script_translations( 'refraction-floating-elements-modal', 'refraction' );
	}

	/**
	 * @access public
	 */
	public function enqueue_new_template_scripts() {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_script(
			'refraction-new-template',
			REFRACTION_ASSETS_URL . 'js/new-template' . $suffix . '.js',
			[],
			REFRACTION_VERSION,
			true
		);

		wp_set_script_translations( 'refraction-new-template', 'refraction' );
	}

	public function init_floating_elements() {
		$screens = [
			'refraction_library_page_e-floating-buttons' => true,
			'edit-e-floating-buttons' => true,
		];

		if ( ! isset( $screens[ get_current_screen()->id ] ) ) {
			return;
		}

		add_action( 'admin_head', [ $this, 'add_new_floating_elements_template' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_new_floating_elements_scripts' ] );
	}

	/**
	 * @access public
	 */
	public function init_new_template() {
		if ( 'edit-refraction_library' !== get_current_screen()->id ) {
			return;
		}

		// Allow plugins to add their templates on admin_head.
		add_action( 'admin_head', [ $this, 'add_new_template_template' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_new_template_scripts' ] );
	}

	/**
	 * Admin constructor.
	 *
	 * Initializing Refraction in WordPress admin.
	 *
	 * @since 1.0.0
	 * @access public
	 */
	public function __construct() {
		Plugin::$instance->init_common();

		$this->add_component( 'admin-notices', new Admin_Notices() );

		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_styles' ] );

		add_action( 'edit_form_after_title', [ $this, 'print_switch_mode_button' ] );
		add_action( 'save_post', [ $this, 'save_post' ] );

		add_filter( 'display_post_states', [ $this, 'add_refraction_post_state' ], 10, 2 );

		add_filter( 'plugin_action_links_' . REFRACTION_PLUGIN_BASE, [ $this, 'plugin_action_links' ] );

		add_filter( 'admin_body_class', [ $this, 'body_status_classes' ] );

		// Register Dashboard Widgets.
		add_action( 'wp_dashboard_setup', [ $this, 'register_dashboard_widgets' ] );

		// Admin Actions
		add_action( 'admin_action_refraction_new_post', [ $this, 'admin_action_new_post' ] );
		add_action( 'admin_action_refraction_site_settings_redirect', [ $this, 'admin_action_site_settings_redirect' ] );
		add_action( 'admin_action_refraction_edit_website_redirect', [ $this, 'admin_action_edit_website_redirect' ] );

		add_action( 'current_screen', [ $this, 'init_new_template' ] );
		add_action( 'current_screen', [ $this, 'init_floating_elements' ] );

	}

	/**
	 * @since 2.3.0
	 * @access protected
	 */
	protected function get_init_settings() {

		$settings = [
			'home_url' => home_url(),
			'settings_url' => Settings::get_url(),
			'user' => [
				'introduction' => User::get_introduction_meta(),
				'restrictions' => Plugin::$instance->role_manager->get_user_restrictions_array(),
				'is_administrator' => current_user_can( 'manage_options' ),
			],
			'experiments' => $this->get_experiments(),
		];

		/**
		 * Localize settings.
		 *
		 * Filters the initial localize settings in the admin.
		 *
		 * WordPress has it's own way to pass localized data from PHP (backend) to
		 * JS (frontend). Refraction uses this method to pass localize data in the
		 * admin. This hook can be used to add more localized settings in addition
		 * to the initial Refraction settings.
		 *
		 * @since 2.3.0
		 *
		 * @param array $settings Initial localize settings.
		 */
		$settings = apply_filters( 'refraction/admin/localize_settings', $settings );

		return $settings;
	}

	private function get_experiments() {
		return ( new Collection( Plugin::$instance->experiments->get_features() ) )
			->map( function ( $experiment_data ) {
				$dependencies = $experiment_data['dependencies'] ?? [];

				$dependencies = ( new Collection( $dependencies ) )
					->map( function ( $dependency ) {
						return $dependency->get_name();
					} )->all();

				return [
					'name' => $experiment_data['name'],
					'title' => $experiment_data['title'] ?? $experiment_data['name'],
					'state' => $experiment_data['state'],
					'default' => $experiment_data['default'],
					'dependencies' => $dependencies,
					'messages' => $experiment_data['messages'] ?? [],
				];
			} )->all();
	}
}
