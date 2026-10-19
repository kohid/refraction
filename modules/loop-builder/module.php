<?php
namespace Refraction\Modules\LoopBuilder;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Documents_Manager;
use Refraction\Modules\LoopBuilder\Classes\Loop_Renderer;
use Refraction\Modules\LoopBuilder\Classes\Query_Lookup;
use Refraction\Modules\LoopBuilder\Classes\Rest_Controller;
use Refraction\Modules\LoopBuilder\Control\Control_Autocomplete;
use Refraction\Modules\LoopBuilder\Controls\Group_Control_Query;
use Refraction\Modules\LoopBuilder\Documents\Loop_Item;
use Refraction\Modules\PageTemplates\Module as PageTemplatesModule;
use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Loop Builder: the Loop Item template type, the Query controls and the widgets that list posts (Posts,
 * Archive Posts, Portfolio, Loop Grid, Loop Carousel, Taxonomy Filter).
 *
 * See docs/refraction/loop-builder.md.
 */
class Module extends BaseModule {

	const CREATE_ACTION = 'refraction_loop_create_template';
	const CREATE_NONCE = 'refraction_loop_create_template';

	public function get_name() {
		return 'loop-builder';
	}

	protected function get_widgets() {
		return [ 'Posts', 'Archive_Posts', 'Portfolio', 'Loop_Grid', 'Loop_Carousel', 'Taxonomy_Filter' ];
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/documents/register', [ $this, 'register_documents' ] );
		add_action( 'refraction/controls/register', [ $this, 'register_controls' ] );
		add_action( 'refraction/controls/controls_registered', [ $this, 'register_group_controls' ] );
		add_action( 'refraction/elements/categories_registered', [ $this, 'register_category' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'register_frontend_assets' ], 5 );
		add_action( 'refraction/editor/before_enqueue_scripts', [ $this, 'enqueue_editor_assets' ] );
		add_filter( 'refraction/dynamic_tags/context_post_id', [ $this, 'use_preview_post' ] );
		add_filter( 'template_include', [ $this, 'use_canvas_for_loop_item' ], 20 );
		add_action( 'wp_ajax_' . self::CREATE_ACTION, [ $this, 'ajax_create_template' ] );
		add_filter( 'refraction/theme_builder/admin_tabs', [ $this, 'add_theme_builder_tab' ] );
		add_filter( 'refraction/theme_builder/is_managed_document', [ $this, 'is_managed_document' ], 10, 2 );

		new Query_Lookup();
		new Rest_Controller();
	}

	public function register_documents( Documents_Manager $documents_manager ): void {
		$documents_manager->register_document_type( Loop_Item::get_type(), Loop_Item::get_class_full_name() );
	}

	public function register_controls( Controls_Manager $controls_manager ): void {
		$controls_manager->register( new Control_Autocomplete() );
	}

	public function register_group_controls( Controls_Manager $controls_manager ): void {
		$controls_manager->add_group_control( Group_Control_Query::get_type(), new Group_Control_Query() );
	}

	public function register_category( $elements_manager ): void {
		$elements_manager->add_category(
			Widgets\Base_Loop_Widget::CATEGORY,
			[
				'title' => esc_html__( 'Posts and Loops', 'refraction' ),
				'icon' => 'rficon-posts-grid',
			]
		);
	}

	public function register_frontend_assets(): void {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_register_style( 'refraction-loop-frontend', REFRACTION_ASSETS_URL . 'css/modules/loop-builder/frontend' . $suffix . '.css', [], REFRACTION_VERSION );
		wp_register_script( 'refraction-loop-frontend', REFRACTION_ASSETS_URL . 'js/loop-builder-frontend' . $suffix . '.js', [ 'jquery', 'refraction-frontend' ], REFRACTION_VERSION, true );

		wp_localize_script(
			'refraction-loop-frontend',
			'refractionLoop',
			[
				'restUrl' => esc_url_raw( rest_url( Rest_Controller::ROUTE_NAMESPACE . Rest_Controller::ROUTE ) ),
				'nonce' => wp_create_nonce( Rest_Controller::NONCE ),
				'i18n' => [
					'loading' => esc_html__( 'Loading…', 'refraction' ),
					'loaded' => esc_html__( 'More posts loaded.', 'refraction' ),
					'filtered' => esc_html__( 'The list was updated.', 'refraction' ),
					'error' => esc_html__( 'Could not load the posts.', 'refraction' ),
				],
			]
		);
	}

