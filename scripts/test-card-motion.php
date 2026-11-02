<?php
// Pure-logic tests for the card stack settings: php scripts/test-card-motion.php
define( 'ABSPATH', __DIR__ . '/' );
require dirname( __DIR__ ) . '/modules/card-motion/classes/pure-stack-settings.php';

use Refraction\Modules\CardMotion\Classes\Pure_Stack_Settings as S;

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

$imgs = function ( $n ) { return array_map( function ( $i ) { return [ 'url' => "https://x.test/$i.jpg", 'alt' => "Alt $i" ]; }, range( 1, $n ) ); };

t( 'off unless a style is chosen', [] === S::normalize( [], $imgs( 2 ) ) && [] === S::normalize( [ 'rf_stack' => 'nope' ], [] ) );
$c = S::normalize( [ 'rf_stack' => 'deck' ], $imgs( 2 ) );
t( 'defaults: 3/4 cards, 8 degrees, 30 % apart, plays every 2.8 s, hover brings forward, click, no glow', '3/4' === $c['ratio'] && 8.0 === $c['spread'] && 30.0 === $c['offset'] && true === $c['autoplay'] && 2800 === $c['interval'] && 'front' === $c['hover'] && true === $c['click'] && false === $c['glow'] && false === $c['dots'] );
t( 'at most four more images (five cards), empty ones skipped', 4 === count( S::normalize( [ 'rf_stack' => 'fan' ], array_merge( [ [ 'url' => '' ] ], $imgs( 7 ) ) )['images'] ) );
t( 'the fan never plays by itself', false === S::normalize( [ 'rf_stack' => 'fan', 'rf_stack_autoplay' => 'yes' ], [] )['autoplay'] );
t( 'dots only for the carousel', true === S::normalize( [ 'rf_stack' => 'carousel' ], [] )['dots'] && false === S::normalize( [ 'rf_stack' => 'shuffle', 'rf_stack_dots' => 'yes' ], [] )['dots'] );
$c = S::normalize( [ 'rf_stack' => 'shuffle', 'rf_stack_spread' => [ 'size' => 99 ], 'rf_stack_offset' => [ 'size' => -5 ], 'rf_stack_interval' => '50', 'rf_stack_ratio' => '7/1', 'rf_stack_hover' => 'x' ], [] );
t( 'values are clamped and unknown choices fall back', 30.0 === $c['spread'] && 0.0 === $c['offset'] && 1200 === $c['interval'] && '3/4' === $c['ratio'] && 'front' === $c['hover'] );
t( 'alt texts travel with the images', 'Alt 1' === S::normalize( [ 'rf_stack' => 'fan' ], $imgs( 1 ) )['images'][0]['alt'] );

echo "card-motion: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
