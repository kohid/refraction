<?php

namespace Refraction\Modules\WpRest;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\WpRest\Classes\Refraction_Post_Meta;
use Refraction\Modules\WpRest\Classes\Refraction_Settings;
use Refraction\Modules\WpRest\Classes\Refraction_User_Meta;
use Refraction\Modules\WpRest\Classes\Post_Query;
use Refraction\Modules\WpRest\Classes\Term_Query;
use Refraction\Modules\WpRest\Classes\User_Query;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends BaseModule {

	public function get_name() {
		return 'wp-rest';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'rest_api_init', function () {
			( new Refraction_Post_Meta() )->register();
			( new Refraction_Settings() )->register();
			( new Refraction_User_Meta() )->register();
			( new Post_Query() )->register( Post_Query::ENDPOINT );
			( new Term_Query() )->register( Term_Query::ENDPOINT );
			( new User_Query() )->register( User_Query::ENDPOINT );
		} );
	}
}
