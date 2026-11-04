<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_File;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's picture. It becomes the event's featured image (copied into the media library). */
class Event_Field_Image extends Field_File {

	use Event_Field;

	protected function role(): string {
		return 'image';
	}

	protected function event_title(): string {
		return esc_html__( 'Event image', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-image';
	}

	public function raw_field(): array {
		$raw = $this->event_raw( parent::raw_field() );
		// A picture, one file.
		$raw['accept'] = array_values( array_intersect( (array) $raw['accept'], [ 'jpg', 'jpeg', 'png', 'gif', 'webp' ] ) ) ?: [ 'jpg', 'jpeg', 'png', 'webp' ];
		$raw['max_files'] = 1;

		return $raw;
	}
}
