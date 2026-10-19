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

class Acf_Number extends Tag {

	public function get_name() {
		return 'acf-number';
	}

	public function get_title() {
		return esc_html__( 'ACF Number', 'refraction' );
	}

	public function get_group() {
		return Module::ACF_GROUP;
	}

	public function get_categories() {
		return [ Module::NUMBER_CATEGORY, Module::TEXT_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'key',
			[
				'label' => esc_html__( 'ACF field name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'description' => esc_html__( 'The name (or key) of the Advanced Custom Fields field.', 'refraction' ),
			]
		);

		$this->add_control(
			'source',
			[
				'label' => esc_html__( 'Read from', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'post',
				'options' => [
					'post' => esc_html__( 'Current post', 'refraction' ),
					'term' => esc_html__( 'Archive term', 'refraction' ),
				],
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
		$value = $this->read_field();

		if ( is_numeric( $value ) ) {
			echo esc_html( (string) $value );
		}
	}
	/** The raw ACF value for the chosen source, or null when ACF is missing or the source may not be read. */
	protected function read_field() {
		$key = trim( (string) $this->get_settings( 'key' ) );

		if ( ! function_exists( 'get_field' ) || ! Value::allowed_key( $key ) ) {
			return null;
		}

		if ( 'term' === $this->get_settings( 'source' ) ) {
			$term = Context::get_term();

			return $term ? get_field( $key, $term ) : null;
		}

		$post = Context::get_post();

		return Context::can_read( $post ) ? get_field( $key, $post->ID ) : null;
	}

}
