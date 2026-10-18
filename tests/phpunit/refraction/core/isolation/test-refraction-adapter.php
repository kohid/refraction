<?php
namespace Refraction\Tests\Phpunit\Refraction\Core\Isolation;

use Refraction\Core\Base\Document;
use Refraction\Core\Isolation\Refraction_Adapter;
use Refraction\Core\Isolation\Refraction_Adapter_Interface;
use Refraction\Plugin;
use PHPUnit\Framework\TestCase as PHPUnit_TestCase;

class Test_Refraction_Adapter extends PHPUnit_TestCase {
	private ?Refraction_Adapter_Interface $refraction_adapter;
	private ?Document $document = null;

	public function setUp(): void {
		parent::setUp();

		$this->refraction_adapter = new Refraction_Adapter();
		$this->document = Plugin::$instance->documents->create(
			'post',
			[
				'post_title' => 'title',
				'post_status' => 'publish',
			]
		);
	}

	public function tearDown(): void {
		$this->refraction_adapter = null;
		$this->document = null;

		parent::tearDown();
	}

	public function test_get_template_type__assert_no_error() {
		$this->assertFalse( ( bool ) $this->refraction_adapter->get_template_type( '' ) );
	}

	public function test_get_template_type__assert_type() {
		$this->assertTrue( 'post' === $this->refraction_adapter->get_template_type( $this->document->get_id() ) );
	}
}
