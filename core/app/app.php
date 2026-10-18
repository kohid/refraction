<?php
namespace Refraction\Core\App;

use Refraction\Core\Base\App as BaseApp;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * This App class was introduced for backwards compatibility with 3rd parties.
 */
class App extends BaseApp {

	const PAGE_ID = 'refraction-app';

	public function get_name() {
		return 'app-bc';
	}
}
