<?php
namespace Refraction\Tests\Phpunit\Refraction\Core\Utils;

use Refraction\Core\Utils\Str;
use RefractionEditorTesting\Refraction_Test_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Test_Str extends Refraction_Test_Base {

	/**
	 * Assert that `Str::encode_idn_url()` encodes non-IDN URLs properly.
	 */
	public function test_encode_idn_url__encodes_non_idn_url() {
		// Arrange.
		$url = 'https://www.example.com/some/path/to/file.php';
		$expected = $url;

		// Act.
		$encoded_url = Str::encode_idn_url( $url );

		// Assert.
		$this->assertEquals( $expected, $encoded_url );
	}

	/**
	 * Assert that `Str::encode_idn_url()` encodes IDN URLs properly.
	 */
	public function test_encode_idn_url__encodes_idn_url() {
		// Arrange.
		$url = 'https://é.com/some/path/to/file.php';
		$expected = 'https://xn--9ca.com/some/path/to/file.php';

		// Act.
		$encoded_url = Str::encode_idn_url( $url );

		// Assert.
		$this->assertEquals( $expected, $encoded_url );
	}

	public function test_ends_with() {
		// Arrange
		$str1 = 'test-str';
		$str2 = 'test-str-2';

		// Act & Assert
		$this->assertTrue( Str::ends_with( $str1, 'str' ) );
		$this->assertFalse( Str::ends_with( $str2, 'str' ) );
	}
}
