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

function rfw_image() {
	static $img = null;
	if ( $img ) {
		return $img;
	}
	$upload = wp_upload_dir();
	wp_mkdir_p( $upload['path'] );
	$file = $upload['path'] . '/rfw-test.png';
	// A 8x8 solid teal PNG.
	$im = imagecreatetruecolor( 8, 8 );
	imagefill( $im, 0, 0, imagecolorallocate( $im, 20, 140, 140 ) );
	imagepng( $im, $file );
	$existing = get_posts( [ 'post_type' => 'attachment', 'title' => 'rfw-test', 'numberposts' => 1, 'fields' => 'ids' ] );
	$id = $existing ? $existing[0] : wp_insert_attachment( [ 'post_title' => 'rfw-test', 'post_mime_type' => 'image/png', 'post_status' => 'inherit' ], $file );
	require_once ABSPATH . 'wp-admin/includes/image.php';
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $file ) );
	$img = [ 'id' => $id, 'url' => wp_get_attachment_url( $id ) ];
	return $img;
}

function rfw_page( $title, array $widgets ) {
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

// ---------------------------------------------------------------- slides
$slide = function ( $n, $extra = [] ) {
	return array_merge( [
		'_id' => 'sl' . $n . 'aaaa',
		'heading' => 'Slide ' . $n . ' <b>title</b>',
		'description' => 'Description ' . $n,
		'button_text' => 'Button ' . $n,
		'button_link' => [ 'url' => 'https://example.com/' . $n, 'is_external' => 'on', 'nofollow' => '' ],
		'background_color' => [ '#123456', '#654321', '#225522' ][ ( $n - 1 ) % 3 ],
	], $extra );
};
$pages['slides'] = rfw_page( 'RFW Slides', [
	rfw_widget( 'refraction-slides', [ 'slides' => [ $slide( 1 ), $slide( 2 ), $slide( 3 ) ], 'autoplay' => 'yes', 'autoplay_speed' => 1500, 'transition_speed' => 300, 'pause_on_hover' => 'yes', 'infinite' => 'yes', 'slider_label' => 'Hero slider' ], 'sld0001' ),
	rfw_widget( 'refraction-slides', [ 'slides' => [ $slide( 1 ), $slide( 2 ) ], 'autoplay' => '', 'transition' => 'fade', 'navigation' => 'dots', 'infinite' => '' ], 'sld0002' ),
	rfw_widget( 'refraction-slides', [ 'slides' => [ $slide( 1 ) ], 'autoplay' => 'yes' ], 'sld0003' ),
] );

// ------------------------------------------------------------ price list
$pages['price-list'] = rfw_page( 'RFW Price List', [
	rfw_widget( 'refraction-price-list', [
		'items' => [
			[ '_id' => 'pl1aaaaa', 'title' => 'Espresso <i>x</i>', 'price' => '$3.50', 'description' => 'Strong & small', 'link' => [ 'url' => 'https://example.com/espresso' ] ],
			[ '_id' => 'pl2aaaaa', 'title' => 'Flat white', 'price' => '$4.20', 'description' => '' ],
			[ '_id' => 'pl3aaaaa', 'title' => 'Cake', 'price' => '$5', 'description' => 'Daily' ],
		],
	], 'plist001' ),
	rfw_widget( 'refraction-price-list', [ 'items' => [ [ '_id' => 'pl4aaaaa', 'title' => 'Only', 'price' => '1' ] ], 'separator_style' => 'none', 'image_position' => 'right', 'title_tag' => 'h4' ], 'plist002' ),
] );

// ----------------------------------------------------------- price table
$pages['price-table'] = rfw_page( 'RFW Price Table', [
	rfw_widget( 'refraction-price-table', [
		'heading' => 'Pro <b>plan</b>', 'sub_heading' => 'For teams', 'currency_symbol' => 'euro', 'price' => '49', 'sale' => 'yes', 'original_price' => '79',
		'period' => 'per month', 'btn_text' => 'Choose plan', 'btn_link' => [ 'url' => 'https://example.com/buy' ],
		'features_list' => [
			[ '_id' => 'pt1aaaaa', 'item_text' => 'Unlimited pages', 'item_included' => 'yes' ],
			[ '_id' => 'pt2aaaaa', 'item_text' => 'Phone support', 'item_included' => '' ],
		],
		'show_ribbon' => 'yes', 'ribbon_title' => 'Best value', 'ribbon_horizontal_position' => 'right',
	], 'ptab0001' ),
	rfw_widget( 'refraction-price-table', [ 'heading' => 'Free', 'price' => '0', 'currency_symbol' => 'custom', 'currency_symbol_custom' => 'CHF', 'currency_position' => 'after', 'show_ribbon' => '', 'features_list' => [] ], 'ptab0002' ),
] );

// -------------------------------------------------------------- flip box
$pages['flip-box'] = rfw_page( 'RFW Flip Box', [
	rfw_widget( 'refraction-flip-box', [
		'front_title' => 'Front <b>title</b>', 'front_description' => 'Front text', 'back_title' => 'Back title', 'back_description' => 'Back text',
		'btn_text' => 'Go there', 'btn_link' => [ 'url' => 'https://example.com/back' ], 'effect' => 'flip', 'direction' => 'up', 'trigger' => 'hover', 'duration' => [ 'size' => 200, 'unit' => 'px' ],
	], 'flip0001' ),
	rfw_widget( 'refraction-flip-box', [ 'front_title' => 'Click front', 'back_title' => 'Click back', 'trigger' => 'click', 'effect' => 'fade', 'duration' => [ 'size' => 200, 'unit' => 'px' ], 'box_label' => 'Details card' ], 'flip0002' ),
	rfw_widget( 'refraction-flip-box', [ 'front_title' => 'Slide front', 'back_title' => 'Slide back', 'effect' => 'slide', 'direction' => 'left', 'duration' => [ 'size' => 200, 'unit' => 'px' ] ], 'flip0003' ),
] );

// ---------------------------------------------------------- call to action
$img = rfw_image();
$pages['call-to-action'] = rfw_page( 'RFW Call To Action', [
	rfw_widget( 'refraction-call-to-action', [
		'title' => 'Join <b>us</b>', 'description' => 'Short pitch', 'btn_text' => 'Sign up', 'btn_link' => [ 'url' => 'https://example.com/signup' ],
		'skin' => 'classic', 'image' => $img, 'image_position' => 'left', 'link_click' => 'box', 'show_ribbon' => 'yes', 'ribbon_title' => 'New',
	], 'cta00001' ),
	rfw_widget( 'refraction-call-to-action', [
		'title' => 'Cover title', 'description' => 'Over a background', 'btn_text' => 'Go', 'btn_link' => [ 'url' => 'https://example.com/go' ],
		'skin' => 'cover', 'bg_image' => $img, 'link_click' => 'button', 'min_height' => [ 'size' => 320, 'unit' => 'px' ],
	], 'cta00002' ),
	rfw_widget( 'refraction-call-to-action', [ 'title' => 'No button', 'description' => '', 'btn_text' => '', 'title_tag' => 'h4' ], 'cta00003' ),
] );

// -------------------------------------------------------- animated headline
$pages['animated-headline'] = rfw_page( 'RFW Animated Headline', [
	rfw_widget( 'refraction-animated-headline', [ 'animation_type' => 'flip', 'before_text' => 'We build <b>x</b>', 'rotating_text' => "fast\nsimple\nreliable", 'after_text' => 'websites', 'animation_delay' => 700, 'header_tag' => 'h2' ], 'hl000001' ),
	rfw_widget( 'refraction-animated-headline', [ 'animation_type' => 'typing', 'before_text' => 'Type', 'rotating_text' => "alpha\nbeta", 'typing_speed' => 40, 'animation_delay' => 400 ], 'hl000002' ),
	rfw_widget( 'refraction-animated-headline', [ 'animation_type' => 'highlight', 'before_text' => 'This is', 'highlighted_text' => 'amazing', 'after_text' => 'stuff', 'loop' => '' ], 'hl000003' ),
	rfw_widget( 'refraction-animated-headline', [ 'animation_type' => 'swirl', 'rotating_text' => "one\ntwo", 'animation_delay' => 700 ], 'hl000004' ),
	rfw_widget( 'refraction-animated-headline', [ 'animation_type' => 'circle', 'highlighted_text' => 'round', 'loop' => 'yes', 'animation_delay' => 900 ], 'hl000005' ),
] );

// @@MORE_PAGES@@ (each widget task appends its page above this line)

echo wp_json_encode( $pages );
