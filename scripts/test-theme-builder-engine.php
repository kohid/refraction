<?php
/**
 * Standalone test for the Theme Builder rules engine (no WordPress, no database).
 *
 * Run: php scripts/test-theme-builder-engine.php
 *
 * It loads modules/theme-builder/classes/* with a tiny autoloader, stubs the handful of WordPress
 * functions the pure logic touches, and feeds the engine a fake Environment. The same cases exist as
 * a PHPUnit test in tests/phpunit/refraction/modules/theme-builder/ for the WordPress test suite.
 * Exit code 1 on any failure.
 */

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	function esc_html__( $text ) {
		return $text;
	}

	function __( $text ) {
		return $text;
	}

	function sanitize_key( $key ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
	}

	function absint( $value ) {
		return abs( (int) $value );
	}

	spl_autoload_register( function ( $class ) {
		$prefix = 'Refraction\\Modules\\ThemeBuilder\\';

		if ( 0 !== strpos( $class, $prefix ) ) {
			return;
		}

		$relative = substr( $class, strlen( $prefix ) );
		$parts = array_map( fn( $p ) => str_replace( '_', '-', strtolower( $p ) ), explode( '\\', $relative ) );
		$file = dirname( __DIR__ ) . '/modules/theme-builder/' . implode( '/', $parts ) . '.php';

		if ( is_file( $file ) ) {
			require_once $file;
		}
	} );
}

namespace Refraction\Tests\ThemeBuilder {

	use Refraction\Modules\ThemeBuilder\Classes\Conditions_Manager;
	use Refraction\Modules\ThemeBuilder\Classes\Environment;
	use Refraction\Modules\ThemeBuilder\Classes\Resolver;
	use Refraction\Modules\ThemeBuilder\Classes\Rule;

	/**
	 * A scripted request: the test sets the facts, the engine decides.
	 */
	class Fake_Environment implements Environment {
		public array $f = [];

		public function __construct( array $facts = [] ) {
			$this->f = $facts + [
				'front_page' => false, 'not_found' => false, 'search' => false, 'date' => false,
				'archive' => false, 'blog_index' => false, 'singular' => false,
				'post_type' => '', 'post_id' => 0, 'author' => 0, 'parent' => 0, 'ancestors' => [],
				'terms' => [], 'pt_archive' => '', 'tax_archive' => [ '', 0 ], 'archive_author' => 0,
				'logged_in' => false, 'roles' => [],
			];
		}

		public function is_front_page(): bool {
			return $this->f['front_page'];
		}

		public function is_404(): bool {
			return $this->f['not_found'];
		}

		public function is_search(): bool {
			return $this->f['search'];
		}

		public function is_date(): bool {
			return $this->f['date'];
		}

		public function is_archive(): bool {
			return $this->f['archive'];
		}

		public function is_blog_index(): bool {
			return $this->f['blog_index'];
		}

		public function is_singular(): bool {
			return $this->f['singular'];
		}

		public function queried_post_type(): string {
			return $this->f['post_type'];
		}

		public function queried_post_id(): int {
			return $this->f['post_id'];
		}

		public function post_author_id( int $post_id ): int {
			return $this->f['author'];
		}

		public function post_parent_id( int $post_id ): int {
			return $this->f['parent'];
		}

		public function post_ancestors( int $post_id ): array {
			return $this->f['ancestors'];
		}

		public function post_has_term( int $post_id, string $taxonomy, int $term_id ): bool {
			return in_array( $taxonomy . ':' . $term_id, $this->f['terms'], true );
		}

		public function is_post_type_archive( string $post_type ): bool {
			return $this->f['pt_archive'] === $post_type;
		}

		public function is_tax_archive( string $taxonomy, int $term_id = 0 ): bool {
			[ $tax, $term ] = $this->f['tax_archive'];

			return '' !== $tax && $tax === $taxonomy && ( 0 === $term_id || $term === $term_id );
		}

		public function archive_author_id(): int {
			return $this->f['archive_author'];
		}

		public function is_user_logged_in(): bool {
			return $this->f['logged_in'];
		}

		public function current_user_roles(): array {
			return $this->f['roles'];
		}

		public function label_post( int $post_id ): string {
			return [ 7 => 'About', 12 => 'Contact' ][ $post_id ] ?? "#$post_id";
		}

		public function label_term( string $taxonomy, int $term_id ): string {
			return [ 5 => 'News' ][ $term_id ] ?? "#$term_id";
		}

		public function label_user( int $user_id ): string {
			return [ 2 => 'Jane' ][ $user_id ] ?? "#$user_id";
		}

		public function label_post_type( string $post_type ): string {
			return [ 'page' => 'Page', 'post' => 'Post', 'book' => 'Book' ][ $post_type ] ?? $post_type;
		}

