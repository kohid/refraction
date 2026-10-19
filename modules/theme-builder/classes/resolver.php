<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Picks the one template that wins for the current request.
 */
class Resolver {

	private Conditions_Manager $conditions;

	public function __construct( Conditions_Manager $conditions ) {
		$this->conditions = $conditions;
	}

	/**
	 * Highest score wins; equal scores go to the most recently modified template, then the highest ID.
	 *
	 * @param array<int, array{rules: string[], modified: int}> $candidates Keyed by template ID.
	 * @return int The winning template ID, 0 when nothing matches.
	 */
	public function pick( array $candidates ): int {
		$winner = 0;
		$best = null;

		foreach ( $candidates as $id => $candidate ) {
			$score = $this->conditions->match( $candidate['rules'] ?? [] );

			if ( null === $score ) {
				continue;
			}

			$key = [ $score, (int) ( $candidate['modified'] ?? 0 ), (int) $id ];

			if ( null === $best || $key > $best ) {
				$best = $key;
				$winner = (int) $id;
			}
		}

		return $winner;
	}
}
