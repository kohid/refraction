<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Request bodies for the Webhook, Discord and Slack actions.
 *
 * $ctx = ['fields' => ..., 'extra' => ..., 'meta' => [form_id, form_name, submission_id, page_url, submitted_at]]
 */
final class Webhook_Payload {

	public static function is_valid_url( string $url ): bool {
		if ( '' === $url || preg_match( '/[\x00-\x20]/', $url ) ) {
			return false;
		}

		$parts = parse_url( $url );

		return false !== $parts && in_array( strtolower( (string) ( $parts['scheme'] ?? '' ) ), [ 'http', 'https' ], true ) && ! empty( $parts['host'] ) && false !== filter_var( $url, FILTER_VALIDATE_URL );
	}

	/** @return array{body: string, content_type: string} */
	public static function build( array $cfg, array $ctx ): array {
		$type = (string) ( $cfg['type'] ?? 'webhook' );
		$meta = (array) ( $ctx['meta'] ?? [] );
		$fields = [];
		$labels = [];

		foreach ( $ctx['fields'] as $id => $field ) {
			if ( 'password' === ( $field['type'] ?? '' ) ) {
				continue;
			}

			$fields[ $id ] = (string) $field['value'];
			$labels[ $id ] = (string) $field['label'];
		}

		if ( 'discord' === $type || 'slack' === $type ) {
			$ctx['extra'] = array_merge( (array) ( $ctx['extra'] ?? [] ), $meta );
			$template = (string) ( $cfg['webhook_message'] ?? '' );
			$template = '' !== trim( $template ) ? $template : "New submission from [form_name]:\n[all-fields]";
			$text = Template_Tags::render( $template, $ctx, 'plain' );

			return 'discord' === $type
				? [ 'body' => (string) wp_json_encode_safe( [ 'content' => mb_substr( $text, 0, 2000 ) ] ), 'content_type' => 'application/json' ]
				: [ 'body' => (string) wp_json_encode_safe( [ 'text' => mb_substr( $text, 0, 3000 ) ] ), 'content_type' => 'application/json' ];
		}

		if ( 'form' === ( $cfg['webhook_format'] ?? 'json' ) ) {
			return [
				'body' => http_build_query( [
					'form_id' => $meta['form_id'] ?? '',
					'form_name' => $meta['form_name'] ?? '',
					'submission_id' => $meta['submission_id'] ?? '',
					'page_url' => $meta['page_url'] ?? '',
					'submitted_at' => $meta['submitted_at'] ?? '',
					'fields' => $fields,
				] ),
				'content_type' => 'application/x-www-form-urlencoded',
			];
		}

		return [
			'body' => (string) wp_json_encode_safe( [
				'form' => [ 'id' => $meta['form_id'] ?? '', 'name' => $meta['form_name'] ?? '' ],
				'submission_id' => $meta['submission_id'] ?? null,
				'page_url' => $meta['page_url'] ?? '',
				'submitted_at' => $meta['submitted_at'] ?? '',
				'fields' => (object) $fields,
				'labels' => (object) $labels,
			] ),
			'content_type' => 'application/json',
		];
	}
}

/** wp_json_encode() when WordPress is loaded, json_encode() otherwise (standalone tests). */
function wp_json_encode_safe( $data ) {
	return function_exists( 'wp_json_encode' ) ? wp_json_encode( $data ) : json_encode( $data, JSON_UNESCAPED_SLASHES );
}
