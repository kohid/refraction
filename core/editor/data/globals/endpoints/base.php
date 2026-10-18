<?php
namespace Refraction\Core\Editor\Data\Globals\Endpoints;

use Refraction\Data\V2\Base\Endpoint;
use Refraction\Data\V2\Base\Exceptions\Data_Exception;
use Refraction\Data\V2\Base\Exceptions\Error_404;
use Refraction\Plugin;

abstract class Base extends Endpoint {
	protected function register() {
		parent::register();

		$args = [
			'id_arg_type_regex' => '[\w-]+',
		];

		$this->register_item_route( \WP_REST_Server::READABLE, $args );
		$this->register_item_route( \WP_REST_Server::CREATABLE, $args );
		$this->register_item_route( \WP_REST_Server::DELETABLE, $args );
	}

	public function get_items( $request ) {
		return $this->get_kit_items();
	}

	/**
	 * @inheritDoc
	 * @throws \Refraction\Data\V2\Base\Exceptions\Error_404 If the item is not found.
	 */
	public function get_item( $id, $request ) {
		$items = $this->get_kit_items();

		if ( ! isset( $items[ $id ] ) ) {
			throw new Error_404( esc_html__( 'The Global value you are trying to use is not available.', 'refraction' ),
				'global_not_found'
			);
		}

		return $items[ $id ];
	}

	public function create_item( $id, $request ) {
		$item = $request->get_body_params();

		if ( ! isset( $item['title'] ) ) {
			return new Data_Exception( esc_html__( 'Invalid title', 'refraction' ), 'invalid_title' );
		}

		$kit = Plugin::$instance->kits_manager->get_active_kit();

		$item['id'] = $id;

		$db_item = $this->convert_db_format( $item );

		$kit->add_repeater_row( 'custom_' . $this->get_name(), $db_item );

		return $item;
	}

	abstract protected function get_kit_items();

	/**
	 * @param array $item frontend format.
	 * @return array backend format.
	 */
	abstract protected function convert_db_format( $item );
}
