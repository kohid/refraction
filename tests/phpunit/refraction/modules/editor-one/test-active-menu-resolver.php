<?php

namespace Refraction\Tests\Phpunit\Refraction\Modules\EditorOne;

use Refraction\Modules\EditorOne\Classes\Active_Menu_Resolver;
use Refraction\Modules\EditorOne\Classes\Url_Matcher;
use PHPUnit\Framework\TestCase as PHPUnit_TestCase;

class Test_Active_Menu_Resolver extends PHPUnit_TestCase {

	private Active_Menu_Resolver $resolver;
	private Url_Matcher $url_matcher;

	public function setUp(): void {
		parent::setUp();
		$this->url_matcher = new Url_Matcher();
		$this->resolver = new Active_Menu_Resolver( $this->url_matcher );
	}

	/**
	 * @dataProvider data_create_active_state
	 */
	public function test_create_active_state( $menu_slug, $child_slug, $score, $expected ) {
		$result = $this->resolver->create_active_state( $menu_slug, $child_slug, $score );
		$this->assertEquals( $expected, $result );
	}

	public function data_create_active_state() {
		return [
			'defaults' => [
				'refraction-settings',
				'',
				0,
				[ 'menu_slug' => 'refraction-settings', 'child_slug' => '', 'score' => 0 ],
			],
			'with_child' => [
				'refraction-settings',
				'general',
				0,
				[ 'menu_slug' => 'refraction-settings', 'child_slug' => 'general', 'score' => 0 ],
			],
			'with_score' => [
				'refraction-settings',
				'general',
				5,
				[ 'menu_slug' => 'refraction-settings', 'child_slug' => 'general', 'score' => 5 ],
			],
		];
	}

	public function test_resolve__returns_home_slug_for_editor_page() {
		$menu_items = [];
		$level4_groups = [];
		$current_page = 'refraction-editor';
		$current_uri = '/wp-admin/admin.php?page=refraction-editor';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( 'refraction', $result['menu_slug'] );
		$this->assertEquals( '', $result['child_slug'] );
	}

	public function test_resolve__returns_best_matching_menu_item() {
		$menu_items = [
			[
				'slug' => 'refraction-settings',
				'url' => '/wp-admin/admin.php?page=refraction-settings',
				'group_id' => '',
			],
			[
				'slug' => 'refraction-tools',
				'url' => '/wp-admin/admin.php?page=refraction-tools',
				'group_id' => '',
			],
		];
		$level4_groups = [];
		$current_page = 'refraction-settings';
		$current_uri = '/wp-admin/admin.php?page=refraction-settings';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( 'refraction-settings', $result['menu_slug'] );
		$this->assertEquals( '', $result['child_slug'] );
	}

	public function test_resolve__returns_level4_child_when_matching() {
		$menu_items = [
			[
				'slug' => 'refraction-custom-elements',
				'url' => '/wp-admin/admin.php?page=refraction-custom-elements',
				'group_id' => 'custom-elements-group',
			],
		];
		$level4_groups = [
			'custom-elements-group' => [
				'items' => [
					[
						'slug' => 'custom-fonts',
						'url' => '/wp-admin/edit.php?post_type=refraction_font',
					],
					[
						'slug' => 'custom-icons',
						'url' => '/wp-admin/edit.php?post_type=refraction_icons',
					],
				],
			],
		];
		$current_page = '';
		$current_uri = '/wp-admin/edit.php?post_type=refraction_font';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( 'refraction-custom-elements', $result['menu_slug'] );
		$this->assertEquals( 'custom-fonts', $result['child_slug'] );
	}

	public function test_resolve__selects_higher_score_match() {
		$menu_items = [
			[
				'slug' => 'refraction-settings',
				'url' => '/wp-admin/admin.php?page=refraction',
				'group_id' => '',
			],
			[
				'slug' => 'refraction-settings-advanced',
				'url' => '/wp-admin/admin.php?page=refraction&tab=advanced',
				'group_id' => '',
			],
		];
		$level4_groups = [];
		$current_page = '';
		$current_uri = '/wp-admin/admin.php?page=refraction&tab=advanced';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( 'refraction-settings-advanced', $result['menu_slug'] );
	}

	public function test_resolve__returns_empty_when_no_match() {
		$menu_items = [
			[
				'slug' => 'refraction-settings',
				'url' => '/wp-admin/admin.php?page=refraction-settings',
				'group_id' => '',
			],
		];
		$level4_groups = [];
		$current_page = '';
		$current_uri = '/wp-admin/admin.php?page=unrelated-plugin';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( '', $result['menu_slug'] );
		$this->assertEquals( '', $result['child_slug'] );
	}

	public function test_resolve__handles_empty_menu_items() {
		$menu_items = [];
		$level4_groups = [];
		$current_page = '';
		$current_uri = '/wp-admin/admin.php?page=refraction';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( '', $result['menu_slug'] );
		$this->assertEquals( '', $result['child_slug'] );
	}

	public function test_resolve__handles_empty_level4_group_items() {
		$menu_items = [
			[
				'slug' => 'refraction-custom-elements',
				'url' => '/wp-admin/admin.php?page=refraction-custom-elements',
				'group_id' => 'custom-elements-group',
			],
		];
		$level4_groups = [
			'custom-elements-group' => [
				'items' => [],
			],
		];
		$current_page = '';
		$current_uri = '/wp-admin/admin.php?page=refraction-custom-elements';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( 'refraction-custom-elements', $result['menu_slug'] );
		$this->assertEquals( '', $result['child_slug'] );
	}

	public function test_resolve__skips_missing_level4_group() {
		$menu_items = [
			[
				'slug' => 'refraction-custom-elements',
				'url' => '/wp-admin/admin.php?page=refraction-custom-elements',
				'group_id' => 'non-existent-group',
			],
		];
		$level4_groups = [];
		$current_page = '';
		$current_uri = '/wp-admin/admin.php?page=refraction-custom-elements';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( 'refraction-custom-elements', $result['menu_slug'] );
		$this->assertEquals( '', $result['child_slug'] );
	}

	public function test_resolve__prioritizes_level4_over_level3_with_same_score() {
		$menu_items = [
			[
				'slug' => 'refraction-custom-elements',
				'url' => '/wp-admin/edit.php?post_type=refraction_font',
				'group_id' => 'custom-elements-group',
			],
		];
		$level4_groups = [
			'custom-elements-group' => [
				'items' => [
					[
						'slug' => 'custom-fonts',
						'url' => '/wp-admin/edit.php?post_type=refraction_font',
					],
				],
			],
		];
		$current_page = '';
		$current_uri = '/wp-admin/edit.php?post_type=refraction_font';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( 'refraction-custom-elements', $result['menu_slug'] );
		$this->assertEquals( 'custom-fonts', $result['child_slug'] );
	}

	public function test_resolve__matches_popup_templates_page() {
		$menu_items = [
			[
				'slug' => 'refraction-templates',
				'url' => '/wp-admin/admin.php?page=refraction-templates',
				'group_id' => 'templates-group',
			],
		];
		$level4_groups = [
			'templates-group' => [
				'items' => [
					[
						'slug' => 'popup_templates',
						'url' => '/wp-admin/admin.php?page=popup_templates',
					],
				],
			],
		];
		$current_page = 'popup_templates';
		$current_uri = '/wp-admin/admin.php?page=popup_templates';

		$result = $this->resolver->resolve( $menu_items, $level4_groups, $current_page, $current_uri );

		$this->assertEquals( 'refraction-templates', $result['menu_slug'] );
		$this->assertEquals( 'popup_templates', $result['child_slug'] );
	}
}