		public function label_post_type_plural( string $post_type ): string {
			return [ 'page' => 'Pages', 'post' => 'Posts', 'book' => 'Books' ][ $post_type ] ?? $post_type;
		}

		public function label_taxonomy( string $taxonomy ): string {
			return [ 'category' => 'Category', 'post_tag' => 'Tag' ][ $taxonomy ] ?? $taxonomy;
		}

		public function label_role( string $role ): string {
			return ucfirst( $role );
		}
	}

	$failures = 0;
	$passes = 0;

	function check( string $name, $actual, $expected ): void {
		global $failures, $passes;

		if ( $actual === $expected ) {
			++$passes;
			echo "ok    $name\n";
			return;
		}

		++$failures;
		echo "FAIL  $name\n      expected: " . json_encode( $expected ) . "\n      actual:   " . json_encode( $actual ) . "\n";
	}

	function score( array $rules, array $facts ) {
		return ( new Conditions_Manager( new Fake_Environment( $facts ) ) )->match( $rules );
	}

	$page_about = [ 'singular' => true, 'post_type' => 'page', 'post_id' => 7 ];
	$post_news = [ 'singular' => true, 'post_type' => 'post', 'post_id' => 40, 'author' => 2, 'terms' => [ 'category:5' ] ];

	// --- Rule parsing and sanitising -------------------------------------------------------------
	check( 'parse include/general', Rule::parse( 'include/general' )->to_string(), 'include/general' );
	check( 'parse exclude with id', Rule::parse( 'exclude/singular/page/7' )->to_string(), 'exclude/singular/page/7' );
	check( 'parse trims and lowercases the verb', Rule::parse( ' Include/general ' )->to_string(), 'include/general' );
	check( 'reject empty', Rule::parse( '' ), null );
	check( 'reject unknown verb', Rule::parse( 'allow/general' ), null );
	check( 'reject unknown name', Rule::parse( 'include/everything' ), null );
	check( 'reject non numeric id', Rule::parse( 'include/singular/page/abc' ), null );
	check( 'reject path tricks', Rule::parse( 'include/singular/../../x' ), null );
	check( 'reject markup', Rule::parse( 'include/singular/<script>' ), null );
	check( 'reject general with args', Rule::parse( 'include/general/x' ), null );
	check( 'reject zero id', Rule::parse( 'include/singular/page/0' ), null );
	check( 'reject unknown visitor kind', Rule::parse( 'include/visitor/robot' ), null );
	check( 'sanitize_list drops junk and duplicates', Rule::sanitize_list( [ 'include/general', 'include/general', 'bad', 5, 'exclude/404' ] ), [ 'include/general', 'exclude/404' ] );
	check( 'sanitize_list of a non array', Rule::sanitize_list( 'include/general' ), [] );

	// --- Basic matching ----------------------------------------------------------------------------
	check( 'general matches a page', score( [ 'include/general' ], $page_about ), 10.0 );
	check( 'no rules never match', score( [], $page_about ), null );
	check( 'only excludes never match', score( [ 'exclude/singular/page/7' ], $post_news ), null );
	check( 'front page rule matches the front page', score( [ 'include/front_page' ], [ 'front_page' => true, 'singular' => true, 'post_type' => 'page', 'post_id' => 2 ] ), 50.0 );
	check( 'front page rule skips inner pages', score( [ 'include/front_page' ], $page_about ), null );
	check( '404 rule', score( [ 'include/404' ], [ 'not_found' => true ] ), 40.0 );
	check( '404 rule skips pages', score( [ 'include/404' ], $page_about ), null );

	// --- Singular ----------------------------------------------------------------------------------
	check( 'all singular', score( [ 'include/singular' ], $page_about ), 20.0 );
	check( 'singular does not match archives', score( [ 'include/singular' ], [ 'archive' => true ] ), null );
	check( 'singular by post type', score( [ 'include/singular/page' ], $page_about ), 30.0 );
	check( 'singular by other post type', score( [ 'include/singular/post' ], $page_about ), null );
	check( 'singular specific id', score( [ 'include/singular/page/7' ], $page_about ), 100.0 );
	check( 'singular specific id other post', score( [ 'include/singular/page/8' ], $page_about ), null );
	check( 'singular by author', score( [ 'include/singular/author/2' ], $post_news ), 60.0 );
	check( 'singular by other author', score( [ 'include/singular/author/3' ], $post_news ), null );
	check( 'singular in category term', score( [ 'include/singular/in_category/5' ], $post_news ), 60.0 );
	check( 'singular in other term', score( [ 'include/singular/in_category/6' ], $post_news ), null );
	check( 'singular child of any ancestor', score( [ 'include/singular/child_of/3' ], [ 'singular' => true, 'post_type' => 'page', 'post_id' => 9, 'parent' => 4, 'ancestors' => [ 4, 3 ] ] ), 60.0 );
	check( 'direct child of needs the parent', score( [ 'include/singular/direct_child_of/3' ], [ 'singular' => true, 'post_type' => 'page', 'post_id' => 9, 'parent' => 4, 'ancestors' => [ 4, 3 ] ] ), null );
	check( 'direct child of matches the parent', score( [ 'include/singular/direct_child_of/4' ], [ 'singular' => true, 'post_type' => 'page', 'post_id' => 9, 'parent' => 4, 'ancestors' => [ 4, 3 ] ] ), 60.0 );
	check( 'has parent', score( [ 'include/singular/has_parent' ], [ 'singular' => true, 'post_type' => 'page', 'post_id' => 9, 'parent' => 4, 'ancestors' => [ 4 ] ] ), 60.0 );
	check( 'has parent skips top level', score( [ 'include/singular/has_parent' ], $page_about ), null );

