<?php
namespace Refraction\Tests\Phpunit\Data\V2\Base\Endpoint\Index;

use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Data_Test_Base;
use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock;
use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Controller as ControllerTemplate;
use Refraction\Tests\Phpunit\Refraction\Data\V2\Base\Mock\Template\Sub_Controller as SubControllerTemplate;

class Test_Sub_Index_Endpoint extends Data_Test_Base {
	public function test_get_format() {
		// Arrange.
		$controller = $this->manager->register_controller( new ControllerTemplate() );
		$sub_controller = new SubControllerTemplate( $controller );

		$this->manager->run_server();

		// Act.
		$actual = $sub_controller->index_endpoint->get_format();

		// Assert.
		$this->assertEquals( implode( '/', [
			$controller->get_name(),
			'{id}',
			$sub_controller->get_name(),
			'{sub_id}'
		] ), $actual );
	}

	public function test_get_base_route() {
		// Arrange.
		$controller = $this->manager->register_controller( new ControllerTemplate() );
		$sub_controller = new SubControllerTemplate( $controller );

		$this->manager->run_server();

		// Act.
		$actual = $sub_controller->index_endpoint->get_base_route();

		// Assert.
		$this->assertEquals( implode( '/', [
			'',
			$controller->get_name(),
			'(?P<id>[\w]+)',
			$sub_controller->get_name(),
		] ), $actual );
	}

	public function test_get_base_route__from_parent_index_of_sub_controller() {
		// Arrange.
		$controller = $this->manager->register_controller( new Mock\Template\Controller() );
		$sub_controller = new Mock\Template\Sub_Controller( $controller );

		// Trigger register.
		$this->manager->run_server();

		$index_endpoint = $sub_controller->get_endpoint_index();

		$sub_endpoint = new Mock\Template\Endpoint( $index_endpoint );

		// Act.
		$actual = $sub_endpoint->get_base_route();

		// Assert.
		$this->assertEquals( implode( '/', [
			'',
			$controller->get_name(),
			'(?P<id>[\w]+)',
			$sub_controller->get_name(),
			$sub_endpoint->get_name(),
		] ),  $actual );
	}

	public function test_get_full_command__from_parent_index_of_sub_controller() {
		// Arrange.
		$controller = $this->manager->register_controller( new Mock\Template\Controller() );
		$sub_controller = new Mock\Template\Sub_Controller( $controller );

		$this->manager->run_server();

		$index_endpoint = $sub_controller->get_endpoint_index();

		// Act.
		$actual = $index_endpoint->get_full_command();

		// Assert.
		$this->assertEquals( implode( '/', [
			$controller->get_name(),
			$sub_controller->get_name(),
			$index_endpoint->get_name(),
		] ), $actual );
	}

}
