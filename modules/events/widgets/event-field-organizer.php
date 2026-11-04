<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Text;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's organizer. */
class Event_Field_Organizer extends Field_Text {

	use Event_Field;

	protected function role(): string {
		return 'organizer';
	}

	protected function event_title(): string {
		return esc_html__( 'Organizer', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-person';
	}
}
