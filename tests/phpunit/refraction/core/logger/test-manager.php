<?php

namespace Refraction\Tests\Phpunit\Refraction\Core\Logger;

use RefractionEditorTesting\Refraction_Test_Base;

class Test_Manager extends Refraction_Test_Base {

	/**
	 * @var \Refraction\Core\Logger\Manager
	 */
	private $mock_manager;

	public function setUp(): void {
		// Mock 'shutdown' method to avoid exit.
		$this->mock_manager = $this->getMockBuilder( \Refraction\Core\Logger\Manager::class )
			->setMethods( [ 'shutdown' ] )
			->getMock();
	}

	/**
	 * @dataProvider rest_error_handler_data_providers_error_numbers
	 */
	public function test_rest_error_handler__error_in_refraction_path( $error_number, $should_exit ) {
		// Assert (Expect).
		$this->mock_manager->expects( $this->once() )
			->method( 'shutdown' )
			->with( [
				'type' => $error_number,
				'message' => 0,
				'file' => __FILE__,
				'line' => 0,
			], $should_exit );

		// Act.
		$this->mock_manager->rest_error_handler( $error_number, 0, __FILE__, 0 );
	}

	public function rest_error_handler_data_providers_error_numbers() {
		return [
			[ E_ERROR, true ],
			[ E_USER_ERROR, true ],
			[ E_CORE_ERROR, true ],
			[ E_NOTICE, false ],
			[ E_USER_NOTICE, false ],
			[ E_DEPRECATED, false ],
			[ E_USER_DEPRECATED, false ],
		];
	}

	public function test_rest_error_handler__error_in_non_refraction_path() {
		// Assert (Expect).
		$this->mock_manager->expects( $this->never() )
			->method( 'shutdown' );

		// Act.
		$this->mock_manager->rest_error_handler( E_ERROR, 0, 'refraction/experts/files/test', 0 );
	}
}
