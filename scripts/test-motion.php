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
t( 'an empty device list means the default (every device)', $devices === $n['scroll']['devices'] );

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

// ---- custom icons
use Refraction\Modules\CustomIcons\Classes\Pure_Svg_Sanitizer as SV;
use Refraction\Modules\CustomIcons\Classes\Pure_Zip_Validator as ZV;
use Refraction\Modules\CustomIcons\Classes\Pure_Icon_Set as IS;

$ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M12 2L2 22h20z" fill="currentColor"/></svg>';
$clean = SV::sanitize( $ok );
t( 'a clean svg survives', false !== strpos( $clean, '<path' ) && false !== strpos( $clean, 'viewBox="0 0 24 24"' ) && 0 === strpos( $clean, '<svg' ) );
t( 'script element removed', false === stripos( SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0h1"/></svg>' ), 'script' ) );
$h = SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><path d="M0 0h1" onclick="x()" onmouseover = "y()"/></svg>' );
t( 'on* attributes removed', '' !== $h && false === stripos( $h, 'onload' ) && false === stripos( $h, 'onclick' ) && false === stripos( $h, 'onmouseover' ) );
t( 'foreignObject removed with its content', false === stripos( SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>hi</div></foreignObject><path d="M0 0h1"/></svg>' ), 'foreignobject' ) );
$a = SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><path d="M0 0h1"/></a><use xlink:href="http://evil.test/x.svg#a"/><image href="http://evil.test/p.png"/><use href="#ok"/><path id="ok" d="M0 0h1"/></svg>' );
t( 'javascript links and external references removed', false === stripos( $a, 'javascript' ) && false === stripos( $a, 'evil.test' ) && false === stripos( $a, '<image' ) );
t( 'the drawing inside a removed link is kept', false !== strpos( $a, '<path d="M0 0h1"/>' ) );
t( 'a use element with an external target is removed entirely', false === strpos( $a, '<use xlink' ) && 1 === substr_count( $a, '<use' ) );
t( 'local use reference kept', false !== strpos( $a, 'href="#ok"' ) );
t( 'style elements removed', false === stripos( SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(http://evil.test/a.css);</style><path d="M0 0h1"/></svg>' ), 'style' ) );
t( 'external url() in style attribute removed', false === stripos( SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1" style="fill:url(http://evil.test/x)"/></svg>' ), 'evil.test' ) );
t( 'fill url(#id) kept', false !== strpos( SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g"><stop offset="0" stop-color="#fff"/></linearGradient></defs><path d="M0 0h1" fill="url(#g)"/></svg>' ), 'fill="url(#g)"' ) );
t( 'doctype/entity svg rejected', '' === SV::sanitize( '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY a "aaaa">]><svg xmlns="http://www.w3.org/2000/svg"><text>&a;</text></svg>' ) );
t( 'not an svg rejected', '' === SV::sanitize( '<html><body>x</body></html>' ) && '' === SV::sanitize( 'garbage' ) && '' === SV::sanitize( '' ) );
t( 'oversized svg rejected', '' === SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg"><path d="' . str_repeat( 'M0 0h1', 60000 ) . '"/></svg>' ) );
t( 'php inside svg is inert text only', false === strpos( SV::sanitize( '<svg xmlns="http://www.w3.org/2000/svg"><?php echo 1; ?><path d="M0 0h1"/></svg>' ), '<?php' ) );

$entries = [ [ 'name' => 'icons/home.svg', 'size' => 500, 'comp' => 300 ], [ 'name' => 'icons/star.SVG', 'size' => 400, 'comp' => 250 ], [ 'name' => 'icons/', 'size' => 0, 'comp' => 0 ], [ 'name' => '__MACOSX/._home.svg', 'size' => 100, 'comp' => 80 ], [ 'name' => 'readme.txt', 'size' => 10, 'comp' => 10 ], [ 'name' => 'selection.json', 'size' => 900, 'comp' => 400 ] ];
$z = ZV::check( $entries );
t( 'a normal zip is accepted', $z['ok'] && 3 === count( $z['accepted'] ) );
t( 'macos junk, directories and other types are skipped', ! isset( $z['accepted'][2] ) && ! isset( $z['accepted'][3] ) && ! isset( $z['accepted'][4] ) );
t( 'accepted entries carry a lowercase ext', 'svg' === $z['accepted'][1]['ext'] && 'json' === $z['accepted'][5]['ext'] );
t( 'zip-slip dot-dot rejected', ! ZV::check( [ [ 'name' => '../evil.svg', 'size' => 10, 'comp' => 10 ] ] )['ok'] );
t( 'zip-slip nested rejected', ! ZV::check( [ [ 'name' => 'a/../../evil.svg', 'size' => 10, 'comp' => 10 ] ] )['ok'] );
t( 'absolute path rejected', ! ZV::check( [ [ 'name' => '/etc/x.svg', 'size' => 10, 'comp' => 10 ] ] )['ok'] );
t( 'backslash traversal rejected', ! ZV::check( [ [ 'name' => 'a\\..\\b.svg', 'size' => 10, 'comp' => 10 ] ] )['ok'] );
t( 'windows drive path rejected', ! ZV::check( [ [ 'name' => 'C:\\x.svg', 'size' => 10, 'comp' => 10 ] ] )['ok'] );
t( 'null byte rejected', ! ZV::check( [ [ 'name' => "a.svg\0.php", 'size' => 10, 'comp' => 10 ] ] )['ok'] );
$many = []; for ( $i = 0; $i < ZV::MAX_FILES + 1; $i++ ) { $many[] = [ 'name' => "i$i.svg", 'size' => 10, 'comp' => 10 ]; }
t( 'too many files rejected', ! ZV::check( $many )['ok'] );
t( 'a huge svg is rejected', ! ZV::check( [ [ 'name' => 'a.svg', 'size' => ZV::MAX_SVG_BYTES + 1, 'comp' => 1000 ] ] )['ok'] );
t( 'total size limit', ! ZV::check( [ [ 'name' => 'a.ttf', 'size' => ZV::MAX_FONT_BYTES, 'comp' => ZV::MAX_FONT_BYTES ], [ 'name' => 'b.woff', 'size' => ZV::MAX_FONT_BYTES, 'comp' => ZV::MAX_FONT_BYTES ], [ 'name' => 'c.woff2', 'size' => ZV::MAX_FONT_BYTES, 'comp' => ZV::MAX_FONT_BYTES ], [ 'name' => 'd.otf', 'size' => ZV::MAX_FONT_BYTES, 'comp' => ZV::MAX_FONT_BYTES ] ] )['ok'] );
t( 'zip bomb ratio rejected', ! ZV::check( [ [ 'name' => 'a.svg', 'size' => 90000, 'comp' => 10 ] ] )['ok'] );
t( 'a zip with nothing usable is rejected', ! ZV::check( [ [ 'name' => 'readme.txt', 'size' => 10, 'comp' => 10 ] ] )['ok'] );

t( 'icon names are slugged', 'home-alt' === IS::icon_name( 'Home Alt.svg' ) && 'arrow-left' === IS::icon_name( 'dir/arrow_left.svg' ) );
t( 'hostile icon names are neutralised', 'scriptalert1script' === str_replace( '-', '', IS::icon_name( '"><script>alert(1)</script>.svg' ) ) || preg_match( '/^[a-z0-9-]+$/', IS::icon_name( '"><script>alert(1)</script>.svg' ) ) );
t( 'duplicate names are made unique', [ 'home', 'home-2' ] === array_values( IS::unique_names( [ 'a/home.svg', 'b/home.svg' ] ) ) );
t( 'set slug', 'my-set' === IS::set_slug( 'My Set' ) && '' === IS::set_slug( '!!!' ) );

$icomoon = json_encode( [ 'icons' => [ [ 'properties' => [ 'name' => 'home, house', 'code' => 59648 ] ], [ 'properties' => [ 'name' => 'user', 'code' => 59649 ] ] ], 'preferences' => [ 'fontPref' => [ 'metadata' => [ 'fontFamily' => 'icomoon' ] ] ] ] );
$p = IS::parse_icomoon( $icomoon );
t( 'icomoon names and codepoints', $p && 59648 === $p['icons']['home'] && 59649 === $p['icons']['user'] && 'icomoon' === $p['family'] );
$fontello = json_encode( [ 'name' => 'fontello', 'css_prefix_text' => 'icon-', 'glyphs' => [ [ 'css' => 'star', 'code' => 59392 ], [ 'css' => 'heart', 'code' => 59393 ] ] ] );
$p2 = IS::parse_fontello( $fontello );
t( 'fontello names and codepoints', $p2 && 59392 === $p2['icons']['star'] && 'fontello' === $p2['family'] );
t( 'bad json gives null', null === IS::parse_icomoon( '{nope' ) && null === IS::parse_fontello( '[]' ) );
t( 'codepoints outside the unicode range are dropped', [] === ( IS::parse_fontello( json_encode( [ 'glyphs' => [ [ 'css' => 'x', 'code' => 99999999 ] ] ] ) )['icons'] ?? [] ) );

$fcss = IS::font_css( 'my-set', 'icomoon', [ 'woff2' => 'f.woff2', 'ttf' => 'f.ttf' ], [ 'home' => 59648 ], 'https://e.test/ci/my-set' );
t( 'font css has face, base class and glyph', false !== strpos( $fcss, '@font-face' ) && false !== strpos( $fcss, '.rf-cf-my-set{' ) && false !== strpos( $fcss, '.rf-cf-my-set-home:before{content:"\e900"}' ) );
t( 'font css lists formats', false !== strpos( $fcss, 'url("https://e.test/ci/my-set/f.woff2") format("woff2")' ) && false !== strpos( $fcss, 'format("truetype")' ) );
t( 'font css cannot be broken out of', 1 === substr_count( IS::font_css( 'x', 'a"};b', [ 'ttf' => 'f.ttf' ], [ 'a"}b' => 59648 ], 'https://e.test' ), '@font-face' ) && false === strpos( IS::font_css( 'x', 'a"};b', [ 'ttf' => 'f.ttf' ], [], 'https://e.test' ), 'a"};b' ) );
$scss = IS::svg_css( 'my-set', [ 'home' => 'home.svg' ], 'https://e.test/ci/my-set' );
t( 'svg css masks the icon with currentColor', false !== strpos( $scss, '.rf-ci-my-set-home{' ) && false !== strpos( $scss, 'mask-image:url("https://e.test/ci/my-set/home.svg")' ) && false !== strpos( $scss, 'background-color:currentColor' ) );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
