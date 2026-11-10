<?php
namespace Refraction\Modules\AskClaude\Classes;

use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The tools of Refraction's MCP server (Mcp_Server). They run as the user of the request (an Application Password),
 * with that user's capabilities; everything written goes through Layout_Sanitizer, like every other Ask Claude
 * result. Pages are only ever written as drafts made through this server (with a secret preview link), or proposed
 * to an existing page for its owner to insert from the Ask Claude panel.
 */
class Mcp_Tools {

	/** @return array[] name => [ description, input schema, callback ]. */
	public static function all(): array {
		$string = [ 'type' => 'string' ];
		$int = [ 'type' => 'integer' ];
		$elements = [ 'type' => 'array', 'items' => [ 'type' => 'object' ], 'description' => 'Element tree in Refraction\'s format (see get_format).' ];

		return [
			'get_format' => [ 'How to write Refraction elements (containers, widgets, setting values, group controls, responsive copies) and the content rules. Read it once before building.', [], 'format' ],
			'get_site' => [ 'The site: Refraction version, address, the global colors and fonts (use them through __globals__), and the page templates.', [], 'site' ],
			'list_widgets' => [ 'Every widget that may be used: name - title (keywords) [holds containers].', [], 'widgets' ],
			'get_widget_controls' => [ 'The settings of some widgets and/or "container", compact: name:type(allowed options), * when it has _tablet and _mobile copies; plus the fields of group controls and the settings every widget shares.', [ 'widgets' => [ 'type' => 'array', 'items' => $string ] ], 'controls', [ 'widgets' ] ],
			'list_media' => [ 'Files in the media library, newest first: id, title, alt, type, size, URL. Media settings take {"id": <id>}.', [ 'search' => $string, 'type' => [ 'type' => 'string', 'enum' => [ 'image', 'video', 'model', 'any' ] ] ], 'media' ],
			'upload_media' => [ 'Adds a file to the media library from a public URL or base64 data (images, video, .glb). Returns its id.', [ 'url' => $string, 'data' => [ 'type' => 'string', 'description' => 'Base64 file content.' ], 'filename' => $string, 'title' => $string, 'alt' => $string ], 'upload', [ 'filename' ] ],
			'list_pages' => [ 'Pages: id, title, status, address, whether Refraction edits them, and drafts made through this server.', [ 'search' => $string ], 'pages' ],
			'get_page' => [ 'A page\'s Refraction elements (the full tree as saved), title, status and template.', [ 'id' => $int ], 'page', [ 'id' ] ],
			'save_draft' => [ 'Creates (no id) or replaces (id of a draft made here) a draft page with these elements, checked like every Ask Claude result. Returns the preview link (opens without logging in) and what was left out. Never publishes.', [ 'id' => $int, 'title' => $string, 'elements' => $elements, 'template' => [ 'type' => 'string', 'enum' => [ 'canvas', 'full-width', 'default' ] ] ], 'save_draft', [ 'title', 'elements' ] ],
			'propose_to_page' => [ 'Offers these elements to an existing page: they appear as a ready request in that page\'s Ask Claude panel (Claude Code), for whoever edits the page to insert. mode page replaces the page, section adds them.', [ 'page_id' => $int, 'elements' => $elements, 'summary' => $string, 'mode' => [ 'type' => 'string', 'enum' => [ 'page', 'section' ] ] ], 'propose', [ 'page_id', 'elements', 'summary' ] ],
			'list_requests' => [ 'Ask Claude requests waiting for Claude Code (queued, or building for over 30 minutes).', [], 'requests' ],
			'get_request' => [ 'One request\'s full brief (the person\'s description, the page or element, and everything about the widgets). Marks it "Claude is building".', [ 'id' => $int ], 'request', [ 'id' ] ],
			'answer_request' => [ 'Sends the result of a request: {"elements": [...], "summary": "..."}, checked before it is stored. Refused (with the reason) when nothing usable is left; fix and send again.', [ 'id' => $int, 'elements' => $elements, 'summary' => $string ], 'answer', [ 'id', 'elements' ] ],
			'decline_request' => [ 'Declines a request with a note the person sees.', [ 'id' => $int, 'note' => $string ], 'decline', [ 'id', 'note' ] ],
		];
	}

