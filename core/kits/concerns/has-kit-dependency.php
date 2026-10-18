<?php

namespace Refraction\Core\Kits\Concerns;

use Refraction\Core\Kits\Documents\Kit;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

trait Has_Kit_Dependency {
	private ?Kit $kit = null;

	public function set_kit( Kit $kit ): self {
		$this->kit = $kit;

		return $this;
	}

	protected function get_kit(): ?Kit {
		if ( ! $this->kit ) {
			$this->kit = Plugin::$instance->kits_manager->get_active_kit();
		}

		return $this->kit;
	}
}
