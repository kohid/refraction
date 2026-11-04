<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Where collection definitions (Bookings, Listings...) are kept: one option, keyed by slug. */
class Collections {

	const OPTION = 'refraction_form_builder_collections';

	/** @return array<string,array> slug => definition */
	public function all(): array {
		$stored = get_option( self::OPTION, [] );
		$all = [];

		foreach ( is_array( $stored ) ? $stored : [] as $definition ) {
			$definition = Schema::definition( $definition );

			if ( '' !== $definition['slug'] && '' !== $definition['label'] ) {
				$all[ $definition['slug'] ] = $definition;
			}
		}

		return $all;
	}

	public function get( string $slug ): ?array {
		$definition = $this->all()[ $slug ] ?? null;

		/**
		 * A collection as it is used now (shown, checked, saved into): modules can bring parts of it up to date, such as
		 * an event form's category choices (Events).
		 *
		 * @param array|null $definition
		 */
		return $definition ? apply_filters( 'refraction/form_builder/definition', $definition ) : null;
	}

	/**
	 * Save a collection. A new one gets a slug that is not taken yet; an existing one keeps its slug, because records
	 * are tied to it.
	 *
	 * @return array|null The saved definition, or null when it has no label.
	 */
	public function save( array $raw, string $existing_slug = '' ): ?array {
		$all = $this->all();

		if ( '' !== $existing_slug && isset( $all[ $existing_slug ] ) ) {
			$raw['slug'] = $existing_slug;
		} else {
			$raw['slug'] = $this->free_slug( Schema::slug( '' !== (string) ( $raw['slug'] ?? '' ) ? $raw['slug'] : ( $raw['label'] ?? '' ) ), $all );
		}

		$definition = Schema::definition( $raw );

		if ( '' === $definition['label'] || '' === $definition['slug'] ) {
			return null;
		}

		$all[ $definition['slug'] ] = $definition;
		update_option( self::OPTION, $all, false );

		return $definition;
	}

	public function delete( string $slug ): void {
		$all = $this->all();
		unset( $all[ $slug ] );
		update_option( self::OPTION, $all, false );
	}

	private function free_slug( string $slug, array $all ): string {
		$slug = '' === $slug ? 'collection' : $slug;
		$candidate = $slug;

		for ( $i = 2; isset( $all[ $candidate ] ); $i++ ) {
			$candidate = substr( $slug, 0, 36 ) . '-' . $i;
		}

		return $candidate;
	}
}
