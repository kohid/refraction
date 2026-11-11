<?php
namespace Refraction\Modules\OrganicFx\Classes;

/**
 * The shapes of Shape Mask, Deco Blob and Floating Shapes, without WordPress: closed SVG paths in a 0-100 box, made
 * from numbers only (no assets), the same on every run. scripts/build-organic-shapes.php writes them into the static
 * CSS (one class per shape, a mask image) and the script (Deco Blob outlines), so masks show before any script runs.
 */
class Pure_Organic {

	/** Shape ids and their names, in the order the picker shows them. */
	const SHAPES = [
		'blob-1' => 'Blob: pebble',
		'blob-2' => 'Blob: cloud',
		'blob-3' => 'Blob: bean',
		'blob-4' => 'Blob: puddle',
		'blob-5' => 'Blob: stone',
		'blob-6' => 'Blob: splash',
		'wave-top' => 'Wavy top edge',
		'wave-bottom' => 'Wavy bottom edge',
		'wave-left' => 'Wavy left edge',
		'wave-right' => 'Wavy right edge',
		'wave-all' => 'Wavy all round',
		'arch' => 'Arch',
		'arch-down' => 'Arch, upside down',
		'pill' => 'Pill',
		'circle' => 'Circle',
		'squircle' => 'Squircle',
		'leaf' => 'Leaf',
		'scallop' => 'Scallop',
		'flower' => 'Flower',
		'star-soft' => 'Soft star',
		'tilted' => 'Tilted card',
	];

	/** Blob presets: seed, number of points, how far the edge wanders (0-1). */
	const BLOBS = [
		'blob-1' => [ 7, 7, 0.22 ],
		'blob-2' => [ 21, 9, 0.18 ],
		'blob-3' => [ 3, 5, 0.3 ],
		'blob-4' => [ 42, 8, 0.26 ],
		'blob-5' => [ 11, 6, 0.16 ],
		'blob-6' => [ 58, 10, 0.32 ],
	];

	/** A small, stable pseudo-random sequence (0-1) for a seed. */
	public static function random( int $seed, int $count ): array {
		$out = [];
		$x = ( $seed * 9301 + 49297 ) % 233280;

		for ( $i = 0; $i < $count; $i++ ) {
			$x = ( $x * 9301 + 49297 ) % 233280;
			$out[] = $x / 233280;
		}

		return $out;
	}

	private static function n( float $v ): string {
		$s = rtrim( rtrim( number_format( $v, 2, '.', '' ), '0' ), '.' );

		return '-0' === $s ? '0' : $s;
	}

	/** A smooth closed path through points (Catmull-Rom turned into cubic Bezier curves). */
	public static function box( float $v ): float {
		return max( 0.0, min( 100.0, $v ) );
	}

	public static function smooth( array $pts, float $tension = 1.0 ): string {
		$count = count( $pts );
		$d = 'M' . self::n( $pts[0][0] ) . ' ' . self::n( $pts[0][1] );

		for ( $i = 0; $i < $count; $i++ ) {
			$p0 = $pts[ ( $i - 1 + $count ) % $count ];
			$p1 = $pts[ $i ];
			$p2 = $pts[ ( $i + 1 ) % $count ];
			$p3 = $pts[ ( $i + 2 ) % $count ];
			// Handles kept inside the box, so the curve (inside its handles' hull) never leaves it.
			$c1 = array_map( [ self::class, 'box' ], [ $p1[0] + ( $p2[0] - $p0[0] ) / 6 * $tension, $p1[1] + ( $p2[1] - $p0[1] ) / 6 * $tension ] );
			$c2 = array_map( [ self::class, 'box' ], [ $p2[0] - ( $p3[0] - $p1[0] ) / 6 * $tension, $p2[1] - ( $p3[1] - $p1[1] ) / 6 * $tension ] );
			$d .= 'C' . self::n( $c1[0] ) . ' ' . self::n( $c1[1] ) . ' ' . self::n( $c2[0] ) . ' ' . self::n( $c2[1] ) . ' ' . self::n( $p2[0] ) . ' ' . self::n( $p2[1] );
		}

		return $d . 'Z';
	}

	/** A blob: points around the middle at a wandering distance, smoothed; it fills most of the box. */
	public static function blob( int $seed, int $points, float $wander ): string {
		$r = self::random( $seed, $points * 2 );
		$pts = [];

		for ( $i = 0; $i < $points; $i++ ) {
			$a = ( $i / $points ) * 2 * M_PI + ( $r[ $points + $i ] - 0.5 ) * ( M_PI / $points );
			$radius = 50 * ( 1 - $wander + $wander * $r[ $i ] );
			$pts[] = [ 50 + cos( $a ) * $radius, 50 + sin( $a ) * $radius ];
		}

		// The smooth curve swings a little past its points: a margin keeps it inside the box.
		return self::smooth( self::fit( $pts, 9, 91 ) );
	}

	/** Stretches points to fill the box (1 to 99), so a blob mask uses the whole element. */
	public static function fit( array $pts, float $from = 1, float $to = 99 ): array {
		$xs = array_column( $pts, 0 );
		$ys = array_column( $pts, 1 );
		$w = max( $xs ) - min( $xs ) ?: 1;
		$h = max( $ys ) - min( $ys ) ?: 1;
		$span = $to - $from;

		return array_map( static fn( $p ) => [ $from + ( $p[0] - min( $xs ) ) / $w * $span, $from + ( $p[1] - min( $ys ) ) / $h * $span ], $pts );
	}

