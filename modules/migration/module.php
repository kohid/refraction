<?php
namespace Refraction\Modules\Migration;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\Migration\AdminMenuItems\Migration_Menu;
use Refraction\Modules\Migration\Classes\Admin;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Moving a site from the page builder Refraction comes from: pages, posts, templates and global styles converted to
 * Refraction (see classes/importer.php), so that builder can be removed. Also the Template widget and the
 * [refraction-template id="..."] shortcode, which show a saved template (what that builder's template widget, global
 * widgets and template shortcode become).
 */
class Module extends BaseModule {

	private ?Admin $admin = null;

	/** Templates being shown, so one that shows itself stops. */
	private static array $showing = [];

	public function get_name() {
		return 'migration';
	}

	protected function get_widgets() {
		return [ 'Template' ];
	}

	public function get_admin(): Admin {
		if ( ! $this->admin ) {
			$this->admin = new Admin();
		}

		return $this->admin;
	}

	public function __construct() {
		parent::__construct();

		add_shortcode( 'refraction-template', [ $this, 'shortcode' ] );

		if ( is_admin() ) {
			$this->get_admin();
			add_action( 'refraction/editor-one/menu/register', [ $this, 'register_menu' ] );
		}
	}

	public function register_menu( Menu_Data_Provider $provider ): void {
		$provider->register_menu( new Migration_Menu() );
	}

	public function shortcode( $atts ): string {
		$atts = shortcode_atts( [ 'id' => 0 ], $atts, 'refraction-template' );

		return self::template( absint( $atts['id'] ) );
	}

	/** A saved template's content ('' for one that is not published, or is already being shown). */
	public static function template( int $id, bool $with_css = true ): string {
		$post = $id ? get_post( $id ) : null;

		if ( ! $post || \Refraction\TemplateLibrary\Source_Local::CPT !== $post->post_type || isset( self::$showing[ $id ] ) ) {
			return '';
		}

		if ( 'publish' !== $post->post_status && ! current_user_can( 'edit_post', $id ) ) {
			return '';
		}

		self::$showing[ $id ] = true;
		$html = (string) Plugin::$instance->frontend->get_builder_content_for_display( $id, $with_css );
		unset( self::$showing[ $id ] );

		return $html;
	}
}
