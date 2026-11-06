<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\Events\Module;
use Refraction\Modules\Events\Tags\Event_Link;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event Button: one button of the event, for its page or its Single template: Tickets, Payment, the map, the event page
 * or an "add to calendar" link. It shows only when the event has that link (no payment link, no Pay button).
 */
class Event_Button extends Widget_Base {

	public function get_name() {
		return 'refraction-event-button';
	}

	public function get_title() {
		return esc_html__( 'Event Button', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-button';
	}

	public function get_categories() {
		return [ Module::WIDGET_CATEGORY ];
	}

	public function get_keywords() {
		return [ 'event', 'button', 'payment', 'pay', 'tickets', 'book', 'map', 'calendar' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-events' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_button', [ 'label' => esc_html__( 'Button', 'refraction' ) ] );

		$this->add_control( 'action', [
			'label' => esc_html__( 'Opens', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'payment',
			'options' => Event_Link::links(),
		] );

		$this->add_control( 'text', [
			'label' => esc_html__( 'Text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'Empty: the text set for the event, or the link\'s name', 'refraction' ),
			'label_block' => true,
			'dynamic' => [ 'active' => true ],
		] );

		$this->add_control( 'event', [
			'label' => esc_html__( 'Event', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => Event_Details::event_options(),
			'label_block' => true,
		] );

		$this->add_responsive_control( 'align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'flex-end' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				'stretch' => [ 'title' => esc_html__( 'Full width', 'refraction' ), 'icon' => 'rficon-text-align-justify' ],
			],
			'selectors' => [ '{{WRAPPER}} .rfe-btn-wrap' => 'justify-content: {{VALUE}};' ],
		] );

		$this->add_control( 'new_tab', [
			'label' => esc_html__( 'Open in a new tab', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style', [ 'label' => esc_html__( 'Button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$button = '{{WRAPPER}} .rfe-btn';
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'typography', 'selector' => $button ] );
		$this->add_responsive_control( 'padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ $button => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );
		$this->start_controls_tabs( 'states' );

		foreach ( [ 'normal' => [ esc_html__( 'Normal', 'refraction' ), '' ], 'hover' => [ esc_html__( 'Hover', 'refraction' ), ':hover' ] ] as $state => [ $label, $suffix ] ) {
			$this->start_controls_tab( 'state_' . $state, [ 'label' => $label ] );
			$this->add_control( 'color_' . $state, [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . $suffix => 'color: {{VALUE}};' ] ] );
			$this->add_control( 'background_' . $state, [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . $suffix => 'background-color: {{VALUE}};' ] ] );
			$this->add_control( 'border_color_' . $state, [ 'label' => esc_html__( 'Border color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $button . $suffix => 'border-color: {{VALUE}};' ] ] );
			$this->end_controls_tab();
		}

		$this->end_controls_tabs();
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'border', 'selector' => $button, 'separator' => 'before' ] );
		$this->add_control( 'radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 50 ] ],
			'selectors' => [ $button => 'border-radius: {{SIZE}}px;' ],
		] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'shadow', 'selector' => $button ] );
		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$id = (int) ( $s['event'] ?? 0 ) ?: Event_Details::current_event();
		$action = (string) ( $s['action'] ?? 'payment' );
		$editing = Plugin::$instance->editor->is_edit_mode() || Plugin::$instance->preview->is_preview_mode();
		// Book now is the booking form itself, with this widget's look on its button.
		if ( 'book' === $action && $id && \Refraction\Modules\Events\Classes\Bookings::enabled( $id ) ) {
			echo '<div class="rfe-btn-wrap" style="--ev:' . esc_attr( \Refraction\Modules\Events\Classes\Event_Data::card( $id )['color'] ) . '">' . \Refraction\Modules\Events\Classes\Bookings::form( $id, 'rfe-btn rfe-btn--book', trim( (string) ( $s['text'] ?? '' ) ) ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

			return;
		}

		// Pay without a payment link: the form for paying the total amount, with this widget's look on its button.
		if ( 'payment' === $action && $id && \Refraction\Modules\Events\Classes\Bookings::pays_online( $id ) ) {
			echo '<div class="rfe-btn-wrap" style="--ev:' . esc_attr( \Refraction\Modules\Events\Classes\Event_Data::card( $id )['color'] ) . '">' . \Refraction\Modules\Events\Classes\Bookings::form( $id, 'rfe-btn rfe-btn--payment', trim( (string) ( $s['text'] ?? '' ) ), 'online' ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

			return;
		}

		$url = $id ? Event_Link::url( $id, $action ) : '';
		$names = Event_Link::links();

		if ( '' === $url ) {
			// Nothing to open: the button stays away, except in the editor, where it says why.
			if ( $editing ) {
				$why = [
					'payment' => __( 'Event Button (Pay): shows when the event has a total amount or a payment link. Set them in the page settings (the cog) > Event details, or in the event form.', 'refraction' ),
					'book' => __( 'Event Button (Book now): turn on "Book now (pay in cash)" in the page settings (the cog) > Event details, or on the event form\'s button.', 'refraction' ),
					'ticket' => __( 'Event Button (Tickets): shows when the event has a tickets link. Set it in the page settings (the cog) > Event details.', 'refraction' ),
				];
				$title = $id ? get_the_title( $id ) : '';
				/* translators: %s: link name, for example "Payment". */
				$text = $why[ $action ] ?? sprintf( __( 'Event Button: shows when the event has a link for "%s".', 'refraction' ), $names[ $action ] ?? $action );
				/* translators: 1: event title, 2: the hint. */
				echo '<div class="rf-ed rf-ed-hint">' . esc_html( '' !== $title ? sprintf( __( '%1$s: %2$s', 'refraction' ), $title, $text ) : $text ) . '</div>';
			}

			return;
		}

		$data = \Refraction\Modules\Events\Classes\Event_Data::get( $id );
		$text = trim( (string) ( $s['text'] ?? '' ) );

		if ( '' === $text ) {
			$own = [ 'ticket' => $data['ticket_label'] ?: __( 'Get tickets', 'refraction' ), 'payment' => \Refraction\Modules\Events\Classes\Event_Data::payment_text( $data ), 'map' => __( 'Show on a map', 'refraction' ), 'page' => __( 'View event', 'refraction' ) ];
			$text = $own[ $action ] ?? ( $names[ $action ] ?? '' );
		}

		$tab = 'yes' === ( $s['new_tab'] ?? '' ) && 'page' !== $action ? ' target="_blank" rel="noopener"' : '';
		?>
		<div class="rfe-btn-wrap" style="--ev:<?php echo esc_attr( \Refraction\Modules\Events\Classes\Event_Data::card( $id )['color'] ); ?>">
			<a class="rfe-btn rfe-btn--<?php echo esc_attr( $action ); ?>" href="<?php echo esc_url( $url ); ?>"<?php echo $tab; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static. ?>><?php echo esc_html( $text ); ?></a>
		</div>
		<?php
	}
}
