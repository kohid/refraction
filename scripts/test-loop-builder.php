<?php
/**
 * Standalone test for the Loop Builder pure logic (no WordPress, no database).
 *
 * Run: php scripts/test-loop-builder.php
 * Covers Query_Args (settings to WP_Query args), Pagination and Context_Token.
 * Exit code 1 on any failure.
 */

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	function sanitize_key( $key ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
	}

	function absint( $value ) {
		return abs( (int) $value );
	}

	function wp_json_encode( $v ) {
		return json_encode( $v );
	}

	spl_autoload_register( function ( $class ) {
		$prefix = 'Refraction\\Modules\\LoopBuilder\\';

		if ( 0 !== strpos( $class, $prefix ) ) {
			return;
		}

		$parts = array_map( fn( $p ) => str_replace( '_', '-', strtolower( $p ) ), explode( '\\', substr( $class, strlen( $prefix ) ) ) );
		$file = dirname( __DIR__ ) . '/modules/loop-builder/' . implode( '/', $parts ) . '.php';

		if ( is_file( $file ) ) {
			require_once $file;
		}
	} );
}

namespace Refraction\Tests\LoopBuilder {

	use Refraction\Modules\LoopBuilder\Classes\Context_Token;
	use Refraction\Modules\LoopBuilder\Classes\Pagination;
	use Refraction\Modules\LoopBuilder\Classes\Query_Args;

	$fail = 0;
	$total = 0;

	function check( string $name, $actual, $expected ): void {
		global $fail, $total;
		++$total;

		if ( $actual === $expected ) {
			echo "ok    $name\n";
			return;
		}

		++$fail;
		echo "FAIL  $name\n      expected: " . json_encode( $expected ) . "\n      actual:   " . json_encode( $actual ) . "\n";
	}

	$ctx = [
		'allowed_post_types' => [ 'post', 'page', 'book' ],
		'term_taxonomies' => [ 5 => 'category', 6 => 'category', 9 => 'post_tag' ],
	];

	// --- Query_Args ---------------------------------------------------------------------------------------
	$a = Query_Args::build( [], $ctx );
	check( 'defaults: post type post', $a['post_type'], 'post' );
	check( 'defaults: only published', $a['post_status'], 'publish' );
	check( 'defaults: password protected posts excluded', $a['has_password'], false );
	check( 'defaults: 6 per page', $a['posts_per_page'], 6 );
	check( 'defaults: newest first', [ $a['orderby'], $a['order'] ], [ 'date', 'DESC' ] );
	check( 'defaults: no tax query', isset( $a['tax_query'] ), false );
	check( 'defaults: no found rows skipping', isset( $a['no_found_rows'] ), false );

	$a = Query_Args::build( [ 'post_type' => 'book' ], $ctx );
	check( 'allowed custom post type', $a['post_type'], 'book' );

	$a = Query_Args::build( [ 'post_type' => 'secret' ], $ctx );
	check( 'unknown post type falls back to post', $a['post_type'], 'post' );

	$a = Query_Args::build( [ 'post_type' => 'attachment' ], [ 'allowed_post_types' => [ 'page' ] ] );
	check( 'fallback is first allowed type when post is not allowed', $a['post_type'], 'page' );

	$a = Query_Args::build( [ 'posts_per_page' => 0 ], $ctx );
	check( 'zero per page clamps to 1', $a['posts_per_page'], 1 );
	$a = Query_Args::build( [ 'posts_per_page' => '9999' ], $ctx );
	check( 'huge per page clamps to 100', $a['posts_per_page'], 100 );
	$a = Query_Args::build( [ 'posts_per_page' => 'abc' ], $ctx );
	check( 'non numeric per page uses default', $a['posts_per_page'], 6 );

	$a = Query_Args::build( [ 'orderby' => 'rand; DROP', 'order' => 'sideways' ], $ctx );
	check( 'bad orderby/order fall back', [ $a['orderby'], $a['order'] ], [ 'date', 'DESC' ] );
	$a = Query_Args::build( [ 'orderby' => 'title', 'order' => 'asc' ], $ctx );
	check( 'valid orderby/order', [ $a['orderby'], $a['order'] ], [ 'title', 'ASC' ] );

