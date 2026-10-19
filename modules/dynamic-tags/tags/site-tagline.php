<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Site_Tagline extends Tag {

	public function get_name() {
		return 'site-tagline';
	}

	public function get_title() {
		return esc_html__( 'Site Tagline', 'refraction' );
	}

	public function get_group() {
		return Module::SITE_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY ];
	}


	public function render() {
		echo esc_html( get_bloginfo( 'description' ) );
	}
}
