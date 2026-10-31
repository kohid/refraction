<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Modules\FormBuilder\Module;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction > Builder: routing, form handlers and assets. The screens themselves are printed by Admin_Views.
 *
 * Screens (query argument `view`): overview (default), new, design, records, record.
 */
class Admin_Page {

	const SLUG = 'refraction-builder';

	const ACTION_CREATE = 'refraction_fb_create';
	const ACTION_SAVE_COLLECTION = 'refraction_fb_save_collection';
	const ACTION_DELETE_COLLECTION = 'refraction_fb_delete_collection';
	const ACTION_SAVE_RECORD = 'refraction_fb_save_record';
	const ACTION_DELETE_RECORDS = 'refraction_fb_delete_records';
	const ACTION_STATUS = 'refraction_fb_status';
	const ACTION_EXPORT = 'refraction_fb_export';

	private Collections $collections;
	private Records $records;
	private Admin_Views $views;

	public function __construct( Collections $collections, Records $records ) {
		$this->collections = $collections;
		$this->records = $records;
		$this->views = new Admin_Views( $collections, $records );

		foreach (
			[
				self::ACTION_CREATE => 'handle_create',
				self::ACTION_SAVE_COLLECTION => 'handle_save_collection',
				self::ACTION_DELETE_COLLECTION => 'handle_delete_collection',
				self::ACTION_SAVE_RECORD => 'handle_save_record',
				self::ACTION_DELETE_RECORDS => 'handle_delete_records',
				self::ACTION_STATUS => 'handle_status',
				self::ACTION_EXPORT => 'handle_export',
			] as $action => $method
		) {
			add_action( 'admin_post_' . $action, [ $this, $method ] );
		}

		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
	}

	public static function url( array $args = [] ): string {
		return add_query_arg( $args, admin_url( 'admin.php?page=' . self::SLUG ) );
	}

	private function guard( string $nonce_action = '' ): void {
		if ( ! Module::can_manage() ) {
			wp_die( esc_html__( 'You do not have permission to manage the Builder.', 'refraction' ), 403 );
		}

		if ( '' !== $nonce_action ) {
			check_admin_referer( $nonce_action );
		}
	}

	private function redirect( array $args ): void {
		wp_safe_redirect( self::url( $args ) );
		exit;
	}

	private function post( string $key, $default = '' ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- Nonce checked in guard(); every value is cleaned by Schema.
		return isset( $_POST[ $key ] ) ? wp_unslash( $_POST[ $key ] ) : $default;
	}

	private function collection_or_die( string $slug ): array {
		$definition = $this->collections->get( Schema::slug( $slug ) );

		if ( ! $definition ) {
			wp_die( esc_html__( 'That collection no longer exists.', 'refraction' ), 404 );
		}

		return $definition;
	}

	public function enqueue_assets( string $hook ): void {
		if ( false === strpos( $hook, self::SLUG ) || ! Module::can_manage() ) {
			return;
		}

		$min = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_style( 'refraction-form-builder-admin', REFRACTION_ASSETS_URL . 'css/modules/form-builder/admin' . $min . '.css', [], REFRACTION_VERSION );

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$view = isset( $_GET['view'] ) ? sanitize_key( wp_unslash( $_GET['view'] ) ) : '';

		if ( ! in_array( $view, [ 'design', 'records' ], true ) ) {
			return;
		}

		wp_enqueue_script( 'refraction-form-builder-admin', REFRACTION_ASSETS_URL . 'js/form-builder-admin' . $min . '.js', [ 'wp-i18n' ], REFRACTION_VERSION, true );
		wp_set_script_translations( 'refraction-form-builder-admin', 'refraction' );
	}

	public function render(): void {
		$this->guard();

		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$view = isset( $_GET['view'] ) ? sanitize_key( wp_unslash( $_GET['view'] ) ) : '';
		$slug = isset( $_GET['collection'] ) ? Schema::slug( wp_unslash( $_GET['collection'] ) ) : '';
		// phpcs:enable

		if ( 'new' === $view ) {
			$this->views->render_new();
			return;
		}

		$definition = '' !== $slug ? $this->collections->get( $slug ) : null;

		if ( $definition && 'design' === $view ) {
			$this->views->render_design( $definition );
		} elseif ( $definition && 'record' === $view ) {
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$this->views->render_record( $definition, isset( $_GET['record'] ) ? absint( $_GET['record'] ) : 0 );
		} elseif ( $definition && 'records' === $view ) {
			$this->views->render_records( $definition );
		} else {
			$this->views->render_overview();
		}
	}

	// ---------------------------------------------------------------- handlers

	public function handle_create(): void {
		$this->guard( self::ACTION_CREATE );

		$preset = sanitize_key( (string) $this->post( 'preset' ) );
		$saved = $this->collections->save( Presets::get( in_array( $preset, Presets::keys(), true ) ? $preset : 'blank' ) );

		$saved ? $this->redirect( [ 'view' => 'design', 'collection' => $saved['slug'], 'done' => 'created' ] ) : $this->redirect( [ 'view' => 'new' ] );
	}

