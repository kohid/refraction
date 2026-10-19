<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * All reads and writes of the submissions tables. Every query is prepared.
 */
class Submissions_Repository {

	const STATUSES = [ 'unread', 'read', 'trash' ];

	public function insert( array $row, array $fields ): int {
		global $wpdb;

		Schema::maybe_upgrade();

		$ok = $wpdb->insert( Schema::table( 'submissions' ), [
			'form_key' => substr( (string) $row['form_key'], 0, 80 ),
			'form_name' => substr( (string) $row['form_name'], 0, 200 ),
			'post_id' => (int) $row['post_id'],
			'element_id' => substr( (string) $row['element_id'], 0, 40 ),
			'status' => 'unread',
			'user_id' => (int) ( $row['user_id'] ?? 0 ),
			'ip' => substr( (string) ( $row['ip'] ?? '' ), 0, 64 ),
			'user_agent' => substr( (string) ( $row['user_agent'] ?? '' ), 0, 255 ),
			'page_url' => substr( (string) ( $row['page_url'] ?? '' ), 0, 500 ),
			'created_gmt' => gmdate( 'Y-m-d H:i:s' ),
		] );

		if ( ! $ok ) {
			return 0;
		}

		$id = (int) $wpdb->insert_id;

		foreach ( $fields as $field_id => $field ) {
			$wpdb->insert( Schema::table( 'submission_values' ), [
				'submission_id' => $id,
				'field_id' => substr( (string) $field_id, 0, 100 ),
				'field_label' => substr( (string) $field['label'], 0, 255 ),
				'field_type' => substr( (string) $field['type'], 0, 20 ),
				'value' => (string) $field['value'],
			] );
		}

		return $id;
	}

	public function add_log( int $submission_id, string $action, string $status, string $message ): void {
		global $wpdb;

		$wpdb->insert( Schema::table( 'submission_log' ), [
			'submission_id' => $submission_id,
			'action' => substr( $action, 0, 40 ),
			'status' => substr( $status, 0, 10 ),
			'message' => substr( $message, 0, 2000 ),
			'created_gmt' => gmdate( 'Y-m-d H:i:s' ),
		] );
	}

	public function get( int $id ): ?array {
		global $wpdb;

		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . Schema::table( 'submissions' ) . ' WHERE id = %d', $id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return $row ?: null;
	}

