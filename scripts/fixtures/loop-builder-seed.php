<?php
/**
 * Test fixture for scripts/check-loop-builder.mjs (run with `wp eval-file`, test sites only).
 *
 * Env LB_ACTION:
 *   content   create categories, authors, 13 public posts (7 in News, 6 in Other, each with a featured image and
 *             a `subtitle` custom field) and four hidden posts (private, draft, password, scheduled); prints IDs
 *   templates create the Loop Item template and the pages the check opens; prints their IDs (needs `content`)
 *   cleanup   delete everything this fixture created
 */
wp_set_current_user( 1 );

$action = getenv( 'LB_ACTION' );
$docs = \Refraction\Plugin::$instance->documents;
$tags = \Refraction\Plugin::$instance->dynamic_tags;

function lb_tag( $name, $settings = [] ) {
	// Built by hand (same format as the dynamic tags manager) so a tag of an optional plugin such as ACF can be
	// saved while that plugin is not active.
	return sprintf( '[refraction-tag id="%1$s" name="%2$s" settings="%3$s"]', substr( md5( $name . wp_json_encode( $settings ) ), 0, 7 ), $name, urlencode( wp_json_encode( (object) $settings ) ) );
}

function lb_id( $seed ) {
	return substr( md5( $seed ), 0, 7 );
}

function lb_widget( $type, $settings = [], $dynamic = [] ) {
	if ( $dynamic ) {
		$settings['__dynamic__'] = $dynamic;
	}

	return [ 'id' => lb_id( $type . wp_json_encode( $settings ) ), 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => [] ];
}

function lb_container( $children, $settings = [] ) {
	return [ 'id' => lb_id( 'c' . wp_json_encode( $children ) ), 'elType' => 'container', 'settings' => $settings, 'elements' => $children ];
}

function lb_png( $r, $g, $b ) {
	$im = imagecreatetruecolor( 600, 400 );
	imagefill( $im, 0, 0, imagecolorallocate( $im, $r, $g, $b ) );
	ob_start();
	imagepng( $im );

	return ob_get_clean();
}

function lb_attachment( $name, $rgb ) {
	$upload = wp_upload_bits( $name . '.png', null, lb_png( ...$rgb ) );
	$id = wp_insert_attachment( [ 'post_mime_type' => 'image/png', 'post_title' => $name, 'post_status' => 'inherit' ], $upload['file'] );
	require_once ABSPATH . 'wp-admin/includes/image.php';
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $upload['file'] ) );

	return $id;
}

