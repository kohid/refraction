<?php
namespace Refraction\Modules\ElementManager;

use Refraction\Modules\Usage\Module as Usage_Module;
use Refraction\Plugin;
use Refraction\User;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Ajax {

	public function register_endpoints() {
		add_action( 'wp_ajax_refraction_element_manager_get_admin_app_data', [ $this, 'ajax_get_admin_page_data' ] );
		add_action( 'wp_ajax_refraction_element_manager_save_disabled_elements', [ $this, 'ajax_save_disabled_elements' ] );
		add_action( 'wp_ajax_refraction_element_manager_get_widgets_usage', [ $this, 'ajax_get_widgets_usage' ] );
	}

	public function ajax_get_admin_page_data() {
		$this->verify_permission();
		$this->force_enabled_all_elements();

		$widgets = [];
		$plugins = [];

		foreach ( Plugin::$instance->widgets_manager->get_widget_types() as $widget ) {
			$widget_title = sanitize_user( $widget->get_title() );
			if ( empty( $widget_title ) || ! $widget->show_in_panel() ) {
				continue;
			}

			$plugin_name = $this->get_plugin_name_from_widget_instance( $widget );

			if ( ! in_array( $plugin_name, $plugins ) ) {
				$plugins[] = $plugin_name;
			}

			$widgets[] = [
				'name' => $widget->get_name(),
				'plugin' => $plugin_name,
				'title' => $widget_title,
				'icon' => $widget->get_icon(),
			];
		}

		$notice_id = 'e-element-manager-intro-1';

		$data = [
			'disabled_elements' => Options::get_disabled_elements(),
			'widgets' => $widgets,
			'plugins' => $plugins,
			'notice_data' => [
				'notice_id' => $notice_id,
				'is_viewed' => User::is_user_notice_viewed( $notice_id ),
				'nonce' => wp_create_nonce( 'refraction_set_admin_notice_viewed' ),
			],
		];

		$data['additional_data'] = apply_filters( 'refraction/element_manager/admin_app_data/additional_data', [] );

		wp_send_json_success( $data );
	}

	private function verify_permission() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( esc_html__( 'You do not have permission to edit these settings.', 'refraction' ) );
		}

		$nonce = Utils::get_super_global_value( $_POST, 'nonce' ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
		if ( empty( $nonce ) || ! wp_verify_nonce( $nonce, 'e-element-manager-app' ) ) {
			wp_send_json_error( esc_html__( 'Invalid nonce.', 'refraction' ) );
		}
	}

	private function force_enabled_all_elements() {
		remove_all_filters( 'refraction/widgets/is_widget_enabled' );
	}

	private function get_plugin_name_from_widget_instance( $widget ) {
		if ( in_array( 'wordpress', $widget->get_categories() ) ) { // phpcs:ignore WordPress.WP.CapitalPDangit.MisspelledInText
			return esc_html__( 'WordPress Widgets', 'refraction' );
		}

		$class_reflection = new \ReflectionClass( $widget );

		$plugin_basename = plugin_basename( $class_reflection->getFileName() );

		$plugin_directory = strtok( $plugin_basename, '/' );

		$plugins_data = get_plugins( '/' . $plugin_directory );
		$plugin_data = array_shift( $plugins_data );

		return $plugin_data['Name'] ?? esc_html__( 'Unknown', 'refraction' );
	}

	public function ajax_save_disabled_elements() {
		$this->verify_permission();

		$elements = Utils::get_super_global_value( $_POST, 'widgets' ); // phpcs:ignore WordPress.Security.NonceVerification.Missing

		if ( empty( $elements ) ) {
			wp_send_json_error( esc_html__( 'No elements to save.', 'refraction' ) );
		}

		$disabled_elements = json_decode( $elements );

		if ( ! is_array( $disabled_elements ) ) {
			wp_send_json_error( esc_html__( 'Unexpected elements data.', 'refraction' ) );
		}

		Options::update_disabled_elements( $disabled_elements );

		do_action( 'refraction/element_manager/save_disabled_elements' );

		wp_send_json_success();
	}

	public function ajax_get_widgets_usage() {
		$this->verify_permission();

		/** @var Usage_Module $usage_module */
		$usage_module = Usage_Module::instance();
		$usage_module->recalc_usage();

		$widgets_usage = [];
		foreach ( $usage_module->get_formatted_usage( 'raw' ) as $data ) {
			foreach ( $data['elements'] as $element => $count ) {
				if ( ! isset( $widgets_usage[ $element ] ) ) {
					$widgets_usage[ $element ] = 0;
				}

				$widgets_usage[ $element ] += $count;
			}
		}

		wp_send_json_success( $widgets_usage );
	}
}
