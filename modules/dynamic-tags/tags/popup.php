<?php
namespace Refraction\Modules\DynamicTags\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Module;
use Refraction\Plugin;
use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Popup extends Data_Tag {

	public function get_name() {
		return 'popup';
	}

	public function get_title() {
		return esc_html__( 'Popup', 'refraction' );
	}

	public function get_group() {
		return Module::ACTION_GROUP;
	}

	public function get_categories() {
		return [ Module::URL_CATEGORY ];
	}

	protected function register_controls() {
		$this->add_control(
			'popup_action',
			[
				'label' => esc_html__( 'Action', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'open',
				'options' => [
					'open' => esc_html__( 'Open popup', 'refraction' ),
					'close' => esc_html__( 'Close popup', 'refraction' ),
					'toggle' => esc_html__( 'Toggle popup', 'refraction' ),
				],
			]
		);

		$options = class_exists( '\\Refraction\\Modules\\Popups\\Module' ) ? \Refraction\Modules\Popups\Module::get_popup_options() : [];

		$this->add_control(
			'popup_id',
			[
				'label' => esc_html__( 'Popup', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [ '' => esc_html__( 'Select a popup', 'refraction' ) ] + $options,
				'default' => '',
				'condition' => [ 'popup_action' => [ 'open', 'toggle' ] ],
				'description' => esc_html__( 'The popup must be published and its Display Conditions must match the page the link is on.', 'refraction' ),
			]
		);
	}

	/**
	 * The link the popup runtime reacts to: `#refraction-popup:open:12`, `#refraction-popup:toggle:12` or
	 * `#refraction-popup:close` (closes the popup the link is in).
	 */
	public function get_value( array $options = [] ) {
		$id = absint( $this->get_settings( 'popup_id' ) );
		$action = in_array( $this->get_settings( 'popup_action' ), [ 'open', 'close', 'toggle' ], true ) ? $this->get_settings( 'popup_action' ) : 'open';

		if ( 'close' === $action ) {
			return '#refraction-popup:close';
		}

		return $id ? '#refraction-popup:' . $action . ':' . $id : '';
	}
}
