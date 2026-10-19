<?php
namespace Refraction\Modules\Forms\Classes;

use Refraction\Modules\Forms\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction > Submissions: list, single view, bulk actions, CSV export, file download, settings.
 * Every state-changing or data-exposing request checks the capability and a nonce.
 */
class Admin_Page {

	const SLUG = 'refraction-submissions';
	const PER_PAGE = 20;

	private Submissions_Repository $repo;

	public function __construct( Submissions_Repository $repo ) {
		$this->repo = $repo;

		add_action( 'admin_post_refraction_forms_bulk', [ $this, 'handle_bulk' ] );
		add_action( 'admin_post_refraction_forms_single', [ $this, 'handle_single' ] );
		add_action( 'admin_post_refraction_forms_export', [ $this, 'handle_export' ] );
		add_action( 'admin_post_refraction_forms_download', [ $this, 'handle_download' ] );
		add_action( 'admin_post_refraction_forms_settings', [ $this, 'handle_settings' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
	}

	public static function url( array $args = [] ): string {
		return add_query_arg( array_merge( [ 'page' => self::SLUG ], $args ), admin_url( 'admin.php' ) );
	}

	private function guard( string $nonce_action, bool $post = false ): void {
		if ( ! current_user_can( Module::capability() ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to do that.', 'refraction' ), 403 );
		}

		$source = $post ? $_POST : $_GET; // phpcs:ignore WordPress.Security.NonceVerification
		$nonce = isset( $source['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $source['_wpnonce'] ) ) : '';

		if ( ! wp_verify_nonce( $nonce, $nonce_action ) ) {
			wp_die( esc_html__( 'The link has expired. Go back and try again.', 'refraction' ), 403 );
		}
	}

	public function enqueue_assets( string $hook ): void {
		if ( false === strpos( $hook, self::SLUG ) ) {
			return;
		}

		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_style( 'refraction-forms-admin', REFRACTION_ASSETS_URL . 'css/modules/forms/admin' . $min . '.css', [], REFRACTION_VERSION );
	}

	/** Filters shared by the list and the export, read from the query string. */
	private function filters_from( array $source ): array {
		$status = isset( $source['status'] ) ? sanitize_key( $source['status'] ) : 'all';

		return [
			'form_key' => isset( $source['form_key'] ) ? preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $source['form_key'] ) : '',
			'status' => in_array( $status, [ 'all', 'unread', 'read', 'trash' ], true ) ? $status : 'all',
			'search' => isset( $source['s'] ) ? sanitize_text_field( $source['s'] ) : '',
			'date_from' => isset( $source['date_from'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $source['date_from'] ) ? $source['date_from'] : '',
			'date_to' => isset( $source['date_to'] ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', (string) $source['date_to'] ) ? $source['date_to'] : '',
		];
	}

	// ------------------------------------------------------------------ handlers

	public function handle_bulk(): void {
		$this->guard( 'refraction_forms_bulk', true );

		$action = isset( $_POST['bulk_action'] ) ? sanitize_key( wp_unslash( $_POST['bulk_action'] ) ) : '';
		$ids = isset( $_POST['ids'] ) && is_array( $_POST['ids'] ) ? array_map( 'absint', wp_unslash( $_POST['ids'] ) ) : [];
		$done = 0;

		switch ( $action ) {
			case 'read':
			case 'unread':
			case 'trash':
				$done = $this->repo->set_status( $ids, $action );
				break;
			case 'restore':
				$done = $this->repo->set_status( $ids, 'read' );
				break;
			case 'delete':
				$done = $this->repo->delete( $ids );
				break;
		}

		wp_safe_redirect( self::url( [ 'notice' => $done ? 'bulk' : 'none', 'count' => $done ] ) );
		exit;
	}

	public function handle_single(): void {
		$this->guard( 'refraction_forms_single', false );

		$id = isset( $_GET['id'] ) ? absint( $_GET['id'] ) : 0;
		$do = isset( $_GET['do'] ) ? sanitize_key( $_GET['do'] ) : '';
		$back = self::url( [ 'notice' => 'bulk', 'count' => 1 ] );

		if ( 'delete' === $do ) {
			$this->repo->delete( [ $id ] );
		} elseif ( in_array( $do, [ 'read', 'unread', 'trash' ], true ) ) {
			$this->repo->set_status( [ $id ], $do );
		} elseif ( 'restore' === $do ) {
			$this->repo->set_status( [ $id ], 'read' );
		} else {
			$back = self::url();
		}

		wp_safe_redirect( $back );
		exit;
	}

	public function handle_export(): void {
		$this->guard( 'refraction_forms_export', false );

		$filters = $this->filters_from( wp_unslash( $_GET ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$rows = [];
		$labels = [];
		$meta_keys = [];
		$settings = Settings::get();
		$page = 1;

		do {
			$batch = $this->repo->query( $filters, 200, $page );
			$values = $this->repo->get_values_for( array_map( fn( $r ) => (int) $r['id'], $batch ) );

			foreach ( $batch as $row ) {
				$cells = [];

				foreach ( $values[ (int) $row['id'] ] ?? [] as $field_id => $value ) {
					if ( 'password' === $value['field_type'] ) {
						continue;
					}

					$labels[ $field_id ] = $labels[ $field_id ] ?? $value['field_label'];
					$cells[ $field_id ] = 'file' === $value['field_type'] ? (string) ( json_decode( $value['value'], true )['name'] ?? '' ) : $value['value'];
				}

				$rows[] = [ 'row' => $row, 'cells' => $cells ];
			}

			++$page;
		} while ( 200 === count( $batch ) && $page < 1000 );

		$extra = [];

		if ( $settings['store_ip'] ) {
			$extra[] = 'ip';
		}

		if ( $settings['store_user_agent'] ) {
			$extra[] = 'user_agent';
		}

		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="refraction-submissions-' . gmdate( 'Ymd-His' ) . '.csv"' );
		header( 'X-Content-Type-Options: nosniff' );

		echo "\xEF\xBB\xBF"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo Csv::line( array_merge( [ 'ID', 'Form', 'Status', 'Date (UTC)', 'Page URL' ], array_map( fn( $k ) => 'ip' === $k ? 'IP' : 'User agent', $extra ), array_values( $labels ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		foreach ( $rows as $item ) {
			$row = $item['row'];
			$line = [ $row['id'], $row['form_name'], $row['status'], $row['created_gmt'], $row['page_url'] ];

			foreach ( $extra as $key ) {
				$line[] = $row[ $key ];
			}

			foreach ( array_keys( $labels ) as $field_id ) {
				$line[] = $item['cells'][ $field_id ] ?? '';
			}

			echo Csv::line( $line ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		exit;
	}

	public function handle_download(): void {
		$this->guard( 'refraction_forms_download', false );

		$value = $this->repo->get_value_row( isset( $_GET['value'] ) ? absint( $_GET['value'] ) : 0 );
		$data = $value && 'file' === $value['field_type'] ? json_decode( $value['value'], true ) : null;
		$path = is_array($data) && ! empty( $data['path'] ) ? Upload_Store::resolve( (string) $data['path'] ) : '';

		if ( '' === $path ) {
			wp_die( esc_html__( 'File not found.', 'refraction' ), 404 );
		}

		$name = Upload_Policy::safe_name( (string) ( $data['name'] ?? 'file' ) );

		nocache_headers();
		header( 'Content-Type: application/octet-stream' );
		header( 'Content-Disposition: attachment; filename="' . $name . '"; filename*=UTF-8\'\'' . rawurlencode( $name ) );
		header( 'Content-Length: ' . filesize( $path ) );
		header( 'X-Content-Type-Options: nosniff' );
		header( "Content-Security-Policy: default-src 'none'; sandbox" );
		readfile( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
		exit;
	}

	public function handle_settings(): void {
		$this->guard( 'refraction_forms_settings', true );

		$raw = isset( $_POST['settings'] ) && is_array( $_POST['settings'] ) ? wp_unslash( $_POST['settings'] ) : []; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$settings = Settings::sanitize( $raw );
		update_option( Settings::OPTION, $settings, false );
		Module::instance()->schedule_purge();

		if ( $settings['retention_days'] > 0 ) {
			$this->repo->purge_older_than( $settings['retention_days'] );
		}

		wp_safe_redirect( self::url( [ 'tab' => 'settings', 'notice' => 'saved' ] ) );
		exit;
	}

	// ------------------------------------------------------------------ views

	public function render(): void {
		if ( ! current_user_can( Module::capability() ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to access this page.', 'refraction' ), 403 );
		}

		Schema::maybe_upgrade();

		$tab = isset( $_GET['tab'] ) && 'settings' === $_GET['tab'] ? 'settings' : 'list'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$view = isset( $_GET['view'] ) ? absint( $_GET['view'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		echo '<div class="wrap rf-admin"><h1 class="wp-heading-inline">' . esc_html__( 'Submissions', 'refraction' ) . '</h1>';
		echo '<nav class="nav-tab-wrapper rf-admin__tabs" aria-label="' . esc_attr__( 'Submissions sections', 'refraction' ) . '">';
		printf( '<a class="nav-tab%s" href="%s">%s</a>', 'list' === $tab ? ' nav-tab-active' : '', esc_url( self::url() ), esc_html__( 'Submissions', 'refraction' ) );
		printf( '<a class="nav-tab%s" href="%s">%s</a>', 'settings' === $tab ? ' nav-tab-active' : '', esc_url( self::url( [ 'tab' => 'settings' ] ) ), esc_html__( 'Settings', 'refraction' ) );
		echo '</nav>';

		$this->render_notice();

		if ( 'settings' === $tab ) {
			$this->render_settings();
		} elseif ( $view ) {
			$this->render_single( $view );
		} else {
			$this->render_list();
		}

		echo '</div>';
	}

	private function render_notice(): void {
		$notice = isset( $_GET['notice'] ) ? sanitize_key( $_GET['notice'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$count = isset( $_GET['count'] ) ? absint( $_GET['count'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( 'bulk' === $notice ) {
			/* translators: %d: number of submissions. */
			$message = sprintf( _n( '%d submission updated.', '%d submissions updated.', $count, 'refraction' ), $count );
		} elseif ( 'saved' === $notice ) {
			$message = __( 'Settings saved.', 'refraction' );
		} elseif ( 'none' === $notice ) {
			$message = __( 'Nothing was selected.', 'refraction' );
		} else {
			return;
		}

		echo '<div class="notice notice-success is-dismissible" role="status"><p>' . esc_html( $message ) . '</p></div>';
	}

	private function render_list(): void {
		$filters = $this->filters_from( wp_unslash( $_GET ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$page = isset( $_GET['paged'] ) ? max( 1, absint( $_GET['paged'] ) ) : 1; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$total = $this->repo->count( $filters );
		$rows = $this->repo->query( $filters, self::PER_PAGE, $page );
		$values = $this->repo->get_values_for( array_map( fn( $r ) => (int) $r['id'], $rows ) );
		$counts = $this->repo->counts_by_status( array_diff_key( $filters, [ 'status' => 1 ] ) );
		$forms = $this->repo->get_forms();
		$mask = Settings::get()['mask_emails'];
		$keep = array_filter( $filters, fn( $v, $k ) => 'status' !== $k && '' !== $v, ARRAY_FILTER_USE_BOTH );

		echo '<ul class="subsubsub">';
		$links = [];

		foreach ( [ 'all' => __( 'All', 'refraction' ), 'unread' => __( 'Unread', 'refraction' ), 'read' => __( 'Read', 'refraction' ), 'trash' => __( 'Trash', 'refraction' ) ] as $key => $label ) {
			$links[] = sprintf( '<li><a href="%s"%s>%s <span class="count">(%d)</span></a>', esc_url( self::url( array_merge( $keep, [ 'status' => $key ] ) ) ), $filters['status'] === $key ? ' class="current" aria-current="page"' : '', esc_html( $label ), (int) $counts[ $key ] );
		}

		echo implode( ' | </li>', $links ) . '</li></ul>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		echo '<form method="get" class="rf-admin__filters"><input type="hidden" name="page" value="' . esc_attr( self::SLUG ) . '"><input type="hidden" name="status" value="' . esc_attr( $filters['status'] ) . '">';
		echo '<label class="screen-reader-text" for="rf-form-filter">' . esc_html__( 'Form', 'refraction' ) . '</label><select name="form_key" id="rf-form-filter"><option value="">' . esc_html__( 'All forms', 'refraction' ) . '</option>';

		foreach ( $forms as $key => $name ) {
			printf( '<option value="%s"%s>%s</option>', esc_attr( $key ), selected( $filters['form_key'], $key, false ), esc_html( $name ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		echo '</select> ';
		printf( '<label>%s <input type="date" name="date_from" value="%s"></label> <label>%s <input type="date" name="date_to" value="%s"></label> ', esc_html__( 'From', 'refraction' ), esc_attr( $filters['date_from'] ), esc_html__( 'To', 'refraction' ), esc_attr( $filters['date_to'] ) );
		printf( '<label class="screen-reader-text" for="rf-search">%s</label><input type="search" id="rf-search" name="s" value="%s" placeholder="%s"> ', esc_html__( 'Search submissions', 'refraction' ), esc_attr( $filters['search'] ), esc_attr__( 'Search…', 'refraction' ) );
		echo '<button class="button">' . esc_html__( 'Filter', 'refraction' ) . '</button> ';
		$export = wp_nonce_url( add_query_arg( array_merge( [ 'action' => 'refraction_forms_export' ], $filters ), admin_url( 'admin-post.php' ) ), 'refraction_forms_export' );
		echo '<a class="button" href="' . esc_url( $export ) . '">' . esc_html__( 'Export CSV', 'refraction' ) . '</a></form>';

		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
		wp_nonce_field( 'refraction_forms_bulk' );
		echo '<input type="hidden" name="action" value="refraction_forms_bulk">';
		echo '<div class="tablenav top"><label class="screen-reader-text" for="rf-bulk">' . esc_html__( 'Bulk action', 'refraction' ) . '</label><select name="bulk_action" id="rf-bulk"><option value="">' . esc_html__( 'Bulk actions', 'refraction' ) . '</option>';
		$bulk = 'trash' === $filters['status']
			? [ 'restore' => __( 'Restore', 'refraction' ), 'delete' => __( 'Delete permanently', 'refraction' ) ]
			: [ 'read' => __( 'Mark as read', 'refraction' ), 'unread' => __( 'Mark as unread', 'refraction' ), 'trash' => __( 'Move to trash', 'refraction' ), 'delete' => __( 'Delete permanently', 'refraction' ) ];

		foreach ( $bulk as $key => $label ) {
			printf( '<option value="%s">%s</option>', esc_attr( $key ), esc_html( $label ) );
		}

		echo '</select> <button class="button action">' . esc_html__( 'Apply', 'refraction' ) . '</button>';
		/* translators: %s: number of submissions. */
		echo '<span class="displaying-num">' . esc_html( sprintf( _n( '%s item', '%s items', $total, 'refraction' ), number_format_i18n( $total ) ) ) . '</span></div>';

		echo '<table class="wp-list-table widefat fixed striped rf-admin__table"><thead><tr><td class="check-column"><input type="checkbox" onclick="document.querySelectorAll(\'.rf-admin__table tbody input[type=checkbox]\').forEach(function(c){c.checked=this.checked}.bind(this))" aria-label="' . esc_attr__( 'Select all', 'refraction' ) . '"></td>';
		echo '<th>' . esc_html__( 'ID', 'refraction' ) . '</th><th>' . esc_html__( 'Form', 'refraction' ) . '</th><th>' . esc_html__( 'Summary', 'refraction' ) . '</th><th>' . esc_html__( 'Date', 'refraction' ) . '</th><th>' . esc_html__( 'Status', 'refraction' ) . '</th></tr></thead><tbody>';

		if ( ! $rows ) {
			echo '<tr><td colspan="6">' . esc_html__( 'No submissions found.', 'refraction' ) . '</td></tr>';
		}

		foreach ( $rows as $row ) {
			$id = (int) $row['id'];
			$summary = [];

			foreach ( array_slice( $values[ $id ] ?? [], 0, 3 ) as $v ) {
				$text = 'file' === $v['field_type'] ? (string) ( json_decode( $v['value'], true )['name'] ?? '' ) : $v['value'];
				$text = $mask && 'email' === $v['field_type'] ? self::mask_email( $text ) : $text;
				$summary[] = '<strong>' . esc_html( $v['field_label'] ) . ':</strong> ' . esc_html( mb_strimwidth( preg_replace( '/\s+/', ' ', $text ), 0, 60, '…' ) );
			}

			$unread = 'unread' === $row['status'];
			printf(
				'<tr%1$s><th scope="row" class="check-column"><input type="checkbox" name="ids[]" value="%2$d" aria-label="%3$s"></th><td><a href="%4$s">#%2$d</a></td><td>%5$s</td><td>%6$s</td><td>%7$s</td><td>%8$s</td></tr>',
				$unread ? ' class="rf-admin__unread"' : '',
				$id,
				/* translators: %d: submission number. */
				esc_attr( sprintf( __( 'Select submission %d', 'refraction' ), $id ) ),
				esc_url( self::url( [ 'view' => $id ] ) ),
				esc_html( $row['form_name'] ),
				implode( '<br>', $summary ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				esc_html( get_date_from_gmt( $row['created_gmt'], 'Y-m-d H:i' ) ),
				esc_html( $unread ? __( 'Unread', 'refraction' ) : ( 'trash' === $row['status'] ? __( 'Trash', 'refraction' ) : __( 'Read', 'refraction' ) ) )
			);
		}

		echo '</tbody></table></form>';

		$pages = (int) ceil( $total / self::PER_PAGE );

		if ( $pages > 1 ) {
			echo '<div class="tablenav bottom"><div class="tablenav-pages">' . wp_kses_post( (string) paginate_links( [ 'base' => add_query_arg( 'paged', '%#%' ), 'format' => '', 'current' => $page, 'total' => $pages ] ) ) . '</div></div>';
		}
	}

	public static function mask_email( string $email ): string {
		$parts = explode( '@', $email, 2 );

		return 2 === count( $parts ) && '' !== $parts[0] ? mb_substr( $parts[0], 0, 1 ) . '***@' . $parts[1] : $email;
	}

	private function render_single( int $id ): void {
		$row = $this->repo->get( $id );

		if ( ! $row ) {
			echo '<p>' . esc_html__( 'Submission not found.', 'refraction' ) . '</p><p><a href="' . esc_url( self::url() ) . '">' . esc_html__( 'Back to the list', 'refraction' ) . '</a></p>';

			return;
		}

		if ( 'unread' === $row['status'] ) {
			$this->repo->set_status( [ $id ], 'read' );
			$row['status'] = 'read';
		}

		$single = fn( string $do ) => wp_nonce_url( add_query_arg( [ 'action' => 'refraction_forms_single', 'do' => $do, 'id' => $id ], admin_url( 'admin-post.php' ) ), 'refraction_forms_single' );

		echo '<p><a href="' . esc_url( self::url() ) . '">&larr; ' . esc_html__( 'Back to the list', 'refraction' ) . '</a></p>';
		/* translators: %d: submission number. */
		echo '<h2>' . esc_html( sprintf( __( 'Submission #%d', 'refraction' ), $id ) ) . '</h2>';

		echo '<table class="widefat striped rf-admin__single"><tbody>';
		$meta = [
			__( 'Form', 'refraction' ) => $row['form_name'],
			__( 'Date', 'refraction' ) => get_date_from_gmt( $row['created_gmt'], 'Y-m-d H:i:s' ) . ' (' . wp_timezone_string() . ')',
			__( 'Status', 'refraction' ) => $row['status'],
			__( 'Page', 'refraction' ) => $row['page_url'],
		];

		if ( '' !== $row['ip'] ) {
			$meta[ __( 'IP address', 'refraction' ) ] = $row['ip'];
		}

		if ( '' !== $row['user_agent'] ) {
			$meta[ __( 'Browser', 'refraction' ) ] = $row['user_agent'];
		}

		if ( (int) $row['user_id'] ) {
			$user = get_userdata( (int) $row['user_id'] );
			$meta[ __( 'User', 'refraction' ) ] = $user ? $user->user_login : '#' . $row['user_id'];
		}

		foreach ( $meta as $label => $value ) {
			echo '<tr><th scope="row">' . esc_html( $label ) . '</th><td>' . esc_html( (string) $value ) . '</td></tr>';
		}

		echo '</tbody></table><h3>' . esc_html__( 'Values', 'refraction' ) . '</h3><table class="widefat striped rf-admin__values"><tbody>';

		foreach ( $this->repo->get_values( $id ) as $value ) {
			echo '<tr><th scope="row">' . esc_html( $value['field_label'] ) . '<br><code>' . esc_html( $value['field_id'] ) . '</code></th><td>';

			if ( 'file' === $value['field_type'] ) {
				$file = json_decode( $value['value'], true );
				$url = wp_nonce_url( add_query_arg( [ 'action' => 'refraction_forms_download', 'value' => (int) $value['id'] ], admin_url( 'admin-post.php' ) ), 'refraction_forms_download' );
				echo '<a href="' . esc_url( $url ) . '">' . esc_html( (string) ( $file['name'] ?? __( 'File', 'refraction' ) ) ) . '</a> (' . esc_html( size_format( (int) ( $file['size'] ?? 0 ) ) ) . ')';
			} else {
				echo nl2br( esc_html( $value['value'] ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</td></tr>';
		}

		echo '</tbody></table><h3>' . esc_html__( 'Action log', 'refraction' ) . '</h3><table class="widefat striped rf-admin__log"><thead><tr><th>' . esc_html__( 'Action', 'refraction' ) . '</th><th>' . esc_html__( 'Result', 'refraction' ) . '</th><th>' . esc_html__( 'Details', 'refraction' ) . '</th><th>' . esc_html__( 'Time (UTC)', 'refraction' ) . '</th></tr></thead><tbody>';
		$log = $this->repo->get_log( $id );

		if ( ! $log ) {
			echo '<tr><td colspan="4">' . esc_html__( 'No actions were logged.', 'refraction' ) . '</td></tr>';
		}

		foreach ( $log as $entry ) {
			printf( '<tr><td>%s</td><td class="rf-admin__log-%s">%s</td><td>%s</td><td>%s</td></tr>', esc_html( $entry['action'] ), esc_attr( $entry['status'] ), esc_html( $entry['status'] ), esc_html( $entry['message'] ), esc_html( $entry['created_gmt'] ) );
		}

		echo '</tbody></table><p class="rf-admin__single-actions">';

		if ( 'trash' === $row['status'] ) {
			echo '<a class="button" href="' . esc_url( $single( 'restore' ) ) . '">' . esc_html__( 'Restore', 'refraction' ) . '</a> ';
		} else {
			echo '<a class="button" href="' . esc_url( $single( 'unread' ) ) . '">' . esc_html__( 'Mark as unread', 'refraction' ) . '</a> <a class="button" href="' . esc_url( $single( 'trash' ) ) . '">' . esc_html__( 'Move to trash', 'refraction' ) . '</a> ';
		}

		echo '<a class="button button-link-delete" href="' . esc_url( $single( 'delete' ) ) . '" onclick="return confirm(\'' . esc_js( __( 'Delete this submission and its files permanently?', 'refraction' ) ) . '\')">' . esc_html__( 'Delete permanently', 'refraction' ) . '</a></p>';
	}

	private function render_settings(): void {
		$s = Settings::get();

		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" class="rf-admin__settings">';
		wp_nonce_field( 'refraction_forms_settings' );
		echo '<input type="hidden" name="action" value="refraction_forms_settings">';
		echo '<h2>' . esc_html__( 'Privacy and retention', 'refraction' ) . '</h2><table class="form-table" role="presentation"><tbody>';
		printf( '<tr><th scope="row"><label for="rf-ret">%s</label></th><td><input type="number" min="0" max="3650" id="rf-ret" name="settings[retention_days]" value="%d" class="small-text"> <p class="description">%s</p></td></tr>', esc_html__( 'Delete submissions after (days)', 'refraction' ), (int) $s['retention_days'], esc_html__( '0 keeps submissions until you delete them. Older submissions and their files are removed daily and when you save this page.', 'refraction' ) );
		$this->checkbox_row( 'store_ip', __( 'Store IP addresses', 'refraction' ), $s['store_ip'], __( 'Off by default. Spam limits still work without storing the address.', 'refraction' ) );
		$this->checkbox_row( 'store_user_agent', __( 'Store browser details (user agent)', 'refraction' ), $s['store_user_agent'], '' );
		$this->checkbox_row( 'mask_emails', __( 'Hide email addresses in the list', 'refraction' ), $s['mask_emails'], __( 'Shows j***@example.com in the list. The single view and the export keep the full value.', 'refraction' ) );
		echo '</tbody></table><h2>' . esc_html__( 'Webhooks', 'refraction' ) . '</h2><table class="form-table" role="presentation"><tbody>';
		$this->checkbox_row( 'allow_private_webhooks', __( 'Allow webhooks to private network addresses', 'refraction' ), $s['allow_private_webhooks'], __( 'Off by default: webhooks to localhost and private IP ranges are refused. Turn on only for a service on your own network (for example a self-hosted automation tool).', 'refraction' ) );
		echo '</tbody></table><h2>' . esc_html__( 'Captcha (optional, external service)', 'refraction' ) . '</h2>';
		echo '<p class="description">' . esc_html__( 'Refraction does not load any captcha unless you pick a provider here, enter your own keys, and switch the captcha on in a form. When enabled, visitors load the provider\'s script and this site sends the visitor\'s response token to the provider to verify it. Read the provider\'s privacy policy first.', 'refraction' ) . '</p><table class="form-table" role="presentation"><tbody>';
		echo '<tr><th scope="row"><label for="rf-cap">' . esc_html__( 'Provider', 'refraction' ) . '</label></th><td><select id="rf-cap" name="settings[captcha_provider]"><option value="none">' . esc_html__( 'None', 'refraction' ) . '</option>';

		foreach ( Captcha::PROVIDERS as $key => $provider ) {
			printf( '<option value="%s"%s>%s</option>', esc_attr( $key ), selected( $s['captcha_provider'], $key, false ), esc_html( $provider['label'] ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		echo '</select></td></tr>';
		printf( '<tr><th scope="row"><label for="rf-sk">%s</label></th><td><input type="text" id="rf-sk" class="regular-text" name="settings[captcha_site_key]" value="%s" autocomplete="off"></td></tr>', esc_html__( 'Site key', 'refraction' ), esc_attr( $s['captcha_site_key'] ) );
		printf( '<tr><th scope="row"><label for="rf-sec">%s</label></th><td><input type="password" id="rf-sec" class="regular-text" name="settings[captcha_secret_key]" value="%s" autocomplete="new-password"></td></tr>', esc_html__( 'Secret key', 'refraction' ), esc_attr( $s['captcha_secret_key'] ) );
		echo '</tbody></table>';
		submit_button( __( 'Save settings', 'refraction' ) );
		echo '</form>';
	}

	private function checkbox_row( string $key, string $label, bool $checked, string $help ): void {
		printf(
			'<tr><th scope="row">%1$s</th><td><label><input type="checkbox" name="settings[%2$s]" value="1"%3$s> %4$s</label>%5$s</td></tr>',
			esc_html( $label ),
			esc_attr( $key ),
			checked( $checked, true, false ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			esc_html__( 'Enabled', 'refraction' ),
			'' !== $help ? '<p class="description">' . esc_html( $help ) . '</p>' : '' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		);
	}
}
