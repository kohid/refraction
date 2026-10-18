<?php
namespace Refraction\Tests\Phpunit\Refraction\Core\Isolation;

use Refraction\Core\Isolation\Plugin_Status_Adapter;
use Refraction\Core\Isolation\Wordpress_Adapter;
use PHPUnit\Framework\TestCase as PHPUnit_TestCase;

class Test_Plugin_Status_Adapter extends PHPUnit_TestCase {

	private $wordpress_adapter;

	public function __construct( ?string $name = null, array $data = [], $dataName = '' ) {
		parent::__construct( $name, $data, $dataName );
		$this->wordpress_adapter = null;
	}

	public function test_is_plugin_installed() {
		// Arrange
		$adapter = new Plugin_Status_Adapter( $this->wordpress_adapter );

		// Act
		$is_refraction_installed = $adapter->is_plugin_installed( 'refraction/refraction.php' );
		$is_refraction_pro_installed = $adapter->is_plugin_installed( 'refraction-pro/refraction-pro.php' );

		// Assert
		$this->assertTrue( $is_refraction_installed );
		$this->assertFalse( $is_refraction_pro_installed );
	}

	public function test_get_install_plugin_url() {
		// Arrange
		$adapter = new Plugin_Status_Adapter( $this->wordpress_adapter );

		// Act
		$refraction_install_url = $adapter->get_install_plugin_url( 'refraction/refraction.php' );
		$expected_core_url = 'wp-admin/update.php?action=install-plugin&amp;plugin=refraction&amp;_wpnonce=';

		// Assert
		$this->assertTrue( str_contains( $refraction_install_url, $expected_core_url ) );
	}

	public function test_get_activate_plugin_url() {
		// Arrange
		$adapter = new Plugin_Status_Adapter( $this->wordpress_adapter );

		// Act
		$refraction_activate_url = $adapter->get_activate_plugin_url( 'refraction/refraction.php' );
		$expected_core_url = 'plugins.php?action=activate&amp;plugin=refraction%2Frefraction.php&amp;plugin_status=all&amp;paged=1&amp;s&amp;_wpnonce=';

		// Assert
		$this->assertTrue( str_contains( $refraction_activate_url, $expected_core_url ) );
	}

	public function setUp(): void {
		parent::setUp();

		$wordpress_adapter_mock = $this->getMockBuilder( Wordpress_Adapter::class )
			->setMethods( [ 'get_plugins' ] )
			->getMock();

		$wordpress_adapter_mock->method( 'get_plugins' )->willReturn(
			[
				'refraction/refraction.php' => 'value',
			]
		);

		$this->wordpress_adapter = $wordpress_adapter_mock;
	}
}
