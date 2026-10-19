<?php

namespace Refraction\Testing\Modules\ThemeBuilder;

use Refraction\Modules\ThemeBuilder\Classes\Conditions_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Resolver;
use Refraction\Modules\ThemeBuilder\Classes\Rule;
use Refraction\Modules\ThemeBuilder\Classes\Wp_Environment;
use RefractionEditorTesting\Refraction_Test_Base;

/**
 * Conditions engine against real WordPress queries. The pure logic is also covered, without
 * WordPress, by scripts/test-theme-builder-engine.php.
 */
class Test_Conditions extends Refraction_Test_Base {

	private function manager(): Conditions_Manager {
		return new Conditions_Manager( new Wp_Environment() );
	}

	public function test_rule_parse_rejects_garbage() {
		$this->assertNull( Rule::parse( 'include/singular/../x' ) );
		$this->assertNull( Rule::parse( 'allow/general' ) );
		$this->assertSame( 'exclude/singular/page/7', Rule::parse( 'exclude/singular/page/7' )->to_string() );
	}

	public function test_general_matches_a_single_page() {
		$page = self::factory()->post->create( [ 'post_type' => 'page' ] );

		$this->go_to( get_permalink( $page ) );

		$this->assertSame( 10.0, $this->manager()->match( [ 'include/general' ] ) );
	}

	public function test_exclude_beats_include() {
		$page = self::factory()->post->create( [ 'post_type' => 'page' ] );

		$this->go_to( get_permalink( $page ) );

		$this->assertNull( $this->manager()->match( [ 'include/general', "exclude/singular/page/$page" ] ) );
	}

	public function test_specific_page_is_more_specific_than_its_type() {
		$page = self::factory()->post->create( [ 'post_type' => 'page' ] );

		$this->go_to( get_permalink( $page ) );

		$this->assertSame( 30.0, $this->manager()->match( [ 'include/singular/page' ] ) );
		$this->assertSame( 100.0, $this->manager()->match( [ "include/singular/page/$page" ] ) );
	}

	public function test_category_archive_and_term_rule() {
		$term = self::factory()->category->create();

		$this->go_to( get_category_link( $term ) );

		$this->assertSame( 30.0, $this->manager()->match( [ 'include/archive/tax/category' ] ) );
		$this->assertSame( 60.0, $this->manager()->match( [ "include/archive/tax/category/$term" ] ) );
		$this->assertNull( $this->manager()->match( [ 'include/singular' ] ) );
	}

	public function test_search_and_404() {
		$this->go_to( home_url( '/?s=nothing' ) );
		$this->assertSame( 30.0, $this->manager()->match( [ 'include/archive/search' ] ) );

		$this->go_to( home_url( '/?p=999999' ) );
		$this->assertSame( 40.0, $this->manager()->match( [ 'include/404' ] ) );
	}

	public function test_visitor_rules_use_the_current_user() {
		$this->go_to( home_url( '/' ) );
		$this->assertNull( $this->manager()->match( [ 'include/visitor/logged_in' ] ) );

		wp_set_current_user( self::factory()->user->create( [ 'role' => 'editor' ] ) );

		$this->assertSame( 10.5, $this->manager()->match( [ 'include/visitor/role/editor' ] ) );
	}

	public function test_resolver_prefers_the_specific_template() {
		$page = self::factory()->post->create( [ 'post_type' => 'page' ] );

		$this->go_to( get_permalink( $page ) );

		$resolver = new Resolver( $this->manager() );

		$this->assertSame( 2, $resolver->pick( [
			1 => [ 'rules' => [ 'include/general' ], 'modified' => 500 ],
			2 => [ 'rules' => [ "include/singular/page/$page" ], 'modified' => 1 ],
		] ) );
	}
}
