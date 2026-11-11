<?php
/**
 * Organic FX (modules/organic-fx): the generated shapes and My Shapes upload cleaning. php scripts/test-organic-fx.php
 */
require __DIR__ . '/build-organic-shapes.php';
require __DIR__ . '/../modules/organic-fx/classes/pure-shape-store.php';

use Refraction\Modules\OrganicFx\Classes\Pure_Organic as O;
use Refraction\Modules\OrganicFx\Classes\Pure_Shape_Store as S;

$pass = 0;
$fail = 0;

function check( string $name, $got, $want ) {
	global $pass, $fail;

	if ( $got === $want ) {
		$pass++;
	} else {
		$fail++;
		echo "FAIL $name\n  got:  " . var_export( $got, true ) . "\n  want: " . var_export( $want, true ) . "\n";
	}
}

$assets = __DIR__ . '/../modules/organic-fx/assets/';

// ---- built-in shapes
check( 'generated SCSS matches the generator (run php scripts/build-organic-shapes.php)', file_get_contents( $assets . 'scss/_shapes.scss' ), organic_scss() );
check( 'generated JS matches the generator', file_get_contents( $assets . 'js/shapes-data.js' ), str_replace( '    ', "\t", organic_js() ) );
check( 'every shape in the list has a path', array_keys( O::paths() ), array_keys( O::SHAPES ) );

$inside = true;
$clean = true;

foreach ( O::paths() as $id => $d ) {
	$clean = $clean && '' !== S::clean_d( $d );
	preg_match_all( '/-?\d+(?:\.\d+)?/', $d, $n );

	foreach ( $n[0] as $v ) {
		$inside = $inside && $v >= -0.01 && $v <= 100.01;
	}
}

check( 'every built-in path stays inside its 100 x 100 box', $inside, true );
check( 'every built-in path passes the upload rules too', $clean, true );
check( 'the same shape every time (seeded)', O::path( 'blob-3' ), O::path( 'blob-3' ) );
check( 'blobs differ from each other', O::path( 'blob-1' ) !== O::path( 'blob-2' ), true );

// ---- path data and viewBox rules
check( 'path data: letters and numbers kept', S::clean_d( "M0 0\n L10,10 z" ), 'M0 0 L10,10 z' );
check( 'path data: anything else refused', S::clean_d( 'M0 0 L10 10" onload="x' ), '' );
check( 'path data: must start with a move', S::clean_d( 'L10 10' ), '' );
check( 'path data: too long refused', S::clean_d( 'M0 0' . str_repeat( 'L1 1', 20000 ) ), '' );
check( 'viewBox: four numbers', S::clean_viewbox( '0, 0, 24 24' ), '0 0 24 24' );
check( 'viewBox: no size refused', S::clean_viewbox( '0 0 0 24' ), '' );
check( 'viewBox: words refused', S::clean_viewbox( '0 0 24 24; x' ), '' );

// ---- uploads
$svg = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 40"><script>alert(1)</script><path onclick="x()" fill="red" d="M0 0L50 0L25 40Z"/></svg>';
check( 'an SVG path: only d and viewBox kept', S::parse( $svg ), [ 'd' => 'M0 0L50 0L25 40Z', 'vb' => '0 0 50 40', 'rule' => 'nonzero' ] );
check( 'several paths joined, single quotes read', S::parse( "<svg viewBox='0 0 10 10'><path d='M0 0H5V5Z'/><path d=\"M5 5H10V10Z\"/></svg>" )['d'], 'M0 0H5V5Z M5 5H10V10Z' );
check( 'a rectangle becomes a path', S::parse( '<svg viewBox="0 0 10 10"><rect x="1" y="2" width="3" height="4"/></svg>' )['d'], 'M1 2H4V6H1Z' );
check( 'a circle becomes two arcs', S::parse( '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>' )['d'], 'M1 5A4 4 0 1 0 9 5A4 4 0 1 0 1 5Z' );
check( 'a polygon becomes a path', S::parse( '<svg viewBox="0 0 10 10"><polygon points="0,0 10,0 5,10"/></svg>' )['d'], 'M0 0L10 0L5 10Z' );
check( 'a polygon with bad points is skipped', S::parse( '<svg viewBox="0 0 10 10"><polygon points="0,0 x,0 5,10"/></svg>' ), null );
check( 'no viewBox: width and height used', S::parse( '<svg width="64" height="32"><path d="M0 0H64V32Z"/></svg>' )['vb'], '0 0 64 32' );
check( 'no viewBox or size: from the numbers', S::parse( '<svg><path d="M0 0H80V40Z"/></svg>' )['vb'], '0 0 80 80' );
check( 'evenodd is kept, so holes stay holes', S::parse( '<svg viewBox="0 0 10 10"><path fill-rule="evenodd" d="M0 0H10V10H0Z"/></svg>' )['rule'], 'evenodd' );
check( 'a path with script in its data is refused', S::parse( '<svg viewBox="0 0 10 10"><path d="M0 0 javascript:alert(1)"/></svg>' ), null );
check( 'commented-out paths ignored', S::parse( '<svg viewBox="0 0 10 10"><!-- <path d="M9 9Z"/> --><path d="M0 0H1Z"/></svg>' )['d'], 'M0 0H1Z' );
check( 'not an SVG', S::parse( '<html><path d="M0 0H1Z"/></html>' ), null );
check( 'an SVG with no shape', S::parse( '<svg viewBox="0 0 10 10"><text>Hi</text></svg>' ), null );
check( 'too big', S::parse( '<svg viewBox="0 0 10 10">' . str_repeat( ' ', S::MAX_BYTES ) . '<path d="M0 0H1Z"/></svg>' ), null );

// ---- stored shapes and CSS
check( 'stored shape cleaned again on the way out', S::clean_shape( [ 'name' => 'A', 'd' => 'M0 0H1Z', 'vb' => '0 0 1 1', 'rule' => 'x' ] ), [ 'name' => 'A', 'd' => 'M0 0H1Z', 'vb' => '0 0 1 1', 'rule' => 'nonzero' ] );
check( 'a tampered stored shape is dropped', S::clean_shape( [ 'd' => 'M0 0"/><script>', 'vb' => '0 0 1 1' ] ), null );
$css = S::css( [ 'my-a' => [ 'name' => 'A', 'd' => 'M0 0H1Z', 'vb' => '0 0 1 1' ], 'bad id' => [ 'd' => 'M0 0H1Z', 'vb' => '0 0 1 1' ] ] );
check( 'CSS for each valid shape, as mask and blob class', 1 === substr_count( $css, '.rf-shape--my-a,.rf-mask--my-a{--rf-shape:url("data:image/svg+xml,' ), true );
check( 'CSS skips a bad id', false === strpos( $css, 'bad' ), true );
check( 'mask image stretches like the built-in shapes', false !== strpos( rawurldecode( $css ), 'preserveAspectRatio="none"' ), true );
check( 'ids: from the name, unique', S::id( 'Brand Blob!', [ 'my-brand-blob' ] ), 'my-brand-blob-2' );
check( 'ids: a name with no letters', S::id( '***', [] ), 'my-shape' );

echo "organic-fx: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
