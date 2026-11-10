<?php
namespace Refraction\Modules\AskClaude\Classes;

use Refraction\Modules\AskClaude\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * REST routes of the Ask Claude panel (refraction/v1/ask-claude): generate, and chat-prompt and chat-import for the
 * Claude.ai chat mode (anyone who may edit that page), and the key and default model (administrators). Every route
 * checks the cookie nonce through the REST API.
 */
class Rest {

	const NS = 'refraction/v1';
	const HOURLY_LIMIT = 40;
	const MAX_IMAGES = 4;
	/** A full brief (sections, copy, stages) fits easily: about 15,000 tokens. */
	const MAX_PROMPT = 60000;
	const MAX_CONTEXT = 60000;

	public function register(): void {
		register_rest_route( self::NS, '/ask-claude/generate', [
			'methods' => 'POST',
			'callback' => [ $this, 'generate' ],
			'permission_callback' => static function ( \WP_REST_Request $request ) {
				return Module::can_use() && current_user_can( 'edit_post', (int) $request->get_param( 'post_id' ) );
			},
		] );
		// The Claude.ai chat mode: the site builds the prompt and checks the pasted answer; it calls nobody.
		foreach ( [ 'chat-prompt' => 'chat_prompt', 'chat-import' => 'chat_import' ] as $route => $method ) {
			register_rest_route( self::NS, '/ask-claude/' . $route, [
				'methods' => 'POST',
				'callback' => [ $this, $method ],
				'permission_callback' => static function ( \WP_REST_Request $request ) {
					return Module::can_use() && current_user_can( 'edit_post', (int) $request->get_param( 'post_id' ) );
				},
			] );
		}

		register_rest_route( self::NS, '/ask-claude/settings', [
			[
				'methods' => 'POST',
				'callback' => [ $this, 'save_settings' ],
				'permission_callback' => static function () {
					return current_user_can( 'manage_options' );
				},
			],
			[
				'methods' => 'DELETE',
				'callback' => [ $this, 'delete_key' ],
				'permission_callback' => static function () {
					return current_user_can( 'manage_options' );
				},
			],
		] );
	}

	private static function error( string $message, int $status ): \WP_Error {
		return new \WP_Error( 'refraction_ask_claude', $message, [ 'status' => $status ] );
	}

	public function save_settings( \WP_REST_Request $request ) {
		if ( ! Module::php_ok() ) {
			return self::error( __( 'Ask Claude needs PHP 8.1 or newer with the sodium extension.', 'refraction' ), 400 );
		}

		$key = trim( (string) $request->get_param( 'key' ) );

		if ( '' !== $key ) {
			if ( ! Key_Store::looks_valid( $key ) ) {
				return self::error( __( 'That does not look like an Anthropic API key (it starts with sk-ant-).', 'refraction' ), 400 );
			}

			Key_Store::save_key( $key );
		}

		if ( null !== $request->get_param( 'model' ) ) {
			Key_Store::save_model( (string) $request->get_param( 'model' ) );
		}

		return [ 'hasKey' => Key_Store::has_key(), 'masked' => Key_Store::masked(), 'model' => Key_Store::model() ];
	}

	public function delete_key() {
		Key_Store::delete_key();

		return [ 'hasKey' => false, 'masked' => '' ];
	}

