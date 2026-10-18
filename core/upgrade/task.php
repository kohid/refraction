<?php

namespace Refraction\Core\Upgrade;

use Refraction\Core\Base\Background_Task;
use Refraction\Core\Base\DB_Upgrades_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Task extends Background_Task {

	/**
	 * @var DB_Upgrades_Manager
	 */
	protected $manager;

	protected function format_callback_log( $item ) {
		return $this->manager->get_plugin_label() . '/Tasks - ' . $item['callback'][1];
	}

	public function set_limit( $limit ) {
		$this->manager->set_query_limit( $limit );
	}
}
