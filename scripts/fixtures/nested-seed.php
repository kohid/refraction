<?php
/**
 * Test fixture for scripts/check-nested.mjs (run with `wp eval-file`, test sites only).
 *
 * Creates one published page per area (off-canvas, mega menu, carousel, combinations).
 * Prints { key: { id, url } } as JSON.
 */
wp_set_current_user( 1 );

function rfn_w( $type, $settings = [], $id = null ) {
	return [
		'id' => $id ? $id : substr( md5( $type . wp_json_encode( $settings ) . wp_rand() ), 0, 7 ),
		'elType' => 'widget',
		'widgetType' => $type,
		'settings' => $settings,
		'elements' => [],
		'isInner' => false,
	];
}

/** A locked child container (what a nested widget creates for each item). */
function rfn_c( $title, array $children = [], $id = null ) {
	return [
		'id' => $id ? $id : substr( md5( $title . wp_rand() ), 0, 7 ),
		'elType' => 'container',
		'settings' => [ '_title' => $title, 'content_width' => 'full' ],
		'elements' => $children,
		'isInner' => false,
		'isLocked' => true,
	];
}

function rfn_nested( $type, $id, array $settings, array $containers ) {
	return [
		'id' => $id,
		'elType' => 'widget',
		'widgetType' => $type,
		'settings' => $settings,
		'elements' => $containers,
		'isInner' => false,
	];
}

function rfn_page( $title, array $elements ) {
	$docs = \Refraction\Plugin::$instance->documents;

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
			'elements' => $elements,
			'isInner' => false,
		] ],
		'settings' => [],
	] );

	return [ 'id' => $doc->get_main_id(), 'url' => get_permalink( $doc->get_main_id() ) ];
}

$h = function ( $text ) { return rfn_w( 'heading', [ 'title' => $text, 'header_size' => 'h3' ] ); };
$btn = function ( $text, $id = null ) { return rfn_w( 'button', [ 'text' => $text, 'link' => [ 'url' => '#' ] ], $id ); };
$txt = function ( $html ) { return rfn_w( 'text-editor', [ 'editor' => $html ] ); };
$filler = $txt( str_repeat( '<p>Filler paragraph to make the page scroll. Lorem ipsum dolor sit amet.</p>', 60 ) );

$pages = [];

// ------------------------------------------------------------- off-canvas
$pages['off-canvas'] = rfn_page( 'RFN Off Canvas', [
	rfn_w( 'html', [ 'html' => '<p><a id="hash-link" href="#refraction-offcanvas:side-menu">Open with a link</a> <button id="custom-trigger" class="open-oc" type="button">Custom trigger</button> <button id="before-btn" type="button">Before</button></p>' ] ),
	rfn_nested( 'refraction-off-canvas', 'oc00001', [
		'panel_id' => 'side-menu',
		'panel_label' => 'Side menu',
		'position' => 'left',
		'button_text' => 'Open side menu',
		'trigger_selector' => '.open-oc',
		'duration' => 200,
	], [ rfn_c( 'Off-canvas content', [ $h( 'Side panel' ), $btn( 'First action', 'ocbtn01' ), $txt( '<p><a id="oc-link" href="#inner">Inner link</a></p>' ), $btn( 'Last action', 'ocbtn02' ) ] ) ] ),
	rfn_nested( 'refraction-off-canvas', 'oc00002', [
		'panel_id' => 'push-panel',
		'panel_label' => 'Push panel',
		'position' => 'right',
		'mode' => 'push',
		'button_text' => 'Open push panel',
		'lock_scroll' => '',
		'duration' => 200,
	], [ rfn_c( 'Push content', [ $h( 'Pushed' ), $btn( 'Push action' ) ] ) ] ),
	rfn_nested( 'refraction-off-canvas', 'oc00003', [
		'panel_id' => 'locked-panel',
		'position' => 'center',
		'button_text' => 'Open modal-like',
		'close_on_overlay' => '',
		'close_on_esc' => '',
		'duration' => 0,
	], [ rfn_c( 'Locked content', [ $h( 'Needs the close button' ) ] ) ] ),
	$filler,
] );

