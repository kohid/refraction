<?php

namespace Refraction\Core\Admin\Menu;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Main extends Base {

	protected function get_init_args() {
		return [
			'page_title' => esc_html__( 'Refraction', 'refraction' ),
			'menu_title' => esc_html__( 'Refraction', 'refraction' ),
			'capability' => 'manage_options',
			'menu_slug' => 'refraction',
			'function' => null,
			'position' => 58.5,
		];
	}
}
