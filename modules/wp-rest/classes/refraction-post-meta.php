<?php

namespace Refraction\Modules\WpRest\Classes;

use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Refraction_Post_Meta {

	public function register(): void {
		$post_types = get_post_types_by_support( 'refraction' );

		foreach ( $post_types as $post_type ) {
			$this->register_edit_mode_meta( $post_type );
			$this->register_template_type_meta( $post_type );
			$this->register_refraction_data_meta( $post_type );
			$this->register_page_settings_meta( $post_type );

			if ( Utils::has_pro() ) {
				$this->register_conditions_meta( $post_type );
			}
		}
	}

	private function register_edit_mode_meta( string $post_type ): void {
		register_meta( 'post', '_refraction_edit_mode', [
			'single' => true,
			'object_subtype' => $post_type,
			'show_in_rest' => [
				'schema' => [
					'title' => 'Refraction edit mode',
					'description' => 'Refraction edit mode, `builder` is required for Refraction editing',
					'type' => 'string',
					'enum' => [ '', 'builder' ],
					'default' => '',
					'context' => [ 'edit' ],
				],
			],
			'auth_callback' => [ $this, 'check_edit_permission' ],
		]);
	}

	private function register_template_type_meta( string $post_type ): void {
		$document_types = Plugin::$instance->documents->get_document_types();

		register_meta( 'post', '_refraction_template_type', [
			'single' => true,
			'object_subtype' => $post_type,
			'show_in_rest' => [
				'schema' => [
					'title' => 'Refraction template type',
					'description' => 'Refraction document type',
					'type' => 'string',
					'enum' => array_merge( array_keys( $document_types ), [ '' ] ),
					'default' => '',
					'context' => [ 'edit' ],
				],
			],
			'auth_callback' => [ $this, 'check_edit_permission' ],
		]);
	}

	private function register_refraction_data_meta( string $post_type ): void {
		register_meta( 'post', '_refraction_data', [
			'single' => true,
			'object_subtype' => $post_type,
			'show_in_rest' => [
				'schema' => [
					'title' => 'Refraction data',
					'description' => 'Refraction JSON as a string',
					'type' => 'string',
					'default' => '',
					'context' => [ 'edit' ],
				],
			],
			'auth_callback' => [ $this, 'check_edit_permission' ],
			'sanitize_callback' => [ $this, 'sanitize_refraction_data' ],
		]);
	}

	public function sanitize_refraction_data( $value ) {
		if ( current_user_can( 'unfiltered_html' ) ) {
			return $value;
		}

		if ( ! is_string( $value ) ) {
			return Utils::kses_post_deep( $value );
		}

		$refraction_data = json_decode( $value, true );

		if ( JSON_ERROR_NONE !== json_last_error() || empty( $refraction_data ) ) {
			// Not valid Refraction JSON (or empty): treat the whole string as HTML to be safe.
			return wp_kses_post( $value );
		}

		return wp_json_encode( Utils::kses_post_deep( $refraction_data ) );
	}

	private function register_page_settings_meta( string $post_type ): void {
		register_meta( 'post', '_refraction_page_settings', [
			'single' => true,
			'object_subtype' => $post_type,
			'type' => 'object',
			'show_in_rest' => [
				'schema' => [
					'title' => 'Refraction page settings',
					'description' => 'Refraction page level settings',
					'type' => 'object',
					'properties' => [
						'hide_title' => [
							'type' => 'string',
							'enum' => [ 'yes', 'no' ],
							'default' => '',
						],
					],
					'default' => '{}',
					'additionalProperties' => true,
					'context' => [ 'edit' ],
				],
			],
			'auth_callback' => [ $this, 'check_edit_permission' ],
			'sanitize_callback' => [ $this, 'sanitize_page_settings' ],
		]);
	}

	public function sanitize_page_settings( $value ) {
		if ( current_user_can( 'unfiltered_html' ) ) {
			return $value;
		}

		return Utils::kses_post_deep( $value );
	}

	private function register_conditions_meta( string $post_type ): void {
		register_meta( 'post', '_refraction_conditions', [
			'object_subtype' => $post_type,
			'type' => 'object',
			'title' => 'Refraction conditions',
			'description' => 'Refraction conditions',
			'single' => true,
			'show_in_rest' => [
				'schema' => [
					'description' => 'Refraction conditions',
					'type' => 'array',
					'additionalProperties' => true,
					'default' => [],
					'context' => [ 'edit' ],
				],
			],
			'auth_callback' => [ $this, 'check_edit_permission' ],
		]);
	}

	/**
	 * Check if current user has permission to edit the specific post with refraction
	 *
	 * @param bool   $allowed Whether the user can add the post meta. Default false.
	 * @param string $meta_key The meta key.
	 * @param int    $post_id Post ID.
	 * @return bool
	 * @since 3.27.0
	 */
	public function check_edit_permission( bool $allowed, string $meta_key, int $post_id ): bool {
		$document = Plugin::$instance->documents->get( $post_id );

		return $document && $document->is_editable_by_current_user();
	}
}