	public function enqueue_editor_assets(): void {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_style( 'refraction-loop-builder-editor', REFRACTION_ASSETS_URL . 'css/modules/loop-builder/editor' . $suffix . '.css', [], REFRACTION_VERSION );
		wp_enqueue_script( 'refraction-loop-builder-editor', REFRACTION_ASSETS_URL . 'js/loop-builder-editor' . $suffix . '.js', [ 'refraction-editor' ], REFRACTION_VERSION, true );
		wp_set_script_translations( 'refraction-loop-builder-editor', 'refraction' );

		$templates = [];

		foreach ( Loop_Renderer::get_template_options() as $id => $title ) {
			$document = Plugin::$instance->documents->get( $id );
			$templates[ $id ] = [
				'title' => $title,
				'editUrl' => $document ? $document->get_edit_url() : '',
			];
		}

		wp_localize_script(
			'refraction-loop-builder-editor',
			'refractionLoopBuilder',
			[
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'lookupAction' => Query_Lookup::ACTION,
				'lookupNonce' => wp_create_nonce( Query_Lookup::NONCE ),
				'createAction' => self::CREATE_ACTION,
				'createNonce' => wp_create_nonce( self::CREATE_NONCE ),
				'templates' => (object) $templates,
			]
		);
	}

	/**
	 * While a Loop Item template is edited or previewed, tags describe its preview post. The loop
	 * widgets push the real post of each item, which wins over this.
	 */
	public function use_preview_post( $post_id ) {
		$post_id = (int) $post_id;

		if ( ! $post_id || Source_Local::CPT !== get_post_type( $post_id ) ) {
			return $post_id;
		}

		$document = Plugin::$instance->documents->get( $post_id );

		return $document instanceof Loop_Item ? $document->get_preview_post_id() : $post_id;
	}

	/** A Loop Item opened on its own shows only itself, on the blank Refraction canvas. */
	public function use_canvas_for_loop_item( $template ) {
		if ( ! is_singular( Source_Local::CPT ) || ! Plugin::$instance->documents->get( get_queried_object_id() ) instanceof Loop_Item ) {
			return $template;
		}

		$page_templates = Plugin::$instance->modules_manager->get_modules( 'page-templates' );
		$canvas = $page_templates ? $page_templates->get_template_path( PageTemplatesModule::TEMPLATE_CANVAS ) : '';

		return $canvas ? $canvas : $template;
	}

	/** Creates an empty Loop Item for the "Create a template" button of the widgets. */
	public function ajax_create_template(): void {
		if ( ! check_ajax_referer( self::CREATE_NONCE, '_nonce', false ) ) {
			wp_send_json_error( [ 'message' => esc_html__( 'Your session expired. Reload the editor and try again.', 'refraction' ) ], 403 );
		}

		$type = get_post_type_object( Source_Local::CPT );

		if ( ! $type || ! current_user_can( $type->cap->publish_posts ) ) {
			wp_send_json_error( [ 'message' => esc_html__( 'You are not allowed to create templates.', 'refraction' ) ], 403 );
		}

		$title = isset( $_POST['title'] ) ? sanitize_text_field( wp_unslash( $_POST['title'] ) ) : '';
		$document = Plugin::$instance->documents->create(
			Loop_Item::get_type(),
			[
				'post_title' => '' !== $title ? $title : esc_html__( 'Loop Item', 'refraction' ),
				'post_status' => 'publish',
			]
		);

		if ( is_wp_error( $document ) || ! $document ) {
			wp_send_json_error( [ 'message' => esc_html__( 'Could not create the template.', 'refraction' ) ], 500 );
		}

		wp_send_json_success(
			[
				'id' => $document->get_main_id(),
				'title' => get_the_title( $document->get_main_id() ),
				'editUrl' => $document->get_edit_url(),
			]
		);
	}

	public function add_theme_builder_tab( array $tabs ): array {
		$tabs[ Loop_Item::TYPE ] = [
			'label' => esc_html__( 'Loop Items', 'refraction' ),
			'singular' => esc_html__( 'Loop Item', 'refraction' ),
			'empty' => esc_html__( 'No loop item yet. Build one, then pick it in a Loop Grid or Loop Carousel.', 'refraction' ),
			'intro' => esc_html__( 'A Loop Item is the card you design once. A Loop Grid or Loop Carousel prints it for every post of a query.', 'refraction' ),
			'conditions' => false,
		];

		return $tabs;
	}

	public function is_managed_document( $is_managed, $post_id ) {
		return $is_managed || Plugin::$instance->documents->get( (int) $post_id ) instanceof Loop_Item;
	}
}
