<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\FormBuilder\Widgets\Field_Number;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Event form: the most tickets one person can buy. A whole number, 1 or more. */
class Event_Field_Tickets_Per_Person extends Field_Number {

	use Event_Field;

	protected function role(): string {
		return 'tickets_per_person';
	}

	protected function event_title(): string {
		return esc_html__( 'Tickets per person', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-person';
	}

	public function raw_field(): array {
		$raw = $this->event_raw( parent::raw_field() );
		$raw['min'] = is_numeric( $raw['min'] ) ? max( 1, (float) $raw['min'] ) : 1;

		return $raw;
	}
}
