<?php
namespace Refraction\Modules\Popups;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Documents_Manager;
use Refraction\Modules\Popups\Classes\Popup_Manager;
use Refraction\Modules\Popups\Documents\Popup;
use Refraction\Modules\ThemeBuilder\Module as ThemeBuilderModule;
use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Popups: a Theme Builder template type with triggers, visitor rules and display conditions.
 *
 * See docs/refraction/popups.md.
 */
class Module extends BaseModule {

	private ?Popup_Manager $manager = null;

	public function get_name() {
		return 'popups';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/documents/register', [ $this, 'register_documents' ] );
		add_filter( 'refraction/theme_builder/admin_tabs', [ $this, 'add_theme_builder_tab' ] );
		add_filter( 'template_include', [ $this, 'use_preview_template' ], 30 );
		add_action( 'before_delete_post', [ $this, 'forget_deleted_popup' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'register_assets' ], 5 );

		if ( ! is_admin() ) {
			$theme_builder = ThemeBuilderModule::instance();
			$this->manager = new Popup_Manager( $theme_builder->get_store(), $theme_builder->get_conditions_manager(), $theme_builder->get_locations_manager() );
		}
	}

	public function get_manager(): ?Popup_Manager {
		return $this->manager;
	}

	public function register_documents( Documents_Manager $documents_manager ): void {
		$documents_manager->register_document_type( Popup::get_type(), Popup::get_class_full_name() );
	}

	public function add_theme_builder_tab( array $tabs ): array {
		$tabs[ Popup::TYPE ] = [
			'label' => esc_html__( 'Popups', 'refraction' ),
			'singular' => esc_html__( 'Popup', 'refraction' ),
			'empty' => esc_html__( 'No popup yet. Design one, choose how it opens and where it appears.', 'refraction' ),
			'intro' => esc_html__( 'A popup opens on a trigger such as page load, scroll, exit intent or a click. Display Conditions say on which pages it is available.', 'refraction' ),
		];

		return $tabs;
	}

	public function register_assets(): void {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_register_style( Popup_Manager::STYLE, REFRACTION_ASSETS_URL . 'css/modules/popups/frontend' . $suffix . '.css', [], REFRACTION_VERSION );
		wp_register_script( Popup_Manager::SCRIPT, REFRACTION_ASSETS_URL . 'js/popups-frontend' . $suffix . '.js', [], REFRACTION_VERSION, [ 'in_footer' => true, 'strategy' => 'defer' ] );
	}

	/** A popup opened on its own shows the popup preview page, never the theme. */
	public function use_preview_template( $template ) {
		if ( ! is_singular( Source_Local::CPT ) || ! Plugin::$instance->documents->get( get_queried_object_id() ) instanceof Popup ) {
			return $template;
		}

		return __DIR__ . '/templates/preview.php';
	}

	public function forget_deleted_popup( $post_id ): void {
		ThemeBuilderModule::instance()->get_store()->remove( (int) $post_id, [ Popup::TYPE ] );
	}

	/**
	 * Published and draft popups as `[ id => title ]`, for the Popup dynamic tag and other pickers.
	 *
	 * @return array<int, string>
	 */
	public static function get_popup_options(): array {
		$posts = get_posts( [
			'post_type' => Source_Local::CPT,
			'post_status' => [ 'publish', 'draft', 'private' ],
			'posts_per_page' => 100,
			'no_found_rows' => true,
			'meta_key' => \Refraction\Core\Base\Document::TYPE_META_KEY, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'meta_value' => Popup::TYPE, // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			'orderby' => 'title',
			'order' => 'ASC',
		] );

		$options = [];

		foreach ( $posts as $post ) {
			$options[ $post->ID ] = '' !== $post->post_title ? $post->post_title : sprintf( /* translators: %d: popup ID. */ __( 'Popup #%d', 'refraction' ), $post->ID );
		}

		return $options;
	}
}
