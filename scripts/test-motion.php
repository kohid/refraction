<?php
// Standalone logic tests for Motion Effects / Sticky / Custom Fonts / Custom Icons (no WordPress): php scripts/test-motion.php
define( 'ABSPATH', __DIR__ . '/' );
$root = dirname( __DIR__ );
foreach ( glob( $root . '/modules/{motion-effects,custom-fonts,custom-icons}/classes/pure-*.php', GLOB_BRACE ) as $f ) {
	require $f;
}

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

use Refraction\Modules\MotionEffects\Classes\Pure_Motion_Settings as M;
use Refraction\Modules\MotionEffects\Classes\Pure_Sticky_Settings as S;

$devices = [ 'desktop', 'tablet', 'mobile' ];

// ---- motion
t( 'nothing enabled gives an empty config', [] === M::normalize( [], $devices ) );
t( 'uses_motion is false for defaults', ! M::uses_motion( [ 'rf_scroll_ty_speed' => '5' ] ) );
t( 'uses_motion is true when an effect is on', M::uses_motion( [ 'rf_mouse_tilt' => 'yes' ] ) );

$n = M::normalize( [ 'rf_scroll_ty' => 'yes' ], $devices );
t( 'defaults: direction up, speed 4, range 0-100', 'up' === $n['scroll']['effects']['ty']['dir'] && 4.0 === $n['scroll']['effects']['ty']['speed'] && 0 === $n['scroll']['effects']['ty']['start'] && 100 === $n['scroll']['effects']['ty']['end'] );
t( 'defaults: all devices, viewport relative', $devices === $n['scroll']['devices'] && 'viewport' === $n['scroll']['relative'] );

$n = M::normalize( [ 'rf_scroll_ty' => 'yes', 'rf_scroll_ty_speed' => '999', 'rf_scroll_ty_start' => '-50', 'rf_scroll_ty_end' => '400' ], $devices );
t( 'speed is clamped to 10', 10.0 === $n['scroll']['effects']['ty']['speed'] );
t( 'range is clamped to 0..100', 0 === $n['scroll']['effects']['ty']['start'] && 100 === $n['scroll']['effects']['ty']['end'] );

$n = M::normalize( [ 'rf_scroll_ty' => 'yes', 'rf_scroll_ty_start' => '80', 'rf_scroll_ty_end' => '20' ], $devices );
t( 'an inverted range is swapped', 20 === $n['scroll']['effects']['ty']['start'] && 80 === $n['scroll']['effects']['ty']['end'] );

$n = M::normalize( [ 'rf_scroll_ty' => 'yes', 'rf_scroll_ty_dir' => '"><script>', 'rf_scroll_ty_speed' => 'abc' ], $devices );
t( 'an unknown direction falls back to the default', 'up' === $n['scroll']['effects']['ty']['dir'] );
t( 'a non-numeric speed falls back to the default', 4.0 === $n['scroll']['effects']['ty']['speed'] );

$n = M::normalize( [ 'rf_scroll_ty' => 'yes', 'rf_scroll_fade' => 'yes', 'rf_scroll_fade_dir' => 'out-in', 'rf_scroll_blur' => 'yes', 'rf_scroll_blur_level' => '99', 'rf_scroll_rotate' => 'yes', 'rf_scroll_scale' => 'yes', 'rf_scroll_scale_dir' => 'down', 'rf_scroll_tx' => 'yes', 'rf_scroll_tx_dir' => 'right' ], $devices );
t( 'fade direction kept', 'out-in' === $n['scroll']['effects']['fade']['dir'] );
t( 'blur level clamped to 20', 20.0 === $n['scroll']['effects']['blur']['level'] );
$keys = array_keys( $n['scroll']['effects'] ); sort( $keys );
t( 'all six effects present', [ 'blur', 'fade', 'rotate', 'scale', 'tx', 'ty' ] === $keys );
t( 'tx right and scale down kept', 'right' === $n['scroll']['effects']['tx']['dir'] && 'down' === $n['scroll']['effects']['scale']['dir'] );

