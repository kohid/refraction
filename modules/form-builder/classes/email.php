<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The emails a form sends (0.147.0): the visitor's copy and the office's notice. "Designed" builds an HTML email
 * (inline styles and tables, as email programs need): the logo or the site name, a heading, the message, the reference
 * in its own box, the answers in a table, a button and a footer. "Plain text" keeps the text emails as before.
 */
class Email {

	/**
	 * The visitor's copy: their message template with {reference}, {summary} and {field_key} filled in.
	 *
	 * @param array  $settings  The form's settings.
	 * @param string $template  The message, plain text.
	 * @param string $reference The record's reference ('' when none).
	 * @param array  $answers   [ key => [ label, text ] ] in form order.
	 *
	 * @return array{body:string,html:bool}
	 */
	public static function visitor( array $settings, string $template, string $reference, array $answers ): array {
		if ( 'html' !== ( $settings['email_style'] ?? 'html' ) ) {
			return [ 'body' => Settings::fill_message( $template, $reference, $answers ), 'html' => false ];
		}

		// The answers table and the reference box take the place of {summary} and {reference} written on a line of their
		// own; anything else in the text is filled in as text.
		$blocks = '';
		$shown_ref = false;
		$boxed = false;

		foreach ( preg_split( '/\n{2,}/', trim( str_replace( "\r", '', $template ) ) ) as $para ) {
			$para = trim( $para );

			if ( '{summary}' === $para ) {
				$blocks .= self::answers_table( $settings, $answers );
				continue;
			}

			if ( '' !== $reference && 1 === preg_match( '/^([^\n{]*)\{reference\}\s*$/', $para, $m ) ) {
				$blocks .= self::reference_box( $settings, $reference, trim( rtrim( trim( $m[1] ), ':' ) ) );
				$shown_ref = true;
				$boxed = true;
				continue;
			}

			$shown_ref = $shown_ref || false !== strpos( $para, '{reference}' );
			$text = Settings::fill_message( $para, $reference, $answers );
			$blocks .= '<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#344054;">' . nl2br( esc_html( $text ) ) . '</p>';
		}

		// The reference in its box on top: when the text does not have it, or as the form's "Reference in its own box" asks.
		if ( '' !== $reference && ! $boxed && ( ! $shown_ref || ! empty( $settings['done_ref_box'] ) ) ) {
			$blocks = self::reference_box( $settings, $reference, (string) ( $settings['done_ref_label'] ?? '' ) ) . $blocks;
		}

		$heading = '' !== (string) ( $settings['done_heading'] ?? '' ) ? (string) $settings['done_heading'] : __( 'Thank you', 'refraction' );

		return [ 'body' => self::document( $settings, $heading, $blocks ), 'html' => true ];
	}

	/**
	 * The office's notice: the reference, every answer and a link to the record.
	 *
	 * @return array{body:string,html:bool}
	 */
	public static function office( array $settings, string $title, string $reference, array $answers, string $link ): array {
		if ( 'html' !== ( $settings['email_style'] ?? 'html' ) ) {
			$lines = '' !== $reference ? [ __( 'Reference', 'refraction' ) . ': ' . $reference ] : [];

			foreach ( $answers as $row ) {
				$lines[] = $row[0] . ': ' . $row[1];
			}

			return [ 'body' => implode( "\n", $lines ) . "\n\n" . $link, 'html' => false ];
		}

		$blocks = ( '' !== $reference ? self::reference_box( $settings, $reference, __( 'Reference', 'refraction' ) ) : '' )
			. self::answers_table( $settings, $answers )
			. ( '' !== $link ? self::button( $settings, $link, __( 'Open the record', 'refraction' ) ) : '' );

		return [ 'body' => self::document( $settings, $title, $blocks ), 'html' => true ];
	}

