<?php

namespace Refraction\Tests\Phpunit\Includes\Widgets;

use Refraction\Plugin;
use RefractionEditorTesting\Refraction_Test_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Test_Widget_Common_Base extends Refraction_Test_Base {
	public function test_mask_shape_control_uses_selectors_dictionary() {
		// Arrange.
		$additional_shapes_filter = static function ( array $additional_shapes ): array {
			$additional_shapes['filtered-shape-with-image'] = [
				'title' => 'Filtered shape with image',
				'image' => 'https://example.com/filtered-shape.svg',
			];

			$additional_shapes['filtered-shape-without-image'] = [
				'title' => 'Filtered shape without image',
			];

			return $additional_shapes;
		};

		add_filter( 'refraction/mask_shapes/additional_shapes', $additional_shapes_filter );

		$common_widget = Plugin::instance()->widgets_manager->get_widget_types( 'common' );

		try {
			// Act.
			Plugin::$instance->controls_manager->delete_stack( $common_widget );

			$mask_shape_control = $common_widget->get_controls( '_mask_shape' );
		} finally {
			remove_filter( 'refraction/mask_shapes/additional_shapes', $additional_shapes_filter );
			Plugin::$instance->controls_manager->delete_stack( $common_widget );
		}

		// Assert.
		$this->assertSame(
			'url( ' . REFRACTION_ASSETS_URL . 'mask-shapes/circle.svg )',
			$mask_shape_control['selectors_dictionary']['circle']
		);

		$this->assertSame(
			[
				'title' => 'Filtered shape with image',
				'image' => 'https://example.com/filtered-shape.svg',
			],
			$mask_shape_control['options']['filtered-shape-with-image']
		);

		$this->assertSame(
			[
				'title' => 'Filtered shape without image',
			],
			$mask_shape_control['options']['filtered-shape-without-image']
		);

		$this->assertSame(
			'url( https://example.com/filtered-shape.svg )',
			$mask_shape_control['selectors_dictionary']['filtered-shape-with-image']
		);

		$this->assertSame(
			'url( ' . REFRACTION_ASSETS_URL . 'mask-shapes/filtered-shape-without-image.svg )',
			$mask_shape_control['selectors_dictionary']['filtered-shape-without-image']
		);

		$this->assertSame( 'none', $mask_shape_control['selectors_dictionary']['custom'] );
		$this->assertSame(
			[
				'{{WRAPPER}}:not( .refraction-widget-image ) .refraction-widget-container, {{WRAPPER}}.refraction-widget-image .refraction-widget-container img' => '-webkit-mask-image: {{VALUE}};',
			],
			$mask_shape_control['selectors']
		);
	}
}
