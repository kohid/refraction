<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Datetime;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's end date and time. */
class Event_Field_End extends Field_Datetime {

	use Event_Field;

	protected function role(): string {
		return 'end';
	}

	protected function event_title(): string {
		return esc_html__( 'End date and time', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-calendar';
	}
}
