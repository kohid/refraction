<?php
namespace Refraction\Modules\DisplayConditions\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** What the evaluator may ask about the visitor and the request. Wp_Context answers from WordPress; tests use a fake. */
interface Context {

	public function is_logged_in(): bool;

	/** @return string[] */
	public function user_roles(): array;

	public function user_id(): int;

	/** Lowercase login. */
	public function user_login(): string;

	public function post_type(): string;

	public function post_id(): int;

	/** @return string[] `taxonomy:slug` and `taxonomy:id` for the queried post or term archive. */
	public function term_keys(): array;

	public function author_id(): int;

	/** The current moment in the site timezone. */
	public function now(): \DateTimeImmutable;

	public function query_arg( string $name ): ?string;

	public function cookie( string $name ): ?string;

	public function referrer(): string;

	/** `mobile`, `tablet` or `desktop`. */
	public function device(): string;

	/** @return string[] Browser languages, best first. */
	public function languages(): array;
}