	/** Reference images: library images only, scaled to at most 1568 px, sent as base64. */
	private static function images( array $ids ): array {
		require_once ABSPATH . 'wp-admin/includes/file.php';
		$out = [];

		foreach ( array_slice( array_unique( array_map( 'intval', $ids ) ), 0, self::MAX_IMAGES ) as $id ) {
			$file = $id > 0 && wp_attachment_is_image( $id ) && current_user_can( 'read_post', $id ) ? get_attached_file( $id ) : '';

			if ( ! $file || ! is_readable( $file ) ) {
				continue;
			}

			$editor = wp_get_image_editor( $file );

			if ( is_wp_error( $editor ) ) {
				continue;
			}

			$editor->resize( 1568, 1568, false );
			$saved = $editor->save( wp_tempnam( 'rf-claude' ) . '.jpg', 'image/jpeg' );

			if ( is_wp_error( $saved ) || empty( $saved['path'] ) ) {
				continue;
			}

			$data = (string) file_get_contents( $saved['path'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
			wp_delete_file( $saved['path'] );
			$out[] = [ 'media_type' => 'image/jpeg', 'data' => base64_encode( $data ) ]; // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		}

		return $out;
	}

	/** The description and mode of a request, or an error. */
	private static function brief( \WP_REST_Request $request ) {
		$prompt = trim( sanitize_textarea_field( (string) $request->get_param( 'prompt' ) ) );
		$mode = (string) $request->get_param( 'mode' );

		if ( '' === $prompt ) {
			return self::error( __( 'Describe what Claude should build.', 'refraction' ), 400 );
		}

		if ( mb_strlen( $prompt ) > self::MAX_PROMPT ) {
			/* translators: %s: Maximum number of characters. */
			return self::error( sprintf( __( 'The description is longer than %s characters. Shorten it, or build the page in two parts with "Add a section".', 'refraction' ), number_format_i18n( self::MAX_PROMPT ) ), 400 );
		}

		if ( ! in_array( $mode, [ 'page', 'section', 'selected' ], true ) ) {
			return self::error( __( 'Unknown mode.', 'refraction' ), 400 );
		}

		return [ $prompt, $mode ];
	}

	/** The whole prompt to paste into a Claude.ai chat, with every widget's controls (no tools there). */
	public function chat_prompt( \WP_REST_Request $request ) {
		$brief = self::brief( $request );

		if ( is_wp_error( $brief ) ) {
			return $brief;
		}

		[ $prompt, $mode ] = $brief;
		$text = Prompt_Builder::chat( new Widget_Specs( (int) $request->get_param( 'post_id' ) ), [
			'prompt' => $prompt,
			'mode' => $mode,
			'context' => 'page' === $mode ? '' : substr( (string) $request->get_param( 'context' ), 0, self::MAX_CONTEXT ),
			'use_styles' => (bool) $request->get_param( 'use_styles' ),
		] );

		// About four characters per token: shown so people know what the chat will count against their plan.
		return [ 'text' => $text, 'tokens' => (int) ceil( strlen( $text ) / 4 ) ];
	}

	/** Checks the answer pasted from the chat, exactly like an answer from the API. */
	public function chat_import( \WP_REST_Request $request ) {
		$mode = (string) $request->get_param( 'mode' );
		$answer = (string) $request->get_param( 'answer' );

		if ( ! in_array( $mode, [ 'page', 'section', 'selected' ], true ) ) {
			return self::error( __( 'Unknown mode.', 'refraction' ), 400 );
		}

		if ( strlen( $answer ) > Prompt_Builder::MAX_ANSWER ) {
			return self::error( __( 'That answer is too long to insert. Build the page in parts with "Add a section".', 'refraction' ), 400 );
		}

		$parsed = Prompt_Builder::parse_answer( $answer );

		if ( ! $parsed ) {
			return self::error( __( 'No complete JSON was found in that answer. Copy Claude\'s whole reply (the code block). If the reply stopped halfway, ask Claude to "continue", or build the page in parts with "Add a section".', 'refraction' ), 422 );
		}

		[ $elements, $dropped, $ok ] = Prompt_Builder::clean( new Widget_Specs( (int) $request->get_param( 'post_id' ) ), $parsed['elements'], $mode );

		if ( ! $ok ) {
			return self::error( 'selected' === $mode ? __( 'The answer must hold exactly one element to replace the selected one.', 'refraction' ) : __( 'Nothing in that answer could be used: it has no elements Refraction knows.', 'refraction' ), 422 );
		}

		$page_settings = 'page' === $mode ? Prompt_Builder::clean_page( new Widget_Specs( (int) $request->get_param( 'post_id' ) ), $parsed['page_settings'] ?? [] )[0] : [];

		return [ 'elements' => $elements, 'summary' => sanitize_textarea_field( $parsed['summary'] ), 'dropped' => $dropped, 'page_settings' => (object) $page_settings ];
	}

	public function generate( \WP_REST_Request $request ) {
		if ( ! Module::php_ok() ) {
			return self::error( __( 'Ask Claude needs PHP 8.1 or newer with the sodium extension.', 'refraction' ), 400 );
		}

		if ( ! Key_Store::has_key() ) {
			return self::error( __( 'Add an Anthropic API key first (an administrator can do it in this panel).', 'refraction' ), 400 );
		}

		$brief = self::brief( $request );

		if ( is_wp_error( $brief ) ) {
			return $brief;
		}

		[ $prompt, $mode ] = $brief;

		// Every generation spends credits on the site's key: a cap per person per hour.
		$count_key = 'rf_ask_claude_' . get_current_user_id();
		$count = (int) get_transient( $count_key );

		if ( $count >= self::HOURLY_LIMIT ) {
			return self::error( __( 'You reached the limit of requests for this hour. Try again later.', 'refraction' ), 429 );
		}

		set_transient( $count_key, $count + 1, HOUR_IN_SECONDS );
		$model = (string) $request->get_param( 'model' );
		$context = (string) $request->get_param( 'context' );

		if ( function_exists( 'set_time_limit' ) ) {
			set_time_limit( 900 ); // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- A page can take minutes to build.
		}

		require_once __DIR__ . '/../sdk.php';

		$builder = new Claude_Builder( new Widget_Specs( (int) $request->get_param( 'post_id' ) ) );
		$result = $builder->generate( [
			'prompt' => $prompt,
			'mode' => $mode,
			'context' => 'page' === $mode ? '' : substr( $context, 0, self::MAX_CONTEXT ),
			'images' => self::images( (array) $request->get_param( 'images' ) ),
			'model' => in_array( $model, Key_Store::MODELS, true ) ? $model : Key_Store::model(),
			'use_styles' => (bool) $request->get_param( 'use_styles' ),
		] );

		if ( isset( $result['error'] ) ) {
			return new \WP_Error( ! empty( $result['code'] ) ? $result['code'] : 'refraction_ask_claude', $result['error'], [ 'status' => (int) ( $result['status'] ?? 500 ) ] );
		}

		return $result;
	}
}
