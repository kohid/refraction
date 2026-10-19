<?php
namespace Refraction\Modules\ThemeBuilder\Documents;

use Refraction\Controls_Manager;
use Refraction\Modules\Library\Documents\Library_Document;
use Refraction\Modules\ThemeBuilder\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A saved template that fills a Theme Builder location (header or footer).
 */
abstract class Theme_Document extends Library_Document {

	const CONDITIONS_SETTING = 'refraction_display_conditions';

	/** The location this document fills: `header` or `footer`. */
	abstract public function get_location(): string;

	public static function get_properties() {
		$properties = parent::get_properties();

		$properties['support_kit'] = true;
		$properties['show_in_finder'] = true;
		$properties['location'] = static::get_type();

		return $properties;
	}

	public function get_name() {
		return static::get_type();
	}

	protected function register_controls() {
		parent::register_controls();

		$this->start_controls_section(
			'refraction_display_conditions_section',
			[
				'label' => esc_html__( 'Display Conditions', 'refraction' ),
				'tab' => Controls_Manager::TAB_SETTINGS,
			]
		);

		$this->add_control(
			self::CONDITIONS_SETTING,
			[
				'type' => 'refraction_conditions',
				'label_block' => true,
				'show_label' => false,
				'default' => [],
			]
		);

		$this->end_controls_section();
	}

	/** Print the saved rules as readable text (used by the admin list). */
	public function get_conditions_text(): array {
		$module = Module::instance();

		return $module->get_conditions_manager()->describe( $module->get_store()->get_rules( $this->get_main_id() ) );
	}
}
