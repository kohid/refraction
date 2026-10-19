<?php
namespace Refraction\Core\Editor\Loader;

use Refraction\Core\Debug\Loading_Inspection_Manager;
use Refraction\Core\Settings\Manager as SettingsManager;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Plugin;
use Refraction\Settings;
use Refraction\Shapes;
use Refraction\Tools;
use Refraction\User;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Editor_Scripts_Settings {
	public static function get() {
		$settings = SettingsManager::get_settings_managers_config();
		// Moved to document since 2.9.0.
		unset( $settings['page'] );

		$document = Plugin::$instance->documents->get_doc_or_auto_save( Plugin::$instance->editor->get_post_id() );
		$kits_manager = Plugin::$instance->kits_manager;

		$page_title_selector = $kits_manager->get_current_settings( 'page_title_selector' );

		$page_title_selector .= ', .refraction-page-title .refraction-heading-title';

		$client_env = [
			'initial_document' => $document->get_config(),
			'version' => REFRACTION_VERSION,
			// The template library is local only (no account, no tiers); the editor's library views still read these keys.
			'library_connect' => [
				'is_connected' => true,
				'user_email' => '',
				'base_access_tier' => 'free',
				'current_access_tier' => 'free',
				'subscription_plans' => [],
			],
			'home_url' => home_url(),
			'admin_settings_url' => admin_url( 'admin.php?page=' . 'refraction-settings' ),
			'admin_tools_url' => admin_url( 'admin.php?page=' . Tools::PAGE_ID ),
			'autosave_interval' => AUTOSAVE_INTERVAL,
			'tabs' => Plugin::$instance->controls_manager->get_tabs(),
			'controls' => Plugin::$instance->controls_manager->get_controls_data(),
			'elements' => Plugin::$instance->elements_manager->get_element_types_config(),
			'globals' => [
				'defaults_enabled' => [
					'colors' => $kits_manager->is_custom_colors_enabled(),
					'typography' => $kits_manager->is_custom_typography_enabled(),
				],
			],
			'icons' => [
				'libraries' => Icons_Manager::get_icon_manager_tabs_config(),
			],
			'fa4_to_fa5_mapping_url' => REFRACTION_ASSETS_URL . 'lib/font-awesome/migration/mapping.js',
			'settings' => $settings,
			'wp_editor' => static::get_wp_editor_config(),
			'settings_page_link' => Settings::get_url(),
			'tools_page_link' => Tools::get_url(),
			'tools_page_nonce' => wp_create_nonce( 'tools-page-from-editor' ),
			'additional_shapes' => Shapes::get_additional_shapes_for_config(),
			'user' => [
				'restrictions' => Plugin::$instance->role_manager->get_user_restrictions_array(),
				'is_administrator' => current_user_can( 'manage_options' ),
				'introduction' => User::get_introduction_meta(),
				'dismissed_editor_notices' => User::get_dismissed_editor_notices(),
				'locale' => get_user_locale(),
			],
			'preview' => [
				'debug_data' => Loading_Inspection_Manager::instance()->run_inspections(),
			],
			'locale' => get_locale(),
			'rich_editing_enabled' => filter_var( get_user_meta( get_current_user_id(), 'rich_editing', true ), FILTER_VALIDATE_BOOLEAN ),
			'page_title_selector' => $page_title_selector,
			'tinymceHasCustomConfig' => class_exists( 'Tinymce_Advanced' ) || class_exists( 'Advanced_Editor_Tools' ),
			'inlineEditing' => Plugin::$instance->widgets_manager->get_inline_editing_config(),
			'dynamicTags' => Plugin::$instance->dynamic_tags->get_config(),
			'ui' => [
				'defaultGenericFonts' => $kits_manager->get_current_settings( 'default_generic_fonts' ),
			],
			// Empty array for BC to avoid errors.
			'i18n' => [],
			// 'responsive' contains the custom breakpoints config introduced in Refraction v3.2.0
			'responsive' => [
				'breakpoints' => Plugin::$instance->breakpoints->get_breakpoints_config(),
				'icons_map' => Plugin::$instance->breakpoints->get_responsive_icons_classes_map(),
			],
			'fontVariableRanges' => Group_Control_Typography::get_font_variable_ranges(),
		];

		if ( Plugin::$instance->experiments->is_feature_active( 'container' ) ) {
			$client_env['elementsPresets'] = Plugin::$instance->editor->get_elements_presets();
		}

		static::bc_move_document_filters();

		/**
		 * Localize editor settings.
		 *
		 * Filters the editor localized settings.
		 *
		 * @since 1.0.0
		 *
		 * @param array $client_env  Editor configuration.
		 * @param int   $post_id The ID of the current post being edited.
		 */
		$client_env = apply_filters( 'refraction/editor/localize_settings', $client_env );

		return $client_env;
	}

	private static function bc_move_document_filters() {
		global $wp_filter;

		$old_tag = 'refraction/editor/localize_settings';
		$new_tag = 'refraction/document/config';

		if ( ! has_filter( $old_tag ) ) {
			return;
		}

		foreach ( $wp_filter[ $old_tag ] as $priority => $filters ) {
			foreach ( $filters as $filter_id => $filter_args ) {
				if ( 2 === $filter_args['accepted_args'] ) {
					remove_filter( $old_tag, $filter_id, $priority );

					add_filter( $new_tag, $filter_args['function'], $priority, 2 );
				}
			}
		}
	}

	/**
	 * Get WordPress editor config.
	 *
	 * Config the default WordPress editor with custom settings for Refraction use.
	 *
	 * @since 1.9.0
	 * @access private
	 */
	private static function get_wp_editor_config() {
		// Remove all TinyMCE plugins.
		remove_all_filters( 'mce_buttons', 10 );
		remove_all_filters( 'mce_external_plugins', 10 );

		if ( ! class_exists( '\_WP_Editors', false ) ) {
			require ABSPATH . WPINC . '/class-wp-editor.php';
		}

		// WordPress 4.8 and higher
		if ( method_exists( '\_WP_Editors', 'print_tinymce_scripts' ) ) {
			\_WP_Editors::print_default_editor_scripts();
			\_WP_Editors::print_tinymce_scripts();
		}
		ob_start();

		wp_editor(
			'%%EDITORCONTENT%%',
			'refractionwpeditor',
			[
				'editor_class' => 'refraction-wp-editor',
				'editor_height' => 250,
				'drag_drop_upload' => true,
			]
		);

		$config = ob_get_clean();

		// Don't call \_WP_Editors methods again
		remove_action( 'admin_print_footer_scripts', [ '_WP_Editors', 'editor_js' ], 50 );
		remove_action( 'admin_print_footer_scripts', [ '_WP_Editors', 'print_default_editor_scripts' ], 45 );

		\_WP_Editors::editor_js();

		return $config;
	}
}
