<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Builds the iframe addresses of Facebook's plugins. Only these plain iframes are used (no SDK script,
 * no pixel); the visitor's browser contacts facebook.com only when the owner added such a widget.
 */
class Facebook_Url {

	const HOSTS = [ 'facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.com', 'fb.watch' ];
	const BASE = 'https://www.facebook.com/plugins/';

	private static function is_http_url( string $url ): bool {
		$parts = parse_url( trim( $url ) );

		return is_array( $parts ) && ! empty( $parts['host'] ) && ! empty( $parts['scheme'] ) && in_array( strtolower( $parts['scheme'] ), [ 'http', 'https' ], true );
	}

	public static function is_facebook_url( string $url ): bool {
		if ( ! self::is_http_url( $url ) ) {
			return false;
		}

		$host = strtolower( parse_url( trim( $url ), PHP_URL_HOST ) );
		if ( 0 === strpos( $host, 'www.' ) ) {
			$host = substr( $host, 4 );
		}

		return in_array( $host, self::HOSTS, true );
	}

	private static function bool( $value ): string {
		return $value ? 'true' : 'false';
	}

	private static function width( $value, int $min, int $max, int $default ): int {
		return max( $min, min( $max, (int) ( $value ? $value : $default ) ) );
	}

	private static function build( string $plugin, array $query ): string {
		return self::BASE . $plugin . '.php?' . http_build_query( $query, '', '&', PHP_QUERY_RFC3986 );
	}

	public static function page_src( string $url, array $o ): string {
		if ( ! self::is_facebook_url( $url ) ) {
			return '';
		}

		$tabs = array_values( array_intersect( array_map( 'trim', explode( ',', (string) ( $o['tabs'] ?? 'timeline' ) ) ), [ 'timeline', 'events', 'messages' ] ) );

		return self::build( 'page', [
			'href' => trim( $url ),
			'tabs' => implode( ',', $tabs ),
			'width' => self::width( $o['width'] ?? 0, 180, 500, 340 ),
			'height' => max( 70, min( 1500, (int) ( $o['height'] ?? 500 ) ) ),
			'small_header' => self::bool( $o['small_header'] ?? false ),
			'adapt_container_width' => 'true',
			'hide_cover' => self::bool( $o['hide_cover'] ?? false ),
			'show_facepile' => self::bool( $o['show_facepile'] ?? true ),
		] );
	}

	public static function post_src( string $url, array $o ): string {
		if ( ! self::is_facebook_url( $url ) ) {
			return '';
		}

		return self::build( 'post', [
			'href' => trim( $url ),
			'width' => self::width( $o['width'] ?? 0, 350, 750, 500 ),
			'show_text' => self::bool( $o['show_text'] ?? true ),
		] );
	}

	public static function video_src( string $url, array $o ): string {
		if ( ! self::is_facebook_url( $url ) ) {
			return '';
		}

		return self::build( 'video', [
			'href' => trim( $url ),
			'width' => self::width( $o['width'] ?? 0, 220, 750, 500 ),
			'show_text' => self::bool( $o['show_text'] ?? true ),
		] );
	}

	public static function like_src( string $url, array $o ): string {
		if ( ! self::is_http_url( $url ) ) {
			return '';
		}

		$action = in_array( $o['action'] ?? '', [ 'like', 'recommend' ], true ) ? $o['action'] : 'like';
		$layout = in_array( $o['layout'] ?? '', [ 'standard', 'button_count', 'button', 'box_count' ], true ) ? $o['layout'] : 'button';
		$size = in_array( $o['size'] ?? '', [ 'small', 'large' ], true ) ? $o['size'] : 'small';

		return self::build( 'like', [
			'href' => trim( $url ),
			'layout' => $layout,
			'action' => $action,
			'size' => $size,
			'share' => self::bool( $o['share'] ?? false ),
			'show_faces' => self::bool( $o['show_faces'] ?? false ),
		] );
	}

	public static function comments_src( string $url, array $o ): string {
		if ( ! self::is_http_url( $url ) ) {
			return '';
		}

		return self::build( 'comments', [
			'href' => trim( $url ),
			'numposts' => max( 1, min( 50, (int) ( $o['numposts'] ?? 10 ) ) ),
			'width' => self::width( $o['width'] ?? 0, 320, 1000, 550 ),
		] );
	}
}