	public static function definitions(): array {
		$out = [];

		foreach ( self::all() as $name => $tool ) {
			$out[] = [
				'name' => $name,
				'description' => $tool[0],
				'inputSchema' => [ 'type' => 'object', 'properties' => (object) $tool[1], 'required' => $tool[3] ?? [] ],
			];
		}

		return $out;
	}

	/** @return array [ result data, is error ]. */
	public static function call( string $name, array $args ): array {
		$tools = self::all();

		if ( ! isset( $tools[ $name ] ) ) {
			return [ 'Unknown tool ' . $name, true ];
		}

		foreach ( $tools[ $name ][3] ?? [] as $required ) {
			if ( ! isset( $args[ $required ] ) ) {
				return [ 'Missing argument: ' . $required, true ];
			}
		}

		$result = call_user_func( [ self::class, $tools[ $name ][2] ], $args );

		return is_wp_error( $result ) ? [ $result->get_error_message() . self::dropped_note( $result ), true ] : [ $result, false ];
	}

	private static function dropped_note( \WP_Error $error ): string {
		$data = $error->get_error_data();

		return is_array( $data ) && ! empty( $data['dropped'] ) ? ' Left out: ' . implode( '; ', $data['dropped'] ) : '';
	}

	private static function error( string $message, array $data = [] ): \WP_Error {
		return new \WP_Error( 'refraction_mcp', $message, $data );
	}

	private static function specs( int $post_id = 0 ): Widget_Specs {
		return new Widget_Specs( $post_id );
	}

	private static function format(): string {
		return implode( "\n\n", [ Prompt_Builder::INTRO, Prompt_Builder::FORMAT, Prompt_Builder::design(), 'Media settings take {"id": <library id>} from list_media (upload files with upload_media first). Section ids (_element_id) make anchors for links like {"url": "#about"}. Motion: rf_reveal* (enter animations, text split, scroll-scrubbed with rf_reveal_trigger "scroll"), rf_scroll_* (parallax presets and scroll effects), rf_sticky (pin). Build the page with save_draft, open the preview link in a browser, compare it with the reference, and save again until it matches.' ] );
	}

	private static function site(): array {
		$specs = self::specs();

		return [
			'refraction' => REFRACTION_VERSION,
			'url' => home_url( '/' ),
			'globals' => $specs->globals(),
			'templates' => [ 'canvas' => 'Only the page content (no theme header or footer)', 'full-width' => 'Theme header and footer, content full width', 'default' => 'The theme\'s own page template' ],
			'breakpoints' => [ 'mobile' => 767, 'tablet' => 1024 ],
		];
	}

	private static function widgets(): string {
		return self::specs()->catalog();
	}

	private static function controls( array $args ): string {
		$names = array_values( array_filter( array_map( 'strval', (array) $args['widgets'] ) ) );

		return Prompt_Builder::controls( self::specs(), $names ?: [ 'container' ] );
	}