$n = M::normalize( [ 'rf_scroll_ty' => 'yes', 'rf_scroll_devices' => [ 'tablet', 'tv', '<b>' ], 'rf_scroll_relative' => 'page' ], $devices );
t( 'unknown devices are dropped', [ 'tablet' ] === $n['scroll']['devices'] );
t( 'relative page accepted', 'page' === $n['scroll']['relative'] );
$n = M::normalize( [ 'rf_scroll_ty' => 'yes', 'rf_scroll_devices' => 'desktop', 'rf_scroll_relative' => 'weird' ], $devices );
t( 'a non-array devices value falls back to all', $devices === $n['scroll']['devices'] && 'viewport' === $n['scroll']['relative'] );
$n = M::normalize( [ 'rf_scroll_ty' => 'yes', 'rf_scroll_devices' => [] ], $devices );
t( 'an empty device list means nowhere', [] === $n['scroll']['devices'] );

$n = M::normalize( [ 'rf_mouse_track' => 'yes', 'rf_mouse_track_speed' => '50', 'rf_mouse_tilt' => 'yes', 'rf_mouse_tilt_intensity' => '-3', 'rf_mouse_tilt_keep' => 'yes' ], $devices );
t( 'mouse track opposite by default, speed clamped', 'opposite' === $n['mouse']['track']['dir'] && 10.0 === $n['mouse']['track']['speed'] );
t( 'tilt intensity clamped and keep flag', 0.0 === $n['mouse']['tilt']['intensity'] && true === $n['mouse']['tilt']['keep'] );
t( 'mouse devices default to desktop only', [ 'desktop' ] === $n['mouse']['devices'] );
t( 'no scroll key when only mouse is on', ! isset( $n['scroll'] ) );
t( 'the config is JSON safe', false !== json_encode( $n ) );

// ---- sticky
t( 'no sticky by default', [] === S::normalize( [], $devices ) );
t( 'an unknown side is ignored', [] === S::normalize( [ 'rf_sticky' => 'left' ], $devices ) );
$s = S::normalize( [ 'rf_sticky' => 'top', 'rf_sticky_offset' => '12', 'rf_sticky_effects_offset' => '200', 'rf_sticky_parent' => 'yes' ], $devices );
t( 'sticky values kept', 'top' === $s['side'] && 12 === $s['offset'] && 200 === $s['effectsOffset'] && true === $s['inParent'] && $devices === $s['devices'] );
$s = S::normalize( [ 'rf_sticky' => 'bottom', 'rf_sticky_offset' => '-5', 'rf_sticky_effects_offset' => '99999', 'rf_sticky_on' => [ 'mobile', 'x' ] ], $devices );
t( 'sticky offsets clamped', 0 === $s['offset'] && 5000 === $s['effectsOffset'] );
t( 'sticky devices filtered', [ 'mobile' ] === $s['devices'] && false === $s['inParent'] );
t( 'uses_sticky', S::uses_sticky( [ 'rf_sticky' => 'top' ] ) && ! S::uses_sticky( [ 'rf_sticky' => '' ] ) );

// ---- custom fonts
use Refraction\Modules\CustomFonts\Classes\Pure_Font_Validator as FV;
use Refraction\Modules\CustomFonts\Classes\Pure_Font_Face_Css as FC;

$woff2 = 'wOF2' . str_repeat( "\0", 64 );
$woff  = 'wOFF' . str_repeat( "\0", 64 );
$ttf   = "\x00\x01\x00\x00" . str_repeat( "\0", 64 );
$otf   = 'OTTO' . str_repeat( "\0", 64 );

$r = FV::validate( 'My-Font.woff2', $woff2, 'font/woff2' );
t( 'a real woff2 passes', $r['ok'] && 'woff2' === $r['ext'] );
t( 'woff, ttf and otf pass', FV::validate( 'a.woff', $woff, '' )['ok'] && FV::validate( 'a.ttf', $ttf, 'application/octet-stream' )['ok'] && FV::validate( 'a.otf', $otf, 'font/otf' )['ok'] );
t( 'the extension is case-insensitive', FV::validate( 'A.WOFF2', $woff2, '' )['ok'] );
t( 'a php file named .woff2 is rejected', ! FV::validate( 'x.woff2', "<?php system(\$_GET['c']); ?>", '' )['ok'] );
t( 'a php extension is rejected', ! FV::validate( 'x.php', $woff2, '' )['ok'] );
t( 'a double extension with php is rejected', ! FV::validate( 'x.php.woff2', $woff2, '' )['ok'] );
t( 'an svg disguised as a font is rejected', ! FV::validate( 'x.woff2', '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>', 'image/svg+xml' )['ok'] );
t( 'a font whose magic does not match its extension is rejected', ! FV::validate( 'x.woff2', $ttf, '' )['ok'] );
t( 'a font with an embedded php tag is rejected', ! FV::validate( 'x.ttf', $ttf . '<?php echo 1;', '' )['ok'] );
t( 'a font with an embedded script tag is rejected', ! FV::validate( 'x.otf', $otf . '<script>alert(1)</script>', '' )['ok'] );
t( 'a disallowed mime type is rejected', ! FV::validate( 'x.woff2', $woff2, 'text/html' )['ok'] );
t( 'an oversized file is rejected', ! FV::validate( 'x.woff2', 'wOF2' . str_repeat( 'a', FV::MAX_BYTES ), '' )['ok'] );
t( 'an empty file is rejected', ! FV::validate( 'x.woff2', '', '' )['ok'] );
t( 'rejections carry a message', '' !== FV::validate( 'x.php', $woff2, '' )['error'] );