	public function handle_save_collection(): void {
		$this->guard( self::ACTION_SAVE_COLLECTION );

		$slug = Schema::slug( (string) $this->post( 'collection' ) );
		$this->collection_or_die( $slug );

		$fields = array_values( (array) $this->post( 'fields', [] ) );
		$statuses = array_values( (array) $this->post( 'statuses', [] ) );
		$raw = [
			'label' => $this->post( 'label' ),
			'singular' => $this->post( 'singular' ),
			'description' => $this->post( 'description' ),
			'icon' => $this->post( 'icon' ),
			'title_field' => $this->post( 'title_field' ),
			'default_status' => $this->post( 'default_status' ),
			'public_form' => '1' === (string) $this->post( 'public_form' ),
			'public_list' => '1' === (string) $this->post( 'public_list' ),
			'success_message' => $this->post( 'success_message' ),
			'fields' => $fields,
			'statuses' => $statuses,
		];
		$saved = $this->collections->save( $raw, $slug );

		$saved
			? $this->redirect( [ 'view' => 'design', 'collection' => $slug, 'done' => 'saved' ] )
			: $this->redirect( [ 'view' => 'design', 'collection' => $slug, 'done' => 'invalid' ] );
	}

	public function handle_delete_collection(): void {
		$this->guard( self::ACTION_DELETE_COLLECTION );

		$slug = Schema::slug( (string) $this->post( 'collection' ) );
		$this->collection_or_die( $slug );

		// The owner must type the name of the collection, so one stray click never wipes the records.
		$definition = $this->collections->get( $slug );

		if ( trim( (string) $this->post( 'confirm' ) ) !== $definition['label'] ) {
			$this->redirect( [ 'view' => 'design', 'collection' => $slug, 'done' => 'confirm' ] );
		}

		$this->records->delete_all( $slug );
		$this->collections->delete( $slug );
		$this->redirect( [ 'done' => 'collection-deleted' ] );
	}

	public function handle_save_record(): void {
		$this->guard( self::ACTION_SAVE_RECORD );

		$definition = $this->collection_or_die( (string) $this->post( 'collection' ) );
		$id = absint( $this->post( 'record', 0 ) );
		$result = Schema::validate( $definition, (array) $this->post( 'values', [] ) );
		$status = sanitize_key( (string) $this->post( 'status' ) );

		if ( $result['errors'] ) {
			set_transient( 'refraction_fb_form_' . get_current_user_id(), [ 'values' => $result['values'], 'errors' => $result['errors'], 'status' => $status, 'record' => $id ], 120 );
			$this->redirect( [ 'view' => 'record', 'collection' => $definition['slug'], 'record' => $id, 'done' => 'errors' ] );
		}

		if ( $id ) {
			$saved = $this->records->update( $id, $definition, $result['values'], $status );
		} else {
			$id = $this->records->insert( $definition, $result['values'], $status );
			$saved = (bool) $id;
		}

		$this->redirect( [ 'view' => 'records', 'collection' => $definition['slug'], 'done' => $saved ? 'record-saved' : 'record-failed' ] );
	}

	public function handle_delete_records(): void {
		$this->guard( self::ACTION_DELETE_RECORDS );

		$definition = $this->collection_or_die( (string) $this->post( 'collection' ) );
		$ids = array_filter( array_map( 'absint', (array) $this->post( 'records', [] ) ) );
		$deleted = 0;

		foreach ( $ids as $id ) {
			$deleted += $this->records->delete( (int) $id, $definition['slug'] ) ? 1 : 0;
		}

		$this->redirect( [ 'view' => 'records', 'collection' => $definition['slug'], 'done' => 'records-deleted', 'count' => $deleted ] );
	}

	public function handle_status(): void {
		$this->guard( self::ACTION_STATUS );

		$definition = $this->collection_or_die( (string) $this->post( 'collection' ) );
		$status = sanitize_key( (string) $this->post( 'status' ) );
		$ids = array_filter( array_map( 'absint', (array) $this->post( 'records', [] ) ) );

		foreach ( $ids as $id ) {
			$this->records->set_status( (int) $id, $definition, $status );
		}

		$this->redirect( [ 'view' => 'records', 'collection' => $definition['slug'], 'done' => 'status-changed' ] );
	}

	public function handle_export(): void {
		$this->guard( self::ACTION_EXPORT );

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Checked in guard().
		$definition = $this->collection_or_die( isset( $_GET['collection'] ) ? sanitize_text_field( wp_unslash( $_GET['collection'] ) ) : '' );
		$rows = Schema::csv_rows( $definition, $this->records->export( $definition, $this->views->table_args() ) );

		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="' . $definition['slug'] . '-' . gmdate( 'Y-m-d' ) . '.csv"' );

		$out = fopen( 'php://output', 'w' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen
		fwrite( $out, "\xEF\xBB\xBF" ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite -- Byte order mark so spreadsheets read UTF-8.

		foreach ( $rows as $row ) {
			fputcsv( $out, $row ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fputcsv
		}

		fclose( $out ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose
		exit;
	}
}