	private static function media( array $args ): array {
		$types = [ 'image' => 'image', 'video' => 'video', 'model' => 'model/gltf-binary' ];
		$type = (string) ( $args['type'] ?? 'any' );
		$query = [ 'post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => 60, 'orderby' => 'date', 'order' => 'DESC' ];

		if ( isset( $types[ $type ] ) ) {
			$query['post_mime_type'] = $types[ $type ];
		}

		if ( ! empty( $args['search'] ) ) {
			$query['s'] = sanitize_text_field( (string) $args['search'] );
		}

		return array_map( static function ( $post ) {
			$meta = wp_get_attachment_metadata( $post->ID );

			return [ 'id' => $post->ID, 'title' => $post->post_title, 'alt' => (string) get_post_meta( $post->ID, '_wp_attachment_image_alt', true ), 'type' => $post->post_mime_type, 'width' => (int) ( $meta['width'] ?? 0 ), 'height' => (int) ( $meta['height'] ?? 0 ), 'url' => wp_get_attachment_url( $post->ID ) ];
		}, get_posts( $query ) );
	}

	private static function upload( array $args ) {
		if ( ! current_user_can( 'upload_files' ) ) {
			return self::error( 'This account may not upload files.' );
		}

		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$name = sanitize_file_name( (string) $args['filename'] );

		if ( ! empty( $args['url'] ) ) {
			$tmp = download_url( esc_url_raw( (string) $args['url'] ), 120 );
		} elseif ( ! empty( $args['data'] ) ) {
			$bytes = base64_decode( (string) $args['data'], true ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
			$tmp = false === $bytes ? self::error( 'data is not base64.' ) : wp_tempnam( $name );

			if ( ! is_wp_error( $tmp ) ) {
				file_put_contents( $tmp, $bytes ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			}
		} else {
			return self::error( 'Give url or data.' );
		}

		if ( is_wp_error( $tmp ) ) {
			return $tmp;
		}

		// The normal upload checks apply (allowed file types, sizes).
		$id = media_handle_sideload( [ 'name' => $name, 'tmp_name' => $tmp ], 0, isset( $args['title'] ) ? sanitize_text_field( (string) $args['title'] ) : null );

		if ( is_wp_error( $id ) ) {
			wp_delete_file( $tmp );

			return $id;
		}

		if ( ! empty( $args['alt'] ) ) {
			update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( (string) $args['alt'] ) );
		}

		return [ 'id' => $id, 'type' => get_post_mime_type( $id ), 'url' => wp_get_attachment_url( $id ) ];
	}

	private static function pages( array $args ): array {
		$query = [ 'post_type' => 'page', 'post_status' => [ 'publish', 'draft', 'private', 'pending' ], 'posts_per_page' => 60, 'orderby' => 'modified', 'order' => 'DESC' ];

		if ( ! empty( $args['search'] ) ) {
			$query['s'] = sanitize_text_field( (string) $args['search'] );
		}

		$pages = array_filter( get_posts( $query ), static function ( $post ) {
			return current_user_can( 'read_post', $post->ID );
		} );

		return array_values( array_map( static function ( $post ) {
			return [ 'id' => $post->ID, 'title' => $post->post_title, 'status' => $post->post_status, 'url' => get_permalink( $post ), 'refraction' => 'builder' === get_post_meta( $post->ID, '_refraction_edit_mode', true ), 'mcp_draft' => (bool) get_post_meta( $post->ID, Draft_Preview::FLAG, true ) ];
		}, $pages ) );
	}

	private static function page( array $args ) {
		$post = get_post( (int) $args['id'] );

		if ( ! $post || 'page' !== $post->post_type || ! current_user_can( 'read_post', $post->ID ) ) {
			return self::error( 'No such page.' );
		}

		$data = json_decode( (string) get_post_meta( $post->ID, '_refraction_data', true ), true );

		return [ 'id' => $post->ID, 'title' => $post->post_title, 'status' => $post->post_status, 'template' => get_page_template_slug( $post->ID ), 'elements' => is_array( $data ) ? $data : [] ];
	}

	private static function save_draft( array $args ) {
		$id = (int) ( $args['id'] ?? 0 );

		if ( $id ) {
			$post = get_post( $id );

			if ( ! $post || 'draft' !== $post->post_status || ! get_post_meta( $id, Draft_Preview::FLAG, true ) || ! current_user_can( 'edit_post', $id ) ) {
				return self::error( 'Only drafts made with save_draft can be replaced. Leave id out to make a new one.' );
			}
		} elseif ( ! current_user_can( 'edit_pages' ) ) {
			return self::error( 'This account may not create pages.' );
		}

		[ $elements, $dropped, $ok, $ignored ] = Prompt_Builder::clean( self::specs( $id ), $args['elements'], 'page' );

		if ( ! $ok ) {
			return self::error( 'No valid element was left after checking. Use only listed widgets and settings.', [ 'dropped' => $dropped ] );
		}

		$title = sanitize_text_field( (string) $args['title'] );

		if ( ! $id ) {
			$id = wp_insert_post( [ 'post_type' => 'page', 'post_status' => 'draft', 'post_title' => $title ], true );

			if ( is_wp_error( $id ) ) {
				return $id;
			}

			update_post_meta( $id, Draft_Preview::FLAG, 1 );
			update_post_meta( $id, '_refraction_edit_mode', 'builder' );
		} else {
			wp_update_post( [ 'ID' => $id, 'post_title' => $title ] );
		}

		$template = [ 'canvas' => 'refraction_canvas', 'full-width' => 'refraction_header_footer', 'default' => 'default' ][ $args['template'] ?? 'canvas' ] ?? 'refraction_canvas';
		$document = Plugin::$instance->documents->get( $id, false );

		if ( ! $document || false === $document->save( [ 'elements' => $elements, 'settings' => [ 'template' => $template ] ] ) ) {
			return self::error( 'The page could not be saved with this account.' );
		}

		return [ 'id' => $id, 'preview' => Draft_Preview::renew( $id ), 'edit' => admin_url( 'post.php?post=' . $id . '&action=refraction' ), 'dropped' => $dropped, 'ignored_settings' => $ignored ];
	}

	private static function propose( array $args ) {
		$page = get_post( (int) $args['page_id'] );
		$mode = 'section' === ( $args['mode'] ?? 'page' ) ? 'section' : 'page';

		if ( ! $page || ! Job_Queue::can_build() ) {
			return self::error( 'No such page, or this account may not propose content.' );
		}

		[ $elements, $dropped, $ok ] = Prompt_Builder::clean( self::specs( $page->ID ), $args['elements'], $mode );

		if ( ! $ok ) {
			return self::error( 'No valid element was left after checking.', [ 'dropped' => $dropped ] );
		}

		// A proposal shows in the Ask Claude panel of whoever edits that page.
		$id = Job_Queue::create( $page->ID, [ 'prompt' => (string) $args['summary'], 'mode' => $mode, 'context' => '', 'use_styles' => false, 'target' => '', 'proposal' => true ] );

		if ( is_wp_error( $id ) ) {
			return $id;
		}

		Job_Queue::move( Job_Queue::get( $id ), 'result', [ 'elements' => $elements, 'summary' => sanitize_textarea_field( (string) $args['summary'] ), 'dropped' => $dropped ] );

		return [ 'request' => $id, 'state' => 'ready', 'dropped' => $dropped ];
	}

	private static function rest( string $method, string $route, array $params = [] ) {
		$request = new \WP_REST_Request( $method, '/' . Queue_Rest::NS . Queue_Rest::BASE . $route );

		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}

		$response = rest_do_request( $request );

		return $response->is_error() ? $response->as_error() : $response->get_data();
	}

	private static function requests() {
		return self::rest( 'POST', '/watch' );
	}

	private static function request( array $args ) {
		$id = (int) $args['id'];
		$start = self::rest( 'POST', '/' . $id . '/start' );
		$brief = self::rest( 'GET', '/' . $id . '/brief' );

		return is_wp_error( $brief ) ? $brief : $brief + [ 'started' => ! is_wp_error( $start ) ];
	}

	private static function answer( array $args ) {
		return self::rest( 'POST', '/' . (int) $args['id'] . '/result', [ 'answer' => wp_json_encode( [ 'elements' => $args['elements'], 'summary' => (string) ( $args['summary'] ?? '' ) ] ) ] );
	}

	private static function decline( array $args ) {
		return self::rest( 'POST', '/' . (int) $args['id'] . '/decline', [ 'note' => (string) $args['note'] ] );
	}
}
