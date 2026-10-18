<?php
namespace Refraction\Modules\ElementCache;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Experiments\Manager as ExperimentsManager;
use Refraction\Element_Base;
use Refraction\Plugin;
use Refraction\Settings;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends BaseModule {

	const OPTION_UNIQUE_ID = '_refraction_element_cache_unique_id';

	public function get_name() {
		return 'element-cache';
	}

	public function __construct() {
		parent::__construct();

		$this->register_shortcode();

		add_filter( 'refraction/element_cache/unique_id', [ $this, 'get_unique_id' ] );

		$this->add_advanced_tab_actions();

		if ( is_admin() ) {
			add_action( 'refraction/admin/after_create_settings/' . Settings::PAGE_ID, [ $this, 'register_admin_fields' ], 100 );
		}
	}

	public function get_unique_id() {
		$unique_id = get_option( static::OPTION_UNIQUE_ID );

		if ( ! $unique_id ) {
			$unique_id = md5( uniqid( wp_generate_password() ) );
			update_option( static::OPTION_UNIQUE_ID, $unique_id );
		}

		return $unique_id;
	}

	private function register_shortcode() {
		add_shortcode( 'refraction-element', function ( $atts ) {
			if ( empty( $atts['data'] ) ) {
				return '';
			}

			if ( empty( $atts['k'] ) || $atts['k'] !== $this->get_unique_id() ) {
				return '';
			}

			$widget_data = json_decode( base64_decode( $atts['data'] ), true );

			if ( empty( $widget_data ) || ! is_array( $widget_data ) ) {
				return '';
			}

			ob_start();

			$element = Plugin::$instance->elements_manager->create_element_instance( $widget_data );

			if ( $element ) {
				$element->print_element();
			}

			return ob_get_clean();
		} );
	}

	private function add_advanced_tab_actions() {
		$hooks = [
			'refraction/element/common/_section_style/after_section_end' => '_css_classes', // Widgets
		];

		foreach ( $hooks as $hook => $injection_position ) {
			add_action(
				$hook,
				function( $element, $args ) use ( $injection_position ) {
					$this->add_control_to_advanced_tab( $element, $args, $injection_position );
				},
				10,
				2
			);
		}
	}

	private function add_control_to_advanced_tab( Element_Base $element, $args, $injection_position ) {
		$element->start_injection(
			[
				'of' => $injection_position,
			]
		);

		$control_data = [
			'label' => esc_html__( 'Cache Settings', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Default', 'refraction' ),
				'yes' => esc_html__( 'Inactive', 'refraction' ),
				'no' => esc_html__( 'Active', 'refraction' ),
			],
		];

		$element->add_control( '_element_cache', $control_data );

		$element->end_injection();
	}

	public function register_admin_fields( Settings $settings ) {
		$settings->add_field(
			Settings::TAB_PERFORMANCE,
			Settings::TAB_PERFORMANCE,
			'element_cache_ttl',
			[
				'label' => esc_html__( 'Element Cache', 'refraction' ),
				'field_args' => [
					'class' => 'refraction-element-cache-ttl',
					'type' => 'select',
					'std' => '24',
					'options' => [
						'disable' => esc_html__( 'Disable', 'refraction' ),
						'1' => esc_html__( '1 Hour', 'refraction' ),
						'6' => esc_html__( '6 Hours', 'refraction' ),
						'12' => esc_html__( '12 Hours', 'refraction' ),
						'24' => esc_html__( '1 Day', 'refraction' ),
						'72' => esc_html__( '3 Days', 'refraction' ),
						'168' => esc_html__( '1 Week', 'refraction' ),
						'336' => esc_html__( '2 Weeks', 'refraction' ),
						'720' => esc_html__( '1 Month', 'refraction' ),
						'8760' => esc_html__( '1 Year', 'refraction' ),
					],
					'desc' => esc_html__( 'Specify the duration for which data is stored in the cache. Elements caching speeds up loading by serving pre-rendered copies of elements, rather than rendering them fresh each time. This control ensures efficient performance and up-to-date content.', 'refraction' ),
				],
			]
		);
	}
}
