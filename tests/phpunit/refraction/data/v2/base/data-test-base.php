<?php
namespace Refraction\Tests\Phpunit\Refraction\Data\V2\Base;

use Refraction\Data\V2\Manager;
use RefractionEditorTesting\Refraction_Test_Base;

abstract class Data_Test_Base extends Refraction_Test_Base {
	/**
	 * @var \Refraction\Data\V2\Manager
	 */
	protected $manager;

	public function setUp(): void {
		parent::setUp();

		$this->set_manager();
	}

	public function tearDown(): void {
		parent::tearDown();

		$this->manager->kill_server();
	}

	public function set_manager( $manager = null ) {
		if ( ! $manager ) {
			$manager = Manager::instance();
		}

		$this->manager = $manager;
	}

	public function get_manager() {
		if ( ! $this->manager ) {
			$this->manager = Manager::instance();
		}

		return $this->manager;
	}
}
