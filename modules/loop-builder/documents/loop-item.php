<?php
namespace Refraction\Modules\LoopBuilder\Documents;

use Refraction\Controls_Manager;
use Refraction\Modules\Library\Documents\Library_Document;
use Refraction\Modules\LoopBuilder\Classes\Query_Lookup;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Loop Item template: one card, row or tile that a Loop Grid or Loop Carousel prints for every post.
 * While it is edited, dynamic tags speak about a preview post chosen in the document settings.
 */
class Loop_Item extends Library_Document {

	const PREVIEW_SETTING = 'refraction_loop_preview_post';
	const TYPE = 'loop-item';

	public static function get_type() {
		return self::TYPE;
	}

	public static function get_properties() {
		$properties = parent::get_properties();

		$properties['support_kit'] = true;
		$properties['show_in_finder'] = true;
		$properties['location'] = self::TYPE;

		return $properties;
	}

	public function get_name() {
		return self::TYPE;
	}

	public static function get_title() {
		return esc_html__( 'Loop Item', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Loop Items', 'refraction' );
	}

	protected function register_controls() {
		parent::register_controls();

		$this->start_controls_section(
			'refraction_loop_preview_section',
			[
				'label' => esc_html__( 'Preview', 'refraction' ),
				'tab' => Controls_Manager::TAB_SETTINGS,
			]
		);

		$this->add_control(
			self::PREVIEW_SETTING,
			[
				'label' => esc_html__( 'Preview with this post', 'refraction' ),
				'type' => 'refraction_autocomplete',
				'query' => [ 'kind' => 'post', 'subtype' => 'any' ],
				'multiple' => false,
				'description' => esc_html__( 'Dynamic tags show the content of this post while you design the item. Leave empty for the latest post.', 'refraction' ),
				'default' => '',
			]
		);

		$this->end_controls_section();
	}

	/** The post the dynamic tags describe while this template is edited or previewed. */
	public function get_preview_post_id(): int {
		$chosen = $this->get_settings( self::PREVIEW_SETTING );
		$chosen = is_array( $chosen ) ? (int) reset( $chosen ) : (int) $chosen;

		if ( $chosen ) {
			$post = get_post( $chosen );

			if ( $post && in_array( $post->post_type, Query_Lookup::post_types(), true ) && current_user_can( 'read_post', $post->ID ) ) {
				return $chosen;
			}
		}

		$latest = get_posts( [
			'post_type' => Query_Lookup::post_types(),
			'post_status' => 'publish',
			'posts_per_page' => 1,
			'fields' => 'ids',
			'no_found_rows' => true,
			'has_password' => false,
		] );

		return $latest ? (int) $latest[0] : 0;
	}

	/** True when the given post ID is a Loop Item template that is published (or the user may edit it). */
	public static function is_usable( int $template_id ): bool {
		$document = Plugin::$instance->documents->get( $template_id );

		if ( ! $document instanceof self ) {
			return false;
		}

		$status = get_post_status( $template_id );

		return 'publish' === $status || ( $status && current_user_can( 'edit_post', $template_id ) );
	}
}
