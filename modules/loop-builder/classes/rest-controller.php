<?php
namespace Refraction\Modules\LoopBuilder\Classes;

use Refraction\Modules\LoopBuilder\Widgets\Archive_Posts;
use Refraction\Modules\LoopBuilder\Widgets\Base_Loop_Widget;
use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * REST endpoint behind pagination links, "load more", infinite load and the Taxonomy Filter.
 *
 * POST refraction/v1/loop-page with the header `X-Refraction-Nonce` and the fields `token` (the signed context
 * the widget printed), `page` and optionally `filter` (`taxonomy`, `term_id`). The visitor never sends
 * settings: the widget is rebuilt from the saved document, so the only inputs are a page number, one term of
 * a public taxonomy and a token that verifies. Only published documents without a password are served, and
 * the query itself asks for published posts without a password.
 */
class Rest_Controller {

	const ROUTE_NAMESPACE = 'refraction/v1';
	const ROUTE = '/loop-page';
	const NONCE = 'refraction_loop';
	const MAX_PAGE = 1000;
	const WIDGETS = [ 'posts', 'archive-posts', 'loop-grid', 'portfolio' ];

	public function __construct() {
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
	}

	public function register_routes(): void {
		register_rest_route(
			self::ROUTE_NAMESPACE,
			self::ROUTE,
			[
				'methods' => 'POST',
				'callback' => [ $this, 'handle' ],
				'permission_callback' => [ $this, 'check_nonce' ],
				'args' => [
					'token' => [ 'type' => 'string', 'required' => true ],
					'page' => [ 'type' => 'integer', 'default' => 1 ],
					'filter' => [ 'type' => [ 'object', 'null' ], 'default' => null ],
				],
			]
		);
	}

	public function check_nonce( \WP_REST_Request $request ) {
		$nonce = (string) $request->get_header( 'X-Refraction-Nonce' );

		if ( ! $nonce || ! wp_verify_nonce( $nonce, self::NONCE ) ) {
			return new \WP_Error( 'refraction_loop_nonce', esc_html__( 'The page is out of date. Reload it and try again.', 'refraction' ), [ 'status' => 403 ] );
		}

		return true;
	}

	public function handle( \WP_REST_Request $request ) {
		$data = Context_Token::verify( (string) $request->get_param( 'token' ), Base_Loop_Widget::signing_key() );

		if ( ! $data || empty( $data['doc'] ) || empty( $data['widget'] ) ) {
			return new \WP_Error( 'refraction_loop_token', esc_html__( 'Invalid request.', 'refraction' ), [ 'status' => 400 ] );
		}

		$document_id = (int) $data['doc'];
		$post = get_post( $document_id );
		$public_type = $post && ( Source_Local::CPT === $post->post_type || in_array( $post->post_type, Query_Lookup::post_types(), true ) );

		if ( ! $post || ! $public_type || 'publish' !== $post->post_status || post_password_required( $post ) ) {
			return new \WP_Error( 'refraction_loop_document', esc_html__( 'Not found.', 'refraction' ), [ 'status' => 404 ] );
		}

		$document = Plugin::$instance->documents->get( $document_id );
		$element = $document ? self::find_element( (array) $document->get_elements_data(), (string) $data['widget'] ) : null;

		if ( ! $element || 'widget' !== ( $element['elType'] ?? '' ) || ! in_array( $element['widgetType'] ?? '', self::WIDGETS, true ) ) {
			return new \WP_Error( 'refraction_loop_widget', esc_html__( 'Not found.', 'refraction' ), [ 'status' => 404 ] );
		}

		$page = max( 1, min( self::MAX_PAGE, (int) $request->get_param( 'page' ) ) );
		$context_post = ! empty( $data['post'] ) ? get_post( (int) $data['post'] ) : null;
		$previous_post = $GLOBALS['post'] ?? null;

		Plugin::$instance->documents->switch_to_document( $document );

		if ( $context_post instanceof \WP_Post && 'publish' === $context_post->post_status && ! post_password_required( $context_post ) ) {
			$GLOBALS['post'] = $context_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
			setup_postdata( $context_post );
		}

		try {
			$widget = Plugin::$instance->elements_manager->create_element_instance( $element );

			if ( ! $widget instanceof Base_Loop_Widget ) {
				return new \WP_Error( 'refraction_loop_widget', esc_html__( 'Not found.', 'refraction' ), [ 'status' => 404 ] );
			}

			$filter = $widget->is_filterable() ? Query_Runner::sanitize_filter( $request->get_param( 'filter' ) ) : null;
			$opts = [
				'rest' => true,
				'url' => isset( $data['url'] ) ? esc_url_raw( (string) $data['url'] ) : '',
			];

			if ( $widget instanceof Archive_Posts ) {
				$opts['archive_vars'] = isset( $data['archive'] ) && is_array( $data['archive'] ) ? $data['archive'] : [];
			}

			$result = $widget->render_page( $page, $filter, $opts );
		} finally {
			Plugin::$instance->documents->restore_document();
			$GLOBALS['post'] = $previous_post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

			if ( $previous_post instanceof \WP_Post ) {
				setup_postdata( $previous_post );
			}
		}

		return rest_ensure_response( $result );
	}

	/** Depth first search for an element by ID in raw document data. */
	public static function find_element( array $elements, string $id ): ?array {
		foreach ( $elements as $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}

			if ( isset( $element['id'] ) && (string) $element['id'] === $id ) {
				return $element;
			}

			if ( ! empty( $element['elements'] ) ) {
				$found = self::find_element( (array) $element['elements'], $id );

				if ( $found ) {
					return $found;
				}
			}
		}

		return null;
	}
}
