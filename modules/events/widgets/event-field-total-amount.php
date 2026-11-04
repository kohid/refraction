<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Amount;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event form: the event's total amount, typed with the form's currency (Currency in the page settings). The event keeps
 * it written out ("£1,250.00"), and Event Details shows it.
 */
class Event_Field_Total_Amount extends Field_Amount {

	use Event_Field;

	protected function role(): string {
		return 'total_amount';
	}

	protected function event_title(): string {
		return esc_html__( 'Total amount', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-price-table';
	}
}
