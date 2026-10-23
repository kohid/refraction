<?php
// Standalone test for the Popups rules engine (no WordPress needed): php scripts/test-popups.php
define( 'ABSPATH', __DIR__ . '/' );
require dirname( __DIR__ ) . '/modules/popups/classes/popup-rules.php';

use Refraction\Modules\Popups\Classes\Popup_Rules as R;

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

$DAY = 86400;
$now = 1_800_000_000;

// ---- normalize: sanitising -------------------------------------------------------------------------------------
$n = R::normalize( [] );
t( 'defaults: no trigger is on', [] === array_filter( $n['triggers'] ) );
t( 'defaults: frequency is always', 'always' === $n['frequency']['mode'] );
t( 'defaults: all devices', [ 'desktop', 'tablet', 'mobile' ] === $n['devices'] );
t( 'defaults: close on overlay and esc, lock scroll', $n['display']['overlay_close'] && $n['display']['esc_close'] && $n['display']['prevent_scroll'] );

$n = R::normalize( [ 'rp_trigger_load' => 'yes', 'rp_load_delay' => '-5' ] );
t( 'load delay never negative', 0 === $n['triggers']['load']['delay'] );
$n = R::normalize( [ 'rp_trigger_load' => 'yes', 'rp_load_delay' => '99999' ] );
t( 'load delay is capped', 3600 >= $n['triggers']['load']['delay'] );
$n = R::normalize( [ 'rp_trigger_scroll' => 'yes', 'rp_scroll_mode' => 'percent', 'rp_scroll_percent' => '250' ] );
t( 'scroll percent clamps to 100', 100 === $n['triggers']['scroll']['percent'] );
$n = R::normalize( [ 'rp_trigger_scroll' => 'yes', 'rp_scroll_mode' => 'bogus' ] );
t( 'unknown scroll mode falls back to percent', 'percent' === $n['triggers']['scroll']['mode'] );
$n = R::normalize( [ 'rp_trigger_click' => 'yes', 'rp_click_selector' => '<script>alert(1)</script>.buy' ] );
t( 'click selector has no markup', false === strpos( $n['triggers']['click']['selector'], '<' ) );
$n = R::normalize( [ 'rp_trigger_click' => 'yes', 'rp_click_selector' => str_repeat( 'a', 900 ) ] );
t( 'click selector is length limited', strlen( $n['triggers']['click']['selector'] ) <= 200 );
$n = R::normalize( [ 'rp_trigger_click' => 'yes', 'rp_click_selector' => '   ' ] );
t( 'click trigger without a selector is dropped', empty( $n['triggers']['click'] ) );
$n = R::normalize( [ 'rp_trigger_idle' => 'yes', 'rp_idle_seconds' => '0' ] );
t( 'idle needs at least one second', 1 === $n['triggers']['idle']['seconds'] );
$n = R::normalize( [ 'rp_trigger_views' => 'yes', 'rp_views_count' => 'x' ] );
t( 'views count defaults to 2', 2 === $n['triggers']['views']['count'] );
$n = R::normalize( [ 'rp_frequency' => 'whatever' ] );
t( 'unknown frequency becomes always', 'always' === $n['frequency']['mode'] );
$n = R::normalize( [ 'rp_frequency' => 'every_n', 'rp_frequency_n' => '0' ] );
t( 'every N is at least 2', 2 === $n['frequency']['n'] );
$n = R::normalize( [ 'rp_devices' => [ 'mobile', 'tv', 'desktop' ] ] );
t( 'devices keep only known names, in order', [ 'desktop', 'mobile' ] === $n['devices'] );
$n = R::normalize( [ 'rp_devices' => [] ] );
t( 'no device chosen means all', [ 'desktop', 'tablet', 'mobile' ] === $n['devices'] );
$n = R::normalize( [ 'rp_referrer' => 'url', 'rp_referrer_url' => 'Google.COM<b>' ] );
t( 'referrer url is lower case and has no markup', 'google.comb' === $n['referrer']['url'] );
$n = R::normalize( [ 'rp_param_name' => 'utm source!', 'rp_param_value' => 'a b' ] );
t( 'param name is a safe key', 'utmsource' === $n['param']['name'] );
$n = R::normalize( [ 'rp_audience' => 'logged_in', 'rp_roles' => [ 'editor', 'Aut<>hor', '', 'editor' ] ] );
t( 'roles are unique slugs', [ 'editor', 'author' ] === $n['audience']['roles'] );
$n = R::normalize( [ 'rp_anim_in' => 'evil"onload', 'rp_anim_out' => 'zoom', 'rp_anim_in_duration' => '999999' ] );
t( 'animation names are whitelisted', 'fade' === $n['display']['anim_in'] && 'zoom' === $n['display']['anim_out'] );
t( 'animation duration is capped', 5000 >= $n['display']['dur_in'] );
$n = R::normalize( [ 'rp_priority' => '7' ] );
t( 'priority is an integer', 7 === $n['priority'] );

