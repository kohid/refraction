<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class User_Info extends Tag {

	public function get_name() {
		return 'user-info';
	}

	public function get_title() {
		return esc_html__( 'Visitor Info', 'refraction' );
	}

	public function get_group() {
		return Module::SITE_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'field',
			[
				'label' => esc_html__( 'Field', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'display_name',
				'options' => [
					'display_name' => esc_html__( 'Display name', 'refraction' ),
					'first_name' => esc_html__( 'First name', 'refraction' ),
					'last_name' => esc_html__( 'Last name', 'refraction' ),
					'user_login' => esc_html__( 'Username', 'refraction' ),
					'user_email' => esc_html__( 'Email', 'refraction' ),
					'ID' => esc_html__( 'ID', 'refraction' ),
				],
			]
		);
	}


	public function render() {
		$field = (string) $this->get_settings( 'field' );
		$allowed = [ 'display_name', 'user_login', 'user_email', 'first_name', 'last_name', 'ID' ];

		if ( ! is_user_logged_in() || ! in_array( $field, $allowed, true ) ) {
			return;
		}

		$user = wp_get_current_user();

		echo esc_html( (string) $user->$field );
	}
}
