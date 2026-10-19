<?php
/**
 * Test fixture for scripts/check-pro-widgets.mjs (run with `wp eval-file`, test sites only).
 *
 * Creates a nav menu and one published page per widget (plus a long article page for the
 * Table of Contents and Progress Tracker). Prints { key: { id, url } } as JSON.
 */
wp_set_current_user( 1 );

$docs = \Refraction\Plugin::$instance->documents;

// ------------------------------------------------------------------ menu
$menu = wp_get_nav_menu_object( 'RF Test Menu' );
if ( $menu ) {
	wp_delete_nav_menu( $menu->term_id );
}
$menu_id = wp_create_nav_menu( 'RF Test Menu' );
$add = function ( $title, $url, $parent = 0 ) use ( $menu_id ) {
	return wp_update_nav_menu_item( $menu_id, 0, [
		'menu-item-title' => $title,
		'menu-item-url' => $url,
		'menu-item-status' => 'publish',
		'menu-item-type' => 'custom',
		'menu-item-parent-id' => $parent,
	] );
};
$add( 'Home', home_url( '/' ) );
$about = $add( 'About', home_url( '/about-us/' ) );
$add( 'Team', home_url( '/team/' ), $about );
$history = $add( 'History', home_url( '/history/' ), $about );
$add( 'Deep Item', home_url( '/deep/' ), $history );
$add( 'Contact', home_url( '/contact/' ) );

$empty = wp_get_nav_menu_object( 'RF Empty Menu' );
if ( ! $empty ) {
	$empty_id = wp_create_nav_menu( 'RF Empty Menu' );
} else {
	$empty_id = $empty->term_id;
}

// --------------------------------------------------------------- helpers
function rfw_widget( $type, $settings = [], $id = null ) {
	return [
		'id' => $id ? $id : substr( md5( $type . wp_json_encode( $settings ) ), 0, 7 ),
		'elType' => 'widget',
		'widgetType' => $type,
		'settings' => $settings,
		'elements' => [],
	];
}

function rfw_page( $title, array $widgets ) {
	global $docs;

	$existing = get_page_by_path( sanitize_title( $title ) );
	if ( $existing ) {
		wp_delete_post( $existing->ID, true );
	}

	$doc = $docs->create( 'wp-page', [
		'post_title' => $title,
		'post_status' => 'publish',
		'post_name' => sanitize_title( $title ),
	] );
	$doc->save( [
		'elements' => [ [
			'id' => substr( md5( $title ), 0, 7 ),
			'elType' => 'container',
			'settings' => [],
			'elements' => $widgets,
			'isInner' => false,
		] ],
		'settings' => [],
	] );

	return [ 'id' => $doc->get_main_id(), 'url' => get_permalink( $doc->get_main_id() ) ];
}

$pages = [];

// ------------------------------------------------------------- nav menu
$pages['nav-menu'] = rfw_page( 'RFW Nav Menu', [
	rfw_widget( 'refraction-nav-menu', [ 'menu' => (string) $menu_id, 'layout' => 'horizontal', 'breakpoint' => 'mobile', 'toggle_label' => 'Main menu' ], 'nav0001' ),
	rfw_widget( 'refraction-nav-menu', [ 'menu' => (string) $menu_id, 'layout' => 'vertical' ], 'nav0002' ),
	rfw_widget( 'refraction-nav-menu', [ 'menu' => (string) $menu_id, 'layout' => 'dropdown', 'toggle_show_label' => 'yes' ], 'nav0003' ),
	rfw_widget( 'refraction-nav-menu', [ 'menu' => (string) $empty_id ], 'nav0004' ),
] );

// @@MORE_PAGES@@ (each widget task appends its page above this line)

echo wp_json_encode( $pages );
