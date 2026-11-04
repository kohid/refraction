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

/** Event Start: when the current event starts ("Y-m-d H:i"), for a Countdown or any date field. */
class Event_Start_Date extends Data_Tag {

	public function get_name() {
		return 'refraction-event-start';
	}

	public function get_title() {
		return esc_html__( 'Event Start', 'refraction' );
	}

	public function get_group() {
		return 'event';
	}

	public function get_categories() {
		return [ Tags::DATETIME_CATEGORY ];
	}

	public function get_value( array $options = [] ) {
		$post = Context::get_post();

		return Context::can_read( $post ) && Module::CPT === $post->post_type ? Event_Data::get( $post->ID )['start'] : '';
	}
}
