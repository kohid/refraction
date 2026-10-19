<?php
// Standalone test for Refraction\Core\Utils\Icons (no WordPress needed): php scripts/test-icons.php
define( 'ABSPATH', __DIR__ . '/' );
define( 'REFRACTION_ASSETS_PATH', dirname( __DIR__ ) . '/assets/' );
define( 'REFRACTION_ASSETS_URL', 'http://example.test/assets/' );
function esc_attr( $v ) { return htmlspecialchars( (string) $v, ENT_QUOTES ); }
require dirname( __DIR__ ) . '/core/utils/icons.php';

use Refraction\Core\Utils\Icons;

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

t( 'clean accepts a material name', 'dark-mode' === Icons::clean( 'dark-mode' ) );
t( 'clean rejects traversal', '' === Icons::clean( '../../wp-config' ) );
t( 'clean rejects uppercase and spaces', '' === Icons::clean( 'Dark Mode' ) );
t( 'exists is true for a bundled icon', Icons::exists( 'palette' ) );
t( 'exists is false for an unknown icon', ! Icons::exists( 'no-such-icon' ) );
t( 'exists is false for a traversal name', ! Icons::exists( '../index' ) );

$svg = Icons::svg( 'palette' );
t( 'svg is inline markup', 0 === strpos( $svg, '<svg ' ) && '</svg>' === substr( $svg, -6 ) );
t( 'svg hides decoration from screen readers', false !== strpos( $svg, 'aria-hidden="true"' ) && false === strpos( $svg, 'role="img"' ) );
t( 'svg default size is 24', false !== strpos( $svg, 'width="24" height="24"' ) );
t( 'svg paints with currentColor', false !== strpos( $svg, 'fill="currentColor"' ) );

$labelled = Icons::svg( 'settings', [ 'label' => 'Open "settings"', 'size' => 20, 'class' => 'a b' ] );
t( 'a label makes the icon an image with an accessible name', false !== strpos( $labelled, 'role="img"' ) && false !== strpos( $labelled, 'aria-label="Open &quot;settings&quot;"' ) && false === strpos( $labelled, 'aria-hidden' ) );
t( 'label is escaped', false === strpos( $labelled, 'aria-label="Open "settings""' ) );
t( 'class and size apply', false !== strpos( $labelled, 'class="refraction-icon a b"' ) && false !== strpos( $labelled, 'width="20"' ) );
t( 'size is clamped', false !== strpos( Icons::svg( 'settings', [ 'size' => 5000 ] ), 'width="256"' ) && false !== strpos( Icons::svg( 'settings', [ 'size' => 1 ] ), 'width="8"' ) );
t( 'an unknown icon prints nothing', '' === Icons::svg( 'no-such-icon' ) );
t( 'a hostile name prints nothing', '' === Icons::svg( '../../index.json' ) );
t( 'url points at the bundled file', 'http://example.test/assets/icons/material/palette.svg' === Icons::url( 'palette' ) );

// A tampered file must never be printed.
$bad = REFRACTION_ASSETS_PATH . 'icons/material/zz-test-bad.svg';
file_put_contents( $bad, '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0"/></svg>' );
t( 'a file with a script is rejected', '' === Icons::svg( 'zz-test-bad' ) );
file_put_contents( $bad, '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><path d="M0 0"/></svg>' );
$cache = new ReflectionProperty( Icons::class, 'cache' ); $cache->setAccessible( true ); $cache->setValue( null, [] );
t( 'a file with an event handler is rejected', '' === Icons::svg( 'zz-test-bad' ) );
unlink( $bad );

// Every bundled icon is plain.
$all = glob( Icons::dir() . '*.svg' ); $plain = true;
foreach ( $all as $file ) { if ( '' === Icons::svg( basename( $file, '.svg' ) ) ) { $plain = false; echo "not plain: $file\n"; } }
t( 'every bundled icon passes the strict check', $plain && count( $all ) > 10 );

echo "$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
