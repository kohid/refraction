<?php
namespace Refraction\Modules\AskClaude\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction as an MCP server (Model Context Protocol, Streamable HTTP transport, stateless JSON responses) at
 * /wp-json/refraction/v1/mcp. Claude Code (on the person's own Claude plan) connects with an Application Password,
 * reads the widgets, pages and media, and builds drafts it can preview and compare in a browser (Mcp_Tools).
 * JSON-RPC 2.0: initialize, ping, tools/list, tools/call; notifications get 202. The site makes no outbound call.
 */
class Mcp_Server {

	const VERSIONS = [ '2025-06-18', '2025-03-26', '2024-11-05' ];

	public function register(): void {
		register_rest_route( Queue_Rest::NS, '/mcp', [
			[
				'methods' => 'POST',
				'callback' => [ $this, 'handle' ],
				'permission_callback' => [ self::class, 'allowed' ],
			],
			[
				// Server-sent events are not offered; clients then use plain POST responses.
				'methods' => 'GET',
				'callback' => static function () {
					return new \WP_REST_Response( null, 405 );
				},
				'permission_callback' => '__return_true',
			],
		] );
	}

	public static function allowed(): bool {
		return is_user_logged_in() && ( Job_Queue::can_build() || current_user_can( 'edit_pages' ) );
	}

	private static function reply( $id, array $result ): array {
		return [ 'jsonrpc' => '2.0', 'id' => $id, 'result' => $result ];
	}

	private static function fail( $id, int $code, string $message ): array {
		return [ 'jsonrpc' => '2.0', 'id' => $id, 'error' => [ 'code' => $code, 'message' => $message ] ];
	}

	public function handle( \WP_REST_Request $request ) {
		$message = json_decode( (string) $request->get_body(), true );

		if ( ! is_array( $message ) ) {
			return new \WP_REST_Response( self::fail( null, -32700, 'Parse error' ), 200 );
		}

		// A batch (older protocol versions): answer each request in it.
		if ( array_values( $message ) === $message ) {
			$out = array_values( array_filter( array_map( [ $this, 'one' ], $message ) ) );

			return $out ? new \WP_REST_Response( $out, 200 ) : new \WP_REST_Response( null, 202 );
		}

		$out = $this->one( $message );

		return null === $out ? new \WP_REST_Response( null, 202 ) : new \WP_REST_Response( $out, 200 );
	}

	/** @return array|null The response, or null for a notification. */
	public function one( $message ): ?array {
		if ( ! is_array( $message ) || '2.0' !== ( $message['jsonrpc'] ?? '' ) || ! is_string( $message['method'] ?? null ) ) {
			return self::fail( $message['id'] ?? null, -32600, 'Invalid request' );
		}

		if ( ! array_key_exists( 'id', $message ) ) {
			return null;
		}

		$id = $message['id'];
		$params = is_array( $message['params'] ?? null ) ? $message['params'] : [];

		switch ( $message['method'] ) {
			case 'initialize':
				$asked = (string) ( $params['protocolVersion'] ?? '' );

				return self::reply( $id, [
					'protocolVersion' => in_array( $asked, self::VERSIONS, true ) ? $asked : self::VERSIONS[0],
					'capabilities' => [ 'tools' => [ 'listChanged' => false ] ],
					'serverInfo' => [ 'name' => 'refraction', 'title' => 'Refraction page builder', 'version' => REFRACTION_VERSION ],
					'instructions' => 'Build pages for this WordPress site with Refraction\'s own widgets. Start with get_format, get_site and list_widgets; look up settings with get_widget_controls; use library files from list_media (upload_media adds files). Build with save_draft, open its preview link in a browser, compare with the reference and save again until it matches; then propose_to_page offers the result to an existing page. Ask Claude requests from the editor: list_requests, get_request, answer_request.',
				] );
			case 'ping':
				return self::reply( $id, (object) [] );
			case 'tools/list':
				return self::reply( $id, [ 'tools' => Mcp_Tools::definitions() ] );
			case 'tools/call':
				$name = (string) ( $params['name'] ?? '' );
				[ $data, $is_error ] = Mcp_Tools::call( $name, is_array( $params['arguments'] ?? null ) ? $params['arguments'] : [] );

				return self::reply( $id, [
					'content' => [ [ 'type' => 'text', 'text' => is_string( $data ) ? $data : (string) wp_json_encode( $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) ] ],
					'isError' => $is_error,
				] );
			default:
				return self::fail( $id, -32601, 'Method not found: ' . $message['method'] );
		}
	}
}
