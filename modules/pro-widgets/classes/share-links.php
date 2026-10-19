<?php
namespace Refraction\Modules\ProWidgets\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Plain share links. Nothing here loads a third-party script: every network is a normal URL
 * the visitor follows on their own.
 */
class Share_Links {

	/**
	 * Network slug => label. `copy` and `print` are handled in the browser and have no remote URL.
	 */
	public static function networks(): array {
		return [
			'facebook' => 'Facebook',
			'x' => 'X',
			'linkedin' => 'LinkedIn',
			'pinterest' => 'Pinterest',
			'whatsapp' => 'WhatsApp',
			'telegram' => 'Telegram',
			'email' => 'Email',
			'copy' => 'Copy link',
			'print' => 'Print',
		];
	}

	/**
	 * @param string $network One of networks(); `twitter` is accepted as an alias of `x`.
	 * @param string $url     Page URL to share.
	 * @param string $title   Page title or message.
	 * @param string $text    Longer description (used by Pinterest).
	 * @param array  $extra   `media` image URL for Pinterest.
	 */
	public static function build( string $network, string $url, string $title = '', string $text = '', array $extra = [] ): string {
		if ( 'twitter' === $network ) {
			$network = 'x';
		}

		$u = rawurlencode( $url );
		$t = rawurlencode( $title );

		switch ( $network ) {
			case 'facebook':
				return 'https://www.facebook.com/sharer/sharer.php?u=' . $u;
			case 'x':
				return 'https://x.com/intent/post?text=' . $t . '&url=' . $u;
			case 'linkedin':
				return 'https://www.linkedin.com/sharing/share-offsite/?url=' . $u;
			case 'pinterest':
				$link = 'https://pinterest.com/pin/create/button/?url=' . $u;
				if ( ! empty( $extra['media'] ) ) {
					$link .= '&media=' . rawurlencode( $extra['media'] );
				}
				$description = '' !== $text ? $text : $title;
				return $link . '&description=' . rawurlencode( $description );
			case 'whatsapp':
				return 'https://wa.me/?text=' . rawurlencode( trim( $title . ' ' . $url ) );
			case 'telegram':
				return 'https://t.me/share/url?url=' . $u . '&text=' . $t;
			case 'email':
				return 'mailto:?subject=' . $t . '&body=' . $u;
		}

		return '';
	}

	/**
	 * Text for a "tweet this" link: the quote in curly quotes, then the author, at most 240 characters
	 * (the page URL is added by the network and takes the rest of the budget).
	 */
	public static function tweet_text( string $quote, string $author = '', int $max = 240 ): string {
		$quote = trim( preg_replace( '/\s+/u', ' ', $quote ) );
		$suffix = "\u{201d}" . ( '' !== $author ? ' - ' . $author : '' );
		$prefix = "\u{201c}";
		$room = $max - mb_strlen( $prefix . $suffix );

		if ( mb_strlen( $quote ) > $room ) {
			$quote = rtrim( mb_substr( $quote, 0, max( 0, $room - 1 ) ) ) . "\u{2026}";
		}

		return $prefix . $quote . $suffix;
	}
}
