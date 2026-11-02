<?php
// Pure-logic tests for the loading screen settings: php scripts/test-page-loader.php
define( 'ABSPATH', __DIR__ . '/' );
require dirname( __DIR__ ) . '/modules/page-loader/classes/pure-loader-settings.php';

use Refraction\Modules\PageLoader\Classes\Pure_Loader_Settings as S;

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

t( 'off unless switched on', [] === S::normalize( [] ) && [] === S::normalize( [ 'rf_loader' => '' ] ) );
$c = S::normalize( [ 'rf_loader' => 'yes' ] );
t( 'defaults: bar, fade, site logo, the homepage colors, 600 ms minimum, 8 s limit, percentage shown', 'bar' === $c['style'] && 'fade' === $c['exit'] && 'site' === $c['logo'] && '#0A0E2B' === $c['bg'] && '#3DD9E8' === $c['accent'] && 600 === $c['min'] && 8000 === $c['max'] && true === $c['percent'] && false === $c['once'] );
$c = S::normalize( [ 'rf_loader' => 'yes', 'rf_loader_style' => 'counter', 'rf_loader_exit' => 'split', 'rf_loader_logo' => 'image', 'rf_loader_image' => [ 'id' => '42' ], 'rf_loader_once' => 'yes', 'rf_loader_percent' => '' ] );
t( 'choices are kept', 'counter' === $c['style'] && 'split' === $c['exit'] && 'image' === $c['logo'] && 42 === $c['image'] && true === $c['once'] && false === $c['percent'] );
$c = S::normalize( [ 'rf_loader' => 'yes', 'rf_loader_style' => 'nope', 'rf_loader_exit' => '<x>', 'rf_loader_min' => '99999', 'rf_loader_max' => '10' ] );
t( 'unknown choices fall back, times are clamped', 'bar' === $c['style'] && 'fade' === $c['exit'] && 5000 === $c['min'] && 1500 === $c['max'] );
t( 'colors: hex and rgba kept, anything else (CSS injection) falls back', '#abc' === S::color( '#abc', '#000' ) && 'rgba(1, 2, 3, .5)' === S::color( 'rgba(1, 2, 3, .5)', '#000' ) && '#000' === S::color( 'red;}body{display:none', '#000' ) && '#000' === S::color( 'url(x)', '#000' ) && '#000' === S::color( null, '#000' ) );
$c = S::normalize( [ 'rf_loader' => 'yes', 'rf_loader_caption' => str_repeat( 'a', 200 ) ] );
t( 'caption is limited to 80 characters', 80 === mb_strlen( $c['caption'] ) );

echo "page-loader: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
