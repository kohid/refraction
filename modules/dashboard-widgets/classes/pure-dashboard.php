<?php
namespace Refraction\Modules\DashboardWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Pure logic of the dashboard widgets (Chart, Data Table, Stat Card), with no WordPress calls, so
 * scripts/test-dashboard.php runs it on its own: reading numbers, lists and pasted tables, a readable axis scale,
 * number formatting, and the shapes of lines and rings.
 */
class Pure_Dashboard {

	/** The default series colors (a dashboard palette: blue, teal, violet, amber, rose, ink). */
	const PALETTE = [ '#3699FF', '#1BC5BD', '#8950FC', '#FFA800', '#F64E60', '#181C32' ];

	/** Color themes: main, light tint. */
	const THEMES = [
		'primary' => [ '#3699FF', '#F1FAFF' ],
		'success' => [ '#1BC5BD', '#C9F7F5' ],
		'info' => [ '#8950FC', '#EEE5FF' ],
		'warning' => [ '#FFA800', '#FFF4DE' ],
		'danger' => [ '#F64E60', '#FFE2E5' ],
		'dark' => [ '#181C32', '#EFF2F5' ],
	];

	/**
	 * A number from text: "1,250", "$1,250.50", "12%", "-3.5", " 4 000 ", "(120)" (negative). null when there is none.
	 */
	public static function number( $value ): ?float {
		if ( is_int( $value ) || is_float( $value ) ) {
			return (float) $value;
		}

		$text = trim( html_entity_decode( strip_tags( (string) $value ), ENT_QUOTES, 'UTF-8' ) );

		if ( '' === $text ) {
			return null;
		}

		$negative = (bool) preg_match( '/^\(.*\)$/', $text ) || (bool) preg_match( '/^[^\d]*-/', $text );
		$text = preg_replace( '/[^\d.,]/', '', $text );

		// "1.234,5" (comma decimals) when the last separator is a comma followed by 1-2 digits.
		if ( preg_match( '/,\d{1,2}$/', $text ) && false !== strpos( $text, '.' ) ) {
			$text = str_replace( [ '.', ',' ], [ '', '.' ], $text );
		} else {
			$text = str_replace( ',', '', $text );
		}

		if ( '' === $text || ! is_numeric( $text ) ) {
			return null;
		}

		return $negative ? -(float) $text : (float) $text;
	}

	/** Items of a list typed as "a, b, c", one per line, or "a | b | c". */
	public static function items( string $text ): array {
		$text = trim( $text );

		if ( '' === $text ) {
			return [];
		}

		$parts = preg_split( false !== strpos( $text, "\n" ) ? '/\r?\n/' : ( false !== strpos( $text, '|' ) ? '/\|/' : '/,/' ), $text );

		return array_values( array_map( 'trim', $parts ) );
	}

	/** Numbers of a list ("12, 19, 3"): null where an item is not a number. */
	public static function numbers( string $text ): array {
		return array_map( [ self::class, 'number' ], self::items( $text ) );
	}

	/**
	 * A pasted table (CSV, or separated by semicolons, tabs or bars, found from the first line) as rows of cells.
	 *
	 * @return array<int, array<int, string>>
	 */
	public static function table( string $text ): array {
		$lines = array_values( array_filter( preg_split( '/\r?\n/', trim( $text ) ), static fn( $l ) => '' !== trim( $l ) ) );

		if ( ! $lines ) {
			return [];
		}

		$first = $lines[0];
		$counts = [ ',' => substr_count( $first, ',' ), ';' => substr_count( $first, ';' ), "\t" => substr_count( $first, "\t" ), '|' => substr_count( $first, '|' ) ];
		arsort( $counts );
		$sep = (string) array_key_first( $counts );

		if ( 0 === reset( $counts ) ) {
			$sep = ',';
		}

		return array_map( static fn( $l ) => array_map( 'trim', str_getcsv( $l, $sep, '"', '\\' ) ), $lines );
	}

	/**
	 * Chart data from a pasted table: the first row names the series (its first cell is ignored), the first column
	 * holds the labels.
	 *
	 * @return array{labels: string[], series: array<int, array{name: string, values: array}>}
	 */
	public static function chart_from_table( array $rows ): array {
		if ( count( $rows ) < 2 ) {
			return [ 'labels' => [], 'series' => [] ];
		}

		$head = array_shift( $rows );
		$labels = array_map( static fn( $r ) => (string) ( $r[0] ?? '' ), $rows );
		$series = [];

		for ( $c = 1; $c < count( $head ); $c++ ) {
			$series[] = [ 'name' => (string) $head[ $c ], 'values' => array_map( static fn( $r ) => self::number( $r[ $c ] ?? '' ), $rows ) ];
		}

		return [ 'labels' => $labels, 'series' => $series ];
	}

	/**
	 * A readable axis: from at most 0 to at least the largest value, in round steps (1, 2, 2.5 or 5 times a power of
	 * ten), about $ticks of them.
	 *
	 * @return array{min: float, max: float, step: float}
	 */
	public static function scale( float $min, float $max, int $ticks = 5, bool $from_zero = true, bool $whole = false ): array {
		if ( $from_zero ) {
			$min = min( 0.0, $min );
			$max = max( 0.0, $max );
		}

		if ( $max === $min ) {
			$max = $min + ( 0.0 === $min ? 1 : abs( $min ) );
		}

		$raw = ( $max - $min ) / max( 1, $ticks );
		$power = 10 ** floor( log10( $raw ) );
		$step = $power;

		foreach ( [ 1, 2, 2.5, 5, 10 ] as $f ) {
			if ( $f * $power >= $raw ) {
				$step = $f * $power;
				break;
			}
		}

		// Counts (whole numbers) never step by a fraction.
		if ( $whole ) {
			$step = max( 1.0, round( $step ) );
		}

		return [ 'min' => floor( $min / $step ) * $step, 'max' => ceil( $max / $step ) * $step, 'step' => $step ];
	}

