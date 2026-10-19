<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Site_Logo extends Data_Tag {

	public function get_name() {
		return 'site-logo';
	}

	public function get_title() {
		return esc_html__( 'Site Logo', 'refraction' );
	}

	public function get_group() {
		return Module::SITE_GROUP;
	}

	public function get_categories() {
		return [ Module::IMAGE_CATEGORY, Module::MEDIA_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'fallback',
			[
				'label' => esc_html__( 'Fallback', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
			]
		);
	}


	public function get_value( array $options = [] ) {
		$id = (int) get_theme_mod( 'custom_logo' );
		$url = $id ? wp_get_attachment_url( $id ) : '';

		return $url ? [ 'id' => $id, 'url' => $url ] : (array) $this->get_settings( 'fallback' );
	}
}
