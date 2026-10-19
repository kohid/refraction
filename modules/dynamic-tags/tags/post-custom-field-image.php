<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Modules\DynamicTags\Classes\Value;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Custom_Field_Image extends Data_Tag {

	public function get_name() {
		return 'post-custom-field-image';
	}

	public function get_title() {
		return esc_html__( 'Custom Field (Image)', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::IMAGE_CATEGORY, Module::MEDIA_CATEGORY, Module::POST_META_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'key',
			[
				'label' => esc_html__( 'Field name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'description' => esc_html__( 'The name of the custom field. Names starting with an underscore are private and never shown.', 'refraction' ),
			]
		);
	}

	public function is_settings_required() {
		return true;
	}

	public function get_panel_template_setting_key() {
		return 'key';
	}


	public function get_value( array $options = [] ) {
		return $this->fill( Value::to_image( $this->read_meta() ) );
	}
	/** @return array{id:int,url:string} */
	private function fill( ?array $image ): array {
		if ( ! $image ) {
			return [];
		}

		if ( $image['id'] && '' === $image['url'] ) {
			$image['url'] = (string) wp_get_attachment_url( $image['id'] );
		}

		return '' === $image['url'] ? [] : $image;
	}

	/** Raw value of the custom field for the current post, or null when it may not be read. */
	protected function read_meta() {
		$post = Context::get_post();
		$key = trim( (string) $this->get_settings( 'key' ) );

		if ( ! Context::can_read( $post ) || ! Value::allowed_key( $key ) ) {
			return null;
		}

		return get_post_meta( $post->ID, $key, true );
	}

}
