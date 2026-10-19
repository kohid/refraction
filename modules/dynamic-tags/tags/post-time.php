<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Time extends Post_Date {

	public function get_name() {
		return 'post-time';
	}

	public function get_title() {
		return esc_html__( 'Post Time', 'refraction' );
	}

	protected function is_time(): bool {
		return true;
	}

	protected function register_controls() {
		$this->add_control(
			'type',
			[
				'label' => esc_html__( 'Time of', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'post_date',
				'options' => [
					'post_date' => esc_html__( 'Publish', 'refraction' ),
					'post_modified' => esc_html__( 'Last modified', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'format',
			[
				'label' => esc_html__( 'Format', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'default',
				'options' => [
					'default' => esc_html__( 'Site default', 'refraction' ),
					'g:i a' => gmdate( 'g:i a' ),
					'H:i' => gmdate( 'H:i' ),
					'human' => esc_html__( 'Human (3 hours ago)', 'refraction' ),
					'custom' => esc_html__( 'Custom', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'custom_format',
			[
				'label' => esc_html__( 'Custom format', 'refraction' ),
				'default' => '',
				'condition' => [ 'format' => 'custom' ],
			]
		);
	}

	protected function get_field(): string {
		return 'modified' === (string) $this->get_settings( 'type' ) || 'post_modified' === (string) $this->get_settings( 'type' ) ? 'post_modified' : 'post_date';
	}
}
