<?php

namespace Refraction\Tests\Phpunit\Refraction\Modules\EditorOne;

use Refraction\Core\Admin\EditorOneMenu\Refraction_One_Menu_Manager;
use Refraction\Modules\EditorOne\Classes\Menu_Config;
use Refraction\Plugin;
use RefractionEditorTesting\Refraction_Test_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Test_Refraction_One_Menu_Manager_Edit_Posts_Users extends Refraction_Test_Base {

	private Refraction_One_Menu_Manager $menu_manager;
	private array $original_menu;
	private array $original_submenu;

	public function setUp(): void {
		parent::setUp();

		global $menu, $submenu;
		$this->original_menu = $menu ?? [];
		$this->original_submenu = $submenu ?? [];

		$menu = [];
		$submenu = [];

		$this->menu_manager = new Refraction_One_Menu_Manager();
	}

	public function tearDown(): void {
		parent::tearDown();

		global $menu, $submenu, $current_user;
		$menu = $this->original_menu;
		$submenu = $this->original_submenu;
		$current_user = null;
	}

	public function test_remove_all_submenus_for_edit_posts_users__removes_all_submenus_for_editor_user() {
		global $submenu;

		$editor_user = $this->create_user_with_role( 'editor' );
		wp_set_current_user( $editor_user );

		$submenu[ Menu_Config::REFRACTION_MENU_SLUG ] = [
			0 => [ 'Editor', 'edit_posts', Menu_Config::EDITOR_MENU_SLUG ],
			1 => [ 'Templates', 'edit_posts', 'refraction-templates' ],
			2 => [ 'Settings', 'manage_options', 'refraction-settings' ],
			3 => [ 'Tools', 'manage_options', 'refraction-tools' ],
		];

		$this->menu_manager->remove_all_submenus_for_edit_posts_users();

		$this->assertCount( 1, $submenu[ Menu_Config::REFRACTION_MENU_SLUG ] );
		$this->assertEquals( Menu_Config::EDITOR_MENU_SLUG, $submenu[ Menu_Config::REFRACTION_MENU_SLUG ][0][2] );

		wp_delete_user( $editor_user );
	}

	public function test_remove_all_submenus_for_edit_posts_users__does_not_remove_for_admin() {
		global $submenu;

		$admin_user = $this->create_user_with_role( 'administrator' );
		wp_set_current_user( $admin_user );

		$submenu[ Menu_Config::REFRACTION_MENU_SLUG ] = [
			0 => [ 'Editor', 'edit_posts', Menu_Config::EDITOR_MENU_SLUG ],
			1 => [ 'Templates', 'edit_posts', 'refraction-templates' ],
			2 => [ 'Settings', 'manage_options', 'refraction-settings' ],
		];

		$this->menu_manager->remove_all_submenus_for_edit_posts_users();

		$this->assertCount( 3, $submenu[ Menu_Config::REFRACTION_MENU_SLUG ] );

		wp_delete_user( $admin_user );
	}

	private function create_user_with_role( string $role ): int {
		$user_id = wp_insert_user( [
			'user_login' => 'test_user_' . uniqid(),
			'user_pass' => 'password',
			'user_email' => 'test_' . uniqid() . '@example.com',
			'role' => $role,
		] );

		return $user_id;
	}

}

