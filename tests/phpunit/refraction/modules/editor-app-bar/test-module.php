<?php
namespace Refraction\Testing\Modules\EditorAppBar;

use Refraction\Modules\EditorAppBar\Module;
use Refraction\Plugin;
use RefractionEditorTesting\Refraction_Test_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Test_Module extends Refraction_Test_Base {
	public function set_up(): void {
		parent::set_up();

		remove_all_filters( 'refraction/editor/v2/packages' );
		remove_all_filters( 'refraction/editor/v2/styles' );
		remove_all_filters( 'refraction/editor/templates' );
		remove_all_actions( 'refraction/editor/v2/scripts/enqueue' );
		remove_all_actions( 'refraction/editor/v2/styles/enqueue' );
	}

	public function test__enqueues_packages_and_styles() {
		// Act
		 new Module();

		// Assert
		$packages = apply_filters( 'refraction/editor/v2/packages', [] );
		$styles = apply_filters( 'refraction/editor/v2/styles', [] );

		$this->assertEquals( Module::PACKAGES, $packages );
		$this->assertEquals( Module::STYLES, $styles );
	}

	public function test_it__dequeues_responsive_bar_script_and_style() {
		// Arrange
		add_action( 'refraction/editor/v2/scripts/enqueue', fn() => wp_enqueue_script( 'refraction-responsive-bar', 'http://example.com/responsive-bar.js' ) );
		add_action( 'refraction/editor/v2/styles/enqueue', fn() => wp_enqueue_style( 'refraction-responsive-bar', 'http://example.com/responsive-bar.css' ) );

		// Act
		new Module();

		do_action( 'refraction/editor/v2/scripts/enqueue' );
		do_action( 'refraction/editor/v2/styles/enqueue' );

		// Assert
		$this->assertFalse( wp_script_is( 'refraction-responsive-bar') );
		$this->assertFalse( wp_style_is( 'refraction-responsive-bar') );
	}

	public function test_it__removes_responsive_bar_template() {
		// Act
		new Module();

		$templates = apply_filters( 'refraction/editor/templates', [ 'responsive-bar' ] );

		// Assert
		$this->assertEmpty( $templates );
	}
}
