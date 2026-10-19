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

		$this->add_control(
			'popup_id',
			[
				'label' => esc_html__( 'Popup template ID', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'condition' => [ 'popup_action' => [ 'open', 'toggle' ] ],
			]
		);
	}


	/**
	 * Placeholder for the Popups module: it prints the action link the popup script will react to. Without the
	 * popups module the link does nothing.
	 */
	public function get_value( array $options = [] ) {
		$id = (int) $this->get_settings( 'popup_id' );
		$action = in_array( $this->get_settings( 'popup_action' ), [ 'open', 'close', 'toggle' ], true ) ? $this->get_settings( 'popup_action' ) : 'open';

		return Plugin::$instance->frontend->create_action_hash( 'popup:' . $action, $id ? [ 'id' => $id ] : [] );
	}
}
