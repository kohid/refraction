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

class Post_Custom_Field_Gallery extends Data_Tag {

	public function get_name() {
		return 'post-custom-field-gallery';
	}

	public function get_title() {
		return esc_html__( 'Custom Field (Gallery)', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::GALLERY_CATEGORY, Module::POST_META_CATEGORY ];
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
		$items = [];

		foreach ( Value::to_gallery( $this->read_meta() ) as $image ) {
			if ( $image['id'] && '' === $image['url'] ) {
				$image['url'] = (string) wp_get_attachment_url( $image['id'] );
			}

			if ( '' !== $image['url'] ) {
				$items[] = $image;
			}
		}

		return $items;
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
