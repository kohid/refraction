<?php
/**
 * Test fixture for scripts/check-popups.mjs (run with `wp eval-file`, test sites only).
 *
 * Creates one small page (or post) per scenario and the popups that belong to it, with their display conditions,
 * and prints their IDs as JSON: { pages: { slug: id }, popups: { name: id }, posts: { a: id, b: id } }.
 */
wp_set_current_user( 1 );

$docs = \Refraction\Plugin::$instance->documents;

function pp_id( $seed ) {
	return substr( md5( $seed ), 0, 7 );
}

function pp_widget( $type, $settings = [], $dynamic = [] ) {
	if ( $dynamic ) {
		$settings['__dynamic__'] = $dynamic;
	}

	return [ 'id' => pp_id( $type . wp_json_encode( $settings ) . wp_rand() ), 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => [] ];
}

function pp_container( $children ) {
	return [ 'id' => pp_id( 'c' . wp_rand() ), 'elType' => 'container', 'settings' => [], 'elements' => $children ];
}

function pp_tag( $name, $settings ) {
	return sprintf( '[refraction-tag id="%1$s" name="%2$s" settings="%3$s"]', substr( md5( $name . wp_json_encode( $settings ) ), 0, 7 ), $name, urlencode( wp_json_encode( (object) $settings ) ) );
}

function pp_html( $html ) {
	return pp_widget( 'html', [ 'html' => $html ] );
}

function pp_field( $id, $type, $label, $extra = [] ) {
	return array_merge( [ '_id' => 'f' . substr( md5( $id ), 0, 6 ), 'custom_id' => $id, 'field_type' => $type, 'field_label' => $label, 'placeholder' => '', 'required' => '', 'field_width' => '100', 'field_options' => '', 'field_value' => '' ], $extra );
}

function pp_form( $id, $actions ) {
	return [
		'id' => $id,
		'elType' => 'widget',
		'widgetType' => 'refraction-form',
		'settings' => [
			'form_name' => 'Form ' . $id,
			'form_fields' => [ pp_field( 'name', 'text', 'Your name', [ 'required' => 'true' ] ), pp_field( 'email', 'email', 'Email', [ 'required' => 'true' ] ) ],
			'submit_actions' => $actions,
			'min_submit_time' => 0,
			'rate_limit_max' => 0,
			'success_message' => 'Thanks, sent OK.',
		],
		'elements' => [],
	];
}

function pp_cleanup() {
	foreach ( get_posts( [ 'post_type' => [ 'page', 'post', 'refraction_library' ], 'post_status' => 'any', 'meta_key' => '_pp_fixture', 'posts_per_page' => -1, 'fields' => 'ids' ] ) as $id ) {
		wp_delete_post( $id, true );
	}
}

function pp_page( $type, $slug, $title, $elements = null ) {
	$docs = \Refraction\Plugin::$instance->documents;

	$doc = $docs->create( $type, [ 'post_title' => $title, 'post_name' => $slug, 'post_status' => 'publish' ] );
	$doc->save( [ 'elements' => $elements ?: [ pp_container( [ pp_widget( 'heading', [ 'title' => 'Page ' . $slug, 'header_size' => 'h1' ] ) ] ) ], 'settings' => [ 'post_status' => 'publish' ] ] );
	wp_update_post( [ 'ID' => $doc->get_main_id(), 'post_name' => $slug, 'post_status' => 'publish' ] );
	update_post_meta( $doc->get_main_id(), '_pp_fixture', '1' );

	return $doc->get_main_id();
}

function pp_popup( $name, $settings, $rules, $elements = null, $status = 'publish' ) {
	$docs = \Refraction\Plugin::$instance->documents;

	$doc = $docs->create( 'popup', [ 'post_title' => $name, 'post_status' => $status ] );
	$doc->save( [
		'elements' => $elements ?: [ pp_container( [
			pp_widget( 'heading', [ 'title' => 'Popup ' . $name, 'header_size' => 'h2' ] ),
			pp_widget( 'text-editor', [ 'editor' => '<p>Body of ' . esc_html( $name ) . '</p>' ] ),
		] ) ],
		'settings' => array_merge( [ 'post_status' => $status, 'refraction_display_conditions' => $rules, 'rp_anim_in' => 'none', 'rp_anim_out' => 'none' ], $settings ),
	] );
	update_post_meta( $doc->get_main_id(), '_pp_fixture', '1' );

	return $doc->get_main_id();
}

