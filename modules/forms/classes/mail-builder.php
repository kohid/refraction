<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Turns an email action's settings and a submission into arguments for wp_mail().
 *
 * Every address is validated on its own and every header value is a single line, so submitted data
 * cannot add recipients or headers.
 */
final class Mail_Builder {

	/**
	 * @return array{to: string[], subject: string, message: string, headers: string[]}|array{error: string}
	 */
	public static function build( array $cfg, array $ctx ): array {
		$to = self::address_list( (string) ( $cfg['to'] ?? '' ), $ctx );

		if ( ! $to ) {
			return [ 'error' => __( 'No valid recipient address.', 'refraction' ) ];
		}

		$html = 'html' === ( $cfg['format'] ?? 'html' );
		$subject = trim( preg_replace( '/[\x00-\x1f\x7f]+/', ' ', Template_Tags::render( (string) ( $cfg['subject'] ?? '' ), $ctx, 'plain' ) ) );
		$template = (string) ( $cfg['message'] ?? '[all-fields]' );

		if ( $html && strip_tags( $template ) === $template ) {
			$template = nl2br( $template );
		}

		$message = Template_Tags::render( $template, $ctx, $html ? 'html' : 'plain' );
		$headers = [];

		$from_email = self::single_address( (string) ( $cfg['from_email'] ?? '' ), $ctx );

		if ( null !== $from_email ) {
			$name = trim( preg_replace( '/[\x00-\x1f\x7f"<>\\\\]+/', ' ', Template_Tags::render( (string) ( $cfg['from_name'] ?? '' ), $ctx, 'plain' ) ) );
			$name = preg_replace( '/\s+/', ' ', $name );

			if ( '' === $name ) {
				$headers[] = 'From: ' . $from_email;
			} elseif ( preg_match( '/[^A-Za-z0-9 \'_\-]/', $name ) ) {
				$headers[] = 'From: "' . $name . '" <' . $from_email . '>';
			} else {
				$headers[] = 'From: ' . $name . ' <' . $from_email . '>';
			}
		}

		$reply_to = self::single_address( (string) ( $cfg['reply_to'] ?? '' ), $ctx );

		if ( null !== $reply_to ) {
			$headers[] = 'Reply-To: ' . $reply_to;
		}

		$cc = self::address_list( (string) ( $cfg['cc'] ?? '' ), $ctx );

		if ( $cc ) {
			$headers[] = 'Cc: ' . implode( ', ', $cc );
		}

		$bcc = self::address_list( (string) ( $cfg['bcc'] ?? '' ), $ctx );

		if ( $bcc ) {
			$headers[] = 'Bcc: ' . implode( ', ', $bcc );
		}

		$headers[] = 'Content-Type: text/' . ( $html ? 'html' : 'plain' ) . '; charset=UTF-8';

		return [ 'to' => $to, 'subject' => $subject, 'message' => $message, 'headers' => $headers ];
	}

	/** Splits the owner's template on commas first, then renders each piece, so a value cannot add recipients. */
	private static function address_list( string $template, array $ctx ): array {
		$out = [];

		foreach ( explode( ',', $template ) as $piece ) {
			$address = self::single_address( $piece, $ctx );

			if ( null !== $address ) {
				$out[] = $address;
			}
		}

		return $out;
	}

	private static function single_address( string $template, array $ctx ): ?string {
		$value = trim( Template_Tags::render( trim( $template ), $ctx, 'plain' ) );

		if ( '' === $value || preg_match( '/[\x00-\x20,;<>]/', $value ) ) {
			return null;
		}

		return false === filter_var( $value, FILTER_VALIDATE_EMAIL ) ? null : $value;
	}
}
