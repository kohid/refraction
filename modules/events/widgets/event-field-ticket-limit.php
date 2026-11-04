<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Number;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: how many tickets (places) the event has. A whole number, 1 or more. */
class Event_Field_Ticket_Limit extends Field_Number {

	use Event_Field;

	protected function role(): string {
		return 'ticket_limit';
	}

	protected function event_title(): string {
		return esc_html__( 'Ticket limit', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-counter';
	}

	public function raw_field(): array {
		$raw = $this->event_raw( parent::raw_field() );
		$raw['min'] = is_numeric( $raw['min'] ) ? max( 1, (float) $raw['min'] ) : 1;

		return $raw;
	}
}