pp_cleanup();

if ( 'cleanup' === getenv( 'PP_ACTION' ) ) {
	echo wp_json_encode( [ 'ok' => true ] );
	return;
}

$spacer = fn( $px ) => pp_html( '<div style="height:' . $px . 'px;background:linear-gradient(#fff,#ccd)">spacer</div>' );
$page_slugs = [ 'pp-load', 'pp-delay', 'pp-scroll', 'pp-scrollel', 'pp-scrollup', 'pp-click', 'pp-link', 'pp-exit', 'pp-idle', 'pp-views', 'pp-event', 'pp-once', 'pp-everyn', 'pp-session', 'pp-day', 'pp-aud', 'pp-dev', 'pp-ref', 'pp-param', 'pp-sched', 'pp-queue', 'pp-form', 'pp-form2', 'pp-nested', 'pp-anim', 'pp-a11y', 'pp-auto', 'pp-noclose', 'pp-xss', 'pp-none', 'pp-dismiss', 'pp-lock' ];

$pages = [];

foreach ( $page_slugs as $slug ) {
	$pages[ $slug ] = pp_page( 'wp-page', $slug, $slug );
}

$posts = [ 'a' => pp_page( 'wp-post', 'pp-post-a', 'pp-post-a' ), 'b' => pp_page( 'wp-post', 'pp-post-b', 'pp-post-b' ) ];

$on = fn( $slug ) => [ 'include/singular/page/' . $pages[ $slug ] ];
$yes = 'yes';
$P = [];

$P['load'] = pp_popup( 'load', [ 'rp_trigger_load' => $yes ], $on( 'pp-load' ) );
$P['delay'] = pp_popup( 'delay', [ 'rp_trigger_load' => $yes, 'rp_load_delay' => 2 ], $on( 'pp-delay' ) );
$P['scroll'] = pp_popup( 'scroll', [ 'rp_trigger_scroll' => $yes, 'rp_scroll_mode' => 'percent', 'rp_scroll_percent' => 50 ], $on( 'pp-scroll' ) );
$P['scrollel'] = pp_popup( 'scrollel', [ 'rp_trigger_scroll' => $yes, 'rp_scroll_mode' => 'element', 'rp_scroll_selector' => '#pp-target' ], $on( 'pp-scrollel' ) );
$P['scrollup'] = pp_popup( 'scrollup', [ 'rp_trigger_scroll_up' => $yes, 'rp_scroll_up_distance' => 200 ], $on( 'pp-scrollup' ) );
$P['click'] = pp_popup( 'click', [ 'rp_trigger_click' => $yes, 'rp_click_selector' => '.open-me' ], $on( 'pp-click' ) );
$P['link'] = pp_popup( 'link', [], $on( 'pp-link' ) );
$P['exit'] = pp_popup( 'exit', [ 'rp_trigger_exit' => $yes ], $on( 'pp-exit' ) );
$P['idle'] = pp_popup( 'idle', [ 'rp_trigger_idle' => $yes, 'rp_idle_seconds' => 2 ], $on( 'pp-idle' ) );
$P['views'] = pp_popup( 'views', [ 'rp_trigger_views' => $yes, 'rp_views_count' => 2 ], $on( 'pp-views' ) );
$P['event'] = pp_popup( 'event', [], $on( 'pp-event' ) );
$P['once'] = pp_popup( 'once', [ 'rp_trigger_load' => $yes, 'rp_frequency' => 'once' ], $on( 'pp-once' ) );
$P['everyn'] = pp_popup( 'everyn', [ 'rp_trigger_load' => $yes, 'rp_frequency' => 'every_n', 'rp_frequency_n' => 3 ], $on( 'pp-everyn' ) );
$P['session'] = pp_popup( 'session', [ 'rp_trigger_load' => $yes, 'rp_frequency' => 'session' ], $on( 'pp-session' ) );
$P['day'] = pp_popup( 'day', [ 'rp_trigger_load' => $yes, 'rp_frequency' => 'day' ], $on( 'pp-day' ) );

// Display conditions: all posts except post B; the search results page.
$P['cond'] = pp_popup( 'cond', [ 'rp_trigger_load' => $yes ], [ 'include/singular/post', 'exclude/singular/post/' . $posts['b'] ] );
$P['search'] = pp_popup( 'search', [ 'rp_trigger_load' => $yes ], [ 'include/archive/search' ] );

