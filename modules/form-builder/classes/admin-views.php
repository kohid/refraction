<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Core\Utils\Icons;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** The Builder screens: overview, new collection, design (fields and statuses), records table and record form. */
class Admin_Views {

	const PER_PAGE = 20;

	private Collections $collections;
	private Records $records;
	/** @var callable|null descriptor-aware download URL builder: ( slug, record id, file ) => url */
	private $download;

	public function __construct( Collections $collections, Records $records, ?callable $download = null ) {
		$this->collections = $collections;
		$this->records = $records;
		$this->download = $download;
	}

	private function url( array $args = [] ): string {
		return Admin_Page::url( $args );
	}

	private function icon( string $name, int $size = 20 ): string {
		return Icons::svg( $name, [ 'size' => $size ] );
	}

	// ---------------------------------------------------------------- shared pieces

	private function open( string $title, string $subtitle = '', array $crumbs = [], string $toolbar = '' ): void {
		echo '<div class="wrap rfb-wrap">';
		echo '<div class="rfb-page-head"><div>';

		if ( $crumbs ) {
			echo '<nav class="rfb-crumbs" aria-label="' . esc_attr__( 'Breadcrumb', 'refraction' ) . '">';

			foreach ( $crumbs as $label => $href ) {
				echo '<a href="' . esc_url( $href ) . '">' . esc_html( $label ) . '</a><span aria-hidden="true">/</span>';
			}

			echo '<span class="rfb-crumb-current">' . esc_html( $title ) . '</span></nav>';
		}

		echo '<h1 class="rfb-title">' . esc_html( $title ) . '</h1>';

		if ( '' !== $subtitle ) {
			echo '<p class="rfb-subtitle">' . esc_html( $subtitle ) . '</p>';
		}

		echo '</div>';

		if ( '' !== $toolbar ) {
			echo '<div class="rfb-toolbar">' . $toolbar . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts by the callers.
		}

		echo '</div><hr class="wp-header-end">';
		$this->notice();
	}

	private function close(): void {
		echo '</div>';
	}

	private function notice(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$key = isset( $_GET['done'] ) ? sanitize_key( wp_unslash( $_GET['done'] ) ) : '';
		$count = isset( $_GET['count'] ) ? absint( $_GET['count'] ) : 0;
		// phpcs:enable
		$messages = [
			'created' => [ 'success', __( 'Collection created. Adjust the fields and statuses, then save.', 'refraction' ) ],
			'saved' => [ 'success', __( 'Collection saved.', 'refraction' ) ],
			'invalid' => [ 'error', __( 'The collection needs a name.', 'refraction' ) ],
			'confirm' => [ 'error', __( 'Nothing was deleted: the name you typed did not match.', 'refraction' ) ],
			'collection-deleted' => [ 'success', __( 'Collection and its records deleted.', 'refraction' ) ],
			'record-saved' => [ 'success', __( 'Record saved.', 'refraction' ) ],
			'record-failed' => [ 'error', __( 'The record could not be saved.', 'refraction' ) ],
			'records-deleted' => [ 'success', sprintf( /* translators: %d: number of records. */ _n( '%d record deleted.', '%d records deleted.', $count, 'refraction' ), $count ) ],
			'status-changed' => [ 'success', __( 'Status updated.', 'refraction' ) ],
			'errors' => [ 'error', __( 'Please fix the highlighted fields.', 'refraction' ) ],
		];

		if ( isset( $messages[ $key ] ) ) {
			echo '<div class="rfb-alert rfb-alert-' . esc_attr( $messages[ $key ][0] ) . '" role="status">' . esc_html( $messages[ $key ][1] ) . '</div>';
		}
	}

	private function button( string $label, string $href, string $style = 'primary', string $icon = '' ): string {
		return '<a class="rfb-btn rfb-btn-' . esc_attr( $style ) . '" href="' . esc_url( $href ) . '">' . $this->icon( $icon, 18 ) . esc_html( $label ) . '</a>';
	}

	private function badge( array $status ): string {
		return '<span class="rfb-badge rfb-badge-light-' . esc_attr( $status['color'] ) . '">' . esc_html( $status['label'] ) . '</span>';
	}

