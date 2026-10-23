<?php
/**
 * Standalone tests for the pure logic of the Off-Canvas, Mega Menu and Nested Carousel modules.
 *
 * Run: php scripts/test-nested.php
 */

define( 'ABSPATH', __DIR__ . '/' );

$files = [
	'off-canvas/classes/off-canvas-logic',
	'mega-menu/classes/mega-menu-logic',
	'nested-carousel/classes/carousel-logic',
];
foreach ( $files as $file ) {
	$path = dirname( __DIR__ ) . '/modules/' . $file . '.php';
	if ( ! file_exists( $path ) ) {
		echo "MISSING class file: $file.php\n";
		exit( 1 );
	}
	require_once $path;
}

use Refraction\Modules\OffCanvas\Classes\Off_Canvas_Logic as OC;
use Refraction\Modules\MegaMenu\Classes\Mega_Menu_Logic as MM;
use Refraction\Modules\NestedCarousel\Classes\Carousel_Logic as NC;

$failures = 0;
$total = 0;
function t( string $name, $actual, $expected ): void {
	global $failures, $total;
	++$total;
	if ( $actual === $expected ) {
		echo "ok   $name\n";
		return;
	}
	++$failures;
	echo "FAIL $name\n     expected: " . var_export( $expected, true ) . "\n     actual:   " . var_export( $actual, true ) . "\n";
}

// ------------------------------------------------------------ Off-Canvas
$s = OC::sanitize( [] );
t( 'oc: defaults', [ $s['position'], $s['mode'], $s['close_on_overlay'], $s['close_on_esc'], $s['duration'] ], [ 'left', 'overlay', true, true, 300 ] );
t( 'oc: bad position falls back', OC::sanitize( [ 'position' => 'diagonal' ] )['position'], 'left' );
t( 'oc: positions accepted', array_map( fn( $p ) => OC::sanitize( [ 'position' => $p ] )['position'], [ 'left', 'right', 'top', 'bottom', 'center' ] ), [ 'left', 'right', 'top', 'bottom', 'center' ] );
t( 'oc: push mode kept for a side panel', OC::sanitize( [ 'position' => 'right', 'mode' => 'push' ] )['mode'], 'push' );
t( 'oc: push is impossible for the centered overlay', OC::sanitize( [ 'position' => 'center', 'mode' => 'push' ] )['mode'], 'overlay' );
t( 'oc: push is impossible for a bottom panel', OC::sanitize( [ 'position' => 'bottom', 'mode' => 'push' ] )['mode'], 'overlay' );
t( 'oc: unknown mode', OC::sanitize( [ 'mode' => 'x' ] )['mode'], 'overlay' );
t( 'oc: duration clamped high', OC::sanitize( [ 'duration' => 99999 ] )['duration'], 2000 );
t( 'oc: duration clamped low', OC::sanitize( [ 'duration' => -5 ] )['duration'], 0 );
t( 'oc: yes/no flags', [ OC::sanitize( [ 'close_on_overlay' => '' ] )['close_on_overlay'], OC::sanitize( [ 'close_on_esc' => 'yes' ] )['close_on_esc'] ], [ false, true ] );
t( 'oc: panel id from widget id', OC::panel_id( 'a1b2c3' ), 'refraction-offcanvas-a1b2c3' );
t( 'oc: custom panel id is cleaned', OC::panel_id( 'a1b2c3', ' My Panel! ' ), 'my-panel' );
t( 'oc: empty custom id falls back', OC::panel_id( 'a1b2c3', '!!!' ), 'refraction-offcanvas-a1b2c3' );
t( 'oc: hash', OC::hash( 'menu' ), '#refraction-offcanvas:menu' );
t( 'oc: parse hash', OC::parse_hash( '#refraction-offcanvas:menu-2' ), 'menu-2' );
t( 'oc: parse foreign hash', OC::parse_hash( '#other' ), '' );
t( 'oc: parse hash rejects markup', OC::parse_hash( '#refraction-offcanvas:a"><b' ), '' );