// -------------------------------------------------------------- mega menu
$dd = function ( $label ) use ( $h, $txt, $btn ) {
	return [ $h( $label . ' heading' ), $txt( '<p><a href="#a-' . sanitize_title( $label ) . '">' . $label . ' link one</a> <a href="#b-' . sanitize_title( $label ) . '">' . $label . ' link two</a></p>' ) ];
};
$items = function ( $suffix = '' ) {
	return [
		[ '_id' => 'mi1' . $suffix, 'item_title' => 'Home', 'item_type' => 'link', 'item_link' => [ 'url' => home_url( '/' ) ] ],
		[ '_id' => 'mi2' . $suffix, 'item_title' => 'Products', 'item_type' => 'dropdown' ],
		[ '_id' => 'mi3' . $suffix, 'item_title' => 'Company', 'item_type' => 'dropdown' ],
		[ '_id' => 'mi4' . $suffix, 'item_title' => 'Contact', 'item_type' => 'link', 'item_link' => [ 'url' => home_url( '/contact/' ) ] ],
	];
};
$mm_children = function () use ( $dd ) {
	return [ rfn_c( 'Home', [] ), rfn_c( 'Products', $dd( 'Products' ) ), rfn_c( 'Company', $dd( 'Company' ) ), rfn_c( 'Contact', [] ) ];
};
$pages['mega-menu'] = rfn_page( 'RFN Mega Menu', [
	rfn_nested( 'refraction-mega-menu', 'mm00001', [ 'items' => $items( 'a' ), 'trigger' => 'hover', 'hover_delay' => 100, 'close_delay' => 300, 'dropdown_width' => 'custom', 'menu_label' => 'Primary', 'breakpoint' => 'tablet', 'mobile_layout' => 'accordion' ], $mm_children() ),
	rfn_w( 'spacer', [ 'space' => [ 'size' => 300, 'unit' => 'px' ] ] ),
	rfn_nested( 'refraction-mega-menu', 'mm00002', [ 'items' => $items( 'b' ), 'trigger' => 'click', 'dropdown_width' => 'full', 'menu_label' => 'Click menu', 'breakpoint' => 'tablet', 'mobile_layout' => 'offcanvas' ], $mm_children() ),
	rfn_w( 'spacer', [ 'space' => [ 'size' => 300, 'unit' => 'px' ] ] ),
	rfn_nested( 'refraction-mega-menu', 'mm00003', [ 'items' => $items( 'c' ), 'layout' => 'vertical', 'trigger' => 'click', 'menu_label' => 'Vertical', 'breakpoint' => 'none' ], $mm_children() ),
	rfn_w( 'html', [ 'html' => '<p id="outside">Outside the menus</p>' ] ),
] );

