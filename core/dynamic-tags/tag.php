<?php
namespace Refraction\Core\DynamicTags;

use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction tag.
 *
 * An abstract class to register new Refraction tag.
 *
 * @since 2.0.0
 * @abstract
 */
abstract class Tag extends Base_Tag {

	const WRAPPED_TAG = false;

	/**
	 * @since 2.0.0
	 * @access public
	 *
	 * @param array $options
	 *
	 * @return string
	 */
	public function get_content( array $options = [] ) {
		$settings = $this->get_settings();

		ob_start();

		$this->render();

		$value = ob_get_clean();

		if ( ! Utils::is_empty( $value ) ) {
			// TODO: fix spaces in `before`/`after` if WRAPPED_TAG ( conflicted with .refraction-tag { display: inline-flex; } );
			if ( ! Utils::is_empty( $settings, 'before' ) ) {
				$value = wp_kses_post( $settings['before'] ) . $value;
			}

			if ( ! Utils::is_empty( $settings, 'after' ) ) {
				$value .= wp_kses_post( $settings['after'] );
			}

			if ( static::WRAPPED_TAG ) :
				$value = '<span id="refraction-tag-' . esc_attr( $this->get_id() ) . '" class="refraction-tag">' . $value . '</span>';
			endif;

		} elseif ( ! Utils::is_empty( $settings, 'fallback' ) ) {
			$value = wp_kses_post_deep( $settings['fallback'] );
		}

		return $value;
	}

	/**
	 * @since 2.0.0
	 * @access public
	 */
	final public function get_content_type() {
		return 'ui';
	}

	/**
	 * @since 2.0.9
	 * @access public
	 */
	public function get_editor_config() {
		$config = parent::get_editor_config();

		$config['wrapped_tag'] = $this::WRAPPED_TAG;

		return $config;
	}

	/**
	 * @since 2.0.0
	 * @access protected
	 */
	protected function register_advanced_section() {
		$this->start_controls_section(
			'advanced',
			[
				'label' => esc_html__( 'Advanced', 'refraction' ),
			]
		);

		$this->add_control(
			'before',
			[
				'label' => esc_html__( 'Before', 'refraction' ),
				'ai' => [
					'active' => false,
				],
			]
		);

		$this->add_control(
			'after',
			[
				'label' => esc_html__( 'After', 'refraction' ),
				'ai' => [
					'active' => false,
				],
			]
		);

		$this->add_control(
			'fallback',
			[
				'label' => esc_html__( 'Fallback', 'refraction' ),
				'ai' => [
					'active' => false,
				],
			]
		);

		$this->end_controls_section();
	}
}
