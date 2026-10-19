<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Shortcode extends Tag {

	public function get_name() {
		return 'shortcode';
	}

	public function get_title() {
		return esc_html__( 'Shortcode', 'refraction' );
	}

	public function get_group() {
		return Module::SITE_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY, Module::POST_META_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'shortcode',
			[
				'label' => esc_html__( 'Shortcode', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
			]
		);
	}

	public function is_settings_required() {
		return true;
	}


	public function render() {
		$shortcode = trim( (string) $this->get_settings( 'shortcode' ) );

		if ( '' === $shortcode ) {
			return;
		}

		// Shortcode output is trusted the way post content is: only people who can edit the page can add it.
		echo do_shortcode( shortcode_unautop( $shortcode ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