	// --- Archives ----------------------------------------------------------------------------------
	check( 'all archives on a category archive', score( [ 'include/archive' ], [ 'archive' => true, 'tax_archive' => [ 'category', 5 ] ] ), 20.0 );
	check( 'all archives on the blog index', score( [ 'include/archive' ], [ 'blog_index' => true ] ), 20.0 );
	check( 'all archives on search', score( [ 'include/archive' ], [ 'search' => true ] ), 20.0 );
	check( 'archives skip pages', score( [ 'include/archive' ], $page_about ), null );
	check( 'post type archive', score( [ 'include/archive/type/book' ], [ 'archive' => true, 'pt_archive' => 'book' ] ), 30.0 );
	check( 'post archive matches the blog index', score( [ 'include/archive/type/post' ], [ 'blog_index' => true ] ), 30.0 );
	check( 'taxonomy archive', score( [ 'include/archive/tax/category' ], [ 'archive' => true, 'tax_archive' => [ 'category', 5 ] ] ), 30.0 );
	check( 'taxonomy archive other taxonomy', score( [ 'include/archive/tax/post_tag' ], [ 'archive' => true, 'tax_archive' => [ 'category', 5 ] ] ), null );
	check( 'taxonomy term archive', score( [ 'include/archive/tax/category/5' ], [ 'archive' => true, 'tax_archive' => [ 'category', 5 ] ] ), 60.0 );
	check( 'taxonomy term archive other term', score( [ 'include/archive/tax/category/6' ], [ 'archive' => true, 'tax_archive' => [ 'category', 5 ] ] ), null );
	check( 'author archive', score( [ 'include/archive/author' ], [ 'archive' => true, 'archive_author' => 2 ] ), 30.0 );
	check( 'one author archive', score( [ 'include/archive/author/2' ], [ 'archive' => true, 'archive_author' => 2 ] ), 60.0 );
	check( 'one author archive, other author', score( [ 'include/archive/author/3' ], [ 'archive' => true, 'archive_author' => 2 ] ), null );
	check( 'date archive', score( [ 'include/archive/date' ], [ 'archive' => true, 'date' => true ] ), 30.0 );
	check( 'search results', score( [ 'include/archive/search' ], [ 'search' => true ] ), 30.0 );
	check( 'search rule skips archives', score( [ 'include/archive/search' ], [ 'archive' => true, 'date' => true ] ), null );

	// --- Exclude always wins -----------------------------------------------------------------------
	check( 'exclude beats include general', score( [ 'include/general', 'exclude/singular/page/7' ], $page_about ), null );
	check( 'exclude elsewhere keeps the include', score( [ 'include/general', 'exclude/singular/page/8' ], $page_about ), 10.0 );
	check( 'exclude beats a more specific include', score( [ 'include/singular/page/7', 'exclude/singular' ], $page_about ), null );
	check( 'exclude front page', score( [ 'include/general', 'exclude/front_page' ], [ 'front_page' => true, 'singular' => true, 'post_type' => 'page', 'post_id' => 2 ] ), null );
	check( 'exclude 404', score( [ 'include/general', 'exclude/404' ], [ 'not_found' => true ] ), null );
	check( 'best score wins inside one template', score( [ 'include/general', 'include/singular/page' ], $page_about ), 30.0 );

