<?php
namespace Refraction\Modules\AskClaude\Classes;

use Refraction\Vendor\Anthropic\Client;
use Refraction\Vendor\Anthropic\Core\Exceptions\APIConnectionException;
use Refraction\Vendor\Anthropic\Core\Exceptions\APIStatusException;
use Refraction\Vendor\Anthropic\Core\Exceptions\AuthenticationException;
use Refraction\Vendor\Anthropic\Core\Exceptions\BadRequestException;
use Refraction\Vendor\Anthropic\Core\Exceptions\PermissionDeniedException;
use Refraction\Vendor\Anthropic\Core\Exceptions\RateLimitException;
use Refraction\Vendor\Http\Discovery\Psr18ClientDiscovery;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Asks Claude to build page content from Refraction's widgets, through the official Anthropic PHP SDK (bundled with
 * a prefixed namespace in vendor-prefixed/claude-sdk). Claude looks up the controls of the widgets it wants to use and
 * the images in the library with tools, then submits the elements, which are cleaned by Layout_Sanitizer. PHP 8.1+.
 */
class Claude_Builder {

	const MAX_TURNS = 10;
	const MAX_TOKENS = 32000;

	private Widget_Specs $specs;

	private array $usage = [ 'input' => 0, 'output' => 0, 'cache_read' => 0 ];

	public function __construct( Widget_Specs $specs ) {
		$this->specs = $specs;
	}

	private function client(): Client {
		static $registered = false;

		if ( ! $registered ) {
			Psr18ClientDiscovery::prependStrategy( Discovery_Strategy::class );
			$registered = true;
		}

		// Tests point the SDK at a local fake API with this constant; sites never set it.
		$base = defined( 'REFRACTION_CLAUDE_BASE_URL' ) ? (string) REFRACTION_CLAUDE_BASE_URL : null;

		return new Client( apiKey: Key_Store::key(), baseUrl: $base, requestOptions: [ 'timeout' => 600, 'maxRetries' => 1 ] );
	}

	private function tools(): array {
		return [
			[
				'name' => 'get_widget_controls',
				'description' => 'Returns the settings (controls) of up to 12 widgets, or of "container": each control\'s type, label, allowed options, units and default. Call it for every element type you will use before submitting, and use only these setting names and option values.',
				'input_schema' => [ 'type' => 'object', 'properties' => [ 'widgets' => [ 'type' => 'array', 'items' => [ 'type' => 'string' ], 'description' => 'Widget names from the catalog, or "container".' ] ], 'required' => [ 'widgets' ] ],
			],
			[
				'name' => 'list_images',
				'description' => 'Lists images already in the site\'s media library (id, title, alt text, size), newest first, optionally matching a search. Image settings may only use these ids.',
				'input_schema' => [ 'type' => 'object', 'properties' => [ 'search' => [ 'type' => 'string' ] ] ],
			],
			[
				'name' => 'submit_elements',
				'description' => 'Submits the finished result. Call it exactly once, at the end.',
				'input_schema' => [
					'type' => 'object',
					'properties' => [
						'elements' => [ 'type' => 'array', 'items' => [ 'type' => 'object' ], 'description' => 'Element tree (see the format in the instructions).' ],
						'summary' => [ 'type' => 'string', 'description' => 'Two or three sentences for the user: what you built and anything they should replace (placeholders, images).' ],
					],
					'required' => [ 'elements', 'summary' ],
				],
			],
		];
	}