// Audience: logged in, logged out, editors only.
$P['aud_in'] = pp_popup( 'aud_in', [ 'rp_audience' => 'logged_in' ], $on( 'pp-aud' ) );
$P['aud_out'] = pp_popup( 'aud_out', [ 'rp_audience' => 'logged_out' ], $on( 'pp-aud' ) );
$P['aud_editor'] = pp_popup( 'aud_editor', [ 'rp_audience' => 'logged_in', 'rp_roles' => [ 'editor' ] ], $on( 'pp-aud' ) );

$P['dev_mobile'] = pp_popup( 'dev_mobile', [ 'rp_trigger_load' => $yes, 'rp_devices' => [ 'mobile' ] ], $on( 'pp-dev' ) );
$P['ref_search'] = pp_popup( 'ref_search', [ 'rp_trigger_load' => $yes, 'rp_referrer' => 'search' ], $on( 'pp-ref' ) );
$P['param'] = pp_popup( 'param', [ 'rp_trigger_load' => $yes, 'rp_param_name' => 'promo', 'rp_param_value' => 'spring' ], $on( 'pp-param' ) );

$tz = wp_timezone();
$fmt = fn( $offset, $format ) => ( new DateTimeImmutable( '@' . ( time() + $offset ) ) )->setTimezone( $tz )->format( $format );
$P['sched_expired'] = pp_popup( 'sched_expired', [ 'rp_trigger_load' => $yes, 'rp_schedule' => $yes, 'rp_schedule_end' => $fmt( -3600, 'Y-m-d H:i' ) ], $on( 'pp-sched' ) );
$P['sched_future'] = pp_popup( 'sched_future', [ 'rp_trigger_load' => $yes, 'rp_schedule' => $yes, 'rp_schedule_start' => $fmt( 86400, 'Y-m-d H:i' ) ], $on( 'pp-sched' ) );
$P['sched_hours_out'] = pp_popup( 'sched_hours_out', [ 'rp_trigger_load' => $yes, 'rp_schedule' => $yes, 'rp_time_from' => $fmt( 7200, 'H:i' ), 'rp_time_to' => $fmt( 10800, 'H:i' ) ], $on( 'pp-sched' ) );
$P['sched_hours_in'] = pp_popup( 'sched_hours_in', [ 'rp_trigger_load' => $yes, 'rp_schedule' => $yes, 'rp_time_from' => $fmt( -7200, 'H:i' ), 'rp_time_to' => $fmt( 7200, 'H:i' ), 'rp_schedule_start' => $fmt( -86400, 'Y-m-d H:i' ), 'rp_schedule_end' => $fmt( 86400, 'Y-m-d H:i' ) ], $on( 'pp-sched' ) );

$P['queue_high'] = pp_popup( 'queue_high', [ 'rp_trigger_load' => $yes, 'rp_priority' => 5 ], $on( 'pp-queue' ) );
$P['queue_low'] = pp_popup( 'queue_low', [ 'rp_trigger_load' => $yes, 'rp_priority' => 1 ], $on( 'pp-queue' ) );

// A form inside a popup that closes the popup, and a form on a page that opens a "thanks" popup.
$P['formpop'] = pp_popup( 'formpop', [ 'rp_trigger_load' => $yes ], $on( 'pp-form' ), [ pp_container( [
	pp_widget( 'heading', [ 'title' => 'Popup formpop', 'header_size' => 'h2' ] ),
	pp_form( 'ppform1', [ [ '_id' => 'a1', 'action_type' => 'collect' ], [ '_id' => 'a2', 'action_type' => 'popup_close', 'popup_id' => '0' ] ] ),
] ) ] );
$P['thanks'] = pp_popup( 'thanks', [], $on( 'pp-form2' ) );
$docs->get( $pages['pp-form2'] )->save( [ 'elements' => [ pp_container( [
	pp_widget( 'heading', [ 'title' => 'Page pp-form2', 'header_size' => 'h1' ] ),
	pp_form( 'ppform2', [ [ '_id' => 'b1', 'action_type' => 'collect' ], [ '_id' => 'b2', 'action_type' => 'popup_open', 'popup_id' => (string) $P['thanks'] ] ] ),
] ) ], 'settings' => [ 'post_status' => 'publish' ] ] );