	// --- Visitor -----------------------------------------------------------------------------------
	check( 'logged in only means the entire site for logged in users', score( [ 'include/visitor/logged_in' ], $page_about + [ 'logged_in' => true ] ), 10.5 );
	check( 'logged in only hides it from guests', score( [ 'include/visitor/logged_in' ], $page_about ), null );
	check( 'logged out audience', score( [ 'include/general', 'include/visitor/logged_out' ], $page_about ), 10.5 );
	check( 'role audience', score( [ 'include/general', 'include/visitor/role/editor' ], $page_about + [ 'logged_in' => true, 'roles' => [ 'editor' ] ] ), 10.5 );
	check( 'role audience mismatch', score( [ 'include/general', 'include/visitor/role/editor' ], $page_about + [ 'logged_in' => true, 'roles' => [ 'author' ] ] ), null );
	check( 'two audiences are alternatives', score( [ 'include/general', 'include/visitor/role/editor', 'include/visitor/role/author' ], $page_about + [ 'logged_in' => true, 'roles' => [ 'author' ] ] ), 10.5 );
	check( 'exclude role', score( [ 'include/general', 'exclude/visitor/role/editor' ], $page_about + [ 'logged_in' => true, 'roles' => [ 'editor' ] ] ), null );
	check( 'exclude logged in lets guests through', score( [ 'include/general', 'exclude/visitor/logged_in' ], $page_about ), 10.0 );
	check( 'audience combines with a location', score( [ 'include/singular/page', 'include/visitor/logged_in' ], $page_about + [ 'logged_in' => true ] ), 30.5 );
	check( 'audience does not widen a location', score( [ 'include/singular/page', 'include/visitor/logged_in' ], $post_news + [ 'logged_in' => true ] ), null );

	// --- Resolver ----------------------------------------------------------------------------------
	$env = new Fake_Environment( $page_about );
	$resolver = new Resolver( new Conditions_Manager( $env ) );
	$candidates = [
		10 => [ 'rules' => [ 'include/general' ], 'modified' => 100 ],
		11 => [ 'rules' => [ 'include/singular/page' ], 'modified' => 50 ],
		12 => [ 'rules' => [ 'include/singular/page/7' ], 'modified' => 10 ],
		13 => [ 'rules' => [ 'include/singular/page/7', 'exclude/general' ], 'modified' => 900 ],
	];
	check( 'most specific template wins, excluded one is ignored', $resolver->pick( $candidates ), 12 );
	check( 'nothing matches', $resolver->pick( [ 1 => [ 'rules' => [ 'include/404' ], 'modified' => 1 ] ] ), 0 );
	check( 'empty candidates', $resolver->pick( [] ), 0 );
	check( 'tie goes to the most recently modified', $resolver->pick( [
		20 => [ 'rules' => [ 'include/general' ], 'modified' => 100 ],
		21 => [ 'rules' => [ 'include/general' ], 'modified' => 200 ],
	] ), 21 );
	check( 'full tie goes to the highest id', $resolver->pick( [
		30 => [ 'rules' => [ 'include/general' ], 'modified' => 100 ],
		31 => [ 'rules' => [ 'include/general' ], 'modified' => 100 ],
	] ), 31 );
	check( 'specific beats recent general', $resolver->pick( [
		40 => [ 'rules' => [ 'include/singular/page' ], 'modified' => 1 ],
		41 => [ 'rules' => [ 'include/general' ], 'modified' => 999 ],
	] ), 40 );
	check( 'audience template wins an equal location tie', $resolver->pick( [
		50 => [ 'rules' => [ 'include/general', 'include/visitor/logged_out' ], 'modified' => 1 ],
		51 => [ 'rules' => [ 'include/general' ], 'modified' => 999 ],
	] ), 50 );

	// --- Readable text -----------------------------------------------------------------------------
	$manager = new Conditions_Manager( new Fake_Environment() );
	check( 'describe entire site', $manager->describe( [ 'include/general' ] ), [ 'Entire site' ] );
	check( 'describe exclude page', $manager->describe( [ 'include/general', 'exclude/singular/page/7' ] ), [ 'Entire site', 'Exclude: Page: About' ] );
	check( 'describe singular family', $manager->describe( [ 'include/singular', 'include/singular/page' ] ), [ 'All singular', 'All Pages' ] );
	check( 'describe terms and authors', $manager->describe( [ 'include/singular/in_category/5', 'include/singular/author/2' ] ), [ 'Category: News', 'Author: Jane' ] );
	check( 'describe archives', $manager->describe( [ 'include/archive', 'include/archive/tax/category/5', 'include/archive/search', 'include/archive/date' ] ), [ 'All archives', 'Category archive: News', 'Search results', 'Date archives' ] );
	check( 'describe 404 and front page', $manager->describe( [ 'include/404', 'include/front_page' ] ), [ '404 page', 'Front page' ] );
	check( 'describe visitor', $manager->describe( [ 'include/visitor/logged_in', 'exclude/visitor/role/editor' ] ), [ 'Logged-in visitors', 'Exclude: Role: Editor' ] );
	check( 'describe nothing', $manager->describe( [] ), [] );
	check( 'describe ignores junk', $manager->describe( [ 'nonsense' ] ), [] );

	echo "\n$passes passed, $failures failed\n";
	exit( $failures ? 1 : 0 );
}
