<?php
// Pure tests for modules/dashboard-widgets/classes/pure-dashboard.php. Run: php scripts/test-dashboard.php
define( 'ABSPATH', __DIR__ . '/' );
require __DIR__ . '/../modules/dashboard-widgets/classes/pure-dashboard.php';

use Refraction\Modules\DashboardWidgets\Classes\Pure_Dashboard as D;

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

check( 'number: plain', D::number( '42' ), 42.0 );
check( 'number: thousands and currency', D::number( '$1,250.50' ), 1250.5 );
check( 'number: percent', D::number( '12%' ), 12.0 );
check( 'number: negative', D::number( '-3.5' ), -3.5 );
check( 'number: parentheses are negative', D::number( '(120)' ), -120.0 );
check( 'number: comma decimals', D::number( '1.234,5' ), 1234.5 );
check( 'number: spaces', D::number( ' 4 000 ' ), 4000.0 );
check( 'number: markup from a dynamic tag', D::number( '<span>7</span>' ), 7.0 );
check( 'number: none', D::number( 'n/a' ), null );
check( 'number: empty', D::number( '' ), null );
check( 'number: an int', D::number( 5 ), 5.0 );

check( 'items: commas', D::items( 'Jan, Feb ,Mar' ), [ 'Jan', 'Feb', 'Mar' ] );
check( 'items: lines', D::items( "Jan\nFeb, March" ), [ 'Jan', 'Feb, March' ] );
check( 'items: bars', D::items( 'A | B' ), [ 'A', 'B' ] );
check( 'numbers: a blank is null', D::numbers( '1, , 3' ), [ 1.0, null, 3.0 ] );

check( 'table: CSV with quotes', D::table( "Month,Sales\n\"Jan, 2026\",10" ), [ [ 'Month', 'Sales' ], [ 'Jan, 2026', '10' ] ] );
check( 'table: semicolons found', D::table( "a;b\n1;2" ), [ [ 'a', 'b' ], [ '1', '2' ] ] );
check( 'table: tabs found', D::table( "a\tb\n1\t2" ), [ [ 'a', 'b' ], [ '1', '2' ] ] );
check( 'chart from table', D::chart_from_table( D::table( "Month,Sales,Costs\nJan,10,4\nFeb,12,5" ) ), [ 'labels' => [ 'Jan', 'Feb' ], 'series' => [ [ 'name' => 'Sales', 'values' => [ 10.0, 12.0 ] ], [ 'name' => 'Costs', 'values' => [ 4.0, 5.0 ] ] ] ] );

check( 'scale: 0..87 in 5 steps', D::scale( 3, 87 ), [ 'min' => 0.0, 'max' => 100.0, 'step' => 20.0 ] );
check( 'scale: 0..1250', D::scale( 0, 1250 ), [ 'min' => 0.0, 'max' => 1250.0, 'step' => 250.0 ] );
check( 'scale: negatives', D::scale( -30, 70 ), [ 'min' => -40.0, 'max' => 80.0, 'step' => 20.0 ] );
check( 'scale: all zero', D::scale( 0, 0 ), [ 'min' => 0.0, 'max' => 1.0, 'step' => 0.2 ] );
check( 'scale: small values', D::scale( 0, 0.7 ), [ 'min' => 0.0, 'max' => 0.8, 'step' => 0.2 ] );

check( 'scale: counts step by whole numbers', D::scale( 0, 2, 5, true, true ), [ 'min' => 0.0, 'max' => 2.0, 'step' => 1.0 ] );
check( 'step decimals', [ D::step_decimals( 20 ), D::step_decimals( 0.5 ), D::step_decimals( 0.25 ) ], [ 0, 1, 2 ] );
check( 'format: thousands', D::format( 1250.0 ), '1,250' );
check( 'format: decimals, prefix, suffix', D::format( 1250.5, 2, '$', ' USD' ), '$1,250.50 USD' );
check( 'format: compact K', D::format( 1250.0, 0, '', '', true ), '1.3K' );
check( 'format: compact M', D::format( 2400000.0, 0, '$', '', true ), '$2.4M' );
check( 'format: compact K under 100 keeps a decimal', D::format( 45200.0, 0, '', '', true ), '45.2K' );
check( 'format: compact K from 100 is whole', D::format( 128400.0, 0, '', '', true ), '128K' );
check( 'format: negative', D::format( -5.0, 0, '$' ), '-$5' );
check( 'format: none', D::format( null ), '–' );

check( 'direction', [ D::direction( 2.5 ), D::direction( -1.0 ), D::direction( 0.0 ), D::direction( null ) ], [ 'up', 'down', 'flat', 'flat' ] );

check( 'line: straight', D::line_path( [ [ 0, 100 ], [ 50, 50 ], [ 100, 0 ] ] ), 'M0 100L50 50L100 0' );
check( 'line: a gap breaks it', D::line_path( [ [ 0, 10 ], null, [ 100, 20 ], [ 200, 30 ] ] ), 'M0 10M100 20L200 30' );
$curve = D::line_path( [ [ 0, 100 ], [ 50, 0 ], [ 100, 100 ] ], true );
check( 'line: smooth uses curves', 2 === substr_count( $curve, 'C' ) && str_starts_with( $curve, 'M0 100' ), true );
preg_match_all( '/C([\d. -]+)/', $curve, $m );
$ys = [];
foreach ( $m[1] as $c ) {
	$v = array_map( 'floatval', preg_split( '/\s+/', trim( $c ) ) );
	$ys[] = $v[1];
	$ys[] = $v[3];
}
check( 'line: smooth never goes past the points (0..100)', min( $ys ) >= 0 && max( $ys ) <= 100, true );

check( 'shares', D::shares( [ 1, 1, 2 ] ), [ [ 'share' => 25.0, 'start' => 0.0 ], [ 'share' => 25.0, 'start' => 25.0 ], [ 'share' => 50.0, 'start' => 50.0 ] ] );
check( 'shares: negatives and blanks count 0', D::shares( [ 3, -1, null, 1 ] )[0]['share'], 75.0 );
check( 'shares: all zero', D::shares( [ 0, 0 ] )[1], [ 'share' => 0.0, 'start' => 0.0 ] );

check( 'color: own', D::color( '#ff0000', 0 ), '#ff0000' );
check( 'color: palette by index', D::color( '', 1 ), '#1BC5BD' );
check( 'color: bad value', D::color( 'red;}', 2 ), '#8950FC' );
check( 'color: global variable', D::color( 'var(--e-global-color-primary)', 0 ), 'var(--e-global-color-primary)' );

echo "$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
