<?php
/**
 * Test fixture for scripts/check-theme-builder.mjs (run with `wp eval-file`, test sites only).
 *
 * Env TB_ACTION:
 *   content    create the pages, posts, terms and users the check navigates; prints their IDs as JSON
 *   templates  TB_SPEC = JSON list of { key, type, title, rules, status?, age? }; creates Refraction
 *              header/footer templates through the document API and prints { key: id } as JSON
 *   reset      delete every header and footer template
 *   floating   create a published Floating Element with TB_RULES (JSON list); prints its ID
 */
wp_set_current_user( 1 );

$action = getenv( 'TB_ACTION' );
$docs = \Refraction\Plugin::$instance->documents;

function tb_elements( $text ) {
	return [ [
		'id' => substr( md5( $text . 'c' ), 0, 7 ),
		'elType' => 'container',
		'settings' => [],
		'elements' => [ [
			'id' => substr( md5( $text . 'w' ), 0, 7 ),
			'elType' => 'widget',
			'widgetType' => 'heading',
			'settings' => [ 'title' => $text ],
			'elements' => [],
		] ],
	] ];
}

function tb_reset() {
	foreach ( get_posts( [ 'post_type' => 'refraction_library', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => '_refraction_template_type', 'meta_value' => [ 'header', 'footer' ], 'meta_compare' => 'IN' ] ) as $id ) {
		wp_delete_post( $id, true );
	}

	delete_option( 'refraction_pro_theme_builder_conditions' );
}

if ( 'content' === $action ) {
	$out = [];
	$term = function ( $slug, $name ) {
		$existing = get_term_by( 'slug', $slug, 'category' );

		return $existing ? $existing->term_id : wp_insert_term( $name, 'category', [ 'slug' => $slug ] )['term_id'];
	};

	$out['news'] = $term( 'news', 'News' );
	$out['other'] = $term( 'other', 'Other' );

	if ( ! get_user_by( 'login', 'author1' ) ) {
		wp_insert_user( [ 'user_login' => 'author1', 'user_pass' => 'author1', 'user_email' => 'author1@example.com', 'role' => 'author', 'display_name' => 'Ada Author' ] );
	}

	$out['author'] = get_user_by( 'login', 'author1' )->ID;
	$out['editor'] = get_user_by( 'login', 'editor' )->ID;

	$page = function ( $slug, $title, $parent = 0 ) {
		$existing = get_page_by_path( $parent ? 'about/' . $slug : $slug );

		return $existing ? $existing->ID : wp_insert_post( [ 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $title . ' body', 'post_parent' => $parent ] );
	};

	$out['home'] = $page( 'welcome', 'Welcome' );
	$out['about'] = $page( 'about', 'About' );
	$out['contact'] = $page( 'contact', 'Contact' );
	$out['team'] = $page( 'team', 'Team', $out['about'] );
	update_option( 'show_on_front', 'page' );
	update_option( 'page_on_front', $out['home'] );
	update_option( 'permalink_structure', '/%postname%/' );

	$post = function ( $slug, $title, $author, $cats ) {
		$existing = get_page_by_path( $slug, OBJECT, 'post' );

		return $existing ? $existing->ID : wp_insert_post( [ 'post_status' => 'publish', 'post_title' => $title, 'post_name' => $slug, 'post_content' => $title . ' body', 'post_author' => $author, 'post_category' => $cats, 'post_date' => '2025-03-05 10:00:00' ] );
	};

	$out['post_news'] = $post( 'news-story', 'News story', 1, [ $out['news'] ] );
	$out['post_other'] = $post( 'other-story', 'Other story', $out['author'], [ $out['other'] ] );
	flush_rewrite_rules();
	echo wp_json_encode( $out );
} elseif ( 'reset' === $action ) {
	tb_reset();
	echo '{}';
} elseif ( 'templates' === $action ) {
	tb_reset();
	$ids = [];

	foreach ( json_decode( getenv( 'TB_SPEC' ), true ) as $spec ) {
		$doc = $docs->create( $spec['type'], [ 'post_title' => $spec['title'], 'post_status' => 'publish' ] );
		$status = $spec['status'] ?? 'publish';
		$doc->save( [
			'elements' => tb_elements( $spec['title'] ),
			'settings' => [ 'post_status' => $status, 'refraction_display_conditions' => $spec['rules'] ],
		] );

		$id = $doc->get_main_id();
		$when = gmdate( 'Y-m-d H:i:s', time() - (int) ( $spec['age'] ?? 0 ) );
		global $wpdb;
		$wpdb->update( $wpdb->posts, [ 'post_modified_gmt' => $when, 'post_modified' => get_date_from_gmt( $when ) ], [ 'ID' => $id ] );
		clean_post_cache( $id );
		$ids[ $spec['key'] ] = $id;
	}

	echo wp_json_encode( $ids );
} elseif ( 'floating' === $action ) {
	$doc = $docs->create( 'floating-buttons', [ 'post_title' => 'TB-FLOAT', 'post_status' => 'publish' ] );
	$doc->save( [ 'elements' => tb_elements( 'TB-FLOAT-CONTENT' ), 'settings' => [ 'post_status' => 'publish' ] ] );
	$id = $doc->get_main_id();
	update_post_meta( $id, '_refraction_conditions', json_decode( getenv( 'TB_RULES' ), true ) );
	( new \Refraction\Modules\FloatingButtons\Classes\Conditions\Conditions_Cache() )->add_to_cache( $id, json_decode( getenv( 'TB_RULES' ), true ) );
	echo wp_json_encode( [ 'id' => $id ] );
}
