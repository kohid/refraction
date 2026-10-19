<?php
namespace Refraction\Modules\ThemeBuilder;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Documents_Manager;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\ThemeBuilder\AdminMenuItems\Editor_One_Theme_Builder_Menu;
use Refraction\Modules\ThemeBuilder\Classes\Admin_Page;
use Refraction\Modules\ThemeBuilder\Classes\Conditions_Ajax;
use Refraction\Modules\ThemeBuilder\Classes\Conditions_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Conditions_Store;
use Refraction\Modules\ThemeBuilder\Classes\Environment;
use Refraction\Modules\ThemeBuilder\Classes\Locations_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Preview_Ajax;
use Refraction\Modules\ThemeBuilder\Classes\Preview_Context;
use Refraction\Modules\ThemeBuilder\Classes\Resolver;
use Refraction\Modules\ThemeBuilder\Classes\Rule;
use Refraction\Modules\ThemeBuilder\Classes\Theme_Integration;
use Refraction\Modules\ThemeBuilder\Classes\Wp_Environment;
use Refraction\Modules\ThemeBuilder\Control\Control_Conditions;
use Refraction\Modules\ThemeBuilder\Control\Control_Preview_Target;
use Refraction\Modules\ThemeBuilder\Documents\Archive;
use Refraction\Modules\ThemeBuilder\Documents\Error_404;
use Refraction\Modules\ThemeBuilder\Documents\Footer;
use Refraction\Modules\ThemeBuilder\Documents\Header;
use Refraction\Modules\ThemeBuilder\Documents\Search_Results;
use Refraction\Modules\ThemeBuilder\Documents\Single;
use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;
use Refraction\Modules\ThemeBuilder\Widgets\Theme_Widget_Base;
use Refraction\Modules\PageTemplates\Module as PageTemplatesModule;
use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

require_once __DIR__ . '/functions.php';

/**
 * Theme Builder: Header and Footer templates shown by display conditions.
 *
 * See docs/refraction/theme-builder.md.
 */
class Module extends BaseModule {

	private ?Environment $environment = null;
	private ?Conditions_Manager $conditions = null;
	private ?Conditions_Store $store = null;
	private ?Locations_Manager $locations = null;
	private ?Admin_Page $admin_page = null;

	public function get_name() {
		return 'theme-builder';
	}

	public function get_environment(): Environment {
		return $this->environment ??= new Wp_Environment();
	}

	public function get_conditions_manager(): Conditions_Manager {
		return $this->conditions ??= new Conditions_Manager( $this->get_environment() );
	}

	public function get_store(): Conditions_Store {
		return $this->store ??= new Conditions_Store();
	}

	public function get_locations_manager(): Locations_Manager {
		return $this->locations ??= new Locations_Manager( $this->get_store(), new Resolver( $this->get_conditions_manager() ) );
	}

	public function get_admin_page(): Admin_Page {
		return $this->admin_page ??= new Admin_Page( $this->get_store(), $this->get_conditions_manager() );
	}