	private static function accent( array $settings ): string {
		$color = (string) sanitize_hex_color( (string) ( $settings['email_accent'] ?? '' ) );

		return '' !== $color ? $color : '#1d4ed8';
	}

	private static function reference_box( array $settings, string $reference, string $label ): string {
		$accent = self::accent( $settings );

		return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-collapse:separate;"><tr><td style="padding:16px 20px;border:1px solid ' . esc_attr( $accent ) . ';border-left:4px solid ' . esc_attr( $accent ) . ';border-radius:8px;background:#f8fafc;">'
			. ( '' !== $label ? '<div style="margin:0 0 4px;font-size:12px;letter-spacing:.04em;color:#667085;">' . esc_html( $label ) . '</div>' : '' )
			. '<div class="rfb-email-reference" style="font-size:22px;font-weight:700;letter-spacing:.06em;color:' . esc_attr( $accent ) . ';font-family:Menlo,Consolas,monospace;">' . esc_html( $reference ) . '</div>'
			. ( '' !== (string) ( $settings['done_note'] ?? '' ) ? '<div style="margin-top:6px;font-size:13px;color:#667085;">' . esc_html( $settings['done_note'] ) . '</div>' : '' )
			. '</td></tr></table>';
	}

	private static function answers_table( array $settings, array $answers ): string {
		$rows = '';

		foreach ( $answers as $row ) {
			if ( '' === (string) $row[1] ) {
				continue;
			}

			$rows .= '<tr><td style="padding:10px 12px;border-bottom:1px solid #eaecf0;font-size:13px;color:#667085;vertical-align:top;width:38%;">' . esc_html( (string) $row[0] ) . '</td>'
				. '<td style="padding:10px 12px;border-bottom:1px solid #eaecf0;font-size:14px;color:#101828;vertical-align:top;">' . nl2br( esc_html( (string) $row[1] ) ) . '</td></tr>';
		}

		return '' === $rows ? '' : '<table class="rfb-email-answers" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;border-collapse:collapse;border-top:2px solid ' . esc_attr( self::accent( $settings ) ) . ';">' . $rows . '</table>';
	}

	private static function button( array $settings, string $url, string $label ): string {
		return '<p style="margin:8px 0 20px;"><a href="' . esc_url( $url ) . '" style="display:inline-block;padding:12px 22px;border-radius:8px;background:' . esc_attr( self::accent( $settings ) ) . ';color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">' . esc_html( $label ) . '</a></p>';
	}

	private static function document( array $settings, string $heading, string $blocks ): string {
		$accent = self::accent( $settings );
		$site = get_bloginfo( 'name' );
		$logo = (string) ( $settings['email_logo'] ?? '' );
		$brand = '' !== $logo
			? '<img src="' . esc_url( $logo ) . '" alt="' . esc_attr( $site ) . '" style="display:block;max-width:180px;max-height:60px;border:0;">'
			: '<span style="font-size:18px;font-weight:700;color:#101828;">' . esc_html( $site ) . '</span>';
		$footer = (string) ( $settings['email_footer'] ?? '' );

		return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . esc_html( $heading ) . '</title></head>'
			. '<body style="margin:0;padding:0;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;">'
			. '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f4f7;"><tr><td align="center" style="padding:32px 12px;">'
			. '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border-top:4px solid ' . esc_attr( $accent ) . ';">'
			. '<tr><td style="padding:24px 32px 8px;">' . $brand . '</td></tr>'
			. '<tr><td style="padding:8px 32px 8px;"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#101828;">' . esc_html( $heading ) . '</h1>' . $blocks . '</td></tr>'
			. ( '' !== $footer ? '<tr><td style="padding:16px 32px 24px;border-top:1px solid #eaecf0;font-size:12px;line-height:1.6;color:#667085;">' . nl2br( esc_html( $footer ) ) . '</td></tr>' : '<tr><td style="padding:0 0 16px;"></td></tr>' )
			. '</table></td></tr></table></body></html>';
	}
}
