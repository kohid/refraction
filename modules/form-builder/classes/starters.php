<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Starters (0.90.0): ready-made Form pages to begin from. "Start from" in Refraction > Builder makes the Form page with
 * the starter's widgets and settings and saves it once, so its collection exists and the form can be shown at once
 * (Form Canvas, [refraction_form]). The page is then edited like any other; nothing ties it to the starter afterwards.
 *
 * A starter is a file in modules/form-builder/starters/ that returns [ 'elements' => ..., 'settings' => ... ].
 */
class Starters {

	const ACTION = 'refraction_fb_starter';

	public static function all(): array {
		return [
			'taxi-booking' => [
				'title' => __( 'Taxi and tour booking', 'refraction' ),
				'text' => __( 'Airport, corporate, golf, wedding and minibus journeys and Inverness tours in three steps: route with stops and a return, passengers and a vehicle that fits, then details, the tour price and a summary. Gives each booking a reference and emails the customer.', 'refraction' ),
			],
		];
	}

	public function __construct() {
		add_action( 'admin_post_' . self::ACTION, [ $this, 'handle' ] );
	}

	public static function url( string $starter ): string {
		return wp_nonce_url( add_query_arg( [ 'action' => self::ACTION, 'starter' => $starter ], admin_url( 'admin-post.php' ) ), self::ACTION . $starter );
	}

	/** The starter's elements and page settings, with fresh element ids. */
	public static function data( string $starter ): ?array {
		if ( ! isset( self::all()[ $starter ] ) ) {
			return null;
		}

		$id = static function (): string {
			return Utils::generate_random_string();
		};

		$data = require dirname( __DIR__ ) . '/starters/' . $starter . '.php';

		return is_array( $data ) ? $data : null;
	}

	/** Makes the Form page and saves it (which makes its collection); returns the page id or 0. */
	public static function create( string $starter ): int {
		$data = self::data( $starter );

		if ( ! $data ) {
			return 0;
		}

		$document = Plugin::$instance->documents->create( Form_Document::TYPE, [ 'post_title' => self::all()[ $starter ]['title'], 'post_status' => 'publish' ] );

		if ( is_wp_error( $document ) || ! $document ) {
			return 0;
		}

		$document->save( [ 'elements' => $data['elements'], 'settings' => $data['settings'] ] );

		return (int) $document->get_main_id();
	}

	public function handle(): void {
		$starter = isset( $_GET['starter'] ) ? sanitize_key( wp_unslash( $_GET['starter'] ) ) : '';

		if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( self::ACTION . $starter ) ) {
			wp_die( esc_html__( 'You are not allowed to do that.', 'refraction' ), 403 );
		}

		$doc_id = self::create( $starter );

		if ( ! $doc_id ) {
			wp_die( esc_html__( 'The form could not be made.', 'refraction' ) );
		}

		wp_safe_redirect( Editor_Forms::edit_url( $doc_id ) ?: Admin_Page::url() );
		exit;
	}
}