	public function get_widgets() {
		return [
			'Site_Logo',
			'Site_Title',
			'Site_Tagline',
			'Page_Title',
			'Post_Title',
			'Post_Content',
			'Post_Excerpt',
			'Featured_Image',
			'Post_Info',
			'Author_Box',
			'Post_Comments',
			'Post_Navigation',
			'Breadcrumbs',
			'Archive_Title',
			'Sitemap',
			'Search_Form',
		];
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/elements/categories_registered', [ $this, 'register_widget_category' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_widget_styles' ] );

		add_action( 'refraction/documents/register', [ $this, 'register_documents' ] );
		add_action( 'refraction/controls/register', [ $this, 'register_controls' ] );
		add_filter( 'refraction/document/save/data', [ $this, 'sanitize_saved_conditions' ], 10, 2 );
		add_action( 'refraction/document/after_save', [ $this, 'store_saved_conditions' ], 10, 2 );
		add_filter( 'template_include', [ $this, 'use_canvas_for_template_preview' ], 20 );
		add_action( 'before_delete_post', [ $this, 'forget_deleted_template' ] );
		add_action( 'refraction/editor/before_enqueue_scripts', [ $this, 'enqueue_editor_assets' ] );
		add_action( 'refraction/editor-one/menu/register', [ $this, 'register_menu' ] );

		// Built on first use below; the admin page registers its own hooks.
		$this->get_admin_page();
		new Conditions_Ajax();
		new Preview_Ajax();
		new Preview_Context();

		if ( ! is_admin() ) {
			new Theme_Integration( $this->get_locations_manager() );
		}

		// Block themes and classic themes need the integration only on the front end; the editor
		// preview frame is a front end request, so Locations_Manager decides per request.
	}

	public function register_widget_category( $elements_manager ): void {
		$elements_manager->add_category(
			Theme_Widget_Base::CATEGORY,
			[
				'title' => esc_html__( 'Theme Elements', 'refraction' ),
				'icon' => 'rficon-library-list',
			]
		);
	}

	public function register_widget_styles(): void {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_register_style(
			Theme_Widget_Base::STYLE_HANDLE,
			REFRACTION_ASSETS_URL . 'css/modules/theme-builder/theme-elements' . $suffix . '.css',
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}

	public function register_documents( Documents_Manager $documents_manager ): void {
		$documents_manager
			->register_document_type( Header::get_type(), Header::get_class_full_name() )
			->register_document_type( Footer::get_type(), Footer::get_class_full_name() )
			->register_document_type( Single::get_type(), Single::get_class_full_name() )
			->register_document_type( Archive::get_type(), Archive::get_class_full_name() )
			->register_document_type( Search_Results::get_type(), Search_Results::get_class_full_name() )
			->register_document_type( Error_404::get_type(), Error_404::get_class_full_name() );
	}

	public function register_controls( Controls_Manager $controls_manager ): void {
		$controls_manager->register( new Control_Conditions() );
		$controls_manager->register( new Control_Preview_Target() );
	}

	public function register_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_Theme_Builder_Menu() );
	}

	/**
	 * Rules arrive from the browser: keep only valid ones, and only from users who may change them.
	 */
	public function sanitize_saved_conditions( $data, $document ) {
		if ( ! $document instanceof Theme_Document || empty( $data['settings'] ) || ! is_array( $data['settings'] ) ) {
			return $data;
		}

		$key = Theme_Document::CONDITIONS_SETTING;

		if ( current_user_can( 'manage_options' ) ) {
			if ( array_key_exists( $key, $data['settings'] ) ) {
				$data['settings'][ $key ] = Rule::sanitize_list( $data['settings'][ $key ] );
			}
		} else {
			$data['settings'][ $key ] = $this->get_store()->get_rules( $document->get_main_id() );
		}

		return $data;
	}

	public function store_saved_conditions( $document, $data ): void {
		if ( ! $document instanceof Theme_Document || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$post_id = $document->get_main_id();
		$key = Theme_Document::CONDITIONS_SETTING;

		if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) || ! isset( $data['settings'] ) || ! array_key_exists( $key, (array) $data['settings'] ) ) {
			return;
		}

		$this->get_store()->save_rules( $post_id, $document->get_location(), (array) $data['settings'][ $key ] );
	}

	/**
	 * A header or footer template opened on its own (editor preview, direct link) shows only itself,
	 * on the blank Refraction canvas, never inside the theme's header and footer.
	 */
	public function use_canvas_for_template_preview( $template ) {
		if ( ! is_singular( Source_Local::CPT ) || ! Plugin::$instance->documents->get( get_queried_object_id() ) instanceof Theme_Document ) {
			return $template;
		}

		$page_templates = Plugin::$instance->modules_manager->get_modules( 'page-templates' );
		$canvas = $page_templates ? $page_templates->get_template_path( PageTemplatesModule::TEMPLATE_CANVAS ) : '';

		return $canvas ? $canvas : $template;
	}

	public function forget_deleted_template( $post_id ): void {
		$this->get_store()->remove( (int) $post_id, array_keys( $this->get_locations_manager()->get_locations() ) );
	}

	public function enqueue_editor_assets(): void {
		$document = Plugin::$instance->documents->get( Plugin::$instance->editor->get_post_id() );

		if ( ! $document instanceof Theme_Document ) {
			return;
		}

		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_style( 'refraction-theme-builder-editor', REFRACTION_ASSETS_URL . 'css/modules/theme-builder/editor' . $suffix . '.css', [], REFRACTION_VERSION );
		wp_enqueue_script( 'refraction-theme-builder-editor', REFRACTION_ASSETS_URL . 'js/theme-builder-editor' . $suffix . '.js', [ 'refraction-editor' ], REFRACTION_VERSION, true );
		wp_set_script_translations( 'refraction-theme-builder-editor', 'refraction' );

		wp_localize_script( 'refraction-theme-builder-editor', 'refractionThemeBuilder', $this->get_editor_config() );
	}

	/** The rule groups and lookup endpoint, for any screen that edits display rules (editor control, Custom Code). */
	public function get_conditions_config(): array {
		$groups = [];
		$manager = $this->get_conditions_manager();

		foreach ( Conditions_Manager::get_classes() as $name => $class ) {
			$condition = $manager->get_condition( $name );

			$groups[] = [
				'name' => $name,
				'label' => $condition->get_label(),
				'audience' => $condition->is_audience(),
				'subs' => $condition->get_sub_conditions(),
			];
		}

		return [
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'action' => Conditions_Ajax::ACTION,
			'nonce' => wp_create_nonce( Conditions_Ajax::NONCE ),
			'canEdit' => current_user_can( 'manage_options' ),
			'conditions' => $groups,
		];
	}

	private function get_editor_config(): array {
		return array_merge( $this->get_conditions_config(), [
			'previewLookupAction' => Conditions_Ajax::PREVIEW_ACTION,
			'previewApplyAction' => Preview_Ajax::ACTION,
			'postId' => (int) Plugin::$instance->editor->get_post_id(),
		] );
	}
}