// ------------------------------------------------------------ Mega Menu
$m = MM::sanitize( [] );
t( 'mm: defaults', [ $m['layout'], $m['trigger'], $m['hover_delay'], $m['close_delay'], $m['dropdown_width'], $m['dropdown_position'], $m['breakpoint'], $m['mobile_layout'] ], [ 'horizontal', 'hover', 150, 250, 'container', 'start', 'tablet', 'accordion' ] );
t( 'mm: bad values fall back', [ MM::sanitize( [ 'layout' => 'x' ] )['layout'], MM::sanitize( [ 'trigger' => 'x' ] )['trigger'], MM::sanitize( [ 'dropdown_width' => 'x' ] )['dropdown_width'], MM::sanitize( [ 'breakpoint' => 'x' ] )['breakpoint'], MM::sanitize( [ 'mobile_layout' => 'x' ] )['mobile_layout'] ], [ 'horizontal', 'hover', 'container', 'tablet', 'accordion' ] );
t( 'mm: accepted values', [ MM::sanitize( [ 'layout' => 'vertical', 'trigger' => 'click', 'dropdown_width' => 'full', 'mobile_layout' => 'offcanvas', 'breakpoint' => 'none' ] )['layout'], MM::sanitize( [ 'trigger' => 'click' ] )['trigger'], MM::sanitize( [ 'dropdown_width' => 'custom' ] )['dropdown_width'], MM::sanitize( [ 'mobile_layout' => 'offcanvas' ] )['mobile_layout'], MM::sanitize( [ 'breakpoint' => 'none' ] )['breakpoint'] ], [ 'vertical', 'click', 'custom', 'offcanvas', 'none' ] );
t( 'mm: delays clamped', [ MM::sanitize( [ 'hover_delay' => 9999 ] )['hover_delay'], MM::sanitize( [ 'close_delay' => -1 ] )['close_delay'] ], [ 2000, 0 ] );
t( 'mm: item ids are 1-based and per widget', MM::item_ids( 'ab12', 0 ), [ 'trigger' => 'refraction-mm-ab12-t1', 'panel' => 'refraction-mm-ab12-p1' ] );
t( 'mm: item ids differ between widgets', MM::item_ids( 'ff', 2 ) !== MM::item_ids( 'gg', 2 ), true );
t( 'mm: link item has no dropdown', MM::has_dropdown( [ 'item_type' => 'link' ] ), false );
t( 'mm: dropdown item has a dropdown', MM::has_dropdown( [ 'item_type' => 'dropdown' ] ), true );
t( 'mm: missing type means link', MM::has_dropdown( [] ), false );

// ------------------------------------------------------------ Nested Carousel
$c = NC::sanitize( [] );
t( 'nc: defaults', [ $c['effect'], $c['pagination'], $c['slides_to_show'], $c['spacing'], $c['speed'], $c['autoplay_speed'], $c['direction'] ], [ 'slide', 'bullets', 1, 20, 500, 5000, 'horizontal' ] );
t( 'nc: bad effect', NC::sanitize( [ 'effect' => 'cube' ] )['effect'], 'slide' );
t( 'nc: fade accepted', NC::sanitize( [ 'effect' => 'fade' ] )['effect'], 'fade' );
t( 'nc: pagination accepted', array_map( fn( $p ) => NC::sanitize( [ 'pagination' => $p ] )['pagination'], [ 'none', 'bullets', 'fraction', 'progress', 'x' ] ), [ 'none', 'bullets', 'fraction', 'progress', 'bullets' ] );
t( 'nc: slides_to_show clamp', [ NC::sanitize( [ 'slides_to_show' => 0 ] )['slides_to_show'], NC::sanitize( [ 'slides_to_show' => 50 ] )['slides_to_show'] ], [ 1, 8 ] );
t( 'nc: speed clamp', [ NC::sanitize( [ 'speed' => 5 ] )['speed'], NC::sanitize( [ 'speed' => 99999 ] )['speed'] ], [ 100, 5000 ] );
t( 'nc: autoplay speed clamp', [ NC::sanitize( [ 'autoplay_speed' => 5 ] )['autoplay_speed'], NC::sanitize( [ 'autoplay_speed' => 999999 ] )['autoplay_speed'] ], [ 500, 30000 ] );
t( 'nc: fade shows one slide', NC::slides_per_view( 'fade', 4 ), 1 );
t( 'nc: slide effect keeps count', NC::slides_per_view( 'slide', 4 ), 4 );
t( 'nc: loop needs more slides than the view', [ NC::can_loop( 3, 3 ), NC::can_loop( 4, 3 ), NC::can_loop( 1, 1 ) ], [ false, true, false ] );
t( 'nc: pagination type maps to swiper', [ NC::swiper_pagination_type( 'bullets' ), NC::swiper_pagination_type( 'none' ) ], [ 'bullets', '' ] );

echo "\n$total tests, $failures failed\n";
exit( $failures ? 1 : 0 );