// --------------------------------------------------------------- carousel
$slides = function ( $n, $prefix ) use ( $h, $btn ) {
	$items = [];
	$cs = [];
	for ( $i = 1; $i <= $n; $i++ ) {
		$items[] = [ '_id' => $prefix . $i . 'zz', 'slide_title' => "Slide $i" ];
		$cs[] = rfn_c( "Slide $i", [ $h( "$prefix slide $i" ), $btn( "$prefix action $i" ) ] );
	}
	return [ $items, $cs ];
};
list( $i1, $c1 ) = $slides( 5, 'A' );
list( $i2, $c2 ) = $slides( 4, 'B' );
list( $i3, $c3 ) = $slides( 3, 'C' );
list( $i4, $c4 ) = $slides( 4, 'D' );
list( $i5, $c5 ) = $slides( 1, 'E' );
$pages['carousel'] = rfn_page( 'RFN Carousel', [
	rfn_nested( 'refraction-nested-carousel', 'nc00001', [ 'slides' => $i1, 'slides_to_show' => '3', 'slides_to_show_tablet' => '2', 'slides_to_show_mobile' => '1', 'spacing' => [ 'size' => 20, 'unit' => 'px' ], 'pagination' => 'bullets', 'carousel_label' => 'Features', 'speed' => 300 ], $c1 ),
	rfn_nested( 'refraction-nested-carousel', 'nc00002', [ 'slides' => $i2, 'slides_to_show' => '1', 'autoplay' => 'yes', 'autoplay_speed' => 1500, 'pause_on_hover' => 'yes', 'loop' => 'yes', 'pagination' => 'fraction', 'speed' => 200 ], $c2 ),
	rfn_nested( 'refraction-nested-carousel', 'nc00003', [ 'slides' => $i3, 'effect' => 'fade', 'pagination' => 'progress', 'arrows' => '', 'speed' => 200 ], $c3 ),
	rfn_nested( 'refraction-nested-carousel', 'nc00004', [ 'slides' => $i4, 'direction' => 'vertical', 'vertical_height' => [ 'size' => 220, 'unit' => 'px' ], 'pagination' => 'none', 'speed' => 200 ], $c4 ),
	rfn_nested( 'refraction-nested-carousel', 'nc00005', [ 'slides' => $i5 ], $c5 ),
] );

// ------------------------------------------------------------ combinations
list( $ci, $cc ) = $slides( 3, 'M' );
$carousel_in_menu = rfn_nested( 'refraction-nested-carousel', 'nc00010', [ 'slides' => $ci, 'speed' => 200, 'pagination' => 'bullets' ], $cc );
$combo_items = [
	[ '_id' => 'cm1', 'item_title' => 'Gallery', 'item_type' => 'dropdown' ],
	[ '_id' => 'cm2', 'item_title' => 'Plain', 'item_type' => 'link', 'item_link' => [ 'url' => home_url( '/' ) ] ],
];
list( $oi, $oc ) = $slides( 3, 'O' );
$stack_items = [
	[ '_id' => 'sm1', 'item_title' => 'Shop', 'item_type' => 'dropdown' ],
	[ '_id' => 'sm2', 'item_title' => 'Help', 'item_type' => 'link', 'item_link' => [ 'url' => home_url( '/' ) ] ],
];
$nested_mm = rfn_nested( 'refraction-mega-menu', 'mm00020', [ 'items' => $stack_items, 'breakpoint' => 'none', 'trigger' => 'click', 'menu_label' => 'In panel' ], [ rfn_c( 'Shop', $dd( 'Shop' ) ), rfn_c( 'Help', [] ) ] );
$carousel_in_oc = rfn_nested( 'refraction-nested-carousel', 'nc00020', [ 'slides' => $oi, 'speed' => 200 ], $oc );
$pages['combos'] = rfn_page( 'RFN Combos', [
	rfn_nested( 'refraction-mega-menu', 'mm00010', [ 'items' => $combo_items, 'trigger' => 'click', 'dropdown_width' => 'custom', 'dropdown_custom_width' => [ 'size' => 600, 'unit' => 'px' ], 'breakpoint' => 'none', 'menu_label' => 'Gallery menu' ], [ rfn_c( 'Gallery', [ $carousel_in_menu ] ), rfn_c( 'Plain', [] ) ] ),
	rfn_nested( 'refraction-off-canvas', 'oc00010', [ 'panel_id' => 'menu-panel', 'panel_label' => 'Menu panel', 'button_text' => 'Open menu panel', 'position' => 'left' ], [ rfn_c( 'Panel', [ $nested_mm ] ) ] ),
	rfn_nested( 'refraction-off-canvas', 'oc00011', [ 'panel_id' => 'carousel-panel', 'panel_label' => 'Carousel panel', 'button_text' => 'Open carousel panel', 'position' => 'center', 'duration' => 100 ], [ rfn_c( 'Carousel panel', [ $carousel_in_oc ] ) ] ),
	rfn_w( 'html', [ 'html' => '<p>After</p>' ] ),
] );

echo wp_json_encode( $pages );