	/** A rectangle whose given edge is a soft wave (top, bottom, left, right). */
	public static function wave_edge( string $edge, int $waves = 3, float $depth = 5 ): string {
		$steps = $waves * 2;
		$along = [];

		// Crests and troughs in turn, joined by curves with level tangents: a soft wave.
		for ( $i = 0; $i <= $steps; $i++ ) {
			$along[] = [ $i / $steps * 100, $depth * ( 1 + 0.85 * ( $i % 2 ? 1 : -1 ) ) ];
		}

		// Built for the top edge, then turned for the others.
		$top = 'M0 ' . self::n( $along[0][1] );

		for ( $i = 0; $i < $steps; $i++ ) {
			$a = $along[ $i ];
			$b = $along[ $i + 1 ];
			$mx = ( $a[0] + $b[0] ) / 2;
			$top .= 'C' . self::n( $mx ) . ' ' . self::n( $a[1] ) . ' ' . self::n( $mx ) . ' ' . self::n( $b[1] ) . ' ' . self::n( $b[0] ) . ' ' . self::n( $b[1] );
		}

		$top .= 'L100 100L0 100Z';

		$map = [
			'top' => static fn( $x, $y ) => [ $x, $y ],
			'bottom' => static fn( $x, $y ) => [ $x, 100 - $y ],
			'left' => static fn( $x, $y ) => [ $y, $x ],
			'right' => static fn( $x, $y ) => [ 100 - $y, $x ],
		];

		return self::transform( $top, $map[ $edge ] );
	}

	/** Applies a point mapping to every coordinate pair of a path made of M, C, L and Z. */
	public static function transform( string $d, callable $map ): string {
		return preg_replace_callback( '/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/', static function ( $m ) use ( $map ) {
			[ $x, $y ] = $map( (float) $m[1], (float) $m[2] );

			return self::n( $x ) . ' ' . self::n( $y );
		}, $d );
	}

	/** A shape with a bumpy outline: n bumps of a given depth around a circle (flower, scallop, soft star). */
	public static function bumps( int $count, float $depth ): string {
		$pts = [];
		$total = $count * 2;

		// Tips and dips in turn; the smoothing rounds both.
		for ( $i = 0; $i < $total; $i++ ) {
			$a = $i / $total * 2 * M_PI - M_PI / 2;
			$radius = $i % 2 ? 49 - $depth : 49;
			$pts[] = [ 50 + cos( $a ) * $radius, 50 + sin( $a ) * $radius ];
		}

		return self::smooth( self::fit( $pts ), 1 );
	}

	/** Every shape id with its path. */
	public static function paths(): array {
		$out = [];

		foreach ( array_keys( self::SHAPES ) as $id ) {
			$out[ $id ] = self::path( $id );
		}

		return $out;
	}

	public static function path( string $id ): string {
		if ( isset( self::BLOBS[ $id ] ) ) {
			return self::blob( ...self::BLOBS[ $id ] );
		}

		switch ( $id ) {
			case 'wave-top':
			case 'wave-bottom':
			case 'wave-left':
			case 'wave-right':
				return self::wave_edge( substr( $id, 5 ) );
			case 'wave-all':
				return self::bumps( 14, 4 );
			case 'arch':
				return 'M0 50C0 22.4 22.4 0 50 0C77.6 0 100 22.4 100 50L100 100L0 100Z';
			case 'arch-down':
				return 'M0 0L100 0L100 50C100 77.6 77.6 100 50 100C22.4 100 0 77.6 0 50Z';
			case 'pill':
				return 'M25 0L75 0C88.8 0 100 22.4 100 50C100 77.6 88.8 100 75 100L25 100C11.2 100 0 77.6 0 50C0 22.4 11.2 0 25 0Z';
			case 'circle':
				return 'M50 0C77.6 0 100 22.4 100 50C100 77.6 77.6 100 50 100C22.4 100 0 77.6 0 50C0 22.4 22.4 0 50 0Z';
			case 'squircle':
				return 'M50 0C90 0 100 10 100 50C100 90 90 100 50 100C10 100 0 90 0 50C0 10 10 0 50 0Z';
			case 'leaf':
				return 'M0 100L0 45C0 20 20 0 45 0L100 0L100 55C100 80 80 100 55 100Z';
			case 'scallop':
				return self::bumps( 16, 6 );
			case 'flower':
				return self::bumps( 8, 16 );
			case 'star-soft':
				return self::bumps( 6, 20 );
			case 'tilted':
				return 'M6 4L96 0C98.2 0 100 1.8 100 4L94 96C94 98.2 92.2 100 90 100L4 96C1.8 96 0 94.2 0 92L2 8C2 5.8 3.8 4 6 4Z';
		}

		return self::path( 'blob-1' );
	}

	/** A mask image for a path: an SVG that stretches to the element (preserveAspectRatio none), as a CSS url(). */
	public static function mask_url( string $path ): string {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="' . $path . '"/></svg>';

		return 'url("data:image/svg+xml,' . rawurlencode( $svg ) . '")';
	}
}