// ---- schedule ----------------------------------------------------------------------------------------------------
// offset +120 minutes (site is UTC+2); "2027-01-15 08:00" site time is 06:00 UTC.
$n = R::normalize( [ 'rp_schedule' => 'yes', 'rp_schedule_start' => '2027-01-15 08:00', 'rp_schedule_end' => '2027-01-16 08:00' ], 7200 );
$start = gmmktime( 6, 0, 0, 1, 15, 2027 );
t( 'schedule start converts site time to UTC', $start === $n['schedule']['start'] );
t( 'before the start is closed', ! R::date_range_allows( $n['schedule'], $start - 1 ) );
t( 'at the start is open', R::date_range_allows( $n['schedule'], $start ) );
t( 'after the end is closed', ! R::date_range_allows( $n['schedule'], $start + $DAY + 1 ) );
t( 'schedule off ignores the range', R::date_range_allows( R::normalize( [ 'rp_schedule_start' => '2027-01-15 08:00' ] )['schedule'], 1 ) );

$n = R::normalize( [ 'rp_schedule' => 'yes', 'rp_time_from' => '09:00', 'rp_time_to' => '17:30' ], 7200 );
$noon_utc = gmmktime( 10, 0, 0, 3, 3, 2027 ); // 12:00 site time
t( 'time of day: inside', R::time_of_day_allows( $n['schedule'], $noon_utc ) );
t( 'time of day: before', ! R::time_of_day_allows( $n['schedule'], gmmktime( 6, 59, 0, 3, 3, 2027 ) ) ); // 08:59 site
t( 'time of day: end is exclusive', ! R::time_of_day_allows( $n['schedule'], gmmktime( 15, 30, 0, 3, 3, 2027 ) ) ); // 17:30 site
$n = R::normalize( [ 'rp_schedule' => 'yes', 'rp_time_from' => '22:00', 'rp_time_to' => '06:00' ], 0 );
t( 'time of day crosses midnight: late', R::time_of_day_allows( $n['schedule'], gmmktime( 23, 0, 0, 3, 3, 2027 ) ) );
t( 'time of day crosses midnight: early', R::time_of_day_allows( $n['schedule'], gmmktime( 5, 0, 0, 3, 3, 2027 ) ) );
t( 'time of day crosses midnight: day', ! R::time_of_day_allows( $n['schedule'], gmmktime( 12, 0, 0, 3, 3, 2027 ) ) );
$n = R::normalize( [ 'rp_schedule' => 'yes', 'rp_time_from' => '25:99', 'rp_time_to' => 'abc' ] );
t( 'invalid times are ignored', R::time_of_day_allows( $n['schedule'], $now ) );

// ---- frequency ---------------------------------------------------------------------------------------------------
$f = fn( $mode, $extra = [] ) => R::normalize( array_merge( [ 'rp_frequency' => $mode ], $extra ) )['frequency'];

