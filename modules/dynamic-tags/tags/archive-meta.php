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

class Archive_Meta extends Tag {

	public function get_name() {
		return 'archive-meta';
	}

	public function get_title() {
		return esc_html__( 'Archive Meta', 'refraction' );
	}

	public function get_group() {
		return Module::ARCHIVE_GROUP;
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
				'description' => esc_html__( 'The name of the term field. Names starting with an underscore are private and never shown.', 'refraction' ),
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
		$term = Context::get_term();
		$key = trim( (string) $this->get_settings( 'key' ) );

		if ( $term && Value::allowed_key( $key ) ) {
			echo wp_kses_post( Value::to_text( get_term_meta( $term->term_id, $key, true ) ) );
		}
	}
}
