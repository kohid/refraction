<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Textarea;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's address. */
class Event_Field_Address extends Field_Textarea {

	use Event_Field;

	protected function role(): string {
		return 'address';
	}

	protected function event_title(): string {
		return esc_html__( 'Address', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-map-pin';
	}
}
