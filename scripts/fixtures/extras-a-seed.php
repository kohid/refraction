<?php
/**
 * Test fixture for scripts/check-extras-a.mjs (run with `wp eval-file`, test sites only).
 * EA_ACTION=content  -> creates the pages, the site CSS and the snippets, prints { key: { id, url } } as JSON.
 * EA_ACTION=snippet  -> EA_SPEC (JSON: title, code, type, location, priority, active, rules) creates one snippet, prints { id }.
 * EA_ACTION=sanitize -> prints what an author (no unfiltered_html) would store for hostile CSS.
 */
wp_set_current_user( 1 );
$action = getenv( 'EA_ACTION' ) ?: 'content';

function ea_heading( $id, $title, array $settings = [] ) {
	return [ 'id' => $id, 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [ 'title' => $title ] + $settings, 'elements' => [] ];
}

function ea_cond( $type, array $extra = [], $op = 'is' ) {
	return [ '_id' => substr( md5( $type . wp_json_encode( $extra ) ), 0, 7 ), 'dc_type' => $type, 'dc_op' => $op ] + $extra;
}

function ea_page( $title, array $elements, array $settings = [] ) {
	$docs = \Refraction\Plugin::$instance->documents;
	$existing = get_page_by_path( sanitize_title( $title ) );
	if ( $existing ) {
		wp_delete_post( $existing->ID, true );
	}
	$doc = $docs->create( 'wp-page', [ 'post_title' => $title, 'post_status' => 'publish', 'post_name' => sanitize_title( $title ) ] );
	$doc->save( [ 'elements' => [ [ 'id' => substr( md5( $title ), 0, 7 ), 'elType' => 'container', 'settings' => [], 'elements' => $elements, 'isInner' => false ] ], 'settings' => $settings ] );
	return [ 'id' => $doc->get_main_id(), 'url' => get_permalink( $doc->get_main_id() ) ];
}

if ( 'snippet' === $action ) {
	$spec = json_decode( getenv( 'EA_SPEC' ), true );
	$snippets = new \Refraction\Modules\CustomCode\Classes\Snippets();
	$snippets->register_post_type();
	$id = $snippets->save( 0, $spec + [ 'title' => 'x', 'code' => '', 'type' => 'html', 'location' => 'head', 'priority' => 10, 'active' => true, 'rules' => [ 'include/general' ] ] );
	echo wp_json_encode( [ 'id' => $id ] );
	return;
}

if ( 'sanitize' === $action ) {
	$author = wp_insert_user( [ 'user_login' => 'ea_author_' . wp_rand(), 'user_pass' => wp_generate_password(), 'role' => 'author' ] );
	wp_set_current_user( $author );
	$bad = 'a{color:red} </style><script>x()</script> @import url(https://evil.test/a.css); b{width:expression(alert(1))}';
	$data = apply_filters( 'refraction/document/save/data', [ 'settings' => [ 'custom_css' => $bad ], 'elements' => [ [ 'settings' => [ 'custom_css' => $bad ], 'elements' => [ [ 'settings' => [ 'custom_css' => $bad ] ] ] ] ] ], null );
	echo wp_json_encode( [ 'can' => current_user_can( 'unfiltered_html' ), 'page' => $data['settings']['custom_css'], 'el' => $data['elements'][0]['settings']['custom_css'], 'inner' => $data['elements'][0]['elements'][0]['settings']['custom_css'] ] );
	return;
}

$risky = '</style><script>window.__xss=1</script> @import url(https://evil.test/x.css); i{width:expression(alert(1))} u{background:url(javascript:alert(1))}';
$out = [];

$out['css'] = ea_page(
	'EA CSS',
	[
		[ 'id' => 'cssbox1', 'elType' => 'container', 'isInner' => true, 'settings' => [ 'custom_css' => 'selector{border:6px solid rgb(1, 2, 3)} selector .refraction-heading-title{text-transform:uppercase}' ], 'elements' => [
			ea_heading( 'cssh001', 'CSS HEADING', [ 'custom_css' => 'selector .refraction-heading-title{color:rgb(11, 22, 33)} selector{outline:4px solid rgb(5, 6, 7)}' . $risky ] ),
		] ],
		ea_heading( 'cssh002', 'PLAIN HEADING' ),
	],
	[ 'custom_css' => 'selector{background-color:rgb(250, 250, 200)} </style><b>page</b>' ]
);

$kit = \Refraction\Plugin::$instance->kits_manager->get_active_kit();
$kit->update_settings( [ 'custom_css' => 'selector .refraction-heading-title{letter-spacing:7px} @import url(https://evil.test/site.css); p{x:expression(1)}' ] );
\Refraction\Plugin::$instance->files_manager->clear_cache();

