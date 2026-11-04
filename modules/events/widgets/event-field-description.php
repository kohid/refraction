<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Textarea;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's description. */
class Event_Field_Description extends Field_Textarea {

	use Event_Field;

	protected function role(): string {
		return 'description';
	}

	protected function event_title(): string {
		return esc_html__( 'Description', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-text-area';
	}
}
