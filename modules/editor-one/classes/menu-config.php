<?php

namespace Refraction\Modules\EditorOne\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Menu_Config {
	const REFRACTION_MENU_SLUG = 'refraction';
	const REFRACTION_HOME_MENU_SLUG = 'refraction-home';
	const EDITOR_MENU_SLUG = 'refraction-editor';
	const TEMPLATES_GROUP_ID = 'refraction-editor-templates';
	const SETTINGS_GROUP_ID = 'refraction-editor-settings';
	const EDITOR_GROUP_ID = 'refraction-editor-items';
	const CUSTOM_ELEMENTS_GROUP_ID = 'refraction-editor-custom-elements';
	const SYSTEM_GROUP_ID = 'refraction-editor-system';
	const THIRD_PARTY_GROUP_ID = 'refraction-editor-third-party';
	const LEGACY_TEMPLATES_SLUG = 'edit.php?post_type=refraction_library';
	const CAPABILITY_EDIT_POSTS = 'edit_posts';
	const CAPABILITY_MANAGE_OPTIONS = 'manage_options';
	const MENU_POSITION = 58.5;
	public static function get_excluded_level4_slugs(): array {
		// add new which is automatically added to templates and categories
		$default_slugs = [
			'edit-tags.php?taxonomy=refraction_library_category&amp;post_type=refraction_library',
		];

		return apply_filters( 'refraction/editor-one/menu/excluded_level4_slugs', $default_slugs );
	}

	public static function get_excluded_level3_slugs(): array {
		// refraction pro slugs (the Theme Builder page is built in, so its slug is not excluded)
		$default_slugs = [
			'refraction-pro-notes-proxy',
			self::EDITOR_MENU_SLUG,
		];

		return apply_filters( 'refraction/editor-one/menu/excluded_level3_slugs', $default_slugs );
	}

	public static function get_excluded_flyout_menu_level3_slugs(): array {
		$default_slugs = [
			'e-form-submissions',
		];

		return apply_filters( 'refraction/editor-one/menu/excluded_flyout_menu_level3_slugs', $default_slugs );
	}


	public static function get_legacy_slug_mapping(): array {
		$default_mapping = [
			self::LEGACY_TEMPLATES_SLUG => self::TEMPLATES_GROUP_ID,
		];

		return apply_filters( 'refraction/editor-one/menu/legacy_slug_mapping', $default_mapping );
	}

	public static function get_legacy_pro_mapping(): array {
		$default_mapping = [
			'refraction-license' => [ 'group' => self::SYSTEM_GROUP_ID ],
			'e-form-submissions' => [ 'group' => self::EDITOR_GROUP_ID ],
			'edit.php?post_type=refraction_font' => [
				'group' => self::CUSTOM_ELEMENTS_GROUP_ID,
				'label' => __( 'Fonts', 'refraction' ),
			],
			'edit.php?post_type=refraction_icons' => [
				'group' => self::CUSTOM_ELEMENTS_GROUP_ID,
				'label' => __( 'Icons', 'refraction' ),
			],
			'edit.php?post_type=refraction_snippet' => [
				'group' => self::CUSTOM_ELEMENTS_GROUP_ID,
				'label' => __( 'Code', 'refraction' ),
			],
			'e-custom-fonts' => [
				'group' => self::CUSTOM_ELEMENTS_GROUP_ID,
				'label' => __( 'Fonts', 'refraction' ),
			],
			'e-custom-icons' => [
				'group' => self::CUSTOM_ELEMENTS_GROUP_ID,
				'label' => __( 'Icons', 'refraction' ),
			],
			'e-custom-code' => [
				'group' => self::CUSTOM_ELEMENTS_GROUP_ID,
				'label' => __( 'Code', 'refraction' ),
			],
		];

		return apply_filters( 'refraction/editor-one/menu/legacy_pro_mapping', $default_mapping );
	}

	public static function get_attribute_mapping(): array {
		$default_mapping = [
			'e-form-submissions' => [
				'position' => 70,
				'icon' => 'send',
			],
		];

		return apply_filters( 'refraction/editor-one/menu/position_mapping', $default_mapping );
	}

	public static function get_custom_code_url(): string {
		$pro_custom_code_cpt = 'refraction_snippet';

		if ( post_type_exists( $pro_custom_code_cpt ) ) {
			$default_url = admin_url( 'edit.php?post_type=' . $pro_custom_code_cpt );
		} else {
			$default_url = admin_url( 'admin.php?page=refraction_custom_code' );
		}

		return apply_filters( 'refraction/editor-one/menu/custom_code_url', $default_url );
	}

	public static function get_refraction_home_url(): string {
		return admin_url( 'admin.php?page=' . self::REFRACTION_MENU_SLUG );
	}

	public static function get_refraction_post_types(): array {
		$default_values = [
			'refraction_icons' => [
				'menu_slug' => 'refraction-custom-elements',
				'child_slug' => 'edit.php?post_type=refraction_icons',
			],
			'refraction_font' => [
				'menu_slug' => 'refraction-custom-elements',
				'child_slug' => 'edit.php?post_type=refraction_font',
			],
			'refraction_snippet' => [
				'menu_slug' => 'refraction-custom-elements',
				'child_slug' => 'edit.php?post_type=refraction_snippet',
			],
		];

		return apply_filters( 'refraction/editor-one/menu/refraction_post_types', $default_values );
	}
}
