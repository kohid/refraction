<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Text;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's venue. */
class Event_Field_Venue extends Field_Text {

	use Event_Field;

	protected function role(): string {
		return 'venue';
	}

	protected function event_title(): string {
		return esc_html__( 'Venue', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-map-pin';
	}
}