function lb_cleanup() {
	foreach ( get_posts( [ 'post_type' => 'any', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_lb_fixture', 'meta_value' => '1' ] ) as $id ) {
		wp_delete_post( $id, true );
	}

	foreach ( get_posts( [ 'post_type' => 'refraction_library', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_refraction_template_type', 'meta_value' => 'loop-item' ] ) as $id ) {
		wp_delete_post( $id, true );
	}
}

function lb_page( $docs, $slug, $title, $elements ) {
	$existing = get_page_by_path( $slug );

	if ( $existing ) {
		wp_delete_post( $existing->ID, true );
	}

	$doc = $docs->create( 'wp-page', [ 'post_title' => $title, 'post_name' => $slug, 'post_status' => 'publish' ] );
	$doc->save( [ 'elements' => $elements, 'settings' => [ 'post_status' => 'publish' ] ] );
	update_post_meta( $doc->get_main_id(), '_lb_fixture', '1' );

	return $doc->get_main_id();
}

if ( 'cleanup' === $action ) {
	lb_cleanup();
	wp_update_post( [ 'ID' => 1, 'post_status' => 'publish' ] );
	echo wp_json_encode( [ 'ok' => true ] );
} elseif ( 'content' === $action ) {
	lb_cleanup();
	$out = [];

	// "Hello world" is a normal public post; the counts below assume only the fixture posts are public.
	wp_update_post( [ 'ID' => 1, 'post_status' => 'draft' ] );

	foreach ( [ 'news' => 'News', 'other' => 'Other' ] as $slug => $name ) {
		$term = get_term_by( 'slug', $slug, 'category' );
		$out[ $slug ] = $term ? $term->term_id : wp_insert_term( $name, 'category', [ 'slug' => $slug ] )['term_id'];
	}

	if ( ! get_user_by( 'login', 'author1' ) ) {
		wp_insert_user( [ 'user_login' => 'author1', 'user_pass' => 'author1', 'user_email' => 'author1@example.com', 'role' => 'author', 'display_name' => 'Ada Author' ] );
	}

	$author = get_user_by( 'login', 'author1' )->ID;
	update_user_meta( $author, 'description', 'Ada writes about loops.' );
	$out['author'] = $author;
	$out['editor'] = get_user_by( 'login', 'editor' )->ID;
	$out['thumb_a'] = lb_attachment( 'lb-red', [ 200, 60, 60 ] );
	$out['thumb_b'] = lb_attachment( 'lb-blue', [ 60, 90, 200 ] );
	$out['posts'] = [];

	for ( $i = 1; $i <= 13; $i++ ) {
		$news = $i <= 7;
		$id = wp_insert_post( [
			'post_title' => sprintf( 'Loop Post %02d', $i ),
			'post_name' => sprintf( 'loop-post-%02d', $i ),
			'post_status' => 'publish',
			'post_author' => $i % 2 ? $author : 1,
			'post_content' => sprintf( 'Body of loop post %02d. It has a few words so that excerpts have something to cut.', $i ),
			'post_category' => [ $news ? $out['news'] : $out['other'] ],
			'post_date' => gmdate( 'Y-m-d H:i:s', time() - $i * 3600 ),
		] );
		update_post_meta( $id, 'subtitle', sprintf( 'Subtitle %02d', $i ) );
		update_post_meta( $id, '_secret_meta', 'must-not-leak' );
		update_post_meta( $id, '_lb_fixture', '1' );
		set_post_thumbnail( $id, $i % 2 ? $out['thumb_a'] : $out['thumb_b'] );
		$out['posts'][] = $id;
	}

	$hidden = [
		'private' => [ 'post_status' => 'private', 'post_title' => 'Hidden Private Post' ],
		'draft' => [ 'post_status' => 'draft', 'post_title' => 'Hidden Draft Post' ],
		'password' => [ 'post_status' => 'publish', 'post_title' => 'Hidden Password Post', 'post_password' => 'secret' ],
		'future' => [ 'post_status' => 'future', 'post_title' => 'Hidden Scheduled Post', 'post_date' => gmdate( 'Y-m-d H:i:s', time() + 86400 * 10 ) ],
	];

	foreach ( $hidden as $key => $args ) {
		$id = wp_insert_post( $args + [ 'post_content' => 'Hidden body', 'post_category' => [ $out['news'] ], 'post_author' => 1 ] );
		update_post_meta( $id, '_lb_fixture', '1' );
		set_post_thumbnail( $id, $out['thumb_a'] );
		$out[ 'hidden_' . $key ] = $id;
	}

	echo wp_json_encode( $out );
} elseif ( 'templates' === $action ) {
	// Advanced Custom Fields may be missing on the test site: its tags are only known while get_field() exists, and
	// a dynamic setting of an unknown tag is dropped when a document is saved. A stand in lets the fixture store one.
	if ( ! function_exists( 'get_field' ) ) {
		function get_field() {
			return null;
		}
	}

	$content = json_decode( getenv( 'LB_CONTENT' ), true );
	$out = [];

	$item = $docs->create( 'loop-item', [ 'post_title' => 'LB Card', 'post_status' => 'publish' ] );
	$item->save( [
		'elements' => [ lb_container( [
			lb_widget( 'image', [ 'image' => [ 'url' => '', 'id' => '' ], 'image_size' => 'medium' ], [ 'image' => lb_tag( 'post-featured-image' ) ] ),
			lb_widget( 'heading', [ 'title' => 'x', 'header_size' => 'h3' ], [ 'title' => lb_tag( 'post-title' ), 'link' => lb_tag( 'post-url' ) ] ),
			lb_widget( 'text-editor', [ 'editor' => 'x' ], [ 'editor' => lb_tag( 'post-custom-field', [ 'key' => 'subtitle', 'before' => 'Sub: ', 'fallback' => 'no subtitle' ] ) ] ),
			lb_widget( 'text-editor', [ 'editor' => 'x' ], [ 'editor' => lb_tag( 'author-name', [ 'before' => 'By ' ] ) ] ),
			lb_widget( 'text-editor', [ 'editor' => 'x' ], [ 'editor' => lb_tag( 'post-terms', [ 'taxonomy' => 'category', 'link' => '' ] ) ] ),
		] ) ],
		'settings' => [ 'post_status' => 'publish' ],
	] );
	update_post_meta( $item->get_main_id(), '_lb_fixture', '1' );
	$out['item'] = $item->get_main_id();
	$tpl = (string) $out['item'];

	$grid = fn( $extra = [], $id = null ) => lb_widget( 'loop-grid', $extra + [ 'template_id' => $tpl, 'query_posts_per_page' => 4, 'query_ignore_sticky_posts' => 'yes', 'query_exclude_current' => '', 'pagination_type' => 'numbers' ] );

	$out['grid'] = lb_page( $docs, 'lb-grid', 'LB Grid', [ lb_container( [ $grid() ] ) ] );
	$out['grid_more'] = lb_page( $docs, 'lb-grid-more', 'LB Grid More', [ lb_container( [ $grid( [ 'pagination_type' => 'load_more', 'query_posts_per_page' => 5 ] ) ] ) ] );
	$out['grid_infinite'] = lb_page( $docs, 'lb-grid-infinite', 'LB Grid Infinite', [ lb_container( [ $grid( [ 'pagination_type' => 'infinite', 'query_posts_per_page' => 5 ] ) ] ) ] );
	$out['grid_filter'] = lb_page( $docs, 'lb-filter', 'LB Filter', [ lb_container( [
		lb_widget( 'taxonomy-filter', [ 'taxonomy' => 'category', 'target_id' => 'lb-target', 'show_count' => 'yes' ] ),
		array_merge( $grid(), [ 'settings' => $grid()['settings'] + [ '_element_id' => 'lb-target' ] ] ),
	] ) ] );
	$out['grid_excl'] = lb_page( $docs, 'lb-grid-query', 'LB Grid Query', [ lb_container( [
		$grid( [ 'query_include_term_ids' => [ $content['news'] ], 'query_exclude_ids' => [ $content['posts'][0] ], 'query_orderby' => 'title', 'query_order' => 'ASC', 'query_posts_per_page' => 20, 'pagination_type' => 'none', 'query_offset' => 1 ] ),
	] ) ] );
	$out['posts_cards'] = lb_page( $docs, 'lb-posts', 'LB Posts', [ lb_container( [
		lb_widget( 'posts', [ 'skin' => 'cards', 'query_posts_per_page' => 4, 'query_ignore_sticky_posts' => 'yes', 'query_exclude_current' => '', 'pagination_type' => 'numbers_prev_next', 'meta_items' => [ 'author', 'date', 'comments', 'terms' ] ] ),
	] ) ] );
	$out['posts_full'] = lb_page( $docs, 'lb-posts-full', 'LB Posts Full', [ lb_container( [
		lb_widget( 'posts', [ 'skin' => 'full_content', 'query_posts_per_page' => 2, 'query_exclude_current' => '', 'pagination_type' => 'prev_next' ] ),
	] ) ] );
	$out['posts_classic_more'] = lb_page( $docs, 'lb-posts-more', 'LB Posts More', [ lb_container( [
		lb_widget( 'posts', [ 'skin' => 'classic', 'query_posts_per_page' => 3, 'query_exclude_current' => '', 'pagination_type' => 'load_more' ] ),
	] ) ] );
	$out['portfolio'] = lb_page( $docs, 'lb-portfolio', 'LB Portfolio', [ lb_container( [
		lb_widget( 'portfolio', [ 'layout' => 'masonry', 'query_posts_per_page' => 8, 'query_exclude_current' => '', 'pagination_type' => 'none' ] ),
	] ) ] );
	$out['portfolio_grid'] = lb_page( $docs, 'lb-portfolio-grid', 'LB Portfolio Grid', [ lb_container( [
		lb_widget( 'portfolio', [ 'layout' => 'grid', 'query_posts_per_page' => 6, 'query_exclude_current' => '', 'pagination_type' => 'load_more' ] ),
	] ) ] );
	$out['carousel'] = lb_page( $docs, 'lb-carousel', 'LB Carousel', [ lb_container( [
		lb_widget( 'loop-carousel', [ 'template_id' => $tpl, 'query_posts_per_page' => 6, 'query_exclude_current' => '', 'slides_to_show' => '3', 'slides_to_show_tablet' => '2', 'slides_to_show_mobile' => '1', 'navigation' => 'both', 'autoplay' => '' ] ),
	] ) ] );
	$out['archive'] = lb_page( $docs, 'lb-archive-block', 'LB Archive Block', [ lb_container( [
		lb_widget( 'archive-posts', [ 'skin' => 'classic', 'archive_posts_per_page' => 4, 'pagination_type' => 'numbers' ] ),
	] ) ] );
	$out['empty'] = lb_page( $docs, 'lb-empty', 'LB Empty', [ lb_container( [
		lb_widget( 'posts', [ 'query_include_term_ids' => [ $content['other'] ], 'query_include_authors' => [ $content['editor'] ], 'query_posts_per_page' => 4, 'query_exclude_current' => '', 'nothing_found_message' => 'Nothing here at all.' ] ),
	] ) ] );
	$out['recursion'] = lb_page( $docs, 'lb-recursion', 'LB Recursion', [ lb_container( [ $grid( [ 'query_posts_per_page' => 2 ] ) ] ) ] );

	// A loop item that contains a loop grid that points at itself must not run away.
	$self = $docs->create( 'loop-item', [ 'post_title' => 'LB Self', 'post_status' => 'publish' ] );
	$self->save( [ 'elements' => [ lb_container( [
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-title' ) ] ),
		lb_widget( 'loop-grid', [ 'template_id' => (string) $self->get_main_id(), 'query_posts_per_page' => 2, 'query_exclude_current' => '' ] ),
	] ) ], 'settings' => [ 'post_status' => 'publish' ] ] );
	update_post_meta( $self->get_main_id(), '_lb_fixture', '1' );
	$out['self'] = $self->get_main_id();
	$out['self_page'] = lb_page( $docs, 'lb-self', 'LB Self Page', [ lb_container( [ lb_widget( 'loop-grid', [ 'template_id' => (string) $out['self'], 'query_posts_per_page' => 2, 'query_exclude_current' => '' ] ) ] ) ] );

	// Dynamic tags on a normal page.
	$page_tags = [
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-title' ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'site-title' ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'site-tagline', [ 'before' => 'Tagline: ', 'after' => '!' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'request-parameter', [ 'param_name' => 'who', 'fallback' => 'nobody' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'shortcode', [ 'shortcode' => '[lb_sc]' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'user-info', [ 'field' => 'display_name', 'fallback' => 'visitor-anon' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-id' ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-custom-field', [ 'key' => '_secret_meta', 'fallback' => 'protected-key-empty' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'page-title' ) ] ),
		lb_widget( 'button', [ 'text' => 'Mail', 'link' => [ 'url' => '' ] ], [ 'link' => lb_tag( 'contact-url', [ 'link_type' => 'email', 'email' => 'hi@example.com', 'subject' => 'Hello' ] ) ] ),
		lb_widget( 'button', [ 'text' => 'Call', 'link' => [ 'url' => '' ] ], [ 'link' => lb_tag( 'contact-url', [ 'link_type' => 'tel', 'number' => '+1 555 010 2030' ] ) ] ),
		lb_widget( 'button', [ 'text' => 'WhatsApp', 'link' => [ 'url' => '' ] ], [ 'link' => lb_tag( 'contact-url', [ 'link_type' => 'whatsapp', 'number' => '+44 20 7946 0958', 'body' => 'Hi' ] ) ] ),
		lb_widget( 'button', [ 'text' => 'Popup', 'link' => [ 'url' => '' ] ], [ 'link' => lb_tag( 'popup', [ 'popup_action' => 'open', 'popup_id' => 5 ] ) ] ),
		lb_widget( 'button', [ 'text' => 'Internal', 'link' => [ 'url' => '' ] ], [ 'link' => lb_tag( 'internal-url', [ 'type' => 'post', 'post_id' => (string) $content['posts'][2] ] ) ] ),
		lb_widget( 'button', [ 'text' => 'Lightbox', 'link' => [ 'url' => '' ] ], [ 'link' => lb_tag( 'lightbox', [ 'type' => 'video', 'video_url' => 'https://www.youtube.com/watch?v=XHOmBV4js_E' ] ) ] ),
	];
	$out['tags_page'] = lb_page( $docs, 'lb-tags', 'LB Tags Page', [ lb_container( $page_tags ) ] );

	$out['dyn_page'] = lb_page( $docs, 'lb-dyn', 'LB Dyn Page', [ lb_container( [ lb_widget( 'lb-dynamic-test', [] ) ] ) ] );

	// A post built with the editor: single view, post context, related posts, ACF stand in.
	$post = $docs->create( 'wp-post', [ 'post_title' => 'LB Built Post', 'post_name' => 'lb-built-post', 'post_status' => 'publish', 'post_category' => [ $content['news'] ], 'post_author' => $content['author'], 'post_date' => gmdate( 'Y-m-d H:i:s', time() - 30 * 86400 ) ] );
	$post->save( [ 'elements' => [ lb_container( [
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-title' ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'author-name', [ 'before' => 'Author: ' ] ) ] ),
		lb_widget( 'text-editor', [ 'editor' => 'x' ], [ 'editor' => lb_tag( 'author-bio' ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-terms', [ 'taxonomy' => 'category', 'link' => 'yes', 'separator' => ' | ' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-custom-field', [ 'key' => 'subtitle', 'fallback' => 'empty-subtitle' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-comments', [ 'format' => 'text' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'post-date', [ 'format' => 'Y-m-d' ] ) ] ),
		lb_widget( 'heading', [ 'title' => 'x' ], [ 'title' => lb_tag( 'acf-text', [ 'key' => 'acf_demo' ] ) ] ),
		lb_widget( 'posts', [ 'skin' => 'classic', 'query_post_type' => 'related', 'related_taxonomies' => [ 'category' ], 'query_posts_per_page' => 3, 'pagination_type' => 'none', 'query_ignore_sticky_posts' => 'yes' ] ),
	] ) ], 'settings' => [ 'post_status' => 'publish' ] ] );
	wp_set_post_categories( $post->get_main_id(), [ $content['news'] ] );
	update_post_meta( $post->get_main_id(), 'subtitle', 'Built subtitle' );
	update_post_meta( $post->get_main_id(), '_lb_fixture', '1' );
	$out['built_post'] = $post->get_main_id();

	echo wp_json_encode( $out );
}
