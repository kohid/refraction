<?php
namespace Refraction\Modules\Events\Tags;

use Refraction\Core\DynamicTags\Data_Tag;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Modules\DynamicTags\Module as Tags;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event Gallery: the current event's gallery images, for the Gallery and Image Carousel widgets. */
class Event_Gallery_Tag extends Data_Tag {

	public function get_name() {
		return 'refraction-event-gallery';
	}

	public function get_title() {
		return esc_html__( 'Event Gallery', 'refraction' );
	}

	public function get_group() {
		return 'event';
	}

	public function get_categories() {
		return [ Tags::GALLERY_CATEGORY ];
	}

	public function get_value( array $options = [] ) {
		$post = Context::get_post();

		if ( ! Context::can_read( $post ) || Module::CPT !== $post->post_type ) {
			return [];
		}

		return array_map( static fn( $id ) => [ 'id' => $id, 'url' => (string) wp_get_attachment_url( $id ) ], Event_Data::gallery( $post->ID ) );
	}
}
