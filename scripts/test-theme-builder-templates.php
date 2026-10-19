<?php
/**
 * Standalone test for Theme Builder part 2: which request a body template (Single, Archive, Search Results,
 * Error 404) may serve, and how Preview Settings become WP_Query variables. No WordPress, no database.
 *
 * Run: php scripts/test-theme-builder-templates.php
 */

namespace {
	putenv( 'TB_TEST_LIB=1' );
	require __DIR__ . '/test-theme-builder-engine.php';
}

namespace Refraction\Tests\ThemeBuilder {

use Refraction\Modules\ThemeBuilder\Classes\Conditions_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Location_Scope;
use Refraction\Modules\ThemeBuilder\Classes\Preview_Target;
use Refraction\Modules\ThemeBuilder\Classes\Resolver;

$page = [ 'singular' => true, 'post_type' => 'page', 'post_id' => 7 ];
$archive = [ 'archive' => true, 'tax_archive' => [ 'category', 5 ] ];
$search = [ 'search' => true ];
$missing = [ 'not_found' => true ];
$blog = [ 'blog_index' => true ];
$posts_front = [ 'front_page' => true ];

$scope = fn( string $loc, array $facts ) => Location_Scope::applies( $loc, new Fake_Environment( $facts ) );

// --- Location guard -----------------------------------------------------------------------------
check( 'header applies everywhere', $scope( 'header', $missing ), true );
check( 'footer applies everywhere', $scope( 'footer', $search ), true );
check( 'single applies to a page', $scope( 'single', $page ), true );
check( 'single does not apply to an archive', $scope( 'single', $archive ), false );
check( 'single does not apply to search', $scope( 'single', $search ), false );
check( 'single does not apply to 404', $scope( 'single', $missing ), false );
check( 'archive applies to a category archive', $scope( 'archive', $archive ), true );
check( 'archive applies to the posts page', $scope( 'archive', $blog ), true );
check( 'archive applies to posts as front page', $scope( 'archive', $posts_front ), true );
check( 'archive does not apply to a page', $scope( 'archive', $page ), false );
check( 'archive does not apply to search', $scope( 'archive', $search + [ 'archive' => true ] ), false );
check( 'archive does not apply to 404', $scope( 'archive', $missing ), false );
check( 'search results apply to search', $scope( 'search-results', $search ), true );
check( 'search results do not apply to an archive', $scope( 'search-results', $archive ), false );
check( 'error 404 applies to 404', $scope( 'error-404', $missing ), true );
check( 'error 404 does not apply to a page', $scope( 'error-404', $page ), false );
check( 'unknown location never applies', $scope( 'bogus', $page ), false );

// --- Resolver uses the guard ----------------------------------------------------------------------
$general = [ 1 => [ 'rules' => [ 'include/general' ], 'modified' => 1 ] ];
$resolver = fn( array $facts ) => new Resolver( new Conditions_Manager( new Fake_Environment( $facts ) ) );
check( 'single template with include general serves a page', $resolver( $page )->pick( $general, 'single' ), 1 );
check( 'single template with include general skips an archive', $resolver( $archive )->pick( $general, 'single' ), 0 );
check( 'single template with include general skips search', $resolver( $search )->pick( $general, 'single' ), 0 );
check( 'archive template with include archive skips search', $resolver( $search + [ 'archive' => true ] )->pick( [ 1 => [ 'rules' => [ 'include/archive' ], 'modified' => 1 ] ], 'archive' ), 0 );
check( 'search template with the search rule serves search', $resolver( $search )->pick( [ 1 => [ 'rules' => [ 'include/archive/search' ], 'modified' => 1 ] ], 'search-results' ), 1 );
check( '404 template with include 404 serves a 404', $resolver( $missing )->pick( [ 1 => [ 'rules' => [ 'include/404' ], 'modified' => 1 ] ], 'error-404' ), 1 );
check( 'pick without a location behaves as before', $resolver( $archive )->pick( $general ), 1 );
check( 'excluded single template is skipped', $resolver( $page )->pick( [ 1 => [ 'rules' => [ 'include/general', 'exclude/singular/page/7' ], 'modified' => 1 ] ], 'single' ), 0 );
check( 'specific single template wins', $resolver( $page )->pick( [
	1 => [ 'rules' => [ 'include/singular' ], 'modified' => 9 ],
	2 => [ 'rules' => [ 'include/singular/page' ], 'modified' => 1 ],
], 'single' ), 2 );

// --- Preview target -------------------------------------------------------------------------------
check( 'source parse: post type', Preview_Target::parse_source( 'post:page' ), [ 'kind' => 'post', 'sub' => 'page' ] );
check( 'source parse: taxonomy', Preview_Target::parse_source( 'term:category' ), [ 'kind' => 'term', 'sub' => 'category' ] );
check( 'source parse: author', Preview_Target::parse_source( 'author' ), [ 'kind' => 'author', 'sub' => '' ] );
check( 'source parse: junk', Preview_Target::parse_source( 'post:../etc' ), null );
check( 'source parse: unknown kind', Preview_Target::parse_source( 'sql:1' ), null );
check( 'default single source', Preview_Target::default_source( 'single' ), 'post:post' );
check( 'default archive source', Preview_Target::default_source( 'archive' ), 'blog' );
check( 'default search source', Preview_Target::default_source( 'search-results' ), 'search' );
check( 'default 404 source', Preview_Target::default_source( 'error-404' ), '404' );
check( 'default header source', Preview_Target::default_source( 'header' ), 'post:page' );

check( 'single with id', Preview_Target::query_vars( 'single', [ 'source' => 'post:page', 'id' => 7 ] ), [ 'p' => 7, 'post_type' => 'any', 'post_status' => 'any' ] );
check( 'single without id picks the latest of the type', Preview_Target::query_vars( 'single', [ 'source' => 'post:post', 'id' => 0 ] ), [ 'post_type' => 'post', 'posts_per_page' => 1, 'ignore_sticky_posts' => true ] );
check( 'single with page uses the page var for post type page', Preview_Target::query_vars( 'single', [ 'source' => 'post:page', 'id' => 0 ] )['post_type'], 'page' );
check( 'archive blog', Preview_Target::query_vars( 'archive', [ 'source' => 'blog' ] ), [] );
check( 'archive term with id', Preview_Target::query_vars( 'archive', [ 'source' => 'term:category', 'id' => 5 ] ), [ 'tax_query' => [ [ 'taxonomy' => 'category', 'field' => 'term_id', 'terms' => [ 5 ] ] ] ] );
check( 'archive term without id is a blog', Preview_Target::query_vars( 'archive', [ 'source' => 'term:category', 'id' => 0 ] ), [] );
check( 'archive author', Preview_Target::query_vars( 'archive', [ 'source' => 'author', 'id' => 2 ] ), [ 'author' => 2 ] );
check( 'archive post type', Preview_Target::query_vars( 'archive', [ 'source' => 'postype:book' ] ), [ 'post_type' => 'book' ] );
check( 'archive date year-month', Preview_Target::query_vars( 'archive', [ 'source' => 'date', 'date' => '2025-03' ] ), [ 'year' => 2025, 'monthnum' => 3 ] );
check( 'archive date year only', Preview_Target::query_vars( 'archive', [ 'source' => 'date', 'date' => '2024' ] ), [ 'year' => 2024 ] );
check( 'archive date junk falls back to the current year', Preview_Target::query_vars( 'archive', [ 'source' => 'date', 'date' => 'x', 'now_year' => 2026 ] ), [ 'year' => 2026 ] );
check( 'search term', Preview_Target::query_vars( 'search-results', [ 'source' => 'search', 'search' => 'hello' ] ), [ 's' => 'hello' ] );
check( 'search with no term uses a placeholder', Preview_Target::query_vars( 'search-results', [ 'source' => 'search', 'search' => '' ] ), [ 's' => 'a' ] );
check( '404', Preview_Target::query_vars( 'error-404', [ 'source' => '404' ] ), [ '__404' => true ] );
check( 'source from another type is ignored', Preview_Target::query_vars( 'error-404', [ 'source' => 'post:page', 'id' => 7 ] ), [ '__404' => true ] );
check( 'header preview defaults to a page', Preview_Target::query_vars( 'header', [] )['post_type'], 'page' );
check( 'negative id is rejected', Preview_Target::query_vars( 'single', [ 'source' => 'post:page', 'id' => -4 ] )['post_type'], 'page' );

check( 'is_valid_source single accepts post:x', Preview_Target::is_valid_source( 'single', 'post:book' ), true );
check( 'is_valid_source single rejects term', Preview_Target::is_valid_source( 'single', 'term:category' ), false );
check( 'is_valid_source archive accepts date', Preview_Target::is_valid_source( 'archive', 'date' ), true );
check( 'is_valid_source search rejects blog', Preview_Target::is_valid_source( 'search-results', 'blog' ), false );

echo "\n$passes passed, $failures failed\n";
exit( $failures ? 1 : 0 );
}
