<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Text;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the event's price. */
class Event_Field_Price extends Field_Text {

	use Event_Field;

	protected function role(): string {
		return 'price';
	}

	protected function event_title(): string {
		return esc_html__( 'Price', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-price-list';
	}
}
