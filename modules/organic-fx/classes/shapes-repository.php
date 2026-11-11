<?php
namespace Refraction\Modules\OrganicFx\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** My Shapes, kept in one option: [ id => [ 'name', 'd', 'vb', 'rule' ] ], read back through Pure_Shape_Store::clean_shape(). */
class Shapes_Repository {

	const OPTION = 'refraction_my_shapes';
	const MAX = 100;

	public function all(): array {
		$shapes = get_option( self::OPTION, [] );
		$out = [];

		foreach ( is_array( $shapes ) ? $shapes : [] as $id => $shape ) {
			$shape = Pure_Shape_Store::clean_shape( $shape );

			if ( $shape && preg_match( '/^my-[a-z0-9-]+$/', (string) $id ) ) {
				$out[ $id ] = $shape;
			}
		}

		return $out;
	}

	/** Adds a shape; returns its id, or '' when the library is full. */
	public function add( string $name, array $shape ): string {
		$all = $this->all();

		if ( count( $all ) >= self::MAX ) {
			return '';
		}

		$id = Pure_Shape_Store::id( $name, array_keys( $all ) );
		$all[ $id ] = [ 'name' => $name, 'd' => $shape['d'], 'vb' => $shape['vb'], 'rule' => $shape['rule'] ?? 'nonzero' ];
		update_option( self::OPTION, $all, true );

		return $id;
	}

	public function rename( string $id, string $name ): bool {
		$all = $this->all();

		if ( ! isset( $all[ $id ] ) || '' === $name ) {
			return false;
		}

		$all[ $id ]['name'] = $name;
		update_option( self::OPTION, $all, true );

		return true;
	}

	public function delete( string $id ): void {
		$all = $this->all();
		unset( $all[ $id ] );
		update_option( self::OPTION, $all, true );
	}
}
