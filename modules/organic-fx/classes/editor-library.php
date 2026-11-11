<?php
namespace Refraction\Modules\OrganicFx\Classes;

use Refraction\Modules\OrganicFx\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * My Shapes and grain textures, managed from the editor (the Uploaded tab's "Upload or manage" button and the Grain
 * section's texture button). Every request checks a nonce and the capability (upload_files by default, filter
 * refraction/organic-fx/capability). Shapes keep only path data and a numeric viewBox (Pure_Shape_Store).
 */
class Editor_Library {

	const NONCE = 'refraction_ofx_library';

	private Shapes_Repository $shapes;

	private Textures_Repository $textures;

	public function __construct( Shapes_Repository $shapes, Textures_Repository $textures ) {
		$this->shapes = $shapes;
		$this->textures = $textures;

		foreach ( [ 'shape_add', 'shape_rename', 'shape_delete', 'texture_add', 'texture_delete' ] as $action ) {
			add_action( 'wp_ajax_refraction_ofx_' . $action, [ $this, $action ] );
		}
	}

	private function guard(): void {
		check_ajax_referer( self::NONCE, 'nonce' );

		if ( ! current_user_can( Module::capability() ) ) {
			wp_send_json_error( [ 'message' => __( 'Sorry, you are not allowed to do that.', 'refraction' ) ], 403 );
		}
	}

	private static function posted( string $key ): string {
		return isset( $_POST[ $key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $key ] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification -- checked in guard().
	}

	private static function name( string $name, string $fallback ): string {
		$name = mb_substr( trim( $name ), 0, 60 );

		return '' === $name ? $fallback : $name;
	}

	/** What the editor needs to show the library and add a shape to the preview. */
	public function shapes_payload(): array {
		$out = [];

		foreach ( $this->shapes->all() as $id => $shape ) {
			$out[ $id ] = $shape + [ 'css' => Pure_Shape_Store::css( [ $id => $shape ] ) ];
		}

		return $out;
	}

	public function shape_add(): void {
		$this->guard();

		$svg = isset( $_POST['svg'] ) ? (string) wp_unslash( $_POST['svg'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput, WordPress.Security.NonceVerification -- parsed by Pure_Shape_Store, which keeps only numbers and path letters.
		$shape = Pure_Shape_Store::parse( $svg );

		if ( ! $shape ) {
			wp_send_json_error( [ 'message' => __( 'No shape found. Use an SVG with a filled path, rectangle, circle, ellipse or polygon (up to 200 KB). Text and pictures inside an SVG are not used.', 'refraction' ) ] );
		}

		$id = $this->shapes->add( self::name( self::posted( 'name' ), __( 'My shape', 'refraction' ) ), $shape );

		if ( '' === $id ) {
			/* translators: %d: maximum number of shapes. */
			wp_send_json_error( [ 'message' => sprintf( __( 'The library holds %d shapes. Delete one first.', 'refraction' ), Shapes_Repository::MAX ) ] );
		}

		wp_send_json_success( [ 'id' => $id, 'shapes' => $this->shapes_payload() ] );
	}

	public function shape_rename(): void {
		$this->guard();
		$this->shapes->rename( self::posted( 'id' ), self::name( self::posted( 'name' ), '' ) );
		wp_send_json_success( [ 'shapes' => $this->shapes_payload() ] );
	}

	public function shape_delete(): void {
		$this->guard();
		$this->shapes->delete( self::posted( 'id' ) );
		wp_send_json_success( [ 'shapes' => $this->shapes_payload() ] );
	}

	public function texture_add(): void {
		$this->guard();

		$data = isset( $_POST['png'] ) ? (string) wp_unslash( $_POST['png'] ) : ''; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput, WordPress.Security.NonceVerification -- decoded and re-encoded by GD.
		$png = preg_match( '#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $data, $m ) ? base64_decode( $m[1], true ) : false; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode -- an image upload.
		$result = false === $png ? new \WP_Error( 'bad', __( 'That picture could not be read.', 'refraction' ) ) : $this->textures->add( self::name( self::posted( 'name' ), __( 'Texture', 'refraction' ) ), $png );

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( [ 'message' => $result->get_error_message() ] );
		}

		wp_send_json_success( [ 'id' => $result[0], 'textures' => $this->textures->for_script() ] );
	}

	public function texture_delete(): void {
		$this->guard();
		$this->textures->delete( self::posted( 'id' ) );
		wp_send_json_success( [ 'textures' => $this->textures->for_script() ] );
	}
}