	/**
	 * A number for display: decimals, thousands separator, prefix and suffix; compact makes 1250 "1.3K" and
	 * 2400000 "2.4M".
	 */
	public static function format( ?float $value, int $decimals = 0, string $prefix = '', string $suffix = '', bool $compact = false, string $thousands = ',' ): string {
		if ( null === $value ) {
			return '–';
		}

		$sign = $value < 0 ? '-' : '';
		$abs = abs( $value );
		$unit = '';

		if ( $compact ) {
			foreach ( [ 1e9 => 'B', 1e6 => 'M', 1e3 => 'K' ] as $size => $letter ) {
				if ( $abs >= $size ) {
					$abs /= $size;
					$unit = $letter;
					$decimals = max( $decimals, $abs < 100 ? 1 : 0 );
					break;
				}
			}
		}

		$text = number_format( $abs, max( 0, min( 6, $decimals ) ), '.', $thousands );

		if ( $compact && false !== strpos( $text, '.' ) ) {
			$text = rtrim( rtrim( $text, '0' ), '.' );
		}

		return $sign . $prefix . $text . $unit . $suffix;
	}

	/** The decimals a step needs to show (0.5 needs 1, 0.25 needs 2). */
	public static function step_decimals( float $step ): int {
		for ( $d = 0; $d < 6; $d++ ) {
			if ( abs( round( $step, $d ) - $step ) < 1e-9 ) {
				return $d;
			}
		}

		return 6;
	}

	/** Which way a change goes: up, down or flat. */
	public static function direction( ?float $change ): string {
		if ( null === $change || abs( $change ) < 1e-9 ) {
			return 'flat';
		}

		return $change > 0 ? 'up' : 'down';
	}

	/**
	 * An SVG path through points (x, y in the chart's 0-1000 box): straight segments, or a smooth curve (Catmull-Rom
	 * turned into cubic Béziers, kept within the points' height so it does not overshoot). Null points break the
	 * line.
	 *
	 * @param array<int, array{0: float, 1: float}|null> $points
	 */
	public static function line_path( array $points, bool $smooth = false ): string {
		$runs = [];
		$run = [];

		foreach ( $points as $p ) {
			if ( null === $p ) {
				if ( $run ) {
					$runs[] = $run;
				}
				$run = [];
				continue;
			}
			$run[] = $p;
		}

		if ( $run ) {
			$runs[] = $run;
		}

		$d = '';
		$n = static fn( float $v ) => rtrim( rtrim( number_format( $v, 2, '.', '' ), '0' ), '.' );

		foreach ( $runs as $run ) {
			$d .= 'M' . $n( $run[0][0] ) . ' ' . $n( $run[0][1] );
			$count = count( $run );

			for ( $i = 1; $i < $count; $i++ ) {
				[ $x, $y ] = $run[ $i ];

				if ( ! $smooth ) {
					$d .= 'L' . $n( $x ) . ' ' . $n( $y );
					continue;
				}

				$p0 = $run[ max( 0, $i - 2 ) ];
				$p1 = $run[ $i - 1 ];
				$p3 = $run[ min( $count - 1, $i + 1 ) ];
				$lo = min( $p1[1], $y );
				$hi = max( $p1[1], $y );
				$c1 = [ $p1[0] + ( $x - $p0[0] ) / 6, max( $lo, min( $hi, $p1[1] + ( $y - $p0[1] ) / 6 ) ) ];
				$c2 = [ $x - ( $p3[0] - $p1[0] ) / 6, max( $lo, min( $hi, $y - ( $p3[1] - $p1[1] ) / 6 ) ) ];
				$d .= 'C' . $n( $c1[0] ) . ' ' . $n( $c1[1] ) . ' ' . $n( $c2[0] ) . ' ' . $n( $c2[1] ) . ' ' . $n( $x ) . ' ' . $n( $y );
			}
		}

		return $d;
	}

	/**
	 * Shares of a whole for a pie or donut: each value's percent (negatives and blanks count as 0) and where its
	 * segment starts, in percent of the circle.
	 *
	 * @return array<int, array{share: float, start: float}>
	 */
	public static function shares( array $values ): array {
		$values = array_map( static fn( $v ) => is_numeric( $v ) && $v > 0 ? (float) $v : 0.0, $values );
		$total = array_sum( $values );
		$start = 0.0;
		$out = [];

		foreach ( $values as $v ) {
			$share = $total > 0 ? $v / $total * 100 : 0.0;
			$out[] = [ 'share' => round( $share, 4 ), 'start' => round( $start, 4 ) ];
			$start += $share;
		}

		return $out;
	}

	/** A color for series $i: its own when valid, else the palette's. */
	public static function color( $value, int $i ): string {
		$value = is_string( $value ) ? trim( $value ) : '';

		if ( preg_match( '/^#[0-9a-fA-F]{3,8}$|^rgba?\([\d\s.,%]+\)$|^var\(--[a-z0-9-]+\)$/', $value ) ) {
			return $value;
		}

		return self::PALETTE[ $i % count( self::PALETTE ) ];
	}
}
