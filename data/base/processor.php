<?php
namespace Refraction\Data\Base;

abstract class Processor {

	/**
	 * Controller.
	 *
	 * @var \Refraction\Data\Base\Controller
	 */
	private $controller;

	/**
	 * Processor constructor.
	 *
	 * @param \Refraction\Data\Base\Controller $controller
	 */
	public function __construct( $controller ) {
		$this->controller = $controller;
	}

	/**
	 * Get processor command.
	 *
	 * @return string
	 */
	abstract public function get_command();
}
