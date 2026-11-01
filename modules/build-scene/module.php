<?php
namespace Refraction\Modules\BuildScene;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\BuildScene\Classes\Glb_File;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Scroll-driven scenes. 3D Build Scene shows a 3D model (an uploaded .glb or the built-in sample house) whose parts fly
 * in stage by stage while the visitor scrolls; Scroll Sequence plays a video or image sequence with the scroll. Both pin
 * the section while they play. three.js is bundled with the plugin; nothing is loaded from elsewhere.
 */
class Module extends BaseModule {

	const SCRIPT = 'refraction-build-scene';
	const SEQUENCE = 'refraction-scroll-sequence';

	public function get_name() {
		return 'build-scene';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_assets' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_assets' ] );
		add_action( 'refraction/editor/after_enqueue_scripts', [ $this, 'register_assets' ] );
		add_action( 'refraction/editor/before_enqueue_scripts', [ $this, 'enqueue_editor' ] );

		// A .glb is a binary 3D model; WordPress refuses it unless it is allowed here and its content checks out.
		add_filter( 'upload_mimes', [ $this, 'allow_glb_uploads' ] );
		add_filter( 'wp_check_filetype_and_ext', [ $this, 'check_glb_upload' ], 10, 4 );
	}

	protected function get_widgets() {
		return [ 'Build_Scene', 'Scroll_Sequence' ];
	}

	public function register_assets(): void {
		if ( wp_script_is( self::SCRIPT, 'registered' ) ) {
			return;
		}

		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
		wp_register_style( self::SCRIPT, REFRACTION_ASSETS_URL . 'css/modules/build-scene/frontend' . $min . '.css', [], REFRACTION_VERSION );
		wp_register_script( self::SCRIPT, REFRACTION_ASSETS_URL . 'js/build-scene-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
		// The Scroll Sequence has its own small script: it plays pictures, it does not need the 3D library.
		wp_register_script( self::SEQUENCE, REFRACTION_ASSETS_URL . 'js/scroll-sequence-frontend' . $min . '.js', [], REFRACTION_VERSION, true );
	}

	/** The editor side: "Fill stages from the model". */
	public function enqueue_editor(): void {
		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_script( 'refraction-build-scene-editor', REFRACTION_ASSETS_URL . 'js/build-scene-editor' . $min . '.js', [ 'wp-i18n' ], REFRACTION_VERSION, true );
	}

	public function allow_glb_uploads( $mimes ) {
		if ( current_user_can( 'upload_files' ) ) {
			$mimes['glb'] = Glb_File::MIME;
		}

		return $mimes;
	}

	/** A `.glb` upload is accepted only when the file starts like a glTF 2 binary. */
	public function check_glb_upload( $data, $file, $filename, $mimes ) {
		if ( 'glb' !== strtolower( pathinfo( (string) $filename, PATHINFO_EXTENSION ) ) ) {
			return $data;
		}

		$head = is_readable( (string) $file ) ? file_get_contents( $file, false, null, 0, 12 ) : ''; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

		if ( current_user_can( 'upload_files' ) && is_string( $head ) && Glb_File::is_valid_header( $head ) ) {
			return [ 'ext' => 'glb', 'type' => Glb_File::MIME, 'proper_filename' => false ];
		}

		return [ 'ext' => false, 'type' => false, 'proper_filename' => false ];
	}
}
