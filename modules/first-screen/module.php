<?php
namespace Refraction\Modules\FirstScreen;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * First screen without animations (0.146.0), Settings > Performance > Animations On The First Screen.
 *
 * Entrance animations used to print their element hidden (refraction-invisible) until the frontend script, loaded last,
 * revealed it on screen: a hero heading or picture with an entrance stayed invisible through the whole load, which is
 * what speed tests (and visitors) see as a slow page (Largest Contentful Paint). With this on, those elements are
 * printed visible (rf-intro); a few lines of script, run while the page is read (before the frontend scripts), hide
 * the ones below the first screen so they still animate when scrolled to, and mark the ones already on screen as
 * shown (rf-intro-skip): no animation for them, nothing to wait for. Every visitor gets the same page.
 *
 * Pin Board's reveal and Dynamic Container's entrance follow it too (the body class rf-first-screen): what is on screen
 * when the page opens is shown at once.
 */
class Module extends BaseModule {

	const OPTION = 'refraction_first_screen_animations';

	public function get_name() {
		return 'first-screen';
	}

	/** On the site (not in the editor or its preview), when the setting is on (the default). */
	public static function is_enabled(): bool {
		if ( '1' !== get_option( self::OPTION, '1' ) || is_admin() ) {
			return false;
		}

		$plugin = Plugin::$instance;

		return ! ( $plugin->editor->is_edit_mode() || $plugin->preview->is_preview_mode() );
	}

	public function __construct() {
		parent::__construct();

		add_filter( 'body_class', function ( $classes ) {
			if ( self::is_enabled() ) {
				$classes[] = 'rf-first-screen';
			}

			return $classes;
		} );

		// Before the frontend scripts (printed later in the footer), so they find every element already sorted.
		add_action( 'wp_footer', [ $this, 'print_script' ], 1 );

		// Cached element markup was printed the other way: printed again (first save adds the option, a reset deletes it).
		$clear = function () {
			Plugin::$instance->files_manager->clear_cache();
		};
		add_action( 'add_option_' . self::OPTION, $clear );
		add_action( 'update_option_' . self::OPTION, $clear );
		add_action( 'delete_option_' . self::OPTION, $clear );
	}

	public function print_script() {
		if ( ! self::is_enabled() ) {
			return;
		}
		?>
		<script>
			( function() {
				var h = window.innerHeight || document.documentElement.clientHeight;
				document.querySelectorAll( '.rf-intro' ).forEach( function( el ) {
					var r = el.getBoundingClientRect();
					el.classList.add( r.top < h && r.bottom > 0 && r.height > 0 ? 'rf-intro-skip' : 'refraction-invisible' );
				} );
			} )();
		</script>
		<?php
	}
}
