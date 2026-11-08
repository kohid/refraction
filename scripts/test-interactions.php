<?php
// Pure tests for modules/interactions/classes/pure-interaction-settings.php. Run: php scripts/test-interactions.php
define( 'ABSPATH', __DIR__ . '/' );
require __DIR__ . '/../modules/interactions/classes/pure-interaction-settings.php';

use Refraction\Modules\Interactions\Classes\Pure_Interaction_Settings as S;

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

check( 'cursor off by default', S::cursor( [] ), [] );
check( 'unknown cursor style is off', S::cursor( [ 'rf_cursor' => 'sparkles' ] ), [] );
check( 'cursor defaults', S::cursor( [ 'rf_cursor' => 'dot-ring' ] ), [ 'style' => 'dot-ring', 'color' => '#111111', 'size' => 36, 'hide' => false, 'links' => true, 'ease' => 0.2 ] );
check( 'blend cursor is white by default', S::cursor( [ 'rf_cursor' => 'blend' ] )['color'], '#ffffff' );
check( 'cursor size clamped', S::cursor( [ 'rf_cursor' => 'ring', 'rf_cursor_size' => [ 'size' => 500 ] ] )['size'], 80 );
check( 'cursor ease clamped', S::cursor( [ 'rf_cursor' => 'ring', 'rf_cursor_ease' => [ 'size' => 0 ] ] )['ease'], 0.05 );
check( 'bad color falls back', S::cursor( [ 'rf_cursor' => 'dot', 'rf_cursor_color' => 'red;}body{display:none' ] )['color'], '#111111' );
check( 'hex color kept', S::cursor( [ 'rf_cursor' => 'dot', 'rf_cursor_color' => '#FF5500' ] )['color'], '#FF5500' );
check( 'rgba color kept', S::cursor( [ 'rf_cursor' => 'dot', 'rf_cursor_color' => 'rgba(0, 0, 0, 0.5)' ] )['color'], 'rgba(0, 0, 0, 0.5)' );
check( 'links can be switched off', S::cursor( [ 'rf_cursor' => 'dot', 'rf_cursor_links' => 'no' ] )['links'], false );
check( 'hide system cursor', S::cursor( [ 'rf_cursor' => 'dot', 'rf_cursor_hide_system' => 'yes' ] )['hide'], true );

check( 'transition off', S::transition( [] ), [] );
check( 'transition unknown', S::transition( [ 'rf_transition' => 'explode' ] ), [] );
check( 'transition default duration', S::transition( [ 'rf_transition' => 'fade' ] ), [ 'type' => 'fade', 'duration' => 450 ] );
check( 'transition duration clamped', S::transition( [ 'rf_transition' => 'wipe', 'rf_transition_duration' => [ 'size' => 9000 ] ] )['duration'], 1500 );
check( 'no css when off', S::transition_css( [] ), '' );
$css = S::transition_css( [ 'type' => 'slide', 'duration' => 600 ] );
check( 'css opts in to cross-document transitions', false !== strpos( $css, '@view-transition{navigation:auto}' ), true );
check( 'css uses the duration', false !== strpos( $css, 'animation-duration:600ms' ), true );
check( 'css has the slide keyframes', false !== strpos( $css, 'rf-vt-in' ), true );
check( 'css off for reduced motion', false !== strpos( $css, '@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}' ), true );
check( 'wipe css', false !== strpos( S::transition_css( [ 'type' => 'wipe', 'duration' => 400 ] ), 'clip-path:inset(100% 0 0 0)' ), true );
check( 'fade css has no custom keyframes', false === strpos( S::transition_css( [ 'type' => 'fade', 'duration' => 400 ] ), '@keyframes' ), true );

check( 'magnetic off', S::magnetic( [] ), [] );
check( 'magnetic defaults', S::magnetic( [ 'rf_magnetic' => 'yes' ] ), [ 's' => 0.35, 'r' => 40 ] );
check( 'magnetic clamped', S::magnetic( [ 'rf_magnetic' => 'yes', 'rf_magnetic_strength' => [ 'size' => 4 ], 'rf_magnetic_area' => [ 'size' => -10 ] ] ), [ 's' => 1.0, 'r' => 0 ] );
check( 'magnetic non-numeric', S::magnetic( [ 'rf_magnetic' => 'yes', 'rf_magnetic_strength' => [ 'size' => 'x' ] ] )['s'], 0.35 );

check( 'label empty', S::label( [] ), '' );
check( 'label trimmed', S::label( [ 'rf_cursor_label' => '  View  ' ] ), 'View' );
check( 'label cut to 24', strlen( S::label( [ 'rf_cursor_label' => str_repeat( 'a', 40 ) ] ) ), 24 );
check( 'label not a string', S::label( [ 'rf_cursor_label' => [ 'x' ] ] ), '' );

check( 'pages off', S::pages( [] ), [] );
check( 'pages unknown mode', S::pages( [ 'rf_hp' => 'flip' ] ), [] );
check( 'pages slide defaults', S::pages( [ 'rf_hp' => 'slide' ] ), [ 'mode' => 'slide', 'speed' => 900, 'depth' => 30, 'arrows' => true, 'counter' => 'number', 'prefix' => '', 'progress' => true, 'loop' => false, 'phone' => 'rotate', 'header' => false ] );
check( 'book is slower by default', S::pages( [ 'rf_hp' => 'book' ] )['speed'], 1100 );
check( 'pages speed clamped', S::pages( [ 'rf_hp' => 'slide', 'rf_hp_speed' => [ 'size' => 99999 ] ] )['speed'], 2500 );
check( 'pages depth clamped', S::pages( [ 'rf_hp' => 'slide', 'rf_hp_depth' => [ 'size' => -5 ] ] )['depth'], 0 );
check( 'pages counter none', S::pages( [ 'rf_hp' => 'slide', 'rf_hp_counter' => '' ] )['counter'], '' );
check( 'pages counter unknown', S::pages( [ 'rf_hp' => 'slide', 'rf_hp_counter' => 'roman' ] )['counter'], 'number' );
check( 'pages prefix cut', S::pages( [ 'rf_hp' => 'slide', 'rf_hp_counter_prefix' => ' *Page* ' ] )['prefix'], '*Pag' );
check( 'pages arrows off', S::pages( [ 'rf_hp' => 'slide', 'rf_hp_arrows' => 'no' ] )['arrows'], false );
check( 'pages loop', S::pages( [ 'rf_hp' => 'book', 'rf_hp_loop' => 'yes' ] )['loop'], true );
check( 'pages phone ask', S::pages( [ 'rf_hp' => 'book', 'rf_hp_phone' => 'ask' ] )['phone'], 'ask' );
check( 'pages phone unknown', S::pages( [ 'rf_hp' => 'book', 'rf_hp_phone' => 'tilt' ] )['phone'], 'rotate' );
check( 'pages keep the header', S::pages( [ 'rf_hp' => 'slide', 'rf_hp_header' => 'yes' ] )['header'], true );
check( 'depth automatic', S::page_depth( [] ), null );
check( 'depth set', S::page_depth( [ 'rf_hp_depth_own' => [ 'size' => 0.75 ] ] ), 0.75 );
check( 'depth clamped', S::page_depth( [ 'rf_hp_depth_own' => [ 'size' => 9 ] ] ), 2.0 );
check( 'depth zero kept', S::page_depth( [ 'rf_hp_depth_own' => [ 'size' => 0 ] ] ), 0.0 );

echo "$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
