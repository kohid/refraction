<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Replaces [field id="..."], [all-fields] and a few site tags in an owner-written template.
 *
 * One pass only: tags inside submitted values are never expanded. Modes: plain (text), html (values
 * escaped), url (values URL-encoded). Password fields never appear.
 *
 * $ctx = ['fields' => [id => ['label', 'value', 'type']], 'extra' => [tag => value]]
 */
final class Template_Tags {

	public static function render( string $template, array $ctx, string $mode = 'plain' ): string {
		$pattern = '/\[(?:field\s+id\s*=\s*(?:"([^"]*)"|\'([^\']*)\')\s*|([a-z][a-z_\-]*))\]/i';

		return (string) preg_replace_callback(
			$pattern,
			function ( $m ) use ( $ctx, $mode ) {
				if ( isset( $m[3] ) && '' !== $m[3] ) {
					$name = strtolower( $m[3] );

					if ( 'all-fields' === $name ) {
						return self::all_fields( $ctx, $mode );
					}

					$extra = $name;
					$key = isset( $ctx['extra'][ $extra ] ) ? $extra : str_replace( '-', '_', $extra );

					return isset( $ctx['extra'][ $key ] ) ? self::escape( (string) $ctx['extra'][ $key ], $mode ) : $m[0];
				}

				$id = '' !== ( $m[1] ?? '' ) ? $m[1] : ( $m[2] ?? '' );
				$field = $ctx['fields'][ $id ] ?? null;

				if ( ! $field || 'password' === ( $field['type'] ?? '' ) ) {
					return '';
				}

				return self::escape( (string) $field['value'], $mode );
			},
			$template
		);
	}

	private static function escape( string $value, string $mode ): string {
		if ( 'html' === $mode ) {
			return htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
		}

		return 'url' === $mode ? urlencode( $value ) : $value;
	}

	private static function all_fields( array $ctx, string $mode ): string {
		$rows = [];

		foreach ( $ctx['fields'] as $field ) {
			if ( 'password' !== ( $field['type'] ?? '' ) ) {
				$rows[] = $field;
			}
		}

		if ( 'html' === $mode ) {
			$html = '<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;border:1px solid #ddd">';

			foreach ( $rows as $row ) {
				$html .= '<tr><th align="left" valign="top" style="border:1px solid #ddd;background:#f6f7f7">' . htmlspecialchars( (string) $row['label'], ENT_QUOTES, 'UTF-8' ) . '</th><td style="border:1px solid #ddd">' . nl2br( htmlspecialchars( (string) $row['value'], ENT_QUOTES, 'UTF-8' ) ) . '</td></tr>';
			}

			return $html . '</table>';
		}

		$lines = [];

		foreach ( $rows as $row ) {
			$lines[] = $row['label'] . ': ' . $row['value'];
		}

		return self::escape( implode( "\n", $lines ), $mode );
	}
}
