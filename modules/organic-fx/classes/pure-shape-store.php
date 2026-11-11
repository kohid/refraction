<?php
namespace Refraction\Modules\OrganicFx\Classes;

/**
 * My Shapes without WordPress: what is kept of an uploaded SVG. Nothing is stored as sent: only path data (letters of
 * path commands, numbers and separators) and a numeric viewBox are kept, and the shape is drawn again as one plain
 * path. Rectangles, circles, ellipses, polygons and polylines are turned into path data first.
 */
class Pure_Shape_Store {

	const MAX_BYTES = 200000;
	const MAX_D = 60000;

	/** Path data that may be stored, or '' (wrong characters, empty, too long). */
	public static function clean_d( string $d ): string {
		$d = trim( preg_replace( '/\s+/', ' ', $d ) );

		if ( '' === $d || strlen( $d ) > self::MAX_D || preg_match( '/[^MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]/', $d ) || ! preg_match( '/^[Mm]/', $d ) ) {
			return '';
		}

		return $d;
	}

	/** "x y w h" from four numbers with a positive size, else ''. */
	public static function clean_viewbox( string $vb ): string {
		if ( preg_match( '/^\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*$/', $vb, $m ) && (float) $m[3] > 0 && (float) $m[4] > 0 ) {
			return ( 0 + $m[1] ) . ' ' . ( 0 + $m[2] ) . ' ' . ( 0 + $m[3] ) . ' ' . ( 0 + $m[4] );
		}

		return '';
	}

	private static function num( string $tag, string $attr ): float {
		return preg_match( '/\s' . $attr . '\s*=\s*["\']\s*(-?[\d.]+)/i', $tag, $m ) ? (float) $m[1] : 0.0;
	}

	/** Path data for the simple shape elements of an SVG. */
	public static function primitives( string $svg ): array {
		$out = [];

		preg_match_all( '/<(rect|circle|ellipse|polygon|polyline)\b[^>]*>/i', $svg, $tags, PREG_SET_ORDER );

		foreach ( $tags as [ $tag, $name ] ) {
			switch ( strtolower( $name ) ) {
				case 'rect':
					[ $x, $y, $w, $h ] = [ self::num( $tag, 'x' ), self::num( $tag, 'y' ), self::num( $tag, 'width' ), self::num( $tag, 'height' ) ];

					if ( $w > 0 && $h > 0 ) {
						$out[] = "M{$x} {$y}H" . ( $x + $w ) . 'V' . ( $y + $h ) . "H{$x}Z";
					}
					break;

				case 'circle':
				case 'ellipse':
					$cx = self::num( $tag, 'cx' );
					$cy = self::num( $tag, 'cy' );
					$rx = 'circle' === strtolower( $name ) ? self::num( $tag, 'r' ) : self::num( $tag, 'rx' );
					$ry = 'circle' === strtolower( $name ) ? $rx : self::num( $tag, 'ry' );

					if ( $rx > 0 && $ry > 0 ) {
						$out[] = 'M' . ( $cx - $rx ) . " {$cy}A{$rx} {$ry} 0 1 0 " . ( $cx + $rx ) . " {$cy}A{$rx} {$ry} 0 1 0 " . ( $cx - $rx ) . " {$cy}Z";
					}
					break;

				default:
					if ( preg_match( '/\spoints\s*=\s*["\']([^"\']*)["\']/i', $tag, $p ) ) {
						$nums = preg_split( '/[\s,]+/', trim( $p[1] ) ) ?: [];

						if ( count( $nums ) >= 4 && ! ( count( $nums ) % 2 ) && ! preg_grep( '/^-?[\d.]+$/', $nums, PREG_GREP_INVERT ) ) {
							$pairs = array_chunk( $nums, 2 );
							$out[] = 'M' . implode( 'L', array_map( static fn( $xy ) => $xy[0] . ' ' . $xy[1], $pairs ) ) . 'Z';
						}
					}
			}
		}

		return $out;
	}

