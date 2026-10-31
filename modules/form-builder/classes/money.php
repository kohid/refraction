<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Amounts: the currency format of a collection (General tab) and the parsing and printing of money values.
 * Stored values are always plain decimals ("1234.50"); the separators only exist on screen. Pure logic.
 */
class Money {

	const POSITIONS = [ 'before', 'after' ];
	const THOUSANDS = [ ',', '.', ' ', '' ];
	const DECIMALS = [ '.', ',' ];

	/** The periods an Amount can be priced per; the value is the stored key. */
	public static function periods(): array {
		return [
			'' => Schema::t( 'No period' ),
			'hour' => Schema::t( 'per hour' ),
			'day' => Schema::t( 'per day' ),
			'week' => Schema::t( 'per week' ),
			'month' => Schema::t( 'per month' ),
			'quarter' => Schema::t( 'per quarter' ),
			'year' => Schema::t( 'per year' ),
			'custom' => Schema::t( 'Custom text' ),
		];
	}

	/** The short form shown beside a price ("/ month"). */
	public static function per_label( string $per, string $custom = '' ): string {
		if ( 'custom' === $per ) {
			return '' !== $custom ? '/ ' . $custom : '';
		}

		$short = [
			'hour' => Schema::t( 'hour' ), 'day' => Schema::t( 'day' ), 'week' => Schema::t( 'week' ),
			'month' => Schema::t( 'month' ), 'quarter' => Schema::t( 'quarter' ), 'year' => Schema::t( 'year' ),
		];

		return isset( $short[ $per ] ) ? '/ ' . $short[ $per ] : '';
	}

	public static function defaults(): array {
		return [ 'currency_symbol' => '$', 'currency_position' => 'before', 'thousands_sep' => ',', 'decimal_sep' => '.', 'decimals' => 2 ];
	}

	/** Cleans the money part of the settings: whitelists the separators and keeps both different. */
	public static function clean( array $raw ): array {
		$d = self::defaults();
		$symbol = Schema::text( $raw['currency_symbol'] ?? $d['currency_symbol'], 6 );
		$decimal = in_array( $raw['decimal_sep'] ?? '', self::DECIMALS, true ) ? $raw['decimal_sep'] : $d['decimal_sep'];
		$thousands = in_array( $raw['thousands_sep'] ?? null, self::THOUSANDS, true ) ? $raw['thousands_sep'] : $d['thousands_sep'];

		if ( $thousands === $decimal ) {
			$thousands = '.' === $decimal ? ',' : '.';
		}

		return [
			'currency_symbol' => array_key_exists( 'currency_symbol', $raw ) ? $symbol : $d['currency_symbol'],
			'currency_position' => in_array( $raw['currency_position'] ?? '', self::POSITIONS, true ) ? $raw['currency_position'] : $d['currency_position'],
			'thousands_sep' => $thousands,
			'decimal_sep' => $decimal,
			'decimals' => max( 0, min( 4, is_numeric( $raw['decimals'] ?? null ) ? (int) $raw['decimals'] : $d['decimals'] ) ),
		];
	}

	/** The format of a collection, read from its (cleaned) settings. */
	public static function config( array $settings ): array {
		return self::clean( $settings );
	}

	/**
	 * A typed amount as a plain decimal string, or null when it is not a number. Understands the collection's own
	 * separators and ignores the currency symbol and spaces.
	 */
	public static function parse( string $text, array $cfg ): ?string {
		$text = trim( str_replace( [ $cfg['currency_symbol'], "\xC2\xA0" ], '', $text ) );
		$text = '' === $cfg['thousands_sep'] || ' ' === $cfg['thousands_sep'] ? preg_replace( '/\s+/', '', $text ) : str_replace( ' ', '', $text );

		if ( '' !== $cfg['thousands_sep'] && ' ' !== $cfg['thousands_sep'] ) {
			$text = str_replace( $cfg['thousands_sep'], '', $text );
		}

		$text = str_replace( $cfg['decimal_sep'], '.', $text );

		return 1 === preg_match( '/^-?(\d+(\.\d*)?|\.\d+)$/', $text ) ? $text : null;
	}

	/** A plain decimal as the collection writes it, with thousands separators and no symbol. */
	public static function format( $number, array $cfg, ?int $decimals = null ): string {
		$decimals = null === $decimals ? $cfg['decimals'] : $decimals;

		return number_format( (float) $number, $decimals, $cfg['decimal_sep'], $cfg['thousands_sep'] );
	}

	/** An amount with the symbol on the configured side and, when set, the period ("$20 / month"). */
	public static function display( $number, array $cfg, string $per = '', string $custom = '' ): string {
		$text = self::format( $number, $cfg );
		$text = '' === $cfg['currency_symbol'] ? $text : ( 'after' === $cfg['currency_position'] ? $text . ' ' . $cfg['currency_symbol'] : $cfg['currency_symbol'] . $text );
		$label = self::per_label( $per, $custom );

		return '' === $label ? $text : $text . ' ' . $label;
	}

	/** What the front-end script needs to write amounts as the collection does. */
	public static function js( array $cfg ): array {
		return [ 't' => $cfg['thousands_sep'], 'd' => $cfg['decimal_sep'], 'n' => $cfg['decimals'] ];
	}
}