	$a = Query_Args::build( [ 'include_term_ids' => [ '5', 6, 9, 77 ] ], $ctx );
	check(
		'include terms grouped by taxonomy, unknown ids dropped',
		$a['tax_query'],
		[
			'relation' => 'AND',
			[ 'taxonomy' => 'category', 'field' => 'term_id', 'terms' => [ 5, 6 ], 'operator' => 'IN' ],
			[ 'taxonomy' => 'post_tag', 'field' => 'term_id', 'terms' => [ 9 ], 'operator' => 'IN' ],
		]
	);

	$a = Query_Args::build( [ 'include_term_ids' => [ 5 ], 'exclude_term_ids' => [ 9 ] ], $ctx );
	check(
		'exclude terms use NOT IN',
		$a['tax_query'],
		[
			'relation' => 'AND',
			[ 'taxonomy' => 'category', 'field' => 'term_id', 'terms' => [ 5 ], 'operator' => 'IN' ],
			[ 'taxonomy' => 'post_tag', 'field' => 'term_id', 'terms' => [ 9 ], 'operator' => 'NOT IN' ],
		]
	);

	$a = Query_Args::build( [ 'include_authors' => [ '3', 'x', 4 ], 'exclude_authors' => [ 8 ] ], $ctx );
	check( 'authors', [ $a['author__in'], $a['author__not_in'] ], [ [ 3, 4 ], [ 8 ] ] );

	$a = Query_Args::build( [ 'post_type' => 'by_id', 'posts_ids' => [ '11', 12, 'bad' ] ], $ctx );
	check( 'specific posts: post__in over every allowed type', [ $a['post__in'], $a['post_type'] ], [ [ 11, 12 ], [ 'post', 'page', 'book' ] ] );
	$a = Query_Args::build( [ 'post_type' => 'by_id', 'posts_ids' => [] ], $ctx );
	check( 'specific posts with none chosen finds nothing', $a['post__in'], [ 0 ] );

	$a = Query_Args::build( [ 'exclude_ids' => [ 4, '5' ] ], $ctx );
	check( 'exclude posts', $a['post__not_in'], [ 4, 5 ] );

	$a = Query_Args::build( [ 'exclude_current' => 'yes' ], $ctx + [ 'current_post_id' => 42 ] );
	check( 'exclude current post', $a['post__not_in'], [ 42 ] );

	$a = Query_Args::build( [ 'avoid_duplicates' => 'yes', 'exclude_ids' => [ 4 ] ], $ctx + [ 'displayed_ids' => [ 4, 7, 7 ] ] );
	check( 'avoid duplicates merges displayed ids', $a['post__not_in'], [ 4, 7 ] );
	$a = Query_Args::build( [], $ctx + [ 'displayed_ids' => [ 4 ] ] );
	check( 'duplicates kept when switch is off', isset( $a['post__not_in'] ), false );

	$a = Query_Args::build( [ 'ignore_sticky_posts' => 'yes' ], $ctx );
	check( 'ignore sticky', $a['ignore_sticky_posts'], true );
	$a = Query_Args::build( [], $ctx );
	check( 'sticky respected by default', $a['ignore_sticky_posts'], false );

	$a = Query_Args::build( [ 'offset' => 3, 'posts_per_page' => 5 ], $ctx );
	check( 'offset on page 1', [ $a['offset'], isset( $a['paged'] ) ], [ 3, false ] );
	$a = Query_Args::build( [ 'offset' => 3, 'posts_per_page' => 5 ], $ctx + [ 'paged' => 3 ] );
	check( 'offset on page 3 = offset + 2 pages', $a['offset'], 13 );
	$a = Query_Args::build( [ 'posts_per_page' => 5 ], $ctx + [ 'paged' => 3 ] );
	check( 'no offset uses paged', [ $a['paged'], isset( $a['offset'] ) ], [ 3, false ] );
	$a = Query_Args::build( [ 'posts_per_page' => 5 ], $ctx + [ 'paged' => -4 ] );
	check( 'negative page clamps to page 1 (no paged argument)', isset( $a['paged'] ), false );

