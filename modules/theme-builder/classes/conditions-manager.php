<?php
namespace Refraction\Modules\ThemeBuilder\Classes;

use Refraction\Modules\ThemeBuilder\Classes\Conditions\Condition_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Registry of condition classes and the matching logic.
 *
 * Matching rules:
 * - any matching exclude rule rejects the template;
 * - location includes (everything except visitor rules) give a specificity, the best one counts;
 * - visitor includes are an audience filter: at least one must match, and a template that has them
 *   gains 0.5 so it beats an unrestricted template of the same location. With only visitor includes,
 *   the location is the entire site;
 * - no matching include means no match.
 */
class Conditions_Manager {

	const AUDIENCE_BONUS = 0.5;

	/** @var array<string, class-string<Condition_Base>> */
	private static array $classes = [];

	private static bool $defaults_loaded = false;

	/** @var array<string, Condition_Base> */
	private array $instances = [];

	private Environment $environment;

	public function __construct( Environment $environment ) {
		$this->environment = $environment;
	}

	public function get_environment(): Environment {
		return $this->environment;
	}

	/**
	 * Register a condition class (name => class). Third parties can add their own before rules are parsed.
	 *
	 * @param class-string<Condition_Base> $class
	 */
	public static function register( string $class ): void {
		self::load_defaults();
		self::$classes[ $class::get_name() ] = $class;
	}

	/** @return array<string, class-string<Condition_Base>> */
	public static function get_classes(): array {
		self::load_defaults();

		return self::$classes;
	}

	public static function class_for( string $name ): ?string {
		self::load_defaults();

		return self::$classes[ $name ] ?? null;
	}

	private static function load_defaults(): void {
		if ( self::$defaults_loaded ) {
			return;
		}

		self::$defaults_loaded = true;

		foreach ( [
			Conditions\General::class,
			Conditions\Front_Page::class,
			Conditions\Singular::class,
			Conditions\Archive::class,
			Conditions\Not_Found::class,
			Conditions\Visitor::class,
		] as $class ) {
			self::$classes[ $class::get_name() ] = $class;
		}
	}

	public function get_condition( string $name ): ?Condition_Base {
		$class = self::class_for( $name );

		if ( ! $class ) {
			return null;
		}

		return $this->instances[ $name ] ??= new $class();
	}

	/**
	 * @param string[] $rules Rule strings.
	 * @return float|null The specificity of the match, null when the template does not apply.
	 */
	public function match( array $rules ): ?float {
		$best = null;
		$has_location_include = false;
		$has_audience_include = false;
		$audience_matches = false;

		foreach ( $rules as $raw ) {
			$rule = Rule::parse( $raw );
			$condition = $rule ? $this->get_condition( $rule->name ) : null;

			if ( ! $rule || ! $condition ) {
				continue;
			}

			$matches = $condition->check( $rule->args, $this->environment );

			if ( ! $rule->include ) {
				if ( $matches ) {
					return null;
				}

				continue;
			}

			if ( $condition->is_audience() ) {
				$has_audience_include = true;
				$audience_matches = $audience_matches || $matches;
				continue;
			}

			$has_location_include = true;

			if ( $matches ) {
				$best = max( $best ?? 0.0, $condition->get_specificity( $rule->args ) );
			}
		}

		if ( ! $has_location_include && $has_audience_include ) {
			$best = Conditions\General::SPECIFICITY;
		}

		if ( null === $best ) {
			return null;
		}

		if ( $has_audience_include ) {
			if ( ! $audience_matches ) {
				return null;
			}

			$best += self::AUDIENCE_BONUS;
		}

		return (float) $best;
	}

	/**
	 * Readable text for each rule, for the admin list and the editor hint.
	 *
	 * @param string[] $rules
	 * @return string[]
	 */
	public function describe( array $rules ): array {
		$lines = [];

		foreach ( $rules as $raw ) {
			$rule = Rule::parse( $raw );
			$condition = $rule ? $this->get_condition( $rule->name ) : null;

			if ( ! $rule || ! $condition ) {
				continue;
			}

			$text = $condition->describe( $rule->args, $this->environment );
			$lines[] = $rule->include ? $text : sprintf( /* translators: %s: what is excluded, for example "Page: About". */ __( 'Exclude: %s', 'refraction' ), $text );
		}

		return $lines;
	}
}
