<?php
namespace Refraction\Testing\Modules\Library\Documents;

use Refraction\Modules\Library\Documents\Page;
use RefractionEditorTesting\Refraction_Test_Base;

class Refraction_Test_Page extends Refraction_Test_Base {

	/** @var Page */
	private static $page;

	public function setUp(): void {
		parent::setUp();
		self::$page = new Page( [ 'post_id' => self::factory()->create_and_get_default_post()->ID ] );
	}

	public function test_should_return_properties() {
		$properties = Page::get_properties();

		$this->assertTrue( $properties['support_wp_page_templates'] );
	}

	public function test_should_return_name() {
		$name = self::$page->get_name();

		$this->assertEquals( 'page', $name );
	}

	public function test_should_return_title() {
		$title = Page::get_title();

		$this->assertEquals( esc_html__( 'Page', 'refraction' ), $title );
	}

	public function test_should_return_css_wrapper_selector() {
		$css_wrapper = self::$page->get_css_wrapper_selector();

		$this->assertStringContainsString( 'body.refraction-page-', $css_wrapper );
	}

	public function test_should_register_controls() {
		$page_reflection = new \ReflectionClass( 'Refraction\Modules\Library\Documents\Page' );
		$method = $page_reflection->getMethod( 'register_controls' );
		$method->setAccessible( true );

		$method->invokeArgs( self::$page, [] );

		$this->assertNotNull( self::$page->get_controls( 'post_status' ) );
		$this->assertNotNull( self::$page->get_section_controls( 'section_page_style' ) );
	}
}
