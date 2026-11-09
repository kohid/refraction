<?php
// Pure tests for modules/image-optimizer/classes/pure-image-plan.php. Run: php scripts/test-image-optimizer.php
define( 'ABSPATH', __DIR__ . '/' );
require __DIR__ . '/../modules/image-optimizer/classes/pure-image-plan.php';

use Refraction\Modules\ImageOptimizer\Classes\Pure_Image_Plan as P;

$pass = 0;
$fail = 0;
function check( string $name, $got, $want ) {
	global $pass, $fail;
	if ( $got === $want ) {
		$pass++;
		return;
	}
	$fail++;
	echo "FAIL $name\n  got:  " . var_export( $got, true ) . "\n  want: " . var_export( $want, true ) . "\n";
}

check( 'landscape resized by width', P::target_size( 4000, 3000, 1600 ), [ 1600, 1200 ] );
check( 'portrait resized by height', P::target_size( 3000, 4000, 1600 ), [ 1200, 1600 ] );
check( 'square resized by width', P::target_size( 2000, 2000, 1600 ), [ 1600, 1600 ] );
check( 'smaller landscape unchanged', P::target_size( 1200, 800, 1600 ), null );
check( 'smaller portrait unchanged', P::target_size( 900, 1600, 1600 ), null );
check( 'exactly the limit unchanged', P::target_size( 1600, 900, 1600 ), null );
check( 'tall panorama keeps its ratio', P::target_size( 500, 5000, 1000 ), [ 100, 1000 ] );
check( 'very thin image keeps 1px', P::target_size( 10000, 1, 1000 ), [ 1000, 1 ] );
check( 'limit 0 never resizes', P::target_size( 8000, 6000, 0 ), null );
check( 'no size, no plan', P::target_size( 0, 0, 1600 ), null );

check( 'max default', P::max_size( '' ), 1600 );
check( 'max from text', P::max_size( '2048' ), 2048 );
check( 'max 0 allowed (off)', P::max_size( '0' ), 0 );
check( 'max negative clamped', P::max_size( '-5' ), 0 );
check( 'max huge clamped', P::max_size( '99999' ), 10000 );
check( 'max not a number', P::max_size( 'big' ), 1600 );
check( 'quality default', P::quality( null ), 80 );
check( 'quality clamped high', P::quality( '150' ), 100 );
check( 'quality clamped low', P::quality( '0' ), 1 );

check( 'alt: dashes and extension', P::alt_from_filename( 'inverness-airport-van.jpg' ), 'Inverness airport van' );
check( 'alt: underscores, upper extension', P::alt_from_filename( 'loch_ness__tour.JPG' ), 'Loch ness tour' );
check( 'alt: WordPress suffixes removed', P::alt_from_filename( 'castle-view-scaled.webp' ), 'Castle view' );
check( 'alt: size suffix removed', P::alt_from_filename( 'castle-view-1600x900.png' ), 'Castle view' );
check( 'alt: title without extension', P::alt_from_filename( 'safekab-taxi' ), 'Safekab taxi' );
check( 'alt: keeps numbers in the name', P::alt_from_filename( 'room-2-sea-view.jpeg' ), 'Room 2 sea view' );
check( 'alt: unicode first letter', P::alt_from_filename( 'élan-vital.png' ), 'Élan vital' );
check( 'alt: only an extension', P::alt_from_filename( '.png' ), '' );

$frame = "\x21\xF9\x04\x04\x0A\x00\x00\x00\x2C";
check( 'gif: one frame is still', P::is_animated_gif( 'GIF89a' . $frame . 'data' ), false );
check( 'gif: a looping gif is animated', P::is_animated_gif( "GIF89a\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00" . $frame ), true );
check( 'gif: two frames are animated', P::is_animated_gif( 'GIF89a' . $frame . 'a' . $frame . 'b' ), true );
$png = "\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08";
check( 'palette: gif', P::is_palette( 'image/gif', '' ), true );
check( 'palette: 8-bit png', P::is_palette( 'image/png', $png . "\x03\x00" ), true );
check( 'palette: truecolor png', P::is_palette( 'image/png', $png . "\x06\x00" ), false );
check( 'palette: jpeg', P::is_palette( 'image/jpeg', '' ), false );
check( 'types include jpeg, png, bmp, not svg', [ in_array( 'image/jpeg', P::TYPES, true ), in_array( 'image/png', P::TYPES, true ), in_array( 'image/bmp', P::TYPES, true ), in_array( 'image/svg+xml', P::TYPES, true ) ], [ true, true, true, false ] );

echo "$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