$out['dc'] = ea_page(
	'EA DC',
	[
		ea_heading( 'dc00001', 'DC-ALWAYS' ),
		ea_heading( 'dc00002', 'DC-LOGGED-IN', [ 'refraction_dc_items' => [ ea_cond( 'logged_in' ) ] ] ),
		ea_heading( 'dc00003', 'DC-LOGGED-OUT', [ 'refraction_dc_items' => [ ea_cond( 'logged_in', [], 'is_not' ) ] ] ),
		ea_heading( 'dc00004', 'DC-ROLE-EDITOR', [ 'refraction_dc_items' => [ ea_cond( 'user_role', [ 'dc_roles' => [ 'editor' ] ] ) ] ] ),
		ea_heading( 'dc00005', 'DC-ROLE-ADMIN', [ 'refraction_dc_items' => [ ea_cond( 'user_role', [ 'dc_roles' => [ 'administrator' ] ] ) ] ] ),
		ea_heading( 'dc00006', 'DC-2030', [ 'refraction_dc_items' => [ ea_cond( 'date_range', [ 'dc_from' => '2030-01-01 00:00', 'dc_to' => '2030-12-31 23:59' ] ) ] ] ),
		ea_heading( 'dc00007', 'DC-2026', [ 'refraction_dc_items' => [ ea_cond( 'date_range', [ 'dc_from' => '2026-01-01 00:00', 'dc_to' => '2026-12-31 23:59' ] ) ] ] ),
		ea_heading( 'dc00008', 'DC-PARAM', [ 'refraction_dc_items' => [ ea_cond( 'url_param', [ 'dc_value' => 'ea=1' ] ) ] ] ),
		ea_heading( 'dc00009', 'DC-OR', [ 'refraction_dc_logic' => 'or', 'refraction_dc_items' => [ ea_cond( 'logged_in' ), ea_cond( 'url_param', [ 'dc_value' => 'ea=1' ] ) ] ] ),
		ea_heading( 'dc00010', 'DC-AND', [ 'refraction_dc_logic' => 'and', 'refraction_dc_items' => [ ea_cond( 'logged_in' ), ea_cond( 'url_param', [ 'dc_value' => 'ea=1' ] ) ] ] ),
		ea_heading( 'dc00011', 'DC-HIDE-LOGGED-IN', [ 'refraction_dc_mode' => 'hide', 'refraction_dc_items' => [ ea_cond( 'logged_in' ) ] ] ),
		ea_heading( 'dc00012', 'DC-MONDAY', [ 'refraction_dc_items' => [ ea_cond( 'day_of_week', [ 'dc_days' => [ 'mon' ] ] ) ] ] ),
		ea_heading( 'dc00013', 'DC-WORKHOURS', [ 'refraction_dc_items' => [ ea_cond( 'time_of_day', [ 'dc_time_from' => '09:00', 'dc_time_to' => '17:00' ] ) ] ] ),
		ea_heading( 'dc00014', 'DC-COOKIE', [ 'refraction_dc_items' => [ ea_cond( 'cookie', [ 'dc_value' => 'ea_seen=yes' ] ) ] ] ),
		ea_heading( 'dc00015', 'DC-LANG-DE', [ 'refraction_dc_items' => [ ea_cond( 'language', [ 'dc_value' => 'de' ] ) ] ] ),
		[ 'id' => 'dccont01', 'elType' => 'container', 'isInner' => true, 'settings' => [ 'refraction_dc_items' => [ ea_cond( 'logged_in' ) ] ], 'elements' => [ ea_heading( 'dc00016', 'DC-CHILD-OF-CONDITIONED' ) ] ],
	]
);

$out['attr'] = ea_page(
	'EA Attr',
	[
		ea_heading( 'at00001', 'ATTR HEADING', [ '_attributes' => "data-track|hero\naria-label|Hero banner\nhidden\nonclick|alert(1)\nonmouseover|x\nhref|javascript:alert(1)\nstyle|border-top:3px solid rgb(4, 5, 6);width:expression(alert(1))\ntitle|Hi <b>there</b>\nsrcdoc|x\nbad key|y" ] ),
		ea_heading( 'at00002', 'ATTR DYNAMIC', [ '_attributes' => 'data-page|post-id', '__dynamic__' => [ '_attributes' => '[refraction-tag id="ea1" name="post-id" settings="' . rawurlencode( wp_json_encode( [ 'before' => 'data-page|' ] ) ) . '"]' ] ] ),
	]
);

$out['plain'] = ea_page( 'EA Plain', [ ea_heading( 'pl00001', 'PLAIN PAGE' ) ] );

echo wp_json_encode( $out );
