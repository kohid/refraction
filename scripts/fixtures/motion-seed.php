<?php
/**
 * Test fixture for scripts/check-motion.mjs (run with `wp eval-file`, test sites only).
 *
 * Env MO_ACTION:
 *   pages    creates the pages the check scrolls/hovers; prints { slug: { id, url } } as JSON
 *   header   creates a Theme Builder header template with a sticky container, shown everywhere
 *   nopage   removes the header template
 */
wp_set_current_user( 1 );

update_option( 'permalink_structure', '' );

$docs = \Refraction\Plugin::$instance->documents;

function mo_container( $id, array $settings = [], array $children = [] ) {
	return [ 'id' => $id, 'elType' => 'container', 'settings' => $settings, 'elements' => $children, 'isInner' => false ];
}

function mo_heading( $id, $text, array $settings = [] ) {
	return [ 'id' => $id, 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => array_merge( [ 'title' => $text ], $settings ), 'elements' => [] ];
}

function mo_spacer( $id, $height ) {
	return mo_container( $id, [ 'min_height' => [ 'unit' => 'px', 'size' => $height ] ] );
}

function mo_box( $id, array $fx, $height = 200, array $extra = [] ) {
	return mo_container( $id, array_merge( [
		'min_height' => [ 'unit' => 'px', 'size' => $height ],
		'background_background' => 'classic',
		'background_color' => '#0e7c86',
	], $fx, $extra ), [ mo_heading( $id . 'h', 'Box ' . $id ) ] );
}

function mo_page( $title, array $elements ) {
	$docs = \Refraction\Plugin::$instance->documents;

	$slug = sanitize_title( $title );
	$existing = get_page_by_path( $slug );

	if ( $existing ) {
		wp_delete_post( $existing->ID, true );
	}

	$doc = $docs->create( 'wp-page', [ 'post_title' => $title, 'post_status' => 'publish', 'post_name' => $slug ] );
	$doc->save( [ 'elements' => $elements, 'settings' => [] ] );

	$id = $doc->get_main_id();

	return [ 'id' => $id, 'url' => get_permalink( $id ) ];
}

$action = getenv( 'MO_ACTION' );

