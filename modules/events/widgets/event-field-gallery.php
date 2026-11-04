<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_File;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event form: pictures for the event's gallery (up to the "Max files" set, 10 at most). They are copied into the media
 * library and shown by the Event Gallery widget and tag.
 */
class Event_Field_Gallery extends Field_File {

	use Event_Field;

	protected function role(): string {
		return 'gallery';
	}

	protected function event_title(): string {
		return esc_html__( 'Image gallery', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-gallery-grid';
	}

	public function get_keywords() {
		return [ 'event', 'gallery', 'images', 'photos', 'upload' ];
	}

	public function raw_field(): array {
		$raw = $this->event_raw( parent::raw_field() );
		$raw['accept'] = array_values( array_intersect( (array) $raw['accept'], [ 'jpg', 'jpeg', 'png', 'gif', 'webp' ] ) ) ?: [ 'jpg', 'jpeg', 'png', 'webp' ];
		$raw['max_files'] = max( 2, min( 10, (int) $raw['max_files'] ) );

		return $raw;
	}
}
