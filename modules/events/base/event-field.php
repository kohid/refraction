<?php
namespace Refraction\Modules\Events\Base;

use Refraction\Modules\Events\Classes\Event_Types;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * An event field: a Form Builder field widget (same Content, Style and Advanced tabs, same markup and checks) that asks
 * for one detail of an event. Its key is fixed (event_<role>), so when the form is sent the Events module knows which
 * answer is the start, the venue and so on, and makes the event from them (Classes\Event_Types). A form with event
 * fields is an event type.
 */
trait Event_Field {

	/** The event detail this field asks for: title, start, venue... */
	abstract protected function role(): string;

	/** Its name in the panel. */
	abstract protected function event_title(): string;

	public function get_name() {
		return \Refraction\Modules\FormBuilder\Base\Field_Widget::PREFIX . 'event-' . str_replace( '_', '-', $this->role() );
	}

	public function get_title() {
		return $this->event_title();
	}

	public function get_categories() {
		return [ Event_Types::WIDGET_CATEGORY ];
	}

	public function get_keywords() {
		return [ 'event', 'form', 'field', $this->role() ];
	}

	/** Fields every event needs are always required. */
	protected function always_required(): bool {
		return false;
	}

	public function raw_field(): array {
		return $this->event_raw( parent::raw_field() );
	}

	/** The fixed key, and required when every event needs it. Classes with their own raw_field() call this too. */
	protected function event_raw( array $raw ): array {
		$raw['key'] = Event_Types::KEY_PREFIX . $this->role();

		if ( $this->always_required() ) {
			$raw['required'] = true;
		}

		return $raw;
	}
}
