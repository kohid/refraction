<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Typography;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Module;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event Details: an event's date, time, venue (with a map link), price and organizer, its tickets button and an
 * "Add to calendar" menu (a <details> element: no script). On an event's own page it shows that event; elsewhere it
 * shows the event you pick.
 */
class Event_Details extends Widget_Base {

	const ROWS = [ 'date', 'time', 'venue', 'price', 'organizer' ];

	public function get_name() {
		return 'refraction-event-details';
	}

	public function get_title() {
		return esc_html__( 'Event Details', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-info-box';
	}

	public function get_categories() {
		return [ Module::WIDGET_CATEGORY ];
	}

	public function get_keywords() {
		return [ 'event', 'date', 'venue', 'tickets', 'details', 'add to calendar' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-events' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	private static function event_options(): array {
		$options = [ '' => esc_html__( 'This event (on an event page)', 'refraction' ) ];

		foreach ( get_posts( [ 'post_type' => Module::CPT, 'post_status' => [ 'publish', 'future', 'draft' ], 'posts_per_page' => 200, 'orderby' => 'date', 'order' => 'DESC' ] ) as $post ) {
			$options[ (string) $post->ID ] = get_the_title( $post ) ?: '#' . $post->ID;
		}

		return $options;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_details', [ 'label' => esc_html__( 'Event details', 'refraction' ) ] );

		$this->add_control( 'event', [
			'label' => esc_html__( 'Event', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => self::event_options(),
			'label_block' => true,
		] );

		foreach ( [
			'date' => esc_html__( 'Date', 'refraction' ),
			'time' => esc_html__( 'Time', 'refraction' ),
			'venue' => esc_html__( 'Venue and address', 'refraction' ),
			'price' => esc_html__( 'Price', 'refraction' ),
			'organizer' => esc_html__( 'Organizer', 'refraction' ),
		] as $row => $label ) {
			$this->add_control( 'show_' . $row, [ 'label' => $label, 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		}

		$this->add_control( 'show_map', [
			'label' => esc_html__( 'Map link under the address', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'show_venue' => 'yes' ],
		] );

		$this->add_control( 'show_tickets', [
			'label' => esc_html__( 'Tickets button', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'separator' => 'before',
		] );

		$this->add_control( 'show_calendar', [
			'label' => esc_html__( '"Add to calendar" menu', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'list',
			'options' => [
				'list' => esc_html__( 'One under another', 'refraction' ),
				'row' => esc_html__( 'In a row', 'refraction' ),
			],
			'prefix_class' => 'rf-ed-layout-',
			'separator' => 'before',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_box', [ 'label' => esc_html__( 'Box', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'box_background', [
			'label' => esc_html__( 'Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-ed' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'box_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ '{{WRAPPER}} .rf-ed' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'box_border', 'selector' => '{{WRAPPER}} .rf-ed' ] );

		$this->add_control( 'box_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-ed' => 'border-radius: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'row_gap', [
			'label' => esc_html__( 'Space between rows', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 50 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-ed' => '--rf-ed-gap: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_rows', [ 'label' => esc_html__( 'Rows', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'icon_color', [
			'label' => esc_html__( 'Icon color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-ed' => '--rf-ed-icon: {{VALUE}};' ],
		] );

		$this->add_control( 'icon_background', [
			'label' => esc_html__( 'Icon background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-ed' => '--rf-ed-icon-bg: {{VALUE}};' ],
		] );

		$this->add_control( 'label_color', [
			'label' => esc_html__( 'Label color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-ed-label' => 'color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'label_typography', 'label' => esc_html__( 'Label', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-ed-label' ] );

		$this->add_control( 'value_color', [
			'label' => esc_html__( 'Text color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-ed-value' => 'color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'value_typography', 'label' => esc_html__( 'Text', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-ed-value' ] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_buttons', [ 'label' => esc_html__( 'Buttons', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'button_background', [
			'label' => esc_html__( 'Tickets button', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-ed' => '--rf-ed-primary: {{VALUE}};' ],
		] );

		$this->add_control( 'button_text', [
			'label' => esc_html__( 'Tickets button text', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-ed-tickets' => 'color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'button_typography', 'selector' => '{{WRAPPER}} .rf-ed-tickets, {{WRAPPER}} .rf-ed-addcal summary' ] );

		$this->add_control( 'button_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-ed' => '--rf-ed-btn-radius: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();
	}

	private static function icon( string $name ): string {
		$paths = [
			'date' => '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
			'time' => '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
			'venue' => '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
			'price' => '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
			'organizer' => '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
		];

		return '<span class="rf-ed-icon"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . ( $paths[ $name ] ?? '' ) . '</svg></span>';
	}

	/**
	 * The details box of an event (also used on events not built in the page editor).
	 *
	 * @param array $card    Event_Data::card().
	 * @param array $options show_* => bool (missing = shown).
	 */
	public static function markup( array $card, array $options ): string {
		$on = static fn( $key ) => $options[ $key ] ?? true;
		$data = $card['data'];
		$rows = [];

		if ( $on( 'show_date' ) && '' !== $card['date'] ) {
			$rows['date'] = [ __( 'Date', 'refraction' ), esc_html( $card['date'] ) ];
		}

		if ( $on( 'show_time' ) && '' !== $card['time'] ) {
			$rows['time'] = [ __( 'Time', 'refraction' ), esc_html( $card['time'] ) ];
		}

		if ( $on( 'show_venue' ) && ( '' !== $card['venue'] || '' !== $card['address'] ) ) {
			$place = esc_html( $card['venue'] ) . ( '' !== $card['address'] ? '<span class="rf-ed-address">' . nl2br( esc_html( $card['address'] ) ) . '</span>' : '' );

			if ( $on( 'show_map' ) ) {
				$query = trim( $card['venue'] . ', ' . str_replace( "\n", ', ', $card['address'] ), ', ' );
				$place .= '<a class="rf-ed-map" href="' . esc_url( 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode( $query ) ) . '" target="_blank" rel="noopener">' . esc_html__( 'Show on a map', 'refraction' ) . '</a>';
			}

			$rows['venue'] = [ __( 'Where', 'refraction' ), $place ];
		}

		if ( $on( 'show_price' ) && '' !== $data['price'] ) {
			$rows['price'] = [ __( 'Price', 'refraction' ), esc_html( $data['price'] ) ];
		}

		if ( $on( 'show_organizer' ) && '' !== $data['organizer'] ) {
			$rows['organizer'] = [ __( 'Organizer', 'refraction' ), esc_html( $data['organizer'] ) ];
		}

		$tickets = $on( 'show_tickets' ) && '' !== $data['ticket_url'];
		$calendar = $on( 'show_calendar' ) && $card['links'];

		if ( ! $rows && ! $tickets && ! $calendar ) {
			return '';
		}

		ob_start();
		?>
		<div class="rf-ed" style="--ev:<?php echo esc_attr( $card['color'] ); ?>">
			<?php if ( $rows ) : ?>
				<ul class="rf-ed-rows">
					<?php foreach ( $rows as $name => [ $label, $value ] ) : ?>
						<li class="rf-ed-row rf-ed-<?php echo esc_attr( $name ); ?>">
							<?php echo self::icon( $name ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?>
							<span class="rf-ed-text">
								<span class="rf-ed-label"><?php echo esc_html( $label ); ?></span>
								<span class="rf-ed-value"><?php echo $value; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above. ?></span>
							</span>
						</li>
					<?php endforeach; ?>
				</ul>
			<?php endif; ?>
			<?php if ( $tickets || $calendar ) : ?>
				<div class="rf-ed-actions">
					<?php if ( $tickets ) : ?>
						<a class="rf-ed-tickets" href="<?php echo esc_url( $data['ticket_url'] ); ?>" target="_blank" rel="noopener"><?php echo esc_html( '' !== $data['ticket_label'] ? $data['ticket_label'] : __( 'Get tickets', 'refraction' ) ); ?></a>
					<?php endif; ?>
					<?php if ( $calendar ) : ?>
						<details class="rf-ed-addcal">
							<summary><?php echo self::icon( 'date' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?><?php esc_html_e( 'Add to calendar', 'refraction' ); ?></summary>
							<div class="rf-ed-addcal-menu">
								<?php foreach ( Event_Data::calendar_labels() as $key => $label ) : ?>
									<?php if ( ! empty( $card['links'][ $key ] ) ) : ?>
										<a href="<?php echo esc_attr( 'ics' === $key ? $card['links'][ $key ] : esc_url( $card['links'][ $key ] ) ); ?>"<?php echo 'ics' === $key ? ' download="' . esc_attr( sanitize_title( $card['title'] ) ?: 'event' ) . '.ics"' : ' target="_blank" rel="noopener"'; ?>><?php echo esc_html( $label ); ?></a>
									<?php endif; ?>
								<?php endforeach; ?>
							</div>
						</details>
					<?php endif; ?>
				</div>
			<?php endif; ?>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$id = (int) ( $s['event'] ?? 0 );

		if ( ! $id ) {
			$current = get_the_ID();
			$id = $current && Module::CPT === get_post_type( $current ) ? (int) $current : 0;
		}

		if ( ! $id ) {
			if ( \Refraction\Plugin::$instance->editor->is_edit_mode() || current_user_can( 'edit_posts' ) ) {
				echo '<div class="rf-ed rf-ed-hint">' . esc_html__( 'Event Details: put this on an event page, or pick an event in its settings.', 'refraction' ) . '</div>';
			}

			return;
		}

		$options = [ 'show_map' => 'yes' === ( $s['show_map'] ?? '' ) ];

		foreach ( array_merge( self::ROWS, [ 'tickets', 'calendar' ] ) as $key ) {
			$options[ 'show_' . $key ] = 'yes' === ( $s[ 'show_' . $key ] ?? '' );
		}

		$html = self::markup( Event_Data::card( $id ), $options );

		if ( '' === $html && ( \Refraction\Plugin::$instance->editor->is_edit_mode() || current_user_can( 'edit_post', $id ) ) ) {
			$html = '<div class="rf-ed rf-ed-hint">' . esc_html__( 'Event Details: set the date, venue and tickets in the page settings (the cog), under Event details.', 'refraction' ) . '</div>';
		}

		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in markup().
	}
}
