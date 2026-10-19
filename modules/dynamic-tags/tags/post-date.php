<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Post_Date extends Tag {

	public function get_name() {
		return 'post-date';
	}

	public function get_title() {
		return esc_html__( 'Post Date', 'refraction' );
	}

	public function get_group() {
		return Module::POST_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY, Module::DATETIME_CATEGORY ];
	}

	/** `modified` in the subclass for the modified date. */
	protected function get_field(): string {
		return 'post_date';
	}

	protected function is_time(): bool {
		return false;
	}

	protected function register_controls() {
		$this->add_control(
			'format',
			[
				'label' => esc_html__( 'Format', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'default',
				'options' => [
					'default' => esc_html__( 'Site default', 'refraction' ),
					'F j, Y' => gmdate( 'F j, Y' ),
					'Y-m-d' => gmdate( 'Y-m-d' ),
					'm/d/Y' => gmdate( 'm/d/Y' ),
					'd/m/Y' => gmdate( 'd/m/Y' ),
					'human' => esc_html__( 'Human (3 days ago)', 'refraction' ),
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
				'description' => esc_html__( 'PHP date format, for example j M Y', 'refraction' ),
			]
		);
	}

	public function render() {
		$post = Context::get_post();

		if ( ! Context::can_read( $post ) ) {
			return;
		}

		$gmt = mysql2date( 'U', 'post_modified' === $this->get_field() ? $post->post_modified_gmt : $post->post_date_gmt, false );
		$format = (string) $this->get_settings( 'format' );

		if ( 'human' === $format ) {
			/* translators: %s: human readable time difference such as "3 days". */
			echo esc_html( sprintf( __( '%s ago', 'refraction' ), human_time_diff( (int) $gmt ) ) );
			return;
		}

		if ( 'custom' === $format ) {
			$format = (string) $this->get_settings( 'custom_format' );
		} elseif ( 'default' === $format || '' === $format ) {
			$format = get_option( $this->is_time() ? 'time_format' : 'date_format' );
		}

		if ( $this->is_time() && in_array( $format, [ 'F j, Y', 'Y-m-d', 'm/d/Y', 'd/m/Y' ], true ) ) {
			$format = get_option( 'time_format' );
		}

		echo esc_html( wp_date( $format, (int) $gmt ) );
	}
}