	public function get_values( int $submission_id ): array {
		global $wpdb;

		return (array) $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM ' . Schema::table( 'submission_values' ) . ' WHERE submission_id = %d ORDER BY id ASC', $submission_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	/** Values of several submissions at once: [submission_id => [field_id => row]]. @param int[] $ids */
	public function get_values_for( array $ids ): array {
		global $wpdb;

		$ids = array_values( array_filter( array_map( 'absint', $ids ) ) );

		if ( ! $ids ) {
			return [];
		}

		$in = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		$rows = (array) $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM ' . Schema::table( 'submission_values' ) . " WHERE submission_id IN ({$in}) ORDER BY id ASC", $ids ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$out = [];

		foreach ( $rows as $row ) {
			$out[ (int) $row['submission_id'] ][ $row['field_id'] ] = $row;
		}

		return $out;
	}

	public function get_value_row( int $value_id ): ?array {
		global $wpdb;

		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . Schema::table( 'submission_values' ) . ' WHERE id = %d', $value_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return $row ?: null;
	}

	public function get_log( int $submission_id ): array {
		global $wpdb;

		return (array) $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM ' . Schema::table( 'submission_log' ) . ' WHERE submission_id = %d ORDER BY id ASC', $submission_id ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	/**
	 * Builds the WHERE clause for the list, the counts and the export.
	 *
	 * @param array $args form_key, status (all|unread|read|trash), search, date_from, date_to (Y-m-d).
	 */
	private function where( array $args ): string {
		global $wpdb;

		$table = Schema::table( 'submissions' );
		$values = Schema::table( 'submission_values' );
		$where = [ '1=1' ];
		$status = $args['status'] ?? 'all';

		if ( 'all' === $status || '' === $status ) {
			$where[] = "s.status <> 'trash'";
		} elseif ( in_array( $status, self::STATUSES, true ) ) {
			$where[] = $wpdb->prepare( 's.status = %s', $status );
		}

		if ( ! empty( $args['form_key'] ) ) {
			$where[] = $wpdb->prepare( 's.form_key = %s', $args['form_key'] );
		}

		if ( ! empty( $args['date_from'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $args['date_from'] ) ) {
			$where[] = $wpdb->prepare( 's.created_gmt >= %s', $args['date_from'] . ' 00:00:00' );
		}

		if ( ! empty( $args['date_to'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $args['date_to'] ) ) {
			$where[] = $wpdb->prepare( 's.created_gmt <= %s', $args['date_to'] . ' 23:59:59' );
		}

		if ( isset( $args['search'] ) && '' !== trim( (string) $args['search'] ) ) {
			$like = '%' . $wpdb->esc_like( trim( (string) $args['search'] ) ) . '%';
			$where[] = $wpdb->prepare( "( s.form_name LIKE %s OR s.id IN ( SELECT v.submission_id FROM {$values} v WHERE v.value LIKE %s AND v.field_type <> 'password' ) )", $like, $like ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		}

		return ' FROM ' . $table . ' s WHERE ' . implode( ' AND ', $where ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	public function query( array $args, int $per_page = 20, int $page = 1 ): array {
		global $wpdb;

		$limit = max( 1, $per_page );
		$offset = max( 0, ( $page - 1 ) * $limit );
		$sql = 'SELECT s.*' . $this->where( $args ) . ' ORDER BY s.id DESC LIMIT %d OFFSET %d';

		return (array) $wpdb->get_results( $wpdb->prepare( $sql, $limit, $offset ), ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	public function count( array $args ): int {
		global $wpdb;

		return (int) $wpdb->get_var( 'SELECT COUNT(*)' . $this->where( $args ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	/** @return array<string,int> unread, read, trash, all (all excludes trash). */
	public function counts_by_status( array $args = [] ): array {
		$out = [];

		foreach ( [ 'unread', 'read', 'trash', 'all' ] as $status ) {
			$out[ $status ] = $this->count( array_merge( $args, [ 'status' => $status ] ) );
		}

		return $out;
	}

	/** @return array<string,string> form_key => form name */
	public function get_forms(): array {
		global $wpdb;

		$rows = (array) $wpdb->get_results( 'SELECT form_key, MAX(form_name) AS form_name FROM ' . Schema::table( 'submissions' ) . ' GROUP BY form_key ORDER BY form_name ASC', ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$out = [];

		foreach ( $rows as $row ) {
			$out[ $row['form_key'] ] = $row['form_name'];
		}

		return $out;
	}

	/** @param int[] $ids */
	public function set_status( array $ids, string $status ): int {
		global $wpdb;

		$ids = array_values( array_filter( array_map( 'absint', $ids ) ) );

		if ( ! $ids || ! in_array( $status, self::STATUSES, true ) ) {
			return 0;
		}

		$in = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

		return (int) $wpdb->query( $wpdb->prepare( 'UPDATE ' . Schema::table( 'submissions' ) . " SET status = %s WHERE id IN ({$in})", array_merge( [ $status ], $ids ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	/** Deletes submissions, their values, log lines and uploaded files. @param int[] $ids */
	public function delete( array $ids ): int {
		global $wpdb;

		$ids = array_values( array_filter( array_map( 'absint', $ids ) ) );

		if ( ! $ids ) {
			return 0;
		}

		$in = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

		$files = (array) $wpdb->get_col( $wpdb->prepare( 'SELECT value FROM ' . Schema::table( 'submission_values' ) . " WHERE field_type = 'file' AND submission_id IN ({$in})", $ids ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		foreach ( $files as $json ) {
			Upload_Store::delete_stored( (string) $json );
		}

		$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . Schema::table( 'submission_values' ) . " WHERE submission_id IN ({$in})", $ids ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . Schema::table( 'submission_log' ) . " WHERE submission_id IN ({$in})", $ids ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return (int) $wpdb->query( $wpdb->prepare( 'DELETE FROM ' . Schema::table( 'submissions' ) . " WHERE id IN ({$in})", $ids ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}

	/** Deletes everything older than the given number of days. Returns how many submissions went. */
	public function purge_older_than( int $days ): int {
		global $wpdb;

		if ( $days <= 0 ) {
			return 0;
		}

		$cutoff = gmdate( 'Y-m-d H:i:s', time() - $days * DAY_IN_SECONDS );
		$ids = (array) $wpdb->get_col( $wpdb->prepare( 'SELECT id FROM ' . Schema::table( 'submissions' ) . ' WHERE created_gmt < %s LIMIT 500', $cutoff ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return $this->delete( array_map( 'intval', $ids ) );
	}

	/** Submission ids that contain the given email address in an email field, or belong to the user. */
	public function find_ids_by_email( string $email, int $limit, int $offset ): array {
		global $wpdb;

		$user = get_user_by( 'email', $email );
		$user_id = $user ? (int) $user->ID : -1;
		$sql = 'SELECT DISTINCT s.id FROM ' . Schema::table( 'submissions' ) . ' s LEFT JOIN ' . Schema::table( 'submission_values' ) . " v ON v.submission_id = s.id AND v.field_type = 'email' WHERE LOWER(v.value) = %s OR s.user_id = %d ORDER BY s.id ASC LIMIT %d OFFSET %d";

		return array_map( 'intval', (array) $wpdb->get_col( $wpdb->prepare( $sql, strtolower( $email ), $user_id, $limit, $offset ) ) ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
	}
}
