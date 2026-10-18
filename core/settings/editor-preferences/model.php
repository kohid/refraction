<?php
namespace Refraction\Core\Settings\EditorPreferences;

use Refraction\Controls_Manager;
use Refraction\Core\Settings\Base\Model as BaseModel;
use Refraction\Modules\Checklist\Module as ChecklistModule;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Model extends BaseModel {

	/**
	 * Get element name.
	 *
	 * Retrieve the element name.
	 *
	 * @return string The name.
	 * @since 2.8.0
	 * @access public
	 */
	public function get_name() {
		return 'editor-preferences';
	}

	/**
	 * Get panel page settings.
	 *
	 * Retrieve the page setting for the current panel.
	 *
	 * @since 2.8.0
	 * @access public
	 */
	public function get_panel_page_settings() {
		return [
			'title' => esc_html__( 'User Preferences', 'refraction' ),
		];
	}

	/**
	 * @since 3.1.0
	 * @access protected
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'preferences',
			[
				'tab' => Controls_Manager::TAB_SETTINGS,
				'label' => esc_html__( 'Preferences', 'refraction' ),
			]
		);

		$this->add_control(
			'editor_heading',
			[
				'label' => esc_html__( 'Panel', 'refraction' ),
				'type' => Controls_Manager::HEADING,
			]
		);

		$this->add_control(
			'ui_theme',
			[
				'label' => esc_html__( 'Display mode', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'light' => [
						'title' => esc_html__( 'Light mode', 'refraction' ),
						'icon' => 'eicon-light-mode',
					],
					'dark' => [
						'title' => esc_html__( 'Dark mode', 'refraction' ),
						'icon' => 'eicon-dark-mode',
					],
					'auto' => [
						'title' => esc_html__( 'Auto detect', 'refraction' ),
						'icon' => 'eicon-header',
					],
				],
				'default' => 'auto',
				'description' => esc_html__( 'Set light or dark mode, or auto-detect to sync with your operating system settings.', 'refraction' ),
			]
		);

		$this->add_control(
			'panel_width',
			[
				'label' => esc_html__( 'Width', 'refraction' ) . ' (px)',
				'type' => Controls_Manager::SLIDER,
				'range' => [
					'px' => [
						'min' => 250,
						'max' => 680,
					],
				],
				'default' => [
					'size' => 300,
				],
			]
		);

		$this->add_control(
			'preview_heading',
			[
				'label' => esc_html__( 'Canvas', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'edit_buttons',
			[
				'label' => esc_html__( 'Show quick edit options', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => esc_html__( 'Yes', 'refraction' ),
				'label_off' => esc_html__( 'No', 'refraction' ),
				'description' => esc_html__( 'Show additional actions while hovering over the handle of an element.', 'refraction' ),
			]
		);

		$this->add_control(
			'lightbox_in_editor',
			[
				'label' => esc_html__( 'Expand images in lightbox', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'label_on' => esc_html__( 'Yes', 'refraction' ),
				'label_off' => esc_html__( 'No', 'refraction' ),
				'description' => esc_html__( 'This only applies while you’re working in the editor. The front end won’t be affected.', 'refraction' ),
			]
		);

		$this->add_control(
			'show_hidden_elements',
			[
				'label' => esc_html__( 'Show hidden elements', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => esc_html__( 'Yes', 'refraction' ),
				'label_off' => esc_html__( 'No', 'refraction' ),
				'default' => 'yes',
				'description' => esc_html__( 'This refers to elements you’ve hidden in the Responsive Visibility settings.', 'refraction' ),
			]
		);

		if ( ChecklistModule::should_display_checklist_toggle_control() ) {
			$this->add_control(
				'get_started_heading',
				[
					'label' => esc_html__( 'Get Started', 'refraction' ),
					'type' => Controls_Manager::HEADING,
					'separator' => 'before',
				]
			);

			$this->add_control(
				ChecklistModule::VISIBILITY_SWITCH_ID,
				[
					'label' => esc_html__( 'Show launchpad checklist', 'refraction' ),
					'type' => Controls_Manager::SWITCHER,
					'label_on' => esc_html__( 'Yes', 'refraction' ),
					'label_off' => esc_html__( 'No', 'refraction' ),
					'default' => Plugin::$instance->modules_manager->get_modules( 'checklist' )->is_preference_switch_on() ? 'yes' : '',
					'description' => esc_html__( 'These will guide you through the first steps of creating your site.', 'refraction' ),
				]
			);
		}

		$this->add_control(
			'design_system_heading',
			[
				'label' => esc_html__( 'Design System', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'enable_styleguide_preview',
			[
				'label' => esc_html__( 'Show global settings', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'label_on' => esc_html__( 'Yes', 'refraction' ),
				'label_off' => esc_html__( 'No', 'refraction' ),
				'description' => esc_html__( 'Temporarily overlay the canvas with the style guide to preview your changes to global colors and fonts.', 'refraction' ),
			]
		);

		$this->add_control(
			'navigation_heading',
			[
				'label' => esc_html__( 'Navigation', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'exit_to',
			[
				'label' => esc_html__( 'Exit to', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'this_post',
				'options' => [
					'this_post' => esc_html__( 'This Post', 'refraction' ),
					'all_posts' => esc_html__( 'All Posts', 'refraction' ),
					'dashboard' => esc_html__( 'WP Dashboard', 'refraction' ),
				],
				'description' => esc_html__( 'Decide where you want to go when leaving the editor.', 'refraction' ),
			]
		);

		$this->end_controls_section();
	}
}
