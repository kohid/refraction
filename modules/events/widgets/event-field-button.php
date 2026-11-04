<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\Events\Base\Event_Field;
use Refraction\Modules\Events\Classes\Event_Types;
use Refraction\Modules\FormBuilder\Widgets\Field_Website;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event form: a button, for one of three things.
 * - Ticket link / Payment link: the form asks for the address (a link field), and the event's page shows a button with
 *   the text you set here that opens it (Event Details widget).
 * - Submit: the form's send button, which makes the event. It is not a field.
 */
class Event_Field_Button extends Field_Website {

	use Event_Field;

	const KINDS = [ 'ticket', 'payment', 'submit' ];

	/** What this button is for. The panel's own copy of the widget (no element, no settings) is a ticket button. */
	private function kind(): string {
		$kind = $this->is_type_instance() ? '' : (string) $this->get_settings( 'button_kind' );

		return in_array( $kind, self::KINDS, true ) ? $kind : 'ticket';
	}

	protected function role(): string {
		return 'payment' === $this->kind() ? 'payment_url' : 'ticket_url';
	}

	protected function event_title(): string {
		return esc_html__( 'Event button (tickets, payment, submit)', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-button';
	}

	public function get_keywords() {
		return [ 'event', 'button', 'payment', 'pay', 'ticket', 'tickets', 'submit', 'send', 'link' ];
	}

	/** The name stays the same whatever the button is for. */
	public function get_name() {
		return \Refraction\Modules\FormBuilder\Base\Field_Widget::PREFIX . 'event-button';
	}

	/** The Submit button is not a field: the Form page leaves it out of the collection (Editor_Forms::collect). */
	public function is_field(): bool {
		return 'submit' !== $this->kind();
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_button_kind', [ 'label' => esc_html__( 'Button', 'refraction' ) ] );

		$this->add_control( 'button_kind', [
			'label' => esc_html__( 'This button is for', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'ticket',
			'options' => [
				'ticket' => esc_html__( 'Ticket link', 'refraction' ),
				'payment' => esc_html__( 'Payment', 'refraction' ),
				'submit' => esc_html__( 'Submit (makes the event)', 'refraction' ),
			],
			'description' => esc_html__( 'Ticket link and Payment ask for the address in the form; the event page then shows a button that opens it. Submit sends the form.', 'refraction' ),
		] );

		$this->add_control( 'page_button_text', [
			'label' => esc_html__( 'Button text on the event page', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'Get tickets', 'refraction' ),
			'condition' => [ 'button_kind!' => 'submit' ],
		] );

		$this->add_control( 'submit_text', [
			'label' => esc_html__( 'Button text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Create event', 'refraction' ),
			'condition' => [ 'button_kind' => 'submit' ],
		] );

		$this->add_responsive_control( 'submit_align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'flex-end' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				'stretch' => [ 'title' => esc_html__( 'Full width', 'refraction' ), 'icon' => 'rficon-text-align-justify' ],
			],
			'selectors_dictionary' => [ 'stretch' => 'stretch; --rfe-btn-width: 100%' ],
			'selectors' => [ '{{WRAPPER}} .rfb-actions' => 'display: flex; justify-content: {{VALUE}};', '{{WRAPPER}} .rfb-actions .rfb-submit' => 'width: var(--rfe-btn-width, auto);' ],
			'condition' => [ 'button_kind' => 'submit' ],
		] );

		$this->add_control( 'submit_bg', [
			'label' => esc_html__( 'Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rfb-submit' => 'background-color: {{VALUE}}; border-color: {{VALUE}};' ],
			'condition' => [ 'button_kind' => 'submit' ],
		] );

		$this->add_control( 'submit_color', [
			'label' => esc_html__( 'Text color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rfb-submit' => 'color: {{VALUE}};' ],
			'condition' => [ 'button_kind' => 'submit' ],
		] );

		$this->end_controls_section();

		parent::register_controls();
	}

	public function raw_field(): array {
		$raw = $this->event_raw( parent::raw_field() );
		$raw['label'] = '' !== trim( $raw['label'] ) && __( 'Event button (tickets, payment, submit)', 'refraction' ) !== $raw['label'] ? $raw['label'] : ( 'payment_url' === $this->role() ? __( 'Payment link', 'refraction' ) : __( 'Ticket link', 'refraction' ) );

		return $raw;
	}

	protected function render() {
		if ( 'submit' === $this->kind() ) {
			$text = trim( (string) $this->get_settings_for_display( 'submit_text' ) );
			// In the editor the button does nothing; on the site it sends the form, which makes the event.
			echo '<div class="rfb-actions"><button type="submit" class="rfb-btn rfb-btn-primary rfb-submit">' . esc_html( '' !== $text ? $text : __( 'Create event', 'refraction' ) ) . '</button></div>';

			return;
		}

		parent::render();
	}
}
