<?php
namespace Refraction\Modules\CustomAttributes;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Element_Base;
use Refraction\Modules\CustomAttributes\Classes\Attribute_Parser;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Custom Attributes on the wrapper of any element (Advanced tab). See docs/refraction/extras-a.md. */
class Module extends BaseModule {

	const CONTROL = '_attributes';

	public function get_name() {
		return 'custom-attributes';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/element/after_section_end', [ $this, 'register_section' ], 10, 2 );
		add_action( 'refraction/element/after_add_attributes', [ $this, 'apply' ] );
	}

	public function register_section( $element, $section_id ) {
		if ( '_section_responsive' !== $section_id || $element->get_controls( self::CONTROL ) ) {
			return;
		}

		$element->start_controls_section(
			'section_custom_attributes',
			[
				'label' => esc_html__( 'Attributes', 'refraction' ),
				'tab' => Controls_Manager::TAB_ADVANCED,
			]
		);

		$element->add_control(
			self::CONTROL,
			[
				'label' => esc_html__( 'Custom Attributes', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'dynamic' => [ 'active' => true ],
				'placeholder' => "data-track|hero\naria-label|Main banner\nhidden",
				'description' => esc_html__( 'One attribute per line as key|value, or only the key for a flag. Event handlers (on...) and javascript: links are removed.', 'refraction' ),
				'render_type' => 'none',
			]
		);

		$element->end_controls_section();
	}

	public function apply( Element_Base $element ) {
		$text = $element->get_settings_for_display( self::CONTROL );

		foreach ( Attribute_Parser::parse( $text ) as $key => $value ) {
			if ( 'class' === $key ) {
				$element->add_render_attribute( '_wrapper', 'class', preg_split( '~\s+~', $value, -1, PREG_SPLIT_NO_EMPTY ) );
			} else {
				$element->set_render_attribute( '_wrapper', $key, $value );
			}
		}
	}
}
