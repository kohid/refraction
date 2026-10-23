<?php
namespace Refraction\Modules\Popups\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Popup settings turned into one clean public config, and the rule logic on top of it.
 *
 * Pure: no WordPress calls, so scripts/test-popups.php runs it on its own. The same rules run in the browser
 * (modules/popups/assets/js/frontend.js) for everything that depends on the visitor (frequency, device, referrer,
 * time of day); keep the two in step. The server uses audience and the date range, which it can decide safely.
 */
final class Popup_Rules {

	const ANIMATIONS = [ 'none', 'fade', 'zoom', 'slide-up', 'slide-down', 'slide-left', 'slide-right' ];
	const FREQUENCIES = [ 'always', 'once', 'every_n', 'session', 'day' ];
	const DEVICES = [ 'desktop', 'tablet', 'mobile' ];
	const REFERRERS = [ 'any', 'search', 'internal', 'external', 'url' ];

	const SEARCH_ENGINES = [ 'google', 'bing', 'duckduckgo', 'yahoo', 'baidu', 'yandex', 'ecosia', 'startpage', 'qwant', 'ask', 'naver', 'seznam', 'brave' ];

	/**
	 * @param array $s              Document settings (`rp_*` keys).
	 * @param int   $tz_offset_secs Site time zone offset from UTC in seconds (for the schedule).
	 */
	public static function normalize( array $s, int $tz_offset_secs = 0 ): array {
		$triggers = [
			'load' => null,
			'scroll' => null,
			'scroll_up' => null,
			'click' => null,
			'exit' => null,
			'idle' => null,
			'views' => null,
		];

		if ( self::on( $s, 'rp_trigger_load' ) ) {
			$triggers['load'] = [ 'delay' => self::int( $s, 'rp_load_delay', 0, 0, 3600 ) ];
		}

		if ( self::on( $s, 'rp_trigger_scroll' ) ) {
			$mode = in_array( $s['rp_scroll_mode'] ?? '', [ 'percent', 'element' ], true ) ? $s['rp_scroll_mode'] : 'percent';
			$selector = self::selector( $s['rp_scroll_selector'] ?? '' );

			if ( 'element' !== $mode || '' !== $selector ) {
				$triggers['scroll'] = [ 'mode' => $mode, 'percent' => self::int( $s, 'rp_scroll_percent', 50, 0, 100 ), 'selector' => $selector ];
			}
		}

		if ( self::on( $s, 'rp_trigger_scroll_up' ) ) {
			$triggers['scroll_up'] = [ 'distance' => self::int( $s, 'rp_scroll_up_distance', 120, 20, 2000 ) ];
		}

		if ( self::on( $s, 'rp_trigger_click' ) ) {
			$selector = self::selector( $s['rp_click_selector'] ?? '' );

			if ( '' !== $selector ) {
				$triggers['click'] = [ 'selector' => $selector ];
			}
		}

		if ( self::on( $s, 'rp_trigger_exit' ) ) {
			$triggers['exit'] = true;
		}

		if ( self::on( $s, 'rp_trigger_idle' ) ) {
			$triggers['idle'] = [ 'seconds' => self::int( $s, 'rp_idle_seconds', 30, 1, 3600 ) ];
		}

		if ( self::on( $s, 'rp_trigger_views' ) ) {
			$triggers['views'] = [ 'count' => self::int( $s, 'rp_views_count', 2, 1, 1000 ) ];
		}

		$mode = in_array( $s['rp_frequency'] ?? '', self::FREQUENCIES, true ) ? $s['rp_frequency'] : 'always';
		$expire_default = 'once' === $mode ? 30 : 0;

		$devices = array_values( array_intersect( self::DEVICES, array_map( 'strval', (array) ( $s['rp_devices'] ?? [] ) ) ) );

		$referrer_mode = in_array( $s['rp_referrer'] ?? '', self::REFERRERS, true ) ? $s['rp_referrer'] : 'any';

		$roles = [];

		foreach ( (array) ( $s['rp_roles'] ?? [] ) as $role ) {
			$role = preg_replace( '/[^a-z0-9_\-]/', '', strtolower( is_string( $role ) ? $role : '' ) );

			if ( '' !== $role ) {
				$roles[ $role ] = $role;
			}
		}

		$audience = in_array( $s['rp_audience'] ?? '', [ 'logged_in', 'logged_out' ], true ) ? $s['rp_audience'] : 'any';

		return [
			'triggers' => $triggers,
			'frequency' => [
				'mode' => $mode,
				'n' => self::int( $s, 'rp_frequency_n', 3, 2, 1000 ),
				'expire_days' => self::int( $s, 'rp_frequency_days', $expire_default, 0, 3650 ),
			],
			'dismiss' => [
				'on_form' => self::on( $s, 'rp_dismiss_on_form' ),
				'days' => self::int( $s, 'rp_dismiss_days', 365, 1, 3650 ),
			],
			'devices' => $devices ? $devices : self::DEVICES,
			'referrer' => [
				'mode' => $referrer_mode,
				'url' => strtolower( preg_replace( '/[^a-zA-Z0-9\-._~:\/?#\[\]@!$&\'()*+,;=%]/', '', (string) ( $s['rp_referrer_url'] ?? '' ) ) ),
			],
			'param' => [
				'name' => substr( preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) ( $s['rp_param_name'] ?? '' ) ), 0, 60 ),
				'value' => substr( self::plain( $s['rp_param_value'] ?? '' ), 0, 100 ),
			],
			'schedule' => self::schedule( $s, $tz_offset_secs ),
			'audience' => [ 'who' => $audience, 'roles' => array_values( $roles ) ],
			'priority' => self::int( $s, 'rp_priority', 0, -1000, 1000 ),
			'display' => [
				'prevent_scroll' => ! array_key_exists( 'rp_prevent_scroll', $s ) || self::on( $s, 'rp_prevent_scroll' ),
				'overlay_close' => ! array_key_exists( 'rp_close_overlay', $s ) || self::on( $s, 'rp_close_overlay' ),
				'esc_close' => ! array_key_exists( 'rp_close_esc', $s ) || self::on( $s, 'rp_close_esc' ),
				'show_close' => ! array_key_exists( 'rp_show_close', $s ) || self::on( $s, 'rp_show_close' ),
				'autoclose' => self::int( $s, 'rp_autoclose', 0, 0, 3600 ),
				'anim_in' => self::animation( $s['rp_anim_in'] ?? '', 'fade' ),
				'anim_out' => self::animation( $s['rp_anim_out'] ?? '', 'fade' ),
				'dur_in' => self::int( $s, 'rp_anim_in_duration', 300, 0, 5000 ),
				'dur_out' => self::int( $s, 'rp_anim_out_duration', 200, 0, 5000 ),
			],
		];
	}

	private static function schedule( array $s, int $offset ): array {
		$out = [ 'enabled' => false, 'start' => 0, 'end' => 0, 'from' => -1, 'to' => -1, 'offset' => $offset ];

		if ( ! self::on( $s, 'rp_schedule' ) ) {
			return $out;
		}

		$out['enabled'] = true;
		$out['start'] = self::datetime( $s['rp_schedule_start'] ?? '', $offset );
		$out['end'] = self::datetime( $s['rp_schedule_end'] ?? '', $offset );
		$out['from'] = self::minutes( $s['rp_time_from'] ?? '' );
		$out['to'] = self::minutes( $s['rp_time_to'] ?? '' );

		return $out;
	}

	/** `2027-01-15 08:00` in site time to a UTC timestamp, 0 when empty or invalid. */
	private static function datetime( $value, int $offset ): int {
		if ( ! is_string( $value ) || ! preg_match( '/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/', trim( $value ), $m ) ) {
			return 0;
		}

		if ( ! checkdate( (int) $m[2], (int) $m[3], (int) $m[1] ) || (int) $m[4] > 23 || (int) $m[5] > 59 ) {
			return 0;
		}

		return gmmktime( (int) $m[4], (int) $m[5], 0, (int) $m[2], (int) $m[3], (int) $m[1] ) - $offset;
	}

	/** `09:30` to minutes after midnight, -1 when empty or invalid. */
	private static function minutes( $value ): int {
		if ( ! is_string( $value ) || ! preg_match( '/^(\d{1,2}):(\d{2})$/', trim( $value ), $m ) || (int) $m[1] > 23 || (int) $m[2] > 59 ) {
			return -1;
		}

		return (int) $m[1] * 60 + (int) $m[2];
	}

	public static function date_range_allows( array $schedule, int $now ): bool {
		if ( empty( $schedule['enabled'] ) ) {
			return true;
		}

		if ( $schedule['start'] && $now < $schedule['start'] ) {
			return false;
		}

		return ! ( $schedule['end'] && $now >= $schedule['end'] );
	}

	public static function time_of_day_allows( array $schedule, int $now ): bool {
		if ( empty( $schedule['enabled'] ) || $schedule['from'] < 0 || $schedule['to'] < 0 || $schedule['from'] === $schedule['to'] ) {
			return true;
		}

		$minute = (int) ( ( ( ( $now + $schedule['offset'] ) % 86400 ) + 86400 ) % 86400 / 60 );

		if ( $schedule['from'] < $schedule['to'] ) {
			return $minute >= $schedule['from'] && $minute < $schedule['to'];
		}

		return $minute >= $schedule['from'] || $minute < $schedule['to'];
	}

	/**
	 * @param array      $frequency       The `frequency` part of the config.
	 * @param array|null $state           Stored per popup: shown, last (timestamp), hits, dismissed (timestamp).
	 * @param int        $session_shown   Times it was shown in this browser session.
	 */
	public static function frequency_allows( array $frequency, ?array $state, int $now, int $session_shown ): bool {
		$state = $state ?? [];

		if ( ! empty( $state['dismissed'] ) && (int) $state['dismissed'] > $now ) {
			return false;
		}

		$shown = (int) ( $state['shown'] ?? 0 );
		$last = (int) ( $state['last'] ?? 0 );

		switch ( $frequency['mode'] ?? 'always' ) {
			case 'once':
				if ( $shown < 1 ) {
					return true;
				}

				$days = (int) ( $frequency['expire_days'] ?? 0 );

				return $days > 0 && $now - $last >= $days * 86400;
			case 'session':
				return $session_shown < 1;
			case 'day':
				return $shown < 1 || $now - $last >= 86400;
			case 'every_n':
				return 0 === (int) ( $state['hits'] ?? 0 ) % max( 2, (int) ( $frequency['n'] ?? 2 ) );
			default:
				return true;
		}
	}

	public static function device_allows( array $devices, string $device ): bool {
		return in_array( $device, $devices, true );
	}

	public static function device_for_width( int $width, int $tablet_max, int $mobile_max ): string {
		if ( $width <= $mobile_max ) {
			return 'mobile';
		}

		return $width <= $tablet_max ? 'tablet' : 'desktop';
	}

	public static function referrer_allows( array $referrer, string $url, string $site_host ): bool {
		$mode = $referrer['mode'] ?? 'any';

		if ( 'any' === $mode ) {
			return true;
		}

		$host = self::host( $url );
		$site_host = self::strip_www( strtolower( $site_host ) );

		switch ( $mode ) {
			case 'search':
				return '' !== $host && (bool) preg_match( '/^(?:[a-z0-9\-]+\.)*(?:' . implode( '|', self::SEARCH_ENGINES ) . ')\.(?:[a-z]{2,3}|(?:co|com)\.[a-z]{2})$/', $host );
			case 'internal':
				return '' !== $host && $host === $site_host;
			case 'external':
				return '' !== $host && $host !== $site_host;
			case 'url':
				$needle = (string) ( $referrer['url'] ?? '' );

				return '' === $needle || false !== strpos( strtolower( $url ), $needle );
		}

		return true;
	}

	public static function param_allows( array $param, array $query ): bool {
		$name = (string) ( $param['name'] ?? '' );

		if ( '' === $name ) {
			return true;
		}

		if ( ! isset( $query[ $name ] ) || ! is_scalar( $query[ $name ] ) ) {
			return false;
		}

		$value = (string) ( $param['value'] ?? '' );

		return '' === $value || (string) $query[ $name ] === $value;
	}

	/** @param string[] $roles The visitor's roles. */
	public static function audience_allows( array $audience, bool $logged_in, array $roles ): bool {
		$who = $audience['who'] ?? 'any';

		if ( 'logged_out' === $who ) {
			return ! $logged_in;
		}

		if ( 'logged_in' === $who ) {
			if ( ! $logged_in ) {
				return false;
			}

			$wanted = (array) ( $audience['roles'] ?? [] );

			return ! $wanted || (bool) array_intersect( $wanted, $roles );
		}

		return true;
	}

	/**
	 * @param array<int, int> $priorities Popup ID => priority.
	 * @return int[] IDs, highest priority first, then the lowest ID.
	 */
	public static function sort_by_priority( array $priorities ): array {
		$ids = array_keys( $priorities );

		usort( $ids, function ( $a, $b ) use ( $priorities ) {
			return [ $priorities[ $b ], $a ] <=> [ $priorities[ $a ], $b ];
		} );

		return array_map( 'intval', $ids );
	}

	private static function on( array $s, string $key ): bool {
		return isset( $s[ $key ] ) && in_array( $s[ $key ], [ 'yes', 'true', true, 1, '1', 'on' ], true );
	}

	private static function int( array $s, string $key, int $default, int $min, int $max ): int {
		$value = $s[ $key ] ?? null;

		if ( is_array( $value ) ) {
			$value = $value['size'] ?? null;
		}

		$value = is_numeric( $value ) ? (int) round( (float) $value ) : $default;

		return max( $min, min( $max, $value ) );
	}

	private static function animation( $value, string $default ): string {
		return in_array( $value, self::ANIMATIONS, true ) ? $value : $default;
	}

	private static function plain( $value ): string {
		return is_scalar( $value ) ? trim( preg_replace( '/[\x00-\x1f\x7f<>]/', '', (string) $value ) ) : '';
	}

	/** A CSS selector typed by the site owner. It only ever goes to querySelectorAll in the browser. */
	private static function selector( $value ): string {
		return substr( trim( preg_replace( '/[\x00-\x1f\x7f<`]/', '', is_scalar( $value ) ? (string) $value : '' ) ), 0, 200 );
	}

	private static function host( string $url ): string {
		$host = parse_url( $url, PHP_URL_HOST );

		return is_string( $host ) ? self::strip_www( strtolower( $host ) ) : '';
	}

	private static function strip_www( string $host ): string {
		return 0 === strpos( $host, 'www.' ) ? substr( $host, 4 ) : $host;
	}
}
