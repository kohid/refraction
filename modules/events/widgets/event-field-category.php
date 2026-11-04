<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\Events\Classes\Event_Types;
use Refraction\Modules\Events\Widgets\Event_Calendar;
use Refraction\Modules\FormBuilder\Widgets\Field_Select;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event form: the event's category, as a dropdown (one) or checkboxes (several). The choices are the Event Categories
 * (all of them, or the ones picked here), read again every time the form is shown, so new categories appear by
 * themselves (Event_Types::fresh_definition).
 */
class Event_Field_Category extends Field_Select {

	use Event_Field;

	protected function role(): string {
		return 'category';
	}

	protected function event_title(): string {
		return esc_html__( 'Category', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-folder';
	}

	/** The choices come from the Event Categories, not typed in. */
	protected function features(): array {
		return [ 'placeholder', 'required' ];
	}

	protected function register_controls() {
		parent::register_controls();

		$this->start_injection( [ 'of' => 'field_required', 'at' => 'before' ] );

		$this->add_control( 'category_terms', [
			'label' => esc_html__( 'Categories to choose from', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => Event_Calendar::category_options(),
			'description' => esc_html__( 'Empty: every Event Category, including ones added later.', 'refraction' ),
		] );

		$this->add_control( 'pick_several', [
			'label' => esc_html__( 'Pick several (checkboxes)', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
		] );

		$this->end_injection();
	}

	public function raw_field(): array {
		$raw = $this->event_raw( parent::raw_field() );
		$settings = $this->get_settings();
		$raw['type'] = 'yes' === ( $settings['pick_several'] ?? '' ) ? 'checkbox' : 'select';
		$raw['options'] = Event_Types::category_choices( (array) ( $settings['category_terms'] ?? [] ) );

		return $raw;
	}
}