// Nested popup.
$P['nest_b'] = pp_popup( 'nest_b', [], $on( 'pp-nested' ) );
$P['nest_a'] = pp_popup( 'nest_a', [ 'rp_trigger_load' => $yes ], $on( 'pp-nested' ), [ pp_container( [
	pp_widget( 'heading', [ 'title' => 'Popup nest_a', 'header_size' => 'h2' ] ),
	pp_html( '<a class="to-b" href="#refraction-popup:open:' . $P['nest_b'] . '">Open B</a>' ),
] ) ] );

$P['anim'] = pp_popup( 'anim', [ 'rp_trigger_load' => $yes, 'rp_anim_in' => 'zoom', 'rp_anim_in_duration' => 600, 'rp_anim_out' => 'zoom', 'rp_anim_out_duration' => 600 ], $on( 'pp-anim' ) );

$P['a11y'] = pp_popup( 'a11y', [ 'rp_trigger_click' => $yes, 'rp_click_selector' => '.opener' ], $on( 'pp-a11y' ), [ pp_container( [
	pp_widget( 'heading', [ 'title' => 'Popup a11y', 'header_size' => 'h2' ] ),
	pp_html( '<input id="a11y-one" type="text" aria-label="one"><input id="a11y-two" type="text" aria-label="two">' ),
] ) ] );

$P['auto'] = pp_popup( 'auto', [ 'rp_trigger_load' => $yes, 'rp_autoclose' => 2 ], $on( 'pp-auto' ) );
$P['noclose'] = pp_popup( 'noclose', [ 'rp_trigger_load' => $yes, 'rp_close_esc' => '', 'rp_close_overlay' => '' ], $on( 'pp-noclose' ) );

$P['xss'] = pp_popup( 'xss"><script>window.__xss=1</script>', [ 'rp_trigger_click' => $yes, 'rp_click_selector' => 'a"><img src=x onerror=window.__xss=2>', 'rp_trigger_load' => $yes ], $on( 'pp-xss' ) );

$P['dismiss'] = pp_popup( 'dismiss', [ 'rp_trigger_load' => $yes ], $on( 'pp-dismiss' ), [ pp_container( [
	pp_widget( 'heading', [ 'title' => 'Popup dismiss', 'header_size' => 'h2' ] ),
	pp_html( '<button type="button" class="never" data-refraction-popup-dismiss>Never show again</button>' ),
] ) ] );

$P['lock'] = pp_popup( 'lock', [], $on( 'pp-lock' ) );

// Page content that needs popup IDs or tall pages.
$page_content = [
	'pp-scroll' => [ $spacer( 3000 ) ],
	'pp-scrollel' => [ $spacer( 2500 ), pp_html( '<div id="pp-target" style="height:120px">Target</div>' ), $spacer( 800 ) ],
	'pp-scrollup' => [ $spacer( 3000 ) ],
	'pp-lock' => [ $spacer( 3000 ) ],
	'pp-click' => [ pp_html( '<button type="button" class="open-me">Open the popup</button>' ) ],
	'pp-a11y' => [ pp_html( '<button type="button" class="opener" id="opener">Opener</button>' ) ],
	'pp-link' => [
		pp_widget( 'button', [ 'text' => 'Open via tag', '_css_classes' => 'tag-link' ], [ 'link' => pp_tag( 'popup', [ 'popup_action' => 'open', 'popup_id' => (string) $P['link'] ] ) ] ),
		pp_html( '<a class="toggle-link" href="#refraction-popup:toggle:' . $P['link'] . '">Toggle</a>' ),
	],
	'pp-event' => [ $spacer( 2000 ) ],
];

foreach ( $page_content as $slug => $widgets ) {
	$docs->get( $pages[ $slug ] )->save( [ 'elements' => [ pp_container( array_merge( [ pp_widget( 'heading', [ 'title' => 'Page ' . $slug, 'header_size' => 'h1' ] ) ], $widgets ) ) ], 'settings' => [ 'post_status' => 'publish' ] ] );
}

// A draft popup whose conditions match everywhere: must never be printed.
$P['draft'] = pp_popup( 'draft', [ 'rp_trigger_load' => $yes ], [ 'include/singular/page/' . $pages['pp-load'] ], null, 'draft' );

echo wp_json_encode( [ 'pages' => $pages, 'popups' => $P, 'posts' => $posts ] );
