<?php
namespace Refraction\Modules\FormBuilder;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\FormBuilder\AdminMenuItems\Editor_One_Builder_Menu;
use Refraction\Modules\FormBuilder\Classes\Admin_Page;
use Refraction\Modules\FormBuilder\Classes\Collections;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
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

		// Forms built in the page editor: the Form page type, its fields as widgets in their own category, and the save
		// that turns the page into the collection everything else reads.
		add_action( 'refraction/documents/register', static function ( $documents_manager ) {
			$documents_manager->register_document_type( Form_Document::TYPE, Form_Document::get_class_full_name() );
		} );
		add_action( 'refraction/elements/categories_registered', static function ( $elements_manager ) {
			$elements_manager->add_category( Editor_Forms::CATEGORY, [
				'title' => esc_html__( 'Form Builder', 'refraction' ),
				'icon' => 'rficon-form-horizontal',
				'active' => true,
			] );
		} );
		add_action( 'refraction/document/after_save', function ( $document ) {
			if ( $document instanceof Form_Document ) {
				( new Editor_Forms( $this->get_collections() ) )->sync( $document );
			}
		} );
		add_action( 'wp_enqueue_scripts', [ $this, 'register_assets' ], 1 );
		// Group, Repeater and Steps hold containers; the editor learns them as nested element types.
		add_action( 'refraction/editor/before_enqueue_scripts', static function () {
			$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
			wp_enqueue_script( 'refraction-form-builder-editor', REFRACTION_ASSETS_URL . 'js/form-builder-editor' . $min . '.js', [ 'nested-elements' ], REFRACTION_VERSION, true );
		} );
		add_filter( 'template_include', [ $this, 'canvas_for_form_preview' ], 20 );
	}

	/** A Form page opened on its own (the editor preview) shows only the form, on the blank canvas. */
	public function canvas_for_form_preview( $template ) {
		if ( ! is_singular( 'refraction_library' ) || ! \Refraction\Plugin::$instance->documents->get( get_queried_object_id() ) instanceof Form_Document ) {
			return $template;
		}

		$page_templates = \Refraction\Plugin::$instance->modules_manager->get_modules( 'page-templates' );
		$canvas = $page_templates ? $page_templates->get_template_path( \Refraction\Modules\PageTemplates\Module::TEMPLATE_CANVAS ) : '';

		return $canvas ? $canvas : $template;
	}

	/** The form styles and script as named handles, so the field widgets can ask for them (in the editor preview too). */
	public function register_assets(): void {
		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
		wp_register_style( 'refraction-form-builder-front', REFRACTION_ASSETS_URL . 'css/modules/form-builder/front' . $min . '.css', [], REFRACTION_VERSION );
		wp_register_script( 'refraction-form-builder-front', REFRACTION_ASSETS_URL . 'js/form-builder-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
	}

	protected function get_widgets() {
		return [
			'Field_Text', 'Field_Textarea', 'Field_Name', 'Field_Email', 'Field_Phone', 'Field_Website', 'Field_Number', 'Field_Amount',
			'Field_Country', 'Field_Date', 'Field_Time', 'Field_Datetime', 'Field_Select', 'Field_Radio', 'Field_Checkbox', 'Field_Toggle',
			'Field_Rating', 'Field_Hidden', 'Field_File', 'Field_Signature', 'Field_Group', 'Field_Repeater', 'Field_Choice_Set', 'Steps', 'Badge', 'Price', 'Submit_Button',
		];
	}

	public function register_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_Builder_Menu() );
	}
}
