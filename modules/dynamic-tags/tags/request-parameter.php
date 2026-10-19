<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Value;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Request_Parameter extends Tag {

	public function get_name() {
		return 'request-parameter';
	}

	public function get_title() {
		return esc_html__( 'Request Parameter', 'refraction' );
	}

	public function get_group() {
		return Module::SITE_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY, Module::NUMBER_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'request_type',
			[
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'get',
				'options' => [
					'get' => esc_html__( 'Query string (GET)', 'refraction' ),
					'post' => esc_html__( 'Form (POST)', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'param_name',
			[
				'label' => esc_html__( 'Parameter name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
			]
		);
	}

	public function is_settings_required() {
		return true;
	}


	public function render() {
		$name = trim( (string) $this->get_settings( 'param_name' ) );

		if ( ! Value::allowed_param( $name ) ) {
			return;
		}

		// Reading a query string or form value to print it back is the purpose of this tag; it is escaped on output.
		$source = 'post' === $this->get_settings( 'request_type' ) ? $_POST : $_GET; // phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.NonceVerification.Missing

		if ( isset( $source[ $name ] ) && is_scalar( $source[ $name ] ) ) {
			echo esc_html( sanitize_text_field( wp_unslash( (string) $source[ $name ] ) ) );
		}
	}
}