t( 'always: shows with no state', R::frequency_allows( $f( 'always' ), null, $now, 0 ) );
t( 'always: shows again', R::frequency_allows( $f( 'always' ), [ 'shown' => 9, 'last' => $now - 5 ], $now, 9 ) );
t( 'once: first time', R::frequency_allows( $f( 'once' ), null, $now, 0 ) );
t( 'once: not twice', ! R::frequency_allows( $f( 'once' ), [ 'shown' => 1, 'last' => $now - 60 ], $now, 1 ) );
t( 'once: shows again after the expiry', R::frequency_allows( $f( 'once', [ 'rp_frequency_days' => 30 ] ), [ 'shown' => 1, 'last' => $now - 31 * $DAY ], $now, 0 ) );
t( 'once: still hidden inside the expiry', ! R::frequency_allows( $f( 'once', [ 'rp_frequency_days' => 30 ] ), [ 'shown' => 1, 'last' => $now - 29 * $DAY ], $now, 0 ) );
t( 'session: first time', R::frequency_allows( $f( 'session' ), null, $now, 0 ) );
t( 'session: not again in the same session', ! R::frequency_allows( $f( 'session' ), [ 'shown' => 3, 'last' => $now - 10 ], $now, 1 ) );
t( 'session: again in a new session', R::frequency_allows( $f( 'session' ), [ 'shown' => 3, 'last' => $now - 10 ], $now, 0 ) );
t( 'day: not within 24h', ! R::frequency_allows( $f( 'day' ), [ 'shown' => 1, 'last' => $now - 23 * 3600 ], $now, 0 ) );
t( 'day: after 24h', R::frequency_allows( $f( 'day' ), [ 'shown' => 1, 'last' => $now - 25 * 3600 ], $now, 0 ) );
$e3 = $f( 'every_n', [ 'rp_frequency_n' => 3 ] );
t( 'every 3: hit 0 shows', R::frequency_allows( $e3, [ 'hits' => 0 ], $now, 0 ) );
t( 'every 3: hit 1 skips', ! R::frequency_allows( $e3, [ 'hits' => 1 ], $now, 0 ) );
t( 'every 3: hit 2 skips', ! R::frequency_allows( $e3, [ 'hits' => 2 ], $now, 0 ) );
t( 'every 3: hit 3 shows', R::frequency_allows( $e3, [ 'hits' => 3 ], $now, 0 ) );
t( 'every 3: no state shows', R::frequency_allows( $e3, null, $now, 0 ) );
t( 'dismissed hides for any mode', ! R::frequency_allows( $f( 'always' ), [ 'dismissed' => $now + 100 ], $now, 0 ) );
t( 'dismissal expires', R::frequency_allows( $f( 'always' ), [ 'dismissed' => $now - 1 ], $now, 0 ) );

// ---- devices -----------------------------------------------------------------------------------------------------
t( 'device allowed', R::device_allows( [ 'desktop', 'mobile' ], 'mobile' ) );
t( 'device not allowed', ! R::device_allows( [ 'desktop', 'mobile' ], 'tablet' ) );
t( 'device from width: desktop', 'desktop' === R::device_for_width( 1400, 1024, 767 ) );
t( 'device from width: tablet edge', 'tablet' === R::device_for_width( 1024, 1024, 767 ) );
t( 'device from width: mobile edge', 'mobile' === R::device_for_width( 767, 1024, 767 ) );

