<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Recognises the video links an owner pastes into the Video Playlist and builds privacy-friendly embed URLs.
 * Nothing is requested from the providers until the visitor presses play.
 */
class Video_Url {

	const YOUTUBE_HOSTS = [ 'youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'youtu.be' ];
	const VIMEO_HOSTS = [ 'vimeo.com', 'player.vimeo.com' ];
	const FILE_EXTENSIONS = [ 'mp4', 'webm', 'ogv', 'ogg', 'm4v', 'mov' ];

	/**
	 * @return array|null `youtube` {provider,id}, `vimeo` {provider,id,hash}, `hosted` {provider,url} or null.
	 */
	public static function parse( string $url ): ?array {
		$url = trim( $url );
		$parts = parse_url( $url );

		if ( ! is_array( $parts ) || empty( $parts['host'] ) || empty( $parts['scheme'] ) || ! in_array( strtolower( $parts['scheme'] ), [ 'http', 'https' ], true ) ) {
			return null;
		}

		$host = strtolower( $parts['host'] );
		if ( 0 === strpos( $host, 'www.' ) ) {
			$host = substr( $host, 4 );
		}
		$path = $parts['path'] ?? '';

		if ( in_array( $host, self::YOUTUBE_HOSTS, true ) ) {
			$id = '';
			if ( 'youtu.be' === $host ) {
				$id = trim( $path, '/' );
			} elseif ( preg_match( '#^/(?:embed|shorts|live|v)/([^/?]+)#', $path, $m ) ) {
				$id = $m[1];
			} elseif ( '/watch' === rtrim( $path, '/' ) && ! empty( $parts['query'] ) ) {
				parse_str( $parts['query'], $query );
				$id = isset( $query['v'] ) && is_string( $query['v'] ) ? $query['v'] : '';
			}

			return preg_match( '/^[A-Za-z0-9_-]{11}$/', $id ) ? [ 'provider' => 'youtube', 'id' => $id ] : null;
		}

		if ( in_array( $host, self::VIMEO_HOSTS, true ) ) {
			if ( preg_match( '#^/(?:video/|channels/[^/]+/|groups/[^/]+/videos/|album/\d+/video/)?(\d{5,12})(?:/([A-Za-z0-9]{6,20}))?/?$#', $path, $m ) ) {
				return [ 'provider' => 'vimeo', 'id' => $m[1], 'hash' => $m[2] ?? '' ];
			}

			return null;
		}

		if ( in_array( strtolower( pathinfo( $path, PATHINFO_EXTENSION ) ), self::FILE_EXTENSIONS, true ) ) {
			return [ 'provider' => 'hosted', 'url' => $url ];
		}

		return null;
	}

	/**
	 * The iframe address for YouTube (privacy-enhanced domain) and Vimeo (do-not-track); empty for files.
	 */
	public static function embed_src( array $video, array $options ): string {
		$autoplay = ! empty( $options['autoplay'] );
		$mute = ! empty( $options['mute'] );

		if ( 'youtube' === ( $video['provider'] ?? '' ) ) {
			$query = [];
			if ( $autoplay ) {
				$query[] = 'autoplay=1';
			}
			$query[] = 'rel=0';
			$query[] = 'playsinline=1';
			if ( $mute ) {
				$query[] = 'mute=1';
			}

			return 'https://www.youtube-nocookie.com/embed/' . $video['id'] . '?' . implode( '&', $query );
		}

		if ( 'vimeo' === ( $video['provider'] ?? '' ) ) {
			$query = [ 'dnt=1' ];
			if ( $autoplay ) {
				$query[] = 'autoplay=1';
			}
			if ( $mute ) {
				$query[] = 'muted=1';
			}
			if ( ! empty( $video['hash'] ) ) {
				$query[] = 'h=' . $video['hash'];
			}

			return 'https://player.vimeo.com/video/' . $video['id'] . '?' . implode( '&', $query );
		}

		return '';
	}
}
