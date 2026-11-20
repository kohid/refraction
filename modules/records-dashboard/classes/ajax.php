<?php
namespace Refraction\Modules\RecordsDashboard\Classes;

use Refraction\Modules\FormBuilder\Classes\Schema;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * What the Records Table and Record Details scripts ask for (0.129.0): signed-in people only (no `nopriv` hook), with a
 * nonce, the widget's own signed settings and the access it was given checked again on every call.
 *
 * Operations: rows (a page of the table), csv (every matching record), record (one record's details), status (change
 * a record's status, editors only).
 */
class Ajax {

	const ACTION = 'refraction_records';

	public function __construct() {
		add_action( 'wp_ajax_' . self::ACTION, [ $this, 'handle' ] );
	}

	public function handle(): void {
		if ( ! check_ajax_referer( self::ACTION, 'nonce', false ) ) {
			wp_send_json_error( [ 'message' => __( 'This page has expired. Reload it and try again.', 'refraction' ) ], 403 );
		}

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- checked above.
		$config = Records_View::verify( wp_unslash( (string) ( $_POST['config'] ?? '' ) ), (string) ( $_POST['sig'] ?? '' ) );
		$definition = $config ? Records_View::collections()->get( (string) ( $config['c'] ?? '' ) ) : null;

		if ( ! $config || ! $definition ) {
			wp_send_json_error( [ 'message' => __( 'These records are not available.', 'refraction' ) ], 400 );
		}

		$access = (string) ( $config['a'] ?? 'admins' );

		if ( ! Records_View::can_view( $access ) ) {
			wp_send_json_error( [ 'message' => __( 'You do not have permission to see these records.', 'refraction' ) ], 403 );
		}

		$op = sanitize_key( (string) ( $_POST['op'] ?? '' ) );
		$id = (int) ( $_POST['id'] ?? 0 );
		$raw = [];

		foreach ( [ 'search', 'status', 'from', 'to', 'orderby', 'order', 'page' ] as $key ) {
			if ( isset( $_POST[ $key ] ) ) {
				$raw[ $key ] = sanitize_text_field( wp_unslash( (string) $_POST[ $key ] ) );
			}
		}
		// phpcs:enable

		switch ( $op ) {
			case 'rows':
				$args = Records_View::query_args( $config, $raw );
				wp_send_json_success( Records_View::rows( $definition, $config, $args, $id ) );
				break;

			case 'csv':
				$this->csv( $definition, $config, Records_View::query_args( $config, $raw ) );
				break;

			case 'record':
				$record = Records_View::records()->get( $id, $definition['slug'] );

				if ( ! $record ) {
					wp_send_json_error( [ 'message' => __( 'This record no longer exists.', 'refraction' ) ], 404 );
				}

				wp_send_json_success( [ 'html' => Records_View::details( $definition, $config, $record ), 'id' => $id ] );
				break;

			case 'status':
				$this->status( $definition, $config, $id, sanitize_key( (string) ( $_POST['to'] ?? '' ) ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
				break;

			default:
				wp_send_json_error( [ 'message' => 'Unknown request.' ], 400 );
		}
	}

	private function status( array $definition, array $config, int $id, string $to ): void {
		if ( ! Records_View::can_change( (string) ( $config['a'] ?? 'admins' ) ) ) {
			wp_send_json_error( [ 'message' => __( 'You do not have permission to change this record.', 'refraction' ) ], 403 );
		}

		if ( ! Schema::status( $definition, $to ) || ! Records_View::records()->set_status( $id, $definition, $to ) ) {
			wp_send_json_error( [ 'message' => __( 'The status could not be changed.', 'refraction' ) ], 400 );
		}

		$record = Records_View::records()->get( $id, $definition['slug'] );

		/**
		 * A record's status was changed from a Record Details widget.
		 *
		 * @param int    $id
		 * @param string $to         The new status key.
		 * @param array  $definition The collection.
		 */
		do_action( 'refraction/records_dashboard/status_changed', $id, $to, $definition );

		wp_send_json_success( [ 'html' => Records_View::details( $definition, $config, $record ), 'id' => $id, 'status' => $to ] );
	}

	/** The table's columns as plain text, for every record matching its filters (up to 5000). */
	private function csv( array $definition, array $config, array $args ): void {
		unset( $args['page'], $args['per_page'] );

		$cols = Records_View::columns( $config );
		$lines = [];
		$header = [];

		foreach ( $cols as $col ) {
			$header[] = (string) ( $col['label'] ?? '' );
		}

		$lines[] = $header;

		foreach ( Records_View::records()->export( $definition, $args ) as $record ) {
			$row = [];

			foreach ( $cols as $col ) {
				$row[] = wp_strip_all_tags( str_replace( [ '</li>', '</span><span class="rf-rec-sub">' ], [ ' → ', ' – ' ], Records_View::cell( $definition, $record, $col ) ) );
			}

			$lines[] = $row;
		}

		$out = fopen( 'php://temp', 'r+' );

		foreach ( $lines as $line ) {
			// A cell starting with =, +, - or @ would run as a formula in a spreadsheet.
			fputcsv( $out, array_map( static function ( $cell ) {
				$cell = preg_replace( '/^[\s→–]+|[\s→–]+$/u', '', html_entity_decode( $cell, ENT_QUOTES, 'UTF-8' ) );

				return preg_match( '/^[=+\-@]/', $cell ) ? "'" . $cell : $cell;
			}, $line ) );
		}

		rewind( $out );
		$csv = stream_get_contents( $out );
		fclose( $out );

		wp_send_json_success( [
			'csv' => "\xEF\xBB\xBF" . $csv,
			'name' => sanitize_file_name( $definition['slug'] . '-' . gmdate( 'Y-m-d' ) . '.csv' ),
		] );
	}
}
