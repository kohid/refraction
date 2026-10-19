<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Modules\DynamicTags\Classes\Value;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Author_Meta extends Tag {

	public function get_name() {
		return 'author-meta';
	}

	public function get_title() {
		return esc_html__( 'Author Meta', 'refraction' );
	}

	public function get_group() {
		return Module::AUTHOR_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY, Module::NUMBER_CATEGORY, Module::POST_META_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'key',
			[
				'label' => esc_html__( 'Field name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'description' => esc_html__( 'The name of the user field. Private names (underscore, passwords, keys, tokens) are never shown.', 'refraction' ),
			]
		);
	}

	public function is_settings_required() {
		return true;
	}

	public function get_panel_template_setting_key() {
		return 'key';
	}


	public function render() {
		$key = trim( (string) $this->get_settings( 'key' ) );
		$id = Context::get_author_id();

		if ( $id && Value::allowed_user_key( $key ) ) {
			echo wp_kses_post( Value::to_text( get_user_meta( $id, $key, true ) ) );
		}
	}
}
