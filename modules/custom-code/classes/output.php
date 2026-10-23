<?php
namespace Refraction\Modules\CustomCode\Classes;

use Refraction\Modules\CustomCode\Module;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Prints the matching snippets at wp_head, wp_body_open and wp_footer. Never in wp-admin, the editor or its preview. */
class Output {

	private Snippets $snippets;

	public function __construct( Snippets $snippets ) {
		$this->snippets = $snippets;

		add_action( 'wp_head', [ $this, 'print_head' ], 99 );
		add_action( 'wp_body_open', [ $this, 'print_body_start' ], 1 );
		add_action( 'wp_footer', [ $this, 'print_body_end' ], 99 );
	}

	public function print_head(): void {
		$this->print_location( 'head' );
	}

	public function print_body_start(): void {
		$this->print_location( 'body_start' );
	}

	public function print_body_end(): void {
		$this->print_location( 'body_end' );
	}

	public function is_off(): bool {
		if ( defined( Module::KILL_SWITCH ) && constant( Module::KILL_SWITCH ) ) {
			return true;
		}

		if ( is_admin() || is_customize_preview() || is_feed() || wp_doing_ajax() ) {
			return true;
		}

		$plugin = Plugin::$instance;

		if ( $plugin->editor->is_edit_mode() || $plugin->preview->is_preview_mode() ) {
			return true;
		}

		// Recovery: an administrator opens any page with ?refraction-disable-code=1.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! empty( $_GET[ Module::SAFE_PARAM ] ) && current_user_can( 'manage_options' ) ) {
			return true;
		}

		return false;
	}

	private function print_location( string $location ): void {
		if ( $this->is_off() ) {
			return;
		}

		$theme_builder = Plugin::$instance->modules_manager->get_modules( 'theme-builder' );

		if ( ! $theme_builder ) {
			return;
		}

		$manager = $theme_builder->get_conditions_manager();
		$matches = $this->snippets->matching( $location, static fn( array $rules ) => null !== $manager->match( $rules ) );

		foreach ( $matches as $snippet ) {
			// The code is written by an administrator on purpose and is printed as is.
			echo Snippet_Format::render( $snippet['type'], $snippet['code'], $snippet['id'] ) . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}
}