	$related_ctx = $ctx + [
		'current_post_id' => 42,
		'current_post_type' => 'book',
		'current_post_terms' => [ 'category' => [ 5, 6 ], 'post_tag' => [ 9 ], 'genre' => [ 1 ] ],
	];
	$a = Query_Args::build( [ 'post_type' => 'related', 'related_taxonomies' => [ 'category', 'post_tag', 'nope' ] ], $related_ctx );
	check( 'related: same post type, excludes the current post', [ $a['post_type'], $a['post__not_in'] ], [ 'book', [ 42 ] ] );
	check(
		'related: OR over the chosen taxonomies the post has',
		$a['tax_query'],
		[
			'relation' => 'OR',
			[ 'taxonomy' => 'category', 'field' => 'term_id', 'terms' => [ 5, 6 ], 'operator' => 'IN' ],
			[ 'taxonomy' => 'post_tag', 'field' => 'term_id', 'terms' => [ 9 ], 'operator' => 'IN' ],
		]
	);
	$a = Query_Args::build( [ 'post_type' => 'related', 'related_taxonomies' => [ 'category' ] ], $ctx );
	check( 'related without a current post finds nothing', $a['post__in'], [ 0 ] );
	$a = Query_Args::build( [ 'post_type' => 'related', 'related_taxonomies' => [ 'genre' ] ], array_merge( $related_ctx, [ 'current_post_terms' => [] ] ) );
	check( 'related with a post that has no terms finds nothing', $a['post__in'], [ 0 ] );

	$a = Query_Args::build( [ 'query_post_type' => 'book', 'query_posts_per_page' => 3 ], $ctx, 'query_' );
	check( 'prefixed settings', [ $a['post_type'], $a['posts_per_page'] ], [ 'book', 3 ] );

	$a = Query_Args::build( [ 'post_type' => 'book' ], $ctx, '', [ 'taxonomy' => 'category', 'term_id' => 6 ] );
	check(
		'filter adds a required term',
		$a['tax_query'],
		[
			'relation' => 'AND',
			[ 'taxonomy' => 'category', 'field' => 'term_id', 'terms' => [ 6 ], 'operator' => 'IN' ],
		]
	);

	// --- Pagination ----------------------------------------------------------------------------------------
	check( 'total pages without offset', Pagination::total_pages( 11, 5, 0 ), 3 );
	check( 'total pages with offset', Pagination::total_pages( 11, 5, 3 ), 2 );
	check( 'total pages of nothing', Pagination::total_pages( 0, 5, 0 ), 0 );
	check( 'total pages with offset beyond results', Pagination::total_pages( 2, 5, 7 ), 0 );
	check( 'total pages zero per page', Pagination::total_pages( 10, 0, 0 ), 0 );
	check( 'clamp too high', Pagination::clamp( 99, 4 ), 4 );
	check( 'clamp too low', Pagination::clamp( 0, 4 ), 1 );
	check( 'clamp with no pages', Pagination::clamp( 3, 0 ), 1 );
	check( 'few pages listed fully', Pagination::pages( 2, 4, 1 ), [ 1, 2, 3, 4 ] );
	check( 'ellipsis at the end', Pagination::pages( 1, 10, 1 ), [ 1, 2, '…', 10 ] );
	check( 'ellipsis both sides', Pagination::pages( 5, 10, 1 ), [ 1, '…', 4, 5, 6, '…', 10 ] );
	check( 'ellipsis at the start', Pagination::pages( 10, 10, 1 ), [ 1, '…', 9, 10 ] );
	check( 'single page lists nothing', Pagination::pages( 1, 1, 2 ), [] );
	check( 'no pages lists nothing', Pagination::pages( 1, 0, 2 ), [] );

	// --- Context_Token -------------------------------------------------------------------------------------
	$token = Context_Token::sign( [ 'doc' => 12, 'widget' => 'ab12', 'archive' => [ 'cat' => 3 ] ], 'secret' );
	check( 'token round trip', Context_Token::verify( $token, 'secret' ), [ 'doc' => 12, 'widget' => 'ab12', 'archive' => [ 'cat' => 3 ] ] );
	check( 'token with another key is rejected', Context_Token::verify( $token, 'other' ), null );
	check( 'tampered payload is rejected', Context_Token::verify( 'x' . $token, 'secret' ), null );
	check( 'tampered signature is rejected', Context_Token::verify( substr( $token, 0, -2 ) . 'zz', 'secret' ), null );
	check( 'garbage is rejected', Context_Token::verify( 'nonsense', 'secret' ), null );
	check( 'empty is rejected', Context_Token::verify( '', 'secret' ), null );

	echo "\n$total checks, $fail failed\n";
	exit( $fail ? 1 : 0 );
}
