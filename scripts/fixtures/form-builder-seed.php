<?php
// Seed helper for scripts/check-form-builder.mjs, run through `wp eval-file`. Action comes from the FB_ACTION env var.
use Refraction\Modules\FormBuilder\Classes\Collections;
use Refraction\Modules\FormBuilder\Classes\Records;
use Refraction\Modules\FormBuilder\Classes\Schema;

$action = getenv( 'FB_ACTION' );
$spec = json_decode( (string) getenv( 'FB_SPEC' ), true ) ?: [];
$collections = new Collections();
$records = new Records();
$out = [];

switch ( $action ) {
	case 'records': // Insert N generated records into a collection.
		$definition = $collections->get( $spec['collection'] );
		$ids = [];
		$services = array_column( Schema::field( $definition, 'service' )['options'] ?? [], 'value' );
		for ( $i = 1; $i <= (int) $spec['count']; $i++ ) {
			$values = $spec['values'] ?? [];
			if ( 'bookings' === $spec['collection'] ) {
				$values += [
					'guest_name' => 'Guest ' . str_pad( (string) $i, 2, '0', STR_PAD_LEFT ),
					'email' => 'guest' . $i . '@example.com',
					'service' => $services[ $i % count( $services ) ],
					'date' => gmdate( 'Y-m-d', strtotime( '+' . $i . ' days' ) ),
					'time' => '10:00',
					'guests' => (string) ( 1 + $i % 4 ),
				];
			}
			$check = Schema::validate( $definition, $values );
			$ids[] = $records->insert( $definition, $check['values'], $spec['status'] ?? $definition['default_status'] );
		}
		$out = [ 'ids' => $ids, 'errors' => $check['errors'] ?? [] ];
		break;

	case 'listing': // One listing record with explicit values and status.
		$definition = $collections->get( 'listings' );
		$check = Schema::validate( $definition, $spec['values'] );
		$out = [ 'id' => $records->insert( $definition, $check['values'], $spec['status'] ), 'errors' => $check['errors'] ];
		break;

	case 'page': // A published page with the given content.
		$id = wp_insert_post( [ 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $spec['title'], 'post_name' => $spec['slug'], 'post_content' => $spec['content'] ] );
		$out = [ 'id' => $id, 'url' => get_permalink( $id ) ];
		break;

	case 'user': // A user with a role.
		$id = username_exists( $spec['login'] ) ?: wp_create_user( $spec['login'], $spec['pass'], $spec['login'] . '@example.com' );
		( new WP_User( $id ) )->set_role( $spec['role'] );
		$out = [ 'id' => $id ];
		break;

	case 'definition': // The saved definition of a collection.
		$out = $collections->get( $spec['collection'] ) ?: [];
		break;

	case 'state': // Counts and a record by title.
		$slug = $spec['collection'];
		$definition = $collections->get( $slug );
		$out = [
			'exists' => (bool) $definition,
			'count' => $definition ? $records->count( $slug ) : 0,
			'total_posts' => (int) wp_count_posts( Records::POST_TYPE )->publish,
			'statuses' => $definition ? $records->counts( $definition ) : [],
			'latest' => $definition ? ( $records->query( $definition, [ 'per_page' => 1 ] )['items'][0] ?? null ) : null,
		];
		break;

	case 'limit': // Put a visitor over the hourly submission limit.
		$ip = $spec['ip'];
		set_transient( 'rfb_rate_' . substr( wp_hash( $ip ), 0, 20 ), 99, HOUR_IN_SECONDS );
		$out = [ 'ok' => true ];
		break;
}

echo wp_json_encode( $out );
