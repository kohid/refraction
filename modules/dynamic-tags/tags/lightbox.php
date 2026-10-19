<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Plugin;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Lightbox extends Data_Tag {

	public function get_name() {
		return 'lightbox';
	}

	public function get_title() {
		return esc_html__( 'Lightbox', 'refraction' );
	}

	public function get_group() {
		return Module::ACTION_GROUP;
	}

	public function get_categories() {
		return [ Module::URL_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'type',
			[
				'label' => esc_html__( 'Open', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'image',
				'options' => [
					'image' => esc_html__( 'Image', 'refraction' ),
					'video' => esc_html__( 'Video (YouTube, Vimeo or file)', 'refraction' ),
				],
			]
		);

		$this->add_control( 'image', [ 'label' => esc_html__( 'Image', 'refraction' ), 'type' => Controls_Manager::MEDIA, 'condition' => [ 'type' => 'image' ] ] );
		$this->add_control( 'video_url', [ 'label' => esc_html__( 'Video URL', 'refraction' ), 'condition' => [ 'type' => 'video' ] ] );
	}


	public function get_value( array $options = [] ) {
		$type = (string) $this->get_settings( 'type' );

		if ( 'video' === $type ) {
			$url = esc_url_raw( (string) $this->get_settings( 'video_url' ) );

			return $url ? Plugin::$instance->frontend->create_action_hash( 'lightbox', [ 'type' => 'video', 'url' => $url ] ) : '';
		}

		$image = (array) $this->get_settings( 'image' );
		$url = ! empty( $image['url'] ) ? esc_url_raw( $image['url'] ) : '';

		return $url ? Plugin::$instance->frontend->create_action_hash( 'lightbox', [ 'type' => 'image', 'url' => $url ] ) : '';
	}

	public function is_settings_required() {
		return true;
	}
}
