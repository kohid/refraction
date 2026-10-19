<?php

namespace Refraction\Modules\FloatingButtons\Classes\Conditions;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Conditions_Cache {

	private string $type;

	/**
	 * @param string $type The bucket in the option: `floating_buttons` (default), `header`, `footer`...
	 */
	public function __construct( string $type = self::CONDITION_TYPE ) {
		$this->type = $type;
	}

	const CONDITIONS_CACHE_META_KEY = 'refraction_pro_theme_builder_conditions';

	const CONDITION_TYPE = 'floating_buttons';

	public function remove_from_cache( int $post_id ): void {
		$conditions = $this->get_conditions();

		if ( isset( $conditions[ $this->type ][ $post_id ] ) ) {
			unset( $conditions[ $this->type ][ $post_id ] );

			if ( empty( $conditions[ $this->type ] ) ) {
				unset( $conditions[ $this->type ] );
			}

			$this->update_conditions( $conditions );
		}
	}

	public function add_to_cache( int $post_id, array $condition_rules = [ 'include/general' ] ): void {
		$conditions = $this->get_conditions();

		if ( ! isset( $conditions[ $this->type ] ) ) {
			$conditions[ $this->type ] = [];
		}

		$conditions[ $this->type ][ $post_id ] = $condition_rules;

		$this->update_conditions( $conditions );
	}

	/**
	 * The rules cached for this type: post ID => rule strings.
	 *
	 * @return array<int, string[]>
	 */
	public function get_all(): array {
		$conditions = $this->get_conditions();

		return isset( $conditions[ $this->type ] ) && is_array( $conditions[ $this->type ] ) ? $conditions[ $this->type ] : [];
	}

	private function get_conditions(): array {
		$conditions = get_option( self::CONDITIONS_CACHE_META_KEY, [] );

		return is_array( $conditions ) ? $conditions : [];
	}

	private function update_conditions( array $conditions ): void {
		update_option( self::CONDITIONS_CACHE_META_KEY, $conditions );
	}
}
