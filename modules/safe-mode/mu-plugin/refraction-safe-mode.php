<?php
/**
 * Plugin Name: Refraction Safe Mode
 * Description: Safe Mode allows you to troubleshoot issues by only loading the editor, without loading the theme or any other plugin.
 * Author: Refraction contributors (based on Elementor by Elementor.com)
 * Version: 1.0.0
 *
 * Text Domain: refraction
 *
 * @package Refraction
 * @category Safe Mode
 *
 * Refraction is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * Refraction is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Safe_Mode {

	const OPTION_ENABLED = 'refraction_safe_mode';
	const OPTION_TOKEN = self::OPTION_ENABLED . '_token';

	public function is_enabled() {
		return get_option( self::OPTION_ENABLED );
	}

	public function is_valid_token() {
		$token = isset( $_COOKIE[ self::OPTION_TOKEN ] )
			? wp_kses_post( wp_unslash( $_COOKIE[ self::OPTION_TOKEN ] ) )
			: null;

		if ( $token && get_option( self::OPTION_TOKEN ) === $token ) {
			return true;
		}

		return false;
	}

	public function is_requested() {
		return ! empty( $_REQUEST['refraction-mode'] ) && 'safe' === $_REQUEST['refraction-mode'];
	}

	public function is_editor() {
		return is_admin() && isset( $_GET['action'] ) && 'refraction' === $_GET['action'];
	}

	public function is_editor_preview() {
		return isset( $_GET['refraction-preview'] );
	}

	public function is_editor_ajax() {
		// PHPCS - There is already nonce verification in the Ajax Manager
		return is_admin() && isset( $_POST['action'] ) && 'refraction_ajax' === $_POST['action']; // phpcs:ignore WordPress.Security.NonceVerification.Missing
	}

	public function add_hooks() {
		add_filter( 'pre_option_active_plugins', function () {
			return get_option( 'refraction_safe_mode_allowed_plugins' );
		} );

		add_filter( 'pre_option_stylesheet', function () {
			return 'refraction-safe';
		} );

		add_filter( 'pre_option_template', function () {
			return 'refraction-safe';
		} );

		add_action( 'refraction/init', function () {
			do_action( 'refraction/safe_mode/init' );
		} );
	}

	public function __construct() {
		$enabled_type = $this->is_enabled();

		if ( ! $enabled_type || ! $this->is_valid_token() ) {
			return;
		}

		if ( ! $this->is_requested() && 'global' !== $enabled_type ) {
			return;
		}

		if ( ! $this->is_editor() && ! $this->is_editor_preview() && ! $this->is_editor_ajax() ) {
			return;
		}

		$this->add_hooks();
	}
}

new Safe_Mode();
