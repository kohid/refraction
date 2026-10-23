<?php
namespace Refraction\Modules\DisplayConditions\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Answers the evaluator from the current WordPress request. */
class Wp_Context implements Context {

	private ?array $terms = null;

	public function is_logged_in(): bool {
		return is_user_logged_in();
	}

	public function user_roles(): array {
		$user = wp_get_current_user();

		return $user && $user->exists() ? array_values( (array) $user->roles ) : [];
	}

	public function user_id(): int {
		return get_current_user_id();
	}

	public function user_login(): string {
		$user = wp_get_current_user();

		return $user && $user->exists() ? strtolower( $user->user_login ) : '';
	}

	public function post_type(): string {
		if ( is_singular() ) {
			return (string) get_post_type( get_queried_object_id() );
		}

		if ( is_post_type_archive() ) {
			return (string) get_query_var( 'post_type' );
		}

		return is_home() ? 'post' : '';
	}

	public function post_id(): int {
		if ( is_singular() || ( is_home() && (int) get_option( 'page_for_posts' ) ) ) {
			return (int) get_queried_object_id();
		}

		return 0;
	}

	public function term_keys(): array {
		if ( null !== $this->terms ) {
			return $this->terms;
		}

		$keys = [];

		if ( is_singular() ) {
			$post_id = (int) get_queried_object_id();

			foreach ( get_object_taxonomies( (string) get_post_type( $post_id ) ) as $taxonomy ) {
				$terms = get_the_terms( $post_id, $taxonomy );

				foreach ( is_array( $terms ) ? $terms : [] as $term ) {
					$keys[] = $taxonomy . ':' . $term->slug;
					$keys[] = $taxonomy . ':' . $term->term_id;
				}
			}
		} elseif ( is_category() || is_tag() || is_tax() ) {
			$term = get_queried_object();

			if ( $term instanceof \WP_Term ) {
				$keys[] = $term->taxonomy . ':' . $term->slug;
				$keys[] = $term->taxonomy . ':' . $term->term_id;
			}
		}

		return $this->terms = $keys;
	}

	public function author_id(): int {
		if ( is_singular() ) {
			return (int) get_post_field( 'post_author', get_queried_object_id() );
		}

		return is_author() ? (int) get_queried_object_id() : 0;
	}

	public function now(): \DateTimeImmutable {
		$zone = wp_timezone();

		/**
		 * Replace the current time, for example in tests. Return a timestamp, a date string or a DateTimeInterface.
		 *
		 * @param mixed $now Null for the real time.
		 */
		$now = apply_filters( 'refraction/display_conditions/now', null );

		try {
			if ( $now instanceof \DateTimeInterface ) {
				return \DateTimeImmutable::createFromInterface( $now )->setTimezone( $zone );
			}

			if ( is_int( $now ) ) {
				return ( new \DateTimeImmutable( '@' . $now ) )->setTimezone( $zone );
			}

			if ( is_string( $now ) && '' !== $now ) {
				return new \DateTimeImmutable( $now, $zone );
			}
		} catch ( \Exception $e ) {
			// Fall through to the real time.
		}

		return new \DateTimeImmutable( 'now', $zone );
	}

	public function query_arg( string $name ): ?string {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return isset( $_GET[ $name ] ) && is_scalar( $_GET[ $name ] ) ? sanitize_text_field( wp_unslash( (string) $_GET[ $name ] ) ) : null;
	}

	public function cookie( string $name ): ?string {
		return isset( $_COOKIE[ $name ] ) && is_scalar( $_COOKIE[ $name ] ) ? sanitize_text_field( wp_unslash( (string) $_COOKIE[ $name ] ) ) : null;
	}

	public function referrer(): string {
		return isset( $_SERVER['HTTP_REFERER'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_REFERER'] ) ) : '';
	}

	public function device(): string {
		$agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) : '';
		$hint = isset( $_SERVER['HTTP_SEC_CH_UA_MOBILE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_SEC_CH_UA_MOBILE'] ) ) : '';
		$device = Visitor_Hints::device( $agent, $hint );

		/** @param string $device `mobile`, `tablet` or `desktop`. */
		$device = apply_filters( 'refraction/display_conditions/device', $device );

		return in_array( $device, [ 'mobile', 'tablet', 'desktop' ], true ) ? $device : 'desktop';
	}

	public function languages(): array {
		$header = isset( $_SERVER['HTTP_ACCEPT_LANGUAGE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_ACCEPT_LANGUAGE'] ) ) : '';

		return Visitor_Hints::languages( $header );
	}
}