	/**
	 * @param array $request [ prompt, mode: page|section|selected, context (JSON string of the page or the selected element), images: [ [ media_type, data ] ], model, use_styles ]
	 * @return array [ elements, summary, dropped, usage ] or [ error ]
	 */
	public function generate( array $request ): array {
		$mode = $request['mode'];
		$content = [];

		foreach ( $request['images'] as $image ) {
			$content[] = [ 'type' => 'image', 'source' => [ 'type' => 'base64', 'media_type' => $image['media_type'], 'data' => $image['data'] ] ];
		}

		$content[] = [ 'type' => 'text', 'text' => Prompt_Builder::request( $mode, $request['prompt'], $request['context'], $request['images'] ? 'The attached images are references for layout, colors and mood; do not copy text or logos from them.' : '' ) ];
		$messages = [ [ 'role' => 'user', 'content' => $content ] ];
		$model = $request['model'];
		$system = [ [ 'type' => 'text', 'text' => Prompt_Builder::api_system( $this->specs, (bool) $request['use_styles'] ), 'cache_control' => [ 'type' => 'ephemeral' ] ] ];
		$fallback = in_array( $model, [ 'claude-opus-5-5', 'claude-sonnet-5-5' ], true );
		$client = $this->client();
		$reminded = false;
		$retried = false;

		for ( $turn = 0; $turn < self::MAX_TURNS; $turn++ ) {
			try {
				$message = $client->beta->messages->create(
					maxTokens: self::MAX_TOKENS,
					messages: $messages,
					model: $model,
					system: $system,
					tools: $this->tools(),
					toolChoice: [ 'type' => 'auto' ],
					outputConfig: [ 'effort' => 'high' ],
					fallbacks: $fallback ? 'default' : null,
					betas: $fallback ? [ 'server-side-fallback-2026-07-01' ] : null,
				);
			} catch ( AuthenticationException | PermissionDeniedException $e ) {
				return [ 'error' => __( 'Claude refused the API key. Check it under Settings in the Ask Claude panel.', 'refraction' ), 'status' => 401 ];
			} catch ( RateLimitException $e ) {
				return [ 'error' => __( 'Claude is busy or the account reached its rate limit. Try again in a minute.', 'refraction' ), 'status' => 429 ];
			} catch ( BadRequestException $e ) {
				return [ 'error' => self::explain( $e ), 'status' => 400 ];
			} catch ( APIStatusException $e ) {
				return [ 'error' => self::explain( $e ), 'status' => 502 ];
			} catch ( APIConnectionException $e ) {
				return [ 'error' => __( 'The site could not reach Claude: ', 'refraction' ) . self::short( $e->getMessage() ), 'status' => 502 ];
			}

			$this->count( $message );

			if ( 'refusal' === $message->stopReason ) {
				return [ 'error' => __( 'Claude declined this request. Try describing it differently.', 'refraction' ), 'status' => 422 ];
			}

			if ( 'max_tokens' === $message->stopReason ) {
				return [ 'error' => __( 'The result was too long. Ask for less at once (for example one section).', 'refraction' ), 'status' => 422 ];
			}

			$messages[] = [ 'role' => 'assistant', 'content' => self::echo_content( $message->content ) ];
			$results = [];

			foreach ( $message->content as $block ) {
				if ( 'tool_use' !== $block->type ) {
					continue;
				}

				if ( 'submit_elements' === $block->name ) {
					[ $elements, $dropped, $ok ] = Prompt_Builder::clean( $this->specs, $block->input['elements'] ?? [], $mode );
					$wrong = ! $ok;

					if ( $wrong && ! $retried ) {
						$retried = true;
						$results[] = [ 'type' => 'tool_result', 'tool_use_id' => $block->id, 'is_error' => true, 'content' => 'selected' === $mode ? 'Submit exactly one valid element.' : 'No valid element was left after checking. Dropped: ' . implode( '; ', $dropped ) . '. Use only catalog widgets and the controls from get_widget_controls.' ];
						continue;
					}

					if ( $wrong ) {
						return [ 'error' => __( 'Claude did not return anything usable. Try again with a clearer request.', 'refraction' ), 'status' => 422 ];
					}

					return [ 'elements' => $elements, 'summary' => sanitize_textarea_field( (string) ( $block->input['summary'] ?? '' ) ), 'dropped' => $dropped, 'usage' => $this->usage + [ 'model' => $message->model ] ];
				}

				$results[] = [ 'type' => 'tool_result', 'tool_use_id' => $block->id, 'content' => (string) wp_json_encode( $this->run_tool( $block->name, (array) $block->input ) ) ];
			}

			if ( ! $results ) {
				if ( $reminded ) {
					break;
				}

				$reminded = true;
				$results[] = [ 'type' => 'text', 'text' => 'Please call submit_elements with the finished result.' ];
			}

			$messages[] = [ 'role' => 'user', 'content' => $results ];
		}

		return [ 'error' => __( 'Claude did not finish. Try again, or ask for a smaller part of the page.', 'refraction' ), 'status' => 422 ];
	}

