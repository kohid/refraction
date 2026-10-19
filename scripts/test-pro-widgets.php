<?php
/**
 * Standalone tests for the pure logic of the Pro widgets module (no WordPress needed).
 *
 * Run: php scripts/test-pro-widgets.php
 */

define( 'ABSPATH', __DIR__ . '/' );

$root = dirname( __DIR__ ) . '/modules/pro-widgets/classes/';
foreach ( [ 'share-links', 'countdown-logic', 'headline-logic' ] as $file ) {
	if ( ! file_exists( $root . $file . '.php' ) ) {
		echo "MISSING class file: $file.php\n";
		exit( 1 );
	}
	require_once $root . $file . '.php';
}

use Refraction\Modules\ProWidgets\Classes\Share_Links;
use Refraction\Modules\ProWidgets\Classes\Countdown_Logic;
use Refraction\Modules\ProWidgets\Classes\Headline_Logic;

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

// ---------------------------------------------------------------- Share_Links
$u = 'https://example.com/post?a=1&b=2';
t( 'share: networks list has the nine requested', array_keys( Share_Links::networks() ), [ 'facebook', 'x', 'linkedin', 'pinterest', 'whatsapp', 'telegram', 'email', 'copy', 'print' ] );
t( 'share: facebook', Share_Links::build( 'facebook', $u ), 'https://www.facebook.com/sharer/sharer.php?u=' . rawurlencode( $u ) );
t( 'share: x with title', Share_Links::build( 'x', $u, 'Hello world' ), 'https://x.com/intent/post?text=Hello%20world&url=' . rawurlencode( $u ) );
t( 'share: twitter is an alias of x', Share_Links::build( 'twitter', $u, 'Hi' ), Share_Links::build( 'x', $u, 'Hi' ) );
t( 'share: linkedin', Share_Links::build( 'linkedin', $u ), 'https://www.linkedin.com/sharing/share-offsite/?url=' . rawurlencode( $u ) );
t( 'share: pinterest with media and text', Share_Links::build( 'pinterest', $u, 'T', 'Desc', [ 'media' => 'https://example.com/i.jpg' ] ), 'https://pinterest.com/pin/create/button/?url=' . rawurlencode( $u ) . '&media=' . rawurlencode( 'https://example.com/i.jpg' ) . '&description=Desc' );
t( 'share: whatsapp puts title and url in one text', Share_Links::build( 'whatsapp', $u, 'Hi there' ), 'https://wa.me/?text=' . rawurlencode( 'Hi there ' . $u ) );
t( 'share: telegram', Share_Links::build( 'telegram', $u, 'Hi' ), 'https://t.me/share/url?url=' . rawurlencode( $u ) . '&text=Hi' );
t( 'share: email', Share_Links::build( 'email', $u, 'Subject here' ), 'mailto:?subject=Subject%20here&body=' . rawurlencode( $u ) );
t( 'share: copy and print have no remote href', [ Share_Links::build( 'copy', $u ), Share_Links::build( 'print', $u ) ], [ '', '' ] );
t( 'share: unknown network is empty', Share_Links::build( 'myspace', $u ), '' );
t( 'share: non-ascii title is percent-encoded', Share_Links::build( 'x', $u, 'Caf' . "\u{e9}" . ' & co' ), 'https://x.com/intent/post?text=Caf%C3%A9%20%26%20co&url=' . rawurlencode( $u ) );
t( 'share: tweet_text keeps short text', Share_Links::tweet_text( 'Short quote', 'Ann' ), "\u{201c}Short quote\u{201d} - Ann" );
$long = str_repeat( 'word ', 100 );
$tt = Share_Links::tweet_text( $long, 'Ann' );
t( 'share: tweet_text is at most 240 characters', mb_strlen( $tt ) <= 240, true );
t( 'share: tweet_text ends with the author', mb_substr( $tt, -7 ), "\u{201d} - Ann" );

// ------------------------------------------------------------ Countdown_Logic
$utc = new DateTimeZone( 'UTC' );
$ny = new DateTimeZone( 'America/New_York' );
t( 'countdown: parse UTC', Countdown_Logic::parse_due( '2030-01-01 00:00', $utc ), 1893456000 );
t( 'countdown: parse honours the site timezone', Countdown_Logic::parse_due( '2030-01-01 00:00', $ny ), 1893456000 + 5 * 3600 );
t( 'countdown: empty string is null', Countdown_Logic::parse_due( '', $utc ), null );
t( 'countdown: garbage is null', Countdown_Logic::parse_due( 'not a date', $utc ), null );
t( 'countdown: split', Countdown_Logic::split( 90061 ), [ 'days' => 1, 'hours' => 1, 'minutes' => 1, 'seconds' => 1 ] );
t( 'countdown: split clamps negatives to zero', Countdown_Logic::split( -50 ), [ 'days' => 0, 'hours' => 0, 'minutes' => 0, 'seconds' => 0 ] );
t( 'countdown: expired when now >= due', [ Countdown_Logic::is_expired( 100, 100 ), Countdown_Logic::is_expired( 100, 99 ) ], [ true, false ] );
t( 'countdown: evergreen seconds', Countdown_Logic::evergreen_seconds( 1, 2, 3, 4 ), 86400 + 7200 + 180 + 4 );
t( 'countdown: evergreen never negative or zero-length by accident', Countdown_Logic::evergreen_seconds( -1, 0, 0, 0 ), 0 );
t( 'countdown: pad', Countdown_Logic::pad( 7 ), '07' );
t( 'countdown: pad keeps three digits', Countdown_Logic::pad( 123 ), '123' );
t( 'countdown: cookie key is safe and stable', Countdown_Logic::cookie_key( 'abc12<>' ), 'rf_cd_abc12' );

// -------------------------------------------------------------- Headline_Logic
t( 'headline: lines are trimmed and blanks dropped', Headline_Logic::lines( "  One \n\n Two\r\n\nThree" ), [ 'One', 'Two', 'Three' ] );
t( 'headline: capped at 20 lines', count( Headline_Logic::lines( implode( "\n", range( 1, 50 ) ) ) ), 20 );
t( 'headline: empty input gives empty array', Headline_Logic::lines( " \n " ), [] );
t( 'headline: valid animation types', Headline_Logic::animation_types(), [ 'typing', 'clip', 'flip', 'swirl', 'blinds', 'drop-in', 'wave', 'slide', 'slide-down', 'fade', 'highlight', 'underline', 'circle', 'strikethrough' ] );
t( 'headline: unknown type falls back to typing', Headline_Logic::sanitize_type( 'bogus' ), 'typing' );
t( 'headline: known type kept', Headline_Logic::sanitize_type( 'flip' ), 'flip' );
t( 'headline: rotating types are the first ones, highlighted the rest', [ Headline_Logic::is_highlight( 'flip' ), Headline_Logic::is_highlight( 'circle' ) ], [ false, true ] );

echo "\n$total tests, $failures failed\n";
exit( $failures ? 1 : 0 );