// ---- referrer ----------------------------------------------------------------------------------------------------
$rf = fn( $mode, $url = '' ) => R::normalize( [ 'rp_referrer' => $mode, 'rp_referrer_url' => $url ] )['referrer'];
t( 'referrer any', R::referrer_allows( $rf( 'any' ), '', 'example.test' ) );
t( 'search engine: google', R::referrer_allows( $rf( 'search' ), 'https://www.google.com/search?q=x', 'example.test' ) );
t( 'search engine: duckduckgo', R::referrer_allows( $rf( 'search' ), 'https://duckduckgo.com/?q=x', 'example.test' ) );
t( 'search engine: not a blog', ! R::referrer_allows( $rf( 'search' ), 'https://blog.example.org/post', 'example.test' ) );
t( 'search engine: empty referrer', ! R::referrer_allows( $rf( 'search' ), '', 'example.test' ) );
t( 'search engine: lookalike host', ! R::referrer_allows( $rf( 'search' ), 'https://notgoogle.com.evil.test/', 'example.test' ) );
t( 'internal: same host', R::referrer_allows( $rf( 'internal' ), 'https://example.test/a', 'example.test' ) );
t( 'internal: other host', ! R::referrer_allows( $rf( 'internal' ), 'https://other.test/a', 'example.test' ) );
t( 'external: other host', R::referrer_allows( $rf( 'external' ), 'https://other.test/a', 'example.test' ) );
t( 'external: direct visit is not external', ! R::referrer_allows( $rf( 'external' ), '', 'example.test' ) );
t( 'url contains', R::referrer_allows( $rf( 'url', 'newsletter' ), 'https://mail.test/newsletter/42', 'example.test' ) );
t( 'url contains is case insensitive', R::referrer_allows( $rf( 'url', 'NewsLetter' ), 'https://mail.test/NEWSletter/42', 'example.test' ) );
t( 'url does not contain', ! R::referrer_allows( $rf( 'url', 'newsletter' ), 'https://mail.test/other', 'example.test' ) );
t( 'url rule with empty text matches nothing special', R::referrer_allows( $rf( 'url', '' ), 'https://x.test', 'example.test' ) );

// ---- url parameter -----------------------------------------------------------------------------------------------
$pm = fn( $name, $value = '' ) => R::normalize( [ 'rp_param_name' => $name, 'rp_param_value' => $value ] )['param'];
t( 'param: none set', R::param_allows( $pm( '' ), [] ) );
t( 'param: present', R::param_allows( $pm( 'promo' ), [ 'promo' => '1' ] ) );
t( 'param: missing', ! R::param_allows( $pm( 'promo' ), [ 'other' => '1' ] ) );
t( 'param: exact value', R::param_allows( $pm( 'promo', 'spring' ), [ 'promo' => 'spring' ] ) );
t( 'param: wrong value', ! R::param_allows( $pm( 'promo', 'spring' ), [ 'promo' => 'winter' ] ) );
t( 'param: array value is rejected', ! R::param_allows( $pm( 'promo', 'spring' ), [ 'promo' => [ 'spring' ] ] ) );

// ---- audience ----------------------------------------------------------------------------------------------------
$au = fn( $who, $roles = [] ) => R::normalize( [ 'rp_audience' => $who, 'rp_roles' => $roles ] )['audience'];
t( 'audience any', R::audience_allows( $au( 'any' ), false, [] ) );
t( 'audience logged in: guest', ! R::audience_allows( $au( 'logged_in' ), false, [] ) );
t( 'audience logged in: member', R::audience_allows( $au( 'logged_in' ), true, [ 'subscriber' ] ) );
t( 'audience logged out: member', ! R::audience_allows( $au( 'logged_out' ), true, [ 'subscriber' ] ) );
t( 'audience logged out: guest', R::audience_allows( $au( 'logged_out' ), false, [] ) );
t( 'audience roles: match', R::audience_allows( $au( 'logged_in', [ 'editor', 'author' ] ), true, [ 'author' ] ) );
t( 'audience roles: no match', ! R::audience_allows( $au( 'logged_in', [ 'editor' ] ), true, [ 'subscriber' ] ) );
t( 'audience roles: guest never matches roles', ! R::audience_allows( $au( 'logged_in', [ 'editor' ] ), false, [] ) );

// ---- priority / ordering -----------------------------------------------------------------------------------------
$sorted = R::sort_by_priority( [ 5 => 1, 9 => 10, 3 => 10, 7 => 0 ] );
t( 'priority: highest first, then lowest id', [ 3, 9, 5, 7 ] === $sorted );

echo "$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
