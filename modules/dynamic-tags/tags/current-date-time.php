<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Current_Date_Time extends Tag {

	public function get_name() {
		return 'current-date-time';
	}

	public function get_title() {
		return esc_html__( 'Current Date Time', 'refraction' );
	}

	public function get_group() {
		return Module::SITE_GROUP;
	}

	public function get_categories() {
		return [ Module::TEXT_CATEGORY, Module::DATETIME_CATEGORY ];
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
					'F j, Y' => 'F j, Y',
					'Y-m-d' => 'Y-m-d',
					'g:i a' => 'g:i a',
					'Y-m-d H:i' => 'Y-m-d H:i',
					'custom' => esc_html__( 'Custom', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'custom_format',
			[
				'label' => esc_html__( 'Custom format', 'refraction' ),
				'default' => 'j M Y',
				'condition' => [ 'format' => 'custom' ],
			]
		);
	}


	public function render() {
		$format = (string) $this->get_settings( 'format' );

		if ( 'custom' === $format ) {
			$format = (string) $this->get_settings( 'custom_format' );
		} elseif ( 'default' === $format ) {
			$format = get_option( 'date_format' ) . ' ' . get_option( 'time_format' );
		}

		echo esc_html( wp_date( $format ) );
	}
}
