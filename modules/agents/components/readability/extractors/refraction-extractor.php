<?php

namespace Refraction\Modules\Agents\Components\Readability\Extractors;

use Refraction\Modules\MarkdownRender\Markdown_Renderer;
use Refraction\Modules\MarkdownRender\Module;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Extracts markdown from posts built with the Refraction editor.
 *
 * Uses `Markdown_Renderer::render_elements_data()` wrapped inside
 * `Module::execute_while_rendering_markdown()` so that widget output
 * skips CSS enqueueing and document-cache side effects.
 *
 * Priority: 10 (runs before all other extractors).
 */
class Refraction_Extractor implements Extractor_Interface {

	/**
	 * Return true when the post was built with Refraction.
	 *
	 * @param \WP_Post $post
	 * @return bool
	 */
	public function can_handle( \WP_Post $post ): bool {
		$document = Plugin::$instance->documents->get( $post->ID );

		return $document && $document->is_built_with_refraction();
	}

	/**
	 * Render Refraction element data to markdown.
	 *
	 * @param \WP_Post $post
	 * @return string Body markdown, or '' on failure.
	 */
	public function extract( \WP_Post $post ): string {
		try {
			$document = Plugin::$instance->documents->get( $post->ID );

			if ( ! $document ) {
				return '';
			}

			return Module::execute_while_rendering_markdown(
				fn() => ( new Markdown_Renderer() )->render_elements_data( $document->get_elements_data() )
			);
		} catch ( \Throwable $e ) {
			return '';
		}
	}

	/**
	 * @return string
	 */
	public function get_id(): string {
		return 'refraction';
	}

	/**
	 * @return int
	 */
	public function get_priority(): int {
		return 10;
	}
}
