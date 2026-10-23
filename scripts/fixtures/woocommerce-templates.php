<?php
/**
 * Test fixture for scripts/check-woocommerce.mjs (run with `wp eval-file`, test sites only).
 *
 * Env WOO_ACTION:
 *   templates  WOO_SPEC = JSON list of { key, type, rules, widgets?, preview?, status?, age? }; creates Refraction
 *              templates through the document API. Each starts with a heading "[key]" so the check can tell which
 *              one rendered. Prints { key: id } as JSON.
 *   reset      delete every Theme Builder template
 *   page       WOO_SPEC = { title, widgets } creates a published page with the widgets; prints { id, url }
 *   content    WOO_ID, WOO_CONTENT set the content of a post (classic shortcodes or blocks)
 */
wp_set_current_user( 1 );

$action = getenv( 'WOO_ACTION' );
$docs = \Refraction\Plugin::$instance->documents;
$types = [ 'header', 'footer', 'single', 'archive', 'search-results', 'error-404', 'product', 'product-archive', 'cart', 'checkout', 'my-account', 'purchase-summary', 'loop-item' ];

function woo_elements( $key, $widgets ) {
	$children = [ [
		'id' => substr( md5( $key . 'h' ), 0, 7 ),
		'elType' => 'widget',
		'widgetType' => 'heading',
		'settings' => [ 'title' => '[' . $key . ']' ],
		'elements' => [],
	] ];

	foreach ( $widgets as $i => $widget ) {
		$children[] = [
			'id' => substr( md5( $key . 'w' . $i ), 0, 7 ),
			'elType' => 'widget',
			'widgetType' => $widget['type'],
			'settings' => $widget['settings'] ?? [],
			'elements' => [],
		];
	}

	return [ [ 'id' => substr( md5( $key . 'c' ), 0, 7 ), 'elType' => 'container', 'settings' => [], 'elements' => $children ] ];
}

if ( 'reset' === $action || 'templates' === $action ) {
	foreach ( get_posts( [ 'post_type' => 'refraction_library', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_refraction_template_type', 'meta_value' => $types, 'meta_compare' => 'IN' ] ) as $id ) {
		wp_delete_post( $id, true );
	}

	delete_option( 'refraction_pro_theme_builder_conditions' );
}

if ( 'templates' === $action ) {
	$ids = [];

	foreach ( json_decode( getenv( 'WOO_SPEC' ), true ) as $spec ) {
		$doc = $docs->create( $spec['type'], [ 'post_title' => $spec['key'], 'post_status' => 'publish' ] );
		$settings = [ 'post_status' => $spec['status'] ?? 'publish', 'refraction_display_conditions' => $spec['rules'] ];

		if ( isset( $spec['preview'] ) ) {
			$settings['refraction_preview_target'] = $spec['preview'];
		}

		$doc->save( [ 'elements' => woo_elements( $spec['key'], $spec['widgets'] ?? [] ), 'settings' => $settings ] );

		$id = $doc->get_main_id();
		$when = gmdate( 'Y-m-d H:i:s', time() - (int) ( $spec['age'] ?? 0 ) );
		global $wpdb;
		$wpdb->update( $wpdb->posts, [ 'post_modified_gmt' => $when, 'post_modified' => get_date_from_gmt( $when ) ], [ 'ID' => $id ] );
		clean_post_cache( $id );
		$ids[ $spec['key'] ] = $id;
	}

	echo wp_json_encode( (object) $ids );
} elseif ( 'page' === $action ) {
	$spec = json_decode( getenv( 'WOO_SPEC' ), true );
	$id = wp_insert_post( [ 'post_type' => 'page', 'post_title' => $spec['title'], 'post_status' => 'publish', 'post_content' => '' ] );
	$doc = $docs->get( $id );
	$doc->save( [ 'elements' => woo_elements( $spec['title'], $spec['widgets'] ), 'settings' => [] ] );
	echo wp_json_encode( [ 'id' => $id, 'url' => get_permalink( $id ) ] );
} elseif ( 'content' === $action ) {
	wp_update_post( [ 'ID' => (int) getenv( 'WOO_ID' ), 'post_content' => getenv( 'WOO_CONTENT' ) ] );
	echo '{}';
} elseif ( 'reset' === $action ) {
	echo '{}';
}
