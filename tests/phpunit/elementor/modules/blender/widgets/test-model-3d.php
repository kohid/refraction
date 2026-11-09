<?php
namespace Elementor\Tests\Phpunit\Elementor\Modules\Blender\Widgets;

use Elementor\Modules\Blender\Module;
use Elementor\Modules\Blender\Rest\Publish_Controller;
use Elementor\Modules\Blender\Widgets\Model_3D;
use ElementorEditorTesting\Elementor_Test_Base;

class Test_Model_3D extends Elementor_Test_Base {

	private function make_widget( array $settings = [] ): Model_3D {
		return new Model_3D( [
			'id' => 'abc1234',
			'elType' => 'widget',
			'widgetType' => 'model-3d',
			'settings' => $settings,
		], [] );
	}

	private function render( array $settings ): string {
		ob_start();
		$this->make_widget( $settings )->render_content();

		return ob_get_clean();
	}

	public function test_widget_is_registered() {
		$this->assertInstanceOf( Model_3D::class, $this->elementor()->widgets_manager->get_widget_types( 'model-3d' ) );
	}

	public function test_depends_on_bundled_model_viewer() {
		$this->assertSame( [ Module::SCRIPT_HANDLE ], $this->make_widget()->get_script_depends() );

		do_action( 'elementor/frontend/after_register_scripts' );

		$script = wp_scripts()->registered[ Module::SCRIPT_HANDLE ];
		$this->assertStringContainsString( 'assets/lib/model-viewer/model-viewer.min.js', $script->src );
		$this->assertStringContainsString( 'assets/lib/draco/', implode( '', $script->extra['after'] ) );
	}

	public function test_renders_nothing_without_model() {
		$this->assertSame( '', trim( $this->render( [] ) ) );
	}

	public function test_default_attributes() {
		$widget = $this->make_widget();
		$attributes = $widget->get_viewer_attributes( array_merge( $widget->get_settings_for_display(), [ 'model' => [ 'url' => 'https://example.com/a.glb' ] ] ) );

		$this->assertSame( 'https://example.com/a.glb', $attributes['src'] );
		$this->assertSame( 'lazy', $attributes['loading'] );
		$this->assertSame( 'agx', $attributes['tone-mapping'] );
		$this->assertArrayHasKey( 'camera-controls', $attributes );
		$this->assertArrayHasKey( 'auto-rotate', $attributes );
		$this->assertSame( '30deg', $attributes['rotation-per-second'] );
		$this->assertArrayNotHasKey( 'autoplay', $attributes );
		$this->assertArrayNotHasKey( 'ar', $attributes );
		$this->assertSame( '3D model', $attributes['alt'] );
	}

	public function test_unknown_select_values_fall_back() {
		$attributes = $this->make_widget()->get_viewer_attributes( [
			'model' => [ 'url' => 'https://example.com/a.glb' ],
			'tone_mapping' => '"><script>',
			'loading' => 'later',
		] );

		$this->assertSame( 'neutral', $attributes['tone-mapping'] );
		$this->assertSame( 'lazy', $attributes['loading'] );
	}

	public function test_render_escapes_attributes_and_sets_options() {
		$html = $this->render( [
			'model' => [ 'url' => 'https://example.com/a.glb' ],
			'alt' => 'Chair "<b>"',
			'autoplay' => 'yes',
			'animation_name' => 'Walk',
			'ar' => 'yes',
			'camera_orbit' => '45deg 60deg 2m',
		] );

		$this->assertStringContainsString( '<model-viewer', $html );
		$this->assertStringContainsString( 'src="https://example.com/a.glb"', $html );
		$this->assertStringContainsString( 'alt="Chair &quot;&lt;b&gt;&quot;"', $html );
		$this->assertStringContainsString( 'animation-name="Walk"', $html );
		$this->assertStringContainsString( 'camera-orbit="45deg 60deg 2m"', $html );
		$this->assertStringContainsString( 'ar-modes="webxr scene-viewer"', $html );
		$this->assertStringNotContainsString( '<b>', $html );
	}

	public function test_attachment_url_and_blender_poster_win_over_stored_url() {
		$model_id = self::factory()->attachment->create( [
			'post_mime_type' => 'model/gltf-binary',
			'file' => '2026/11/chair-2.glb',
		] );
		$poster_id = self::factory()->attachment->create( [
			'post_mime_type' => 'image/png',
			'file' => '2026/11/chair-poster.png',
			'post_parent' => $model_id,
		] );
		update_post_meta( $model_id, Publish_Controller::META_POSTER, $poster_id );

		$attributes = $this->make_widget()->get_viewer_attributes( [
			'model' => [
				'id' => $model_id,
				'url' => 'https://example.com/old/chair.glb',
			],
		] );

		$this->assertSame( wp_get_attachment_url( $model_id ), $attributes['src'] );
		$this->assertSame( wp_get_attachment_url( $poster_id ), $attributes['poster'] );
	}

	public function test_widget_poster_overrides_blender_poster() {
		$attributes = $this->make_widget()->get_viewer_attributes( [
			'model' => [ 'url' => 'https://example.com/a.glb' ],
			'poster' => [ 'url' => 'https://example.com/poster.jpg' ],
		] );

		$this->assertSame( 'https://example.com/poster.jpg', $attributes['poster'] );
	}
}
