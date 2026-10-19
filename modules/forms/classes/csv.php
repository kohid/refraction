<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * CSV output that spreadsheet programs cannot turn into formulas.
 */
final class Csv {

	/** Prefixes a quote when a cell could start a formula (=, +, -, @, tab, CR, LF, also after spaces). */
	public static function cell( string $value ): string {
		return self::is_risky( $value ) ? "'" . $value : $value;
	}

	private static function is_risky( string $value ): bool {
		return (bool) preg_match( '/^ *[=+\-@]|^[\t\r\n]/', $value );
	}

	public static function line( array $cells ): string {
		$out = [];

		foreach ( $cells as $cell ) {
			$cell = (string) $cell;
			$risky = self::is_risky( $cell );
			$text = $risky ? "'" . $cell : $cell;

			if ( $risky || preg_match( '/[",\r\n]/', $text ) ) {
				$text = '"' . str_replace( '"', '""', $text ) . '"';
			}

			$out[] = $text;
		}

		return implode( ',', $out ) . "\n";
	}
}
