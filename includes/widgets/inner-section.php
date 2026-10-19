<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction Inner Section widget.
 *
 * Refraction widget that creates nested columns within a section.
 *
 * @since 3.5.0
 */
class Widget_Inner_Section extends Widget_Base {

	/**
	 * @inheritDoc
	 */
	public static function get_type() {
		return 'section';
	}

	/**
	 * @inheritDoc
	 */
	public function get_name() {
		return 'inner-section';
	}

	/**
	 * @inheritDoc
	 */
	public function get_title() {
		return esc_html__( 'Inner Section', 'refraction' );
	}

	/**
	 * @inheritDoc
	 */
	public function get_icon() {
		return 'rficon-columns';
	}

	/**
	 * @inheritDoc
	 */
	public function get_categories() {
		return [ 'basic' ];
	}

	/**
	 * @inheritDoc
	 */
	public function get_keywords() {
		return [ 'row', 'columns', 'nested' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}
}
