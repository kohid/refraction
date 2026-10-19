<?php
/**
 * Test fixture for scripts/check-theme-builder-2.mjs (run with `wp eval-file`, test sites only).
 *
 * Env TB2_ACTION:
 *   content    create pages, posts, books, terms, users, comments, a featured image and a logo; prints IDs as JSON
 *   templates  TB2_SPEC = JSON list of { key, type, title, rules, widgets?, status?, age? }; creates Refraction
 *              templates of any Theme Builder type through the document API; prints { key: id } as JSON.
 *              Every template starts with a heading "[key]" so the check can tell which one rendered.
 *   reset      delete every Theme Builder template (all six types)
 */
wp_set_current_user( 1 );

$action = getenv( 'TB2_ACTION' );
$docs = \Refraction\Plugin::$instance->documents;
$types = [ 'header', 'footer', 'single', 'archive', 'search-results', 'error-404' ];

function tb2_elements( $key, $widgets ) {
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

function tb2_reset( $types ) {
	foreach ( get_posts( [ 'post_type' => 'refraction_library', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_refraction_template_type', 'meta_value' => $types, 'meta_compare' => 'IN' ] ) as $id ) {
		wp_delete_post( $id, true );
	}

	delete_option( 'refraction_pro_theme_builder_conditions' );
}

if ( 'content' === $action ) {
	$out = [];
	$term = function ( $slug, $name, $tax = 'category' ) {
		$existing = get_term_by( 'slug', $slug, $tax );

		return $existing ? $existing->term_id : wp_insert_term( $name, $tax, [ 'slug' => $slug ] )['term_id'];
	};

	$out['news'] = $term( 'news', 'News' );
	$out['other'] = $term( 'other', 'Other' );
	$out['demo'] = $term( 'demo', 'Demo', 'post_tag' );
	$out['fiction'] = $term( 'fiction', 'Fiction', 'genre' );

	wp_update_user( [ 'ID' => 1, 'display_name' => 'Site Admin' ] );

	if ( ! get_user_by( 'login', 'author1' ) ) {
		wp_insert_user( [ 'user_login' => 'author1', 'user_pass' => 'author1', 'user_email' => 'author1@example.com', 'role' => 'author', 'display_name' => 'Ada Author', 'description' => 'Ada writes about tests.' ] );
	}

	$out['author'] = get_user_by( 'login', 'author1' )->ID;

	// One image used as featured image and logo.
	$upload = wp_upload_dir();
	$file = $upload['path'] . '/tb2-image.png';
	file_put_contents( $file, base64_decode( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' ) );
	$existing = get_posts( [ 'post_type' => 'attachment', 'title' => 'tb2-image', 'numberposts' => 1, 'fields' => 'ids' ] );
	if ( $existing ) {
		$out['image'] = $existing[0];
	} else {
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$out['image'] = wp_insert_attachment( [ 'post_mime_type' => 'image/png', 'post_title' => 'tb2-image', 'post_status' => 'inherit' ], $file );
		wp_update_attachment_metadata( $out['image'], wp_generate_attachment_metadata( $out['image'], $file ) );
	}
	set_theme_mod( 'custom_logo', $out['image'] );

	$page = function ( $slug, $title, $parent = 0 ) {
		$existing = get_page_by_path( $parent ? 'about/' . $slug : $slug );

		return $existing ? $existing->ID : wp_insert_post( [ 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $title . ' page body', 'post_parent' => $parent ] );
	};

	$out['home'] = $page( 'welcome', 'Welcome' );
	$out['blog'] = $page( 'blog', 'Blog' );
	$out['about'] = $page( 'about', 'About' );
	$out['contact'] = $page( 'contact', 'Contact' );
	$out['team'] = $page( 'team', 'Team', $out['about'] );
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $out['home'] );
	update_option( 'page_for_posts', $out['blog'] );
	update_option( 'permalink_structure', '/%postname%/' );
	update_option( 'blogdescription', 'Just a tagline' );
	update_option( 'default_comment_status', 'open' );

	$post = function ( $slug, $title, $author, $cats, $date, $extra = [] ) {
		$existing = get_page_by_path( $slug, OBJECT, 'post' );

		return $existing ? $existing->ID : wp_insert_post( [ 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $extra['content'] ?? ( $title . ' body text.' ), 'post_excerpt' => $extra['excerpt'] ?? '', 'post_author' => $author, 'post_category' => $cats, 'post_date' => $date ] );
	};

	$out['gamma'] = $post( 'gamma-post', 'Gamma Post', 1, [ $out['news'] ], '2025-02-01 10:00:00' );
	$out['alpha'] = $post( 'alpha-post', 'Alpha Post <i>x</i> & more', 1, [ $out['news'] ], '2025-03-05 10:00:00', [ 'content' => 'Alpha body text.', 'excerpt' => 'Alpha excerpt text.' ] );
	$out['beta'] = $post( 'beta-post', 'Beta Post', $out['author'], [ $out['other'] ], '2025-03-10 10:00:00', [ 'content' => 'Beta body text.' ] );
	wp_set_post_terms( $out['alpha'], [ $out['demo'] ], 'post_tag' );
	set_post_thumbnail( $out['alpha'], $out['image'] );

	if ( ! get_comments( [ 'post_id' => $out['alpha'], 'count' => true ] ) ) {
		foreach ( [ 'First comment', 'Second comment' ] as $text ) {
			wp_insert_comment( [ 'comment_post_ID' => $out['alpha'], 'comment_author' => 'Visitor', 'comment_author_email' => 'v@example.com', 'comment_content' => $text, 'comment_approved' => 1 ] );
		}
	}

	$book = function ( $slug, $title ) use ( $out ) {
		$existing = get_page_by_path( $slug, OBJECT, 'book' );

		if ( $existing ) {
			return $existing->ID;
		}

		$id = wp_insert_post( [ 'post_type' => 'book', 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $title . ' book body.' ] );
		wp_set_object_terms( $id, [ $out['fiction'] ], 'genre' );

		return $id;
	};

	$out['book1'] = $book( 'book-one', 'Book One' );
	$out['book2'] = $book( 'book-two', 'Book Two' );
	flush_rewrite_rules();
	echo wp_json_encode( $out );
} elseif ( 'reset' === $action ) {
	tb2_reset( $types );
	echo '{}';
} elseif ( 'templates' === $action ) {
	tb2_reset( $types );
	$ids = [];

	foreach ( json_decode( getenv( 'TB2_SPEC' ), true ) as $spec ) {
		$doc = $docs->create( $spec['type'], [ 'post_title' => $spec['title'] ?? $spec['key'], 'post_status' => 'publish' ] );
		$settings = [ 'post_status' => $spec['status'] ?? 'publish', 'refraction_display_conditions' => $spec['rules'] ];

		if ( isset( $spec['preview'] ) ) {
			$settings['refraction_preview_target'] = $spec['preview'];
		}

		$doc->save( [ 'elements' => tb2_elements( $spec['key'], $spec['widgets'] ?? [] ), 'settings' => $settings ] );

		$id = $doc->get_main_id();
		$when = gmdate( 'Y-m-d H:i:s', time() - (int) ( $spec['age'] ?? 0 ) );
		global $wpdb;
		$wpdb->update( $wpdb->posts, [ 'post_modified_gmt' => $when, 'post_modified' => get_date_from_gmt( $when ) ], [ 'ID' => $id ] );
		clean_post_cache( $id );
		$ids[ $spec['key'] ] = $id;
	}

	echo wp_json_encode( $ids );
}
