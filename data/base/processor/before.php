<?php
namespace Refraction\Data\Base\Processor;

use Refraction\Data\Base\Processor;

abstract class Before extends Processor {

	/**
	 * Get conditions for running processor.
	 *
	 * @param array $args
	 *
	 * @return bool
	 */
	public function get_conditions( $args ) {
		return true;
	}

	/**
	 * Apply processor.
	 *
	 * @param array $args
	 *
	 * @return mixed
	 */
	abstract public function apply( $args );
}
