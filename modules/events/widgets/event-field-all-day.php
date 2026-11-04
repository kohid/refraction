<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Toggle;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's all day. */
class Event_Field_All_Day extends Field_Toggle {

	use Event_Field;

	protected function role(): string {
		return 'all_day';
	}

	protected function event_title(): string {
		return esc_html__( 'All day', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-toggle';
	}
}