function mo_reset_headers() {
	foreach ( get_posts( [ 'post_type' => 'refraction_library', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_refraction_template_type', 'meta_value' => 'header' ] ) as $id ) {
		wp_delete_post( $id, true );
	}
}

if ( 'pages' === $action ) {
	$out = [];

	$out['scroll'] = mo_page( 'RFM Scroll', [
		mo_spacer( 's0', 1000 ),
		mo_box( 'fxty', [ 'rf_scroll_ty' => 'yes', 'rf_scroll_ty_speed' => '10' ] ),
		mo_spacer( 's1', 900 ),
		mo_container( 'fxwrap', [], [ mo_heading( 'fxtx', 'Horizontal heading', [ 'rf_scroll_tx' => 'yes', 'rf_scroll_tx_speed' => '10' ] ) ] ),
		mo_spacer( 's2', 900 ),
		mo_box( 'fxfade', [ 'rf_scroll_fade' => 'yes', 'rf_scroll_fade_dir' => 'out', 'rf_scroll_fade_level' => '8' ] ),
		mo_spacer( 's3', 900 ),
		mo_box( 'fxblur', [ 'rf_scroll_blur' => 'yes', 'rf_scroll_blur_dir' => 'out', 'rf_scroll_blur_level' => '12' ] ),
		mo_spacer( 's4', 900 ),
		mo_box( 'fxrot', [ 'rf_scroll_rotate' => 'yes', 'rf_scroll_rotate_dir' => 'right', 'rf_scroll_rotate_speed' => '10' ] ),
		mo_spacer( 's5', 900 ),
		mo_box( 'fxscale', [ 'rf_scroll_scale' => 'yes', 'rf_scroll_scale_speed' => '10' ] ),
		mo_spacer( 's6', 900 ),
		mo_box( 'fxpage', [ 'rf_scroll_ty' => 'yes', 'rf_scroll_ty_speed' => '10', 'rf_scroll_relative' => 'page' ] ),
		mo_spacer( 's7', 900 ),
		mo_box( 'fxmobile', [ 'rf_scroll_ty' => 'yes', 'rf_scroll_ty_speed' => '10', 'rf_scroll_devices' => [ 'mobile' ] ] ),
		mo_spacer( 's8', 900 ),
		mo_box( 'fxall', [ 'rf_scroll_ty' => 'yes', 'rf_scroll_ty_speed' => '10', 'rf_scroll_devices' => [ 'desktop', 'tablet', 'mobile' ] ] ),
		mo_spacer( 's9', 900 ),
		mo_box( 'fxanim', [ 'rf_scroll_ty' => 'yes', 'rf_scroll_ty_speed' => '10', 'animation' => 'fadeInUp' ] ),
		mo_spacer( 's10', 1400 ),
	] );

	$out['mouse'] = mo_page( 'RFM Mouse', [
		mo_spacer( 'm0', 100 ),
		mo_box( 'mtrack', [ 'rf_mouse_track' => 'yes', 'rf_mouse_track_speed' => '5' ], 200 ),
		mo_box( 'mtilt', [ 'rf_mouse_tilt' => 'yes', 'rf_mouse_tilt_intensity' => '8' ], 240, [ 'width' => [ 'unit' => 'px', 'size' => 400 ] ] ),
		mo_box( 'mkeep', [ 'rf_mouse_tilt' => 'yes', 'rf_mouse_tilt_intensity' => '8', 'rf_mouse_tilt_keep' => 'yes' ], 240, [ 'width' => [ 'unit' => 'px', 'size' => 400 ] ] ),
		mo_box( 'mmobile', [ 'rf_mouse_track' => 'yes', 'rf_mouse_track_speed' => '5', 'rf_mouse_devices' => [ 'mobile' ] ], 120 ),
		mo_spacer( 'm1', 600 ),
	] );

	$out['sticky'] = mo_page( 'RFM Sticky', [
		mo_spacer( 'k0', 300 ),
		mo_box( 'stk1', [ 'rf_sticky' => 'top', 'rf_sticky_offset' => '30', 'rf_sticky_effects_offset' => '100', 'rf_sticky_shrink' => 'yes', 'rf_sticky_shrink_padding' => '4', 'rf_sticky_solid' => '#ff0066' ], 100 ),
		mo_spacer( 'k1', 700 ),
		mo_container( 'par', [ 'min_height' => [ 'unit' => 'px', 'size' => 1500 ], 'background_background' => 'classic', 'background_color' => '#e8eef0' ], [
			mo_box( 'stkin', [ 'rf_sticky' => 'top', 'rf_sticky_offset' => '150', 'rf_sticky_parent' => 'yes' ], 150 ),
		] ),
		mo_spacer( 'k2', 600 ),
		mo_box( 'stkdev', [ 'rf_sticky' => 'top', 'rf_sticky_on' => [ 'mobile' ] ], 80 ),
		mo_spacer( 'k3', 2600 ),
		mo_box( 'stk2', [ 'rf_sticky' => 'bottom', 'rf_sticky_offset' => '10' ], 80 ),
		mo_spacer( 'k4', 900 ),
	] );

	echo wp_json_encode( $out );
} elseif ( 'header' === $action ) {
	mo_reset_headers();
	$doc = $docs->create( 'header', [ 'post_title' => 'MO Header', 'post_status' => 'publish' ] );
	$doc->save( [
		'elements' => [ mo_box( 'hdr1', [ 'rf_sticky' => 'top', 'rf_sticky_shrink' => 'yes', 'rf_sticky_shrink_padding' => '4', 'rf_sticky_effects_offset' => '50' ], 90 ) ],
		'settings' => [ 'post_status' => 'publish', 'refraction_display_conditions' => [ 'include/general' ] ],
	] );
	echo wp_json_encode( [ 'id' => $doc->get_main_id() ] );
} elseif ( 'nopage' === $action ) {
	mo_reset_headers();
	echo '{}';
}