	/**
	 * An uploaded SVG's shape: [ 'd' => path data, 'vb' => viewBox ], or null when it holds no usable shape.
	 * With no viewBox, one is taken from the width and height, else from the path's numbers.
	 */
	public static function parse( string $svg ): ?array {
		if ( strlen( $svg ) > self::MAX_BYTES || false === stripos( $svg, '<svg' ) ) {
			return null;
		}

		$svg = preg_replace( '/<!--.*?-->/s', '', $svg );
		preg_match_all( '/<path\b[^>]*\sd\s*=\s*(?:"([^"]*)"|\'([^\']*)\')/i', $svg, $m, PREG_SET_ORDER );
		$parts = array_filter( array_map( static fn( $x ) => '' !== $x[1] ? $x[1] : ( $x[2] ?? '' ), $m ) );
		$parts = array_merge( $parts, self::primitives( $svg ) );
		$d = self::clean_d( implode( ' ', $parts ) );

		if ( '' === $d ) {
			return null;
		}

		$vb = preg_match( '/<svg\b[^>]*\sviewBox\s*=\s*["\']([^"\']*)["\']/i', $svg, $v ) ? self::clean_viewbox( $v[1] ) : '';

		if ( '' === $vb && preg_match( '/<svg\b[^>]*>/i', $svg, $root ) ) {
			$w = self::num( $root[0], 'width' );
			$h = self::num( $root[0], 'height' );
			$vb = $w > 0 && $h > 0 ? "0 0 {$w} {$h}" : '';
		}

		if ( '' === $vb ) {
			preg_match_all( '/-?\d+(?:\.\d+)?/', $d, $n );
			$max = $n[0] ? max( array_map( 'floatval', $n[0] ) ) : 100;
			$vb = '0 0 ' . max( 1, $max ) . ' ' . max( 1, $max );
		}

		$rule = preg_match( '/fill-rule\s*[=:]\s*["\']?\s*evenodd/i', $svg ) ? 'evenodd' : 'nonzero';

		return [ 'd' => $d, 'vb' => $vb, 'rule' => $rule ];
	}

	/** A stored shape made safe again (it is read back from the database): null when it is no longer valid. */
	public static function clean_shape( $shape ): ?array {
		if ( ! is_array( $shape ) ) {
			return null;
		}

		$d = self::clean_d( (string) ( $shape['d'] ?? '' ) );
		$vb = self::clean_viewbox( (string) ( $shape['vb'] ?? '' ) );

		if ( '' === $d || '' === $vb ) {
			return null;
		}

		return [
			'name' => (string) ( $shape['name'] ?? '' ),
			'd' => $d,
			'vb' => $vb,
			'rule' => 'evenodd' === ( $shape['rule'] ?? '' ) ? 'evenodd' : 'nonzero',
		];
	}

	/** The shape as a plain SVG (for a preview). */
	public static function svg( array $shape, string $fill = 'currentColor' ): string {
		return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' . $shape['vb'] . '" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path fill="' . $fill . '" fill-rule="' . $shape['rule'] . '" d="' . $shape['d'] . '"/></svg>';
	}

	/** The shape as a CSS mask image, stretched to the element like the built-in shapes. */
	public static function mask_url( array $shape ): string {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' . $shape['vb'] . '" preserveAspectRatio="none"><path fill-rule="' . $shape['rule'] . '" d="' . $shape['d'] . '"/></svg>';

		return 'url("data:image/svg+xml,' . rawurlencode( $svg ) . '")';
	}

	/** The rules that make my shapes usable as Shape Mask and Deco Blob shapes. */
	public static function css( array $shapes ): string {
		$out = '';

		foreach ( $shapes as $id => $shape ) {
			$shape = self::clean_shape( $shape );

			if ( $shape && preg_match( '/^my-[a-z0-9-]+$/', (string) $id ) ) {
				$out .= ".rf-shape--{$id},.rf-mask--{$id}{--rf-shape:" . self::mask_url( $shape ) . "}\n";
			}
		}

		return $out;
	}

	/** A stable id from a name: my-<letters, digits and dashes>. */
	public static function id( string $name, array $taken ): string {
		$base = 'my-' . ( trim( preg_replace( '/[^a-z0-9]+/', '-', strtolower( $name ) ), '-' ) ?: 'shape' );
		$base = substr( $base, 0, 40 );
		$id = $base;

		for ( $i = 2; in_array( $id, $taken, true ); $i++ ) {
			$id = $base . '-' . $i;
		}

		return $id;
	}
}
