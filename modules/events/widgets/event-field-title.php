<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Text;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's event name. */
class Event_Field_Title extends Field_Text {

	use Event_Field;

	protected function role(): string {
		return 'title';
	}

	protected function event_title(): string {
		return esc_html__( 'Event name', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-t-letter';
	}

	protected function always_required(): bool {
		return true;
	}
}