	private function run_tool( string $name, array $input ) {
		if ( 'get_widget_controls' === $name ) {
			return $this->specs->describe( (array) ( $input['widgets'] ?? [] ) );
		}

		if ( 'list_images' === $name ) {
			return Widget_Specs::images( sanitize_text_field( (string) ( $input['search'] ?? '' ) ) );
		}

		return [ 'error' => 'unknown tool' ];
	}

	/**
	 * The assistant turn as it must be sent back: thinking blocks unchanged (with their signatures), text and tool
	 * calls; after a server-side fallback, only text from before the fallback marker (which itself is dropped).
	 */
	public static function echo_content( array $blocks ): array {
		$last = -1;

		foreach ( $blocks as $i => $block ) {
			if ( 'fallback' === $block->type ) {
				$last = $i;
			}
		}

		$out = [];

		foreach ( $blocks as $i => $block ) {
			if ( $i <= $last && 'text' !== $block->type ) {
				continue;
			}

			switch ( $block->type ) {
				case 'text':
					$out[] = [ 'type' => 'text', 'text' => $block->text ];
					break;
				case 'thinking':
					$out[] = [ 'type' => 'thinking', 'thinking' => $block->thinking, 'signature' => $block->signature ];
					break;
				case 'redacted_thinking':
					$out[] = [ 'type' => 'redacted_thinking', 'data' => $block->data ];
					break;
				case 'tool_use':
					$out[] = [ 'type' => 'tool_use', 'id' => $block->id, 'name' => $block->name, 'input' => (object) $block->input ];
					break;
			}
		}

		return $out;
	}

	private function count( $message ): void {
		$this->usage['input'] += (int) ( $message->usage->inputTokens ?? 0 );
		$this->usage['output'] += (int) ( $message->usage->outputTokens ?? 0 );
		$this->usage['cache_read'] += (int) ( $message->usage->cacheReadInputTokens ?? 0 );
	}

	/** Anthropic's own one-line message of an error response (not the whole JSON). */
	public static function api_message( $body ): string {
		$message = is_array( $body ) ? ( $body['error']['message'] ?? '' ) : '';

		return is_string( $message ) ? self::short( $message ) : '';
	}

	/** A plain message for an error from Anthropic, with what to do about it. */
	public static function explain( APIStatusException $e ): string {
		$message = self::api_message( $e->body );

		if ( false !== stripos( $message, 'credit balance' ) ) {
			return __( 'The Anthropic account of this API key has no credit left. Add credit at console.anthropic.com (Settings > Billing), then try again. A Claude.ai subscription does not include API credit.', 'refraction' );
		}

		if ( in_array( (int) $e->status, [ 500, 503, 529 ], true ) ) {
			return __( 'Claude is busy right now. Try again in a minute.', 'refraction' );
		}

		if ( '' === $message ) {
			return __( 'Claude answered with an error. Try again.', 'refraction' ) . ' (' . (int) $e->status . ')';
		}

		return __( 'Claude could not take this request: ', 'refraction' ) . $message;
	}

	private static function short( string $text ): string {
		return substr( wp_strip_all_tags( $text ), 0, 300 );
	}
}