t( 'family names are limited to safe characters', 'My Font 2' === FC::clean_family( "My <b>Font</b> \"2\"';" ) || 'My bFontb 2' === FC::clean_family( "My <b>Font</b> \"2\"';" ) );
t( 'family cleaning drops quotes, braces and slashes', ! preg_match( '/["\'{};<>\\\\\/]/', FC::clean_family( 'a"b\'c{d}e;f<g>h\\i/j' ) ) );
t( 'weight whitelist', '700' === FC::clean_weight( '700' ) && '400' === FC::clean_weight( 'evil' ) && '400' === FC::clean_weight( '450' ) );
t( 'style whitelist', 'italic' === FC::clean_style( 'italic' ) && 'normal' === FC::clean_style( 'x;y' ) );
t( 'display whitelist', 'swap' === FC::clean_display( 'swap' ) && 'swap' === FC::clean_display( 'bogus' ) && 'optional' === FC::clean_display( 'optional' ) );

$fam = [ [
	'family' => 'Acme Sans', 'display' => 'swap', 'preload' => true,
	'variations' => [
		[ 'weight' => '400', 'style' => 'normal', 'files' => [ 'woff2' => 'acme/a.woff2', 'woff' => 'acme/a.woff' ] ],
		[ 'weight' => '700', 'style' => 'italic', 'files' => [ 'ttf' => 'acme/b.ttf' ] ],
	],
] ];
$css = FC::generate( $fam, 'https://example.test/uploads/refraction-fonts/' );
t( 'one @font-face per variation', 2 === substr_count( $css, '@font-face' ) );
t( 'family is quoted', false !== strpos( $css, 'font-family:"Acme Sans"' ) );
t( 'woff2 is listed before woff', strpos( $css, 'format("woff2")' ) < strpos( $css, 'format("woff")' ) );
t( 'ttf maps to truetype', false !== strpos( $css, 'format("truetype")' ) );
t( 'weight, style and display printed', false !== strpos( $css, 'font-weight:700' ) && false !== strpos( $css, 'font-style:italic' ) && false !== strpos( $css, 'font-display:swap' ) );
t( 'urls are absolute from the base', false !== strpos( $css, 'url("https://example.test/uploads/refraction-fonts/acme/a.woff2")' ) );

$evil = [ [ 'family' => 'x"} body{display:none} /*', 'display' => 'swap', 'variations' => [ [ 'weight' => '400', 'style' => 'normal', 'files' => [ 'woff2' => 'ok/a.woff2', 'woff' => 'a/b").evil{x:url("c.woff2', 'exe' => 'a.exe' ] ] ] ] ];
$ecss = FC::generate( $evil, 'https://example.test/f/' );
t( 'hostile family cannot break out of the rule', 1 === substr_count( $ecss, '{' ) && 1 === substr_count( $ecss, '}' ) && false === strpos( $ecss, 'display:none' ) );
t( 'hostile file path cannot break out of url()', false === strpos( $ecss, '").evil' ) && 1 === substr_count( $ecss, 'url(' ) );
t( 'unknown file types are ignored', false === strpos( $ecss, '.exe' ) );
t( 'a family with no usable file prints nothing', '' === FC::generate( [ [ 'family' => 'Empty', 'variations' => [ [ 'weight' => '400', 'style' => 'normal', 'files' => [] ] ] ] ], 'https://e.test/' ) );
$pre = FC::preload_urls( $fam, 'https://example.test/uploads/refraction-fonts/' );
t( 'preload lists woff2 only, for flagged families', [ 'https://example.test/uploads/refraction-fonts/acme/a.woff2' ] === $pre );
$fam[0]['preload'] = false;
t( 'no preload when not flagged', [] === FC::preload_urls( $fam, 'https://example.test/' ) );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