	// ---------------------------------------------------------------- overview and new

	public function render_overview(): void {
		$all = $this->collections->all();
		$this->open(
			__( 'Builder', 'refraction' ),
			__( 'Design your own forms and tables for bookings, listings, orders or anything you keep records of.', 'refraction' ),
			[],
			$this->button( __( 'New collection', 'refraction' ), $this->url( [ 'view' => 'new' ] ), 'primary', 'add' )
		);

		if ( ! $all ) {
			echo '<div class="rfb-card rfb-empty"><div class="rfb-card-body">' . $this->icon( 'layers', 40 ) . '<h2>' . esc_html__( 'Create your first collection', 'refraction' ) . '</h2><p>' . esc_html__( 'A collection is a set of records with the fields you choose, a status workflow, an admin table, and optionally a public form or list. Start from a ready-made design or from scratch.', 'refraction' ) . '</p>' . $this->button( __( 'Choose a starting point', 'refraction' ), $this->url( [ 'view' => 'new' ] ), 'primary', 'add' ) . '</div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			$this->close();
			return;
		}

		echo '<div class="rfb-grid">';

		foreach ( $all as $slug => $definition ) {
			$counts = $this->records->counts( $definition );
			echo '<div class="rfb-card rfb-collection"><div class="rfb-card-body">';
			echo '<div class="rfb-collection-head"><span class="rfb-symbol rfb-symbol-light-primary">' . $this->icon( $definition['icon'], 24 ) . '</span><div><h2><a href="' . esc_url( $this->url( [ 'view' => 'records', 'collection' => $slug ] ) ) . '">' . esc_html( $definition['label'] ) . '</a></h2>';
			echo '<p>' . esc_html( $definition['description'] ) . '</p></div></div>';
			echo '<div class="rfb-stat"><strong>' . esc_html( number_format_i18n( $counts['all'] ) ) . '</strong><span>' . esc_html__( 'records', 'refraction' ) . '</span></div>';
			echo '<div class="rfb-chips">';

			foreach ( $definition['statuses'] as $status ) {
				echo '<span class="rfb-badge rfb-badge-light-' . esc_attr( $status['color'] ) . '">' . esc_html( $status['label'] ) . ' · ' . esc_html( (string) ( $counts[ $status['key'] ] ?? 0 ) ) . '</span>';
			}

			echo '</div><div class="rfb-actions">';
			echo $this->button( __( 'Open records', 'refraction' ), $this->url( [ 'view' => 'records', 'collection' => $slug ] ), 'primary' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo $this->button( __( 'Edit design', 'refraction' ), $this->url( [ 'view' => 'design', 'collection' => $slug ] ), 'light', 'tune' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '</div></div></div>';
		}

		echo '</div>';
		$this->close();
	}

	public function render_new(): void {
		$this->open( __( 'New collection', 'refraction' ), __( 'Pick a starting point. Everything in it can be changed afterwards.', 'refraction' ), [ __( 'Builder', 'refraction' ) => $this->url() ] );
		echo '<div class="rfb-grid">';

		foreach ( Presets::list() as $key => $preset ) {
			echo '<form class="rfb-card rfb-collection" method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><div class="rfb-card-body">';
			echo '<input type="hidden" name="action" value="' . esc_attr( Admin_Page::ACTION_CREATE ) . '"><input type="hidden" name="preset" value="' . esc_attr( $key ) . '">';
			wp_nonce_field( Admin_Page::ACTION_CREATE );
			echo '<div class="rfb-collection-head"><span class="rfb-symbol rfb-symbol-light-primary">' . $this->icon( $preset['icon'], 24 ) . '</span><div><h2>' . esc_html( 'blank' === $key ? __( 'Start from scratch', 'refraction' ) : $preset['label'] ) . '</h2><p>' . esc_html( $preset['description'] ) . '</p></div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<div class="rfb-actions"><button type="submit" class="rfb-btn rfb-btn-primary">' . esc_html__( 'Use this', 'refraction' ) . '</button></div>';
			echo '</div></form>';
		}

		echo '</div>';
		$this->close();
	}

	// ---------------------------------------------------------------- design

	public function render_design( array $definition ): void {
		$slug = $definition['slug'];
		$this->open(
			/* translators: %s: collection name. */
			sprintf( __( 'Design: %s', 'refraction' ), $definition['label'] ),
			__( 'Drag fields onto the form, set how they look and behave, and choose what happens on submit.', 'refraction' ),
			[ __( 'Builder', 'refraction' ) => $this->url(), $definition['label'] => $this->url( [ 'view' => 'records', 'collection' => $slug ] ) ],
			$this->button( __( 'View records', 'refraction' ), $this->url( [ 'view' => 'records', 'collection' => $slug ] ), 'light', 'visibility' )
		);

		echo '<form method="post" class="rfb-design" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" id="rfb-design">';
		echo '<input type="hidden" name="action" value="' . esc_attr( Admin_Page::ACTION_SAVE_COLLECTION ) . '"><input type="hidden" name="collection" value="' . esc_attr( $slug ) . '"><input type="hidden" name="design" id="rfb-design-json" value="">';
		wp_nonce_field( Admin_Page::ACTION_SAVE_COLLECTION );
		echo '<div id="rfb-builder" data-design="' . esc_attr( (string) wp_json_encode( $this->with_previews( $definition ) ) ) . '" data-shortcode-form="' . esc_attr( '[refraction_form collection="' . $slug . '"]' ) . '" data-shortcode-list="' . esc_attr( '[refraction_records collection="' . $slug . '" status="published" view="cards"]' ) . '"></div>';
		echo '<noscript><div class="rfb-alert rfb-alert-warning">' . esc_html__( 'The form designer needs JavaScript. Please turn it on for this page.', 'refraction' ) . '</div></noscript>';
		echo '</form>';

		// Danger zone.
		echo '<form method="post" class="rfb-card rfb-danger" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><div class="rfb-card-header"><div><h2>' . esc_html__( 'Delete this collection', 'refraction' ) . '</h2><p>' . esc_html__( 'This permanently deletes the collection, every record in it and its uploaded files. It cannot be undone.', 'refraction' ) . '</p></div></div><div class="rfb-card-body">';
		echo '<input type="hidden" name="action" value="' . esc_attr( Admin_Page::ACTION_DELETE_COLLECTION ) . '"><input type="hidden" name="collection" value="' . esc_attr( $slug ) . '">';
		wp_nonce_field( Admin_Page::ACTION_DELETE_COLLECTION );
		echo '<div class="rfb-field"><label class="rfb-label" for="rfb-confirm">' . esc_html( sprintf( /* translators: %s: collection name. */ __( 'Type "%s" to confirm', 'refraction' ), $definition['label'] ) ) . '</label><input class="rfb-input" id="rfb-confirm" name="confirm" autocomplete="off"></div>';
		echo '<button type="submit" class="rfb-btn rfb-btn-danger">' . esc_html__( 'Delete collection and records', 'refraction' ) . '</button></div></form>';

		$this->close();
	}

	/** Adds a preview address to every Image block so the designer can show the picture (never saved). */
	private function with_previews( array $definition ): array {
		$walk = function ( array $fields ) use ( &$walk ): array {
			foreach ( $fields as $i => $field ) {
				// An empty style must reach the designer as {} (a JSON object), not [] (a list).
				$fields[ $i ]['style'] = (object) $field['style'];

				if ( 'image' === $field['type'] && $field['image_id'] ) {
					$fields[ $i ]['image_url'] = (string) wp_get_attachment_image_url( $field['image_id'], 'medium' );
				}

				if ( $field['children'] ) {
					$fields[ $i ]['children'] = $walk( $field['children'] );
				}
			}

			return $fields;
		};
		$definition['fields'] = $walk( $definition['fields'] );

		return $definition;
	}

	public static function icon_choices(): array {
		return [
			'grid-view' => __( 'Grid', 'refraction' ),
			'schedule' => __( 'Clock (bookings)', 'refraction' ),
			'web' => __( 'Window (listings)', 'refraction' ),
			'shopping-bag' => __( 'Bag (orders)', 'refraction' ),
			'shopping-cart' => __( 'Cart', 'refraction' ),
			'person' => __( 'Person', 'refraction' ),
			'star' => __( 'Star', 'refraction' ),
			'layers' => __( 'Layers', 'refraction' ),
			'interests' => __( 'Shapes', 'refraction' ),
		];
	}

	public static function color_names(): array {
		return [
			'primary' => __( 'Blue', 'refraction' ),
			'success' => __( 'Green', 'refraction' ),
			'warning' => __( 'Yellow', 'refraction' ),
			'danger' => __( 'Red', 'refraction' ),
			'info' => __( 'Purple', 'refraction' ),
			'dark' => __( 'Dark', 'refraction' ),
			'secondary' => __( 'Gray', 'refraction' ),
		];
	}

	// ---------------------------------------------------------------- records table

	/** The table's current search, status, filters, sort and page, read from the query string and cleaned. */
	public function table_args(): array {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		$definition = $this->collections->get( isset( $_GET['collection'] ) ? Schema::slug( wp_unslash( $_GET['collection'] ) ) : '' );
		$args = [
			'search' => isset( $_GET['s'] ) ? Schema::text( wp_unslash( $_GET['s'] ), 100 ) : '',
			'status' => isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : '',
			'orderby' => isset( $_GET['orderby'] ) ? Schema::key( wp_unslash( $_GET['orderby'] ) ) : '',
			'order' => isset( $_GET['order'] ) && 'asc' === strtolower( sanitize_key( wp_unslash( $_GET['order'] ) ) ) ? 'asc' : 'desc',
			'page' => isset( $_GET['paged'] ) ? max( 1, absint( $_GET['paged'] ) ) : 1,
			'per_page' => self::PER_PAGE,
			'filters' => [],
		];

		foreach ( $definition ? Schema::value_fields( $definition ) : [] as $field ) {
			if ( $field['filter'] && isset( $_GET[ 'f_' . $field['key'] ] ) ) {
				$args['filters'][ $field['key'] ] = Schema::text( wp_unslash( $_GET[ 'f_' . $field['key'] ] ), 120 );
			}
		}
		// phpcs:enable

		return $args;
	}

	private function table_url( array $definition, array $args, array $override = [] ): string {
		$query = [ 'view' => 'records', 'collection' => $definition['slug'] ];

		foreach ( [ 's' => 'search', 'status' => 'status', 'orderby' => 'orderby', 'order' => 'order' ] as $param => $key ) {
			if ( '' !== (string) $args[ $key ] ) {
				$query[ $param ] = $args[ $key ];
			}
		}

		foreach ( $args['filters'] as $key => $value ) {
			if ( '' !== $value ) {
				$query[ 'f_' . $key ] = $value;
			}
		}

		return $this->url( array_filter( array_merge( $query, $override ), static function ( $value ) {
			return null !== $value && '' !== $value;
		} ) );
	}

	public function render_records( array $definition ): void {
		$slug = $definition['slug'];
		$args = $this->table_args();
		$result = $this->records->query( $definition, $args );
		$counts = $this->records->counts( $definition );
		$columns = array_values( array_filter( Schema::value_fields( $definition ), static function ( $field ) {
			return $field['in_table'];
		} ) );
		// No column chosen: show the record's title field, so a row is never blank.
		$columns = $columns ? $columns : array_values( array_filter( [ Schema::field( $definition, $definition['title_field'] ) ] ) );

		$toolbar = $this->button( __( 'Export CSV', 'refraction' ), wp_nonce_url( add_query_arg( array_merge( [ 'action' => Admin_Page::ACTION_EXPORT, 'collection' => $slug ], array_filter( [ 's' => $args['search'], 'status' => $args['status'] ] ) ), admin_url( 'admin-post.php' ) ), Admin_Page::ACTION_EXPORT ), 'light', 'download' )
			. $this->button( __( 'Edit design', 'refraction' ), $this->url( [ 'view' => 'design', 'collection' => $slug ] ), 'light', 'tune' )
			/* translators: %s: singular collection name. */
			. $this->button( sprintf( __( 'Add %s', 'refraction' ), $definition['singular'] ), $this->url( [ 'view' => 'record', 'collection' => $slug ] ), 'primary', 'add' );
		$this->open( $definition['label'], $definition['description'], [ __( 'Builder', 'refraction' ) => $this->url() ], $toolbar );

		echo '<div class="rfb-card">';

		// Status tabs and filters.
		echo '<div class="rfb-card-header rfb-card-header-wrap">';
		echo '<ul class="rfb-tabs" aria-label="' . esc_attr__( 'Filter by status', 'refraction' ) . '">';
		$tabs = [ '' => [ 'label' => __( 'All', 'refraction' ), 'count' => $counts['all'] ] ];

		foreach ( $definition['statuses'] as $status ) {
			$tabs[ $status['key'] ] = [ 'label' => $status['label'], 'count' => $counts[ $status['key'] ] ?? 0 ];
		}

		foreach ( $tabs as $key => $tab ) {
			$current = (string) $args['status'] === (string) $key;
			echo '<li><a class="rfb-tab' . ( $current ? ' is-active' : '' ) . '" href="' . esc_url( $this->table_url( $definition, $args, [ 'status' => $key, 'paged' => null ] ) ) . '"' . ( $current ? ' aria-current="page"' : '' ) . '>' . esc_html( $tab['label'] ) . ' <span class="rfb-count">' . esc_html( (string) $tab['count'] ) . '</span></a></li>';
		}

		echo '</ul>';
		echo '<form method="get" class="rfb-filters" role="search"><input type="hidden" name="page" value="' . esc_attr( Admin_Page::SLUG ) . '"><input type="hidden" name="view" value="records"><input type="hidden" name="collection" value="' . esc_attr( $slug ) . '">';

		if ( '' !== $args['status'] ) {
			echo '<input type="hidden" name="status" value="' . esc_attr( $args['status'] ) . '">';
		}

		echo '<label class="rfb-search"><span class="screen-reader-text">' . esc_html__( 'Search records', 'refraction' ) . '</span>' . $this->icon( 'search', 18 ) . '<input class="rfb-input" type="search" name="s" value="' . esc_attr( $args['search'] ) . '" placeholder="' . esc_attr__( 'Search...', 'refraction' ) . '"></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

		foreach ( Schema::value_fields( $definition ) as $field ) {
			if ( ! $field['filter'] ) {
				continue;
			}

			echo '<label><span class="screen-reader-text">' . esc_html( $field['label'] ) . '</span><select class="rfb-input" name="f_' . esc_attr( $field['key'] ) . '"><option value="">' . esc_html( $field['label'] ) . ': ' . esc_html__( 'All', 'refraction' ) . '</option>';

			foreach ( $field['options'] as $option ) {
				echo '<option value="' . esc_attr( $option['value'] ) . '"' . selected( $args['filters'][ $field['key'] ] ?? '', $option['value'], false ) . '>' . esc_html( $option['label'] ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</select></label>';
		}

		echo '<button type="submit" class="rfb-btn rfb-btn-light-primary">' . esc_html__( 'Apply', 'refraction' ) . '</button>';

		if ( '' !== $args['search'] || array_filter( $args['filters'] ) ) {
			echo '<a class="rfb-link" href="' . esc_url( $this->url( [ 'view' => 'records', 'collection' => $slug ] ) ) . '">' . esc_html__( 'Reset', 'refraction' ) . '</a>';
		}

		echo '</form></div>';

		if ( ! $result['items'] ) {
			echo '<div class="rfb-card-body rfb-empty-body">' . $this->icon( 'search', 36 ) . '<p>' . esc_html( $result['total'] || $counts['all'] ? __( 'No records match these filters.', 'refraction' ) : __( 'No records yet. Add the first one, or place the public form on a page.', 'refraction' ) ) . '</p></div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			$this->close();
			return;
		}

		// Bulk form wraps the table; the delete and status buttons read its checked rows.
		echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" id="rfb-bulk" data-status-action="' . esc_attr( Admin_Page::ACTION_STATUS ) . '" data-status-nonce="' . esc_attr( wp_create_nonce( Admin_Page::ACTION_STATUS ) ) . '">';
		echo '<input type="hidden" name="collection" value="' . esc_attr( $slug ) . '">';
		wp_nonce_field( Admin_Page::ACTION_DELETE_RECORDS );
		echo '<div class="rfb-bulkbar" hidden><span id="rfb-selected"></span>';
		echo '<select class="rfb-input" id="rfb-bulk-status" aria-label="' . esc_attr__( 'Change status to', 'refraction' ) . '"><option value="">' . esc_html__( 'Change status to...', 'refraction' ) . '</option>';

		foreach ( $definition['statuses'] as $status ) {
			echo '<option value="' . esc_attr( $status['key'] ) . '">' . esc_html( $status['label'] ) . '</option>';
		}

		echo '</select><button type="submit" class="rfb-btn rfb-btn-light-danger" name="action" value="' . esc_attr( Admin_Page::ACTION_DELETE_RECORDS ) . '" data-confirm="' . esc_attr__( 'Delete the selected records? This cannot be undone.', 'refraction' ) . '">' . esc_html__( 'Delete selected', 'refraction' ) . '</button></div>';

		echo '<div class="rfb-table-wrap"><table class="rfb-table"><thead><tr><th class="rfb-check-col"><input type="checkbox" id="rfb-all" aria-label="' . esc_attr__( 'Select all records', 'refraction' ) . '"></th>';

		foreach ( $columns as $index => $field ) {
			echo Schema::is_scalar_type( $field['type'] ) ? $this->sortable_header( $definition, $args, $field['key'], $field['label'] ) : '<th scope="col">' . esc_html( $field['label'] ) . '</th>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		echo $this->sortable_header( $definition, $args, 'status', __( 'Status', 'refraction' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo $this->sortable_header( $definition, $args, 'date', __( 'Created', 'refraction' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<th class="rfb-actions-col"><span class="screen-reader-text">' . esc_html__( 'Actions', 'refraction' ) . '</span></th></tr></thead><tbody>';

		foreach ( $result['items'] as $record ) {
			$edit = $this->url( [ 'view' => 'record', 'collection' => $slug, 'record' => $record['id'] ] );
			$status = Schema::status( $definition, $record['status'] ) ?? [ 'key' => $record['status'], 'label' => $record['status'], 'color' => 'secondary' ];

			echo '<tr><td class="rfb-check-col"><input type="checkbox" name="records[]" value="' . esc_attr( (string) $record['id'] ) . '" aria-label="' . esc_attr( $record['title'] ) . '"></td>';

			foreach ( $columns as $index => $field ) {
				$value = $record['values'][ $field['key'] ] ?? '';

				if ( 0 === $index ) {
					echo '<td><div class="rfb-user"><span class="rfb-symbol rfb-symbol-light-primary" aria-hidden="true">' . esc_html( Schema::initials( $record['title'] ) ) . '</span><div><a class="rfb-user-name" href="' . esc_url( $edit ) . '">' . Field_Renderer::cell( $field, $value, $definition['settings'] ) . '</a><span class="rfb-muted">#' . esc_html( (string) $record['id'] ) . '</span></div></div></td>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				} else {
					echo '<td>' . Field_Renderer::cell( $field, $value, $definition['settings'] ) . '</td>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				}
			}

			echo '<td>' . $this->badge( $status ) . '</td>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<td class="rfb-muted">' . esc_html( mysql2date( get_option( 'date_format' ), $record['created'] ) ) . '</td>';
			echo '<td class="rfb-actions-col"><a class="rfb-icon-btn" href="' . esc_url( $edit ) . '" aria-label="' . esc_attr( sprintf( /* translators: %s: record title. */ __( 'Edit %s', 'refraction' ), $record['title'] ) ) . '">' . $this->icon( 'edit' ) . '</a></td></tr>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		echo '</tbody></table></div></form>';

		// Footer: count and pagination.
		$from = ( $args['page'] - 1 ) * self::PER_PAGE + 1;
		$to = $from + count( $result['items'] ) - 1;
		echo '<div class="rfb-card-footer"><span class="rfb-muted">' . esc_html( sprintf( /* translators: 1: first row, 2: last row, 3: total. */ __( 'Showing %1$d to %2$d of %3$d', 'refraction' ), $from, $to, $result['total'] ) ) . '</span>';

		if ( $result['pages'] > 1 ) {
			echo '<nav class="rfb-pagination" aria-label="' . esc_attr__( 'Pagination', 'refraction' ) . '">';

			for ( $page = 1; $page <= $result['pages']; $page++ ) {
				if ( $result['pages'] > 9 && ! in_array( $page, [ 1, $result['pages'], $args['page'] - 1, $args['page'], $args['page'] + 1 ], true ) ) {
					continue;
				}

				echo '<a class="rfb-page' . ( $page === $args['page'] ? ' is-active' : '' ) . '" href="' . esc_url( $this->table_url( $definition, $args, [ 'paged' => $page > 1 ? $page : null ] ) ) . '"' . ( $page === $args['page'] ? ' aria-current="page"' : '' ) . '>' . (int) $page . '</a>';
			}

			echo '</nav>';
		}

		echo '</div></div>';
		$this->close();
	}

	private function sortable_header( array $definition, array $args, string $key, string $label ): string {
		$active = ( 'date' === $key && '' === $args['orderby'] ) || $args['orderby'] === $key;
		$next = $active && 'asc' === $args['order'] ? 'desc' : 'asc';
		$arrow = $active ? ( 'asc' === $args['order'] ? ' ▲' : ' ▼' ) : '';
		$aria = $active ? ( 'asc' === $args['order'] ? 'ascending' : 'descending' ) : 'none';

		return '<th scope="col" aria-sort="' . esc_attr( $aria ) . '"><a class="rfb-sort' . ( $active ? ' is-active' : '' ) . '" href="' . esc_url( $this->table_url( $definition, $args, [ 'orderby' => $key, 'order' => $next, 'paged' => null ] ) ) . '">' . esc_html( $label ) . '<span aria-hidden="true">' . esc_html( $arrow ) . '</span></a></th>';
	}

	// ---------------------------------------------------------------- record form

	public function render_record( array $definition, int $id ): void {
		$slug = $definition['slug'];
		$record = $id ? $this->records->get( $id, $slug ) : null;

		if ( $id && ! $record ) {
			wp_die( esc_html__( 'That record was not found.', 'refraction' ), 404 );
		}

		$values = $record ? $record['values'] : [];
		$status = $record ? $record['status'] : $definition['default_status'];
		$errors = [];
		$flash = get_transient( 'refraction_fb_form_' . get_current_user_id() );

		if ( is_array( $flash ) && (int) $flash['record'] === $id ) {
			$values = (array) $flash['values'];
			$errors = (array) $flash['errors'];
			$status = (string) $flash['status'];
			delete_transient( 'refraction_fb_form_' . get_current_user_id() );
		}

		// A new record starts from the field defaults; an edited one shows exactly what was saved.
		$blank = ! $id && ! $errors;
		$download = $this->download;
		$ctx = [
			'admin' => true,
			'type_styles' => $definition['type_styles'],
			'money' => $definition['settings'],
			'files' => $record ? $this->file_lists( $definition, $record['values'] ) : [],
			'file_url' => $download && $id ? static function ( array $file ) use ( $download, $slug, $id ) {
				return $download( $slug, $id, $file );
			} : null,
		];

		/* translators: %s: singular collection name. */
		$title = $id ? sprintf( __( 'Edit %s', 'refraction' ), $definition['singular'] ) : sprintf( __( 'Add %s', 'refraction' ), $definition['singular'] );
		$this->open( $title, $record ? $record['title'] : '', [ __( 'Builder', 'refraction' ) => $this->url(), $definition['label'] => $this->url( [ 'view' => 'records', 'collection' => $slug ] ) ] );

		$field_css = Field_Style::css( $definition, '#rfb-record-form' );
		echo '' !== $field_css ? '<style>' . $field_css . '</style>' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from validated colors, numbers and keywords only.
		echo '<form method="post" id="rfb-record-form" class="rfb-card rfb-form" enctype="multipart/form-data" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '" novalidate data-rfb-form data-rfb-money="' . esc_attr( (string) wp_json_encode( Money::js( Money::config( $definition['settings'] ) ) ) ) . '" data-rfb-i18n="' . esc_attr( (string) wp_json_encode( [ 'tooBig' => __( '%s is larger than the allowed size.', 'refraction' ), 'badType' => __( '%s is not an allowed file type.', 'refraction' ), 'tooMany' => __( 'You can choose at most %d files.', 'refraction' ), 'number' => __( 'Enter a number.', 'refraction' ), 'lowest' => __( 'The lowest allowed value is %s.', 'refraction' ), 'highest' => __( 'The highest allowed value is %s.', 'refraction' ) ] ) ) . '">';
		echo '<input type="hidden" name="action" value="' . esc_attr( Admin_Page::ACTION_SAVE_RECORD ) . '"><input type="hidden" name="collection" value="' . esc_attr( $slug ) . '"><input type="hidden" name="record" value="' . esc_attr( (string) $id ) . '">';
		wp_nonce_field( Admin_Page::ACTION_SAVE_RECORD );
		echo '<div class="rfb-card-body rfb-form-grid">';

		if ( $blank ) {
			Field_Renderer::render_fields( $definition['fields'], [], 'values', $errors, $ctx );
		} else {
			Field_Renderer::render_fields( $definition['fields'], $this->fill_gaps( $definition['fields'], $values ), 'values', $errors, $ctx );
		}

		echo '<div class="rfb-field rfb-w-half"><label class="rfb-label" for="rfb-status">' . esc_html__( 'Status', 'refraction' ) . '</label><select class="rfb-input" id="rfb-status" name="status">';

		foreach ( $definition['statuses'] as $option ) {
			echo '<option value="' . esc_attr( $option['key'] ) . '"' . selected( $status, $option['key'], false ) . '>' . esc_html( $option['label'] ) . '</option>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		echo '</select></div></div><div class="rfb-card-footer"><a class="rfb-btn rfb-btn-light" href="' . esc_url( $this->url( [ 'view' => 'records', 'collection' => $slug ] ) ) . '">' . esc_html__( 'Cancel', 'refraction' ) . '</a><button type="submit" class="rfb-btn rfb-btn-primary">' . esc_html__( 'Save', 'refraction' ) . '</button></div></form>';

		if ( $record ) {
			echo '<form method="post" class="rfb-inline-delete" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '"><input type="hidden" name="action" value="' . esc_attr( Admin_Page::ACTION_DELETE_RECORDS ) . '"><input type="hidden" name="collection" value="' . esc_attr( $slug ) . '"><input type="hidden" name="records[]" value="' . esc_attr( (string) $id ) . '">';
			wp_nonce_field( Admin_Page::ACTION_DELETE_RECORDS );
			echo '<button type="submit" class="rfb-btn rfb-btn-light-danger" data-confirm="' . esc_attr__( 'Delete this record? This cannot be undone.', 'refraction' ) . '">' . esc_html__( 'Delete record', 'refraction' ) . '</button></form>';
		}

		$this->close();
	}

	/**
	 * Saved values with an empty answer for every field that has none, so a checkbox the editor unticked stays unticked
	 * instead of falling back to its default.
	 */
	private function fill_gaps( array $fields, array $values ): array {
		foreach ( Schema::flat( $fields ) as $field ) {
			if ( ! Schema::has_value( $field['type'] ) || array_key_exists( $field['key'], $values ) ) {
				continue;
			}

			$values[ $field['key'] ] = in_array( $field['type'], [ 'checkbox', 'group', 'repeater', 'file', 'choice_set' ], true ) ? [] : '';
		}

		return $values;
	}

	/** Stored file descriptors by field path for the record form. */
	private function file_lists( array $definition, array $values ): array {
		$lists = [];

		foreach ( Uploads::fields( $definition ) as $path => $field ) {
			$node = $values;

			foreach ( explode( '.', $path ) as $step ) {
				$node = is_array( $node ) ? ( $node[ $step ] ?? [] ) : [];
			}

			$lists[ $path ] = is_array( $node ) ? $node : [];
		}

		return $lists;
	}
}
