<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\Events\Classes\Calendar;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Module;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event Calendar: the events in a month grid, a list of the month or one day's timeline, with search, previous / next,
 * today, a month picker under the title, and a preview card on hover or focus with "View event" and "Add to calendar"
 * (Google, iCalendar, Outlook). Moving around reloads the views from refraction/v1/events/calendar without reloading
 * the page. Script: assets/js/frontend/handlers/event-calendar.js.
 */
class Event_Calendar extends Widget_Base {

	public function get_name() {
		return 'refraction-event-calendar';
	}

	public function get_title() {
		return esc_html__( 'Event Calendar', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-calendar';
	}

	public function get_categories() {
		return [ Module::WIDGET_CATEGORY ];
	}

	public function get_keywords() {
		return [ 'calendar', 'events', 'month', 'agenda', 'schedule', 'dates' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-events' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	/** Today moves on: the calendar is not kept in the element cache. */
	protected function is_dynamic_content(): bool {
		return true;
	}

	public static function category_options(): array {
		$terms = get_terms( [ 'taxonomy' => Module::TAXONOMY, 'hide_empty' => false ] );

		return is_array( $terms ) ? wp_list_pluck( $terms, 'name', 'term_id' ) : [];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_calendar', [ 'label' => esc_html__( 'Calendar', 'refraction' ) ] );

		$this->add_control( 'default_view', [
			'label' => esc_html__( 'Opens on', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'month',
			'options' => [
				'month' => esc_html__( 'Month', 'refraction' ),
				'list' => esc_html__( 'List', 'refraction' ),
				'day' => esc_html__( 'Day', 'refraction' ),
			],
		] );

		foreach ( [ 'list' => esc_html__( 'List button', 'refraction' ), 'month' => esc_html__( 'Month button', 'refraction' ), 'day' => esc_html__( 'Day button', 'refraction' ) ] as $view => $label ) {
			$this->add_control( 'view_' . $view, [ 'label' => $label, 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		}

		$this->add_control( 'categories', [
			'label' => esc_html__( 'Only these categories', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'multiple' => true,
			'label_block' => true,
			'options' => self::category_options(),
			'description' => esc_html__( 'Empty: every event.', 'refraction' ),
			'separator' => 'before',
		] );

		$this->add_control( 'week_start', [
			'label' => esc_html__( 'Weeks start on', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => (string) ( 0 === (int) get_option( 'start_of_week', 1 ) ? 0 : 1 ),
			'options' => [ '1' => esc_html__( 'Monday', 'refraction' ), '0' => esc_html__( 'Sunday', 'refraction' ) ],
		] );

		$this->add_control( 'per_day', [
			'label' => esc_html__( 'Events in a day before "+ more"', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 3,
			'min' => 1,
			'max' => 10,
		] );

		$this->add_control( 'show_times', [
			'label' => esc_html__( 'Start times on the month grid', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'show_search', [
			'label' => esc_html__( 'Search', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'separator' => 'before',
		] );

		$this->add_control( 'search_placeholder', [
			'label' => esc_html__( 'Search placeholder', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Search for events', 'refraction' ),
			'condition' => [ 'show_search' => 'yes' ],
		] );

		$this->add_control( 'search_button', [
			'label' => esc_html__( 'Search button', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Find events', 'refraction' ),
			'condition' => [ 'show_search' => 'yes' ],
		] );

		$this->add_control( 'preview', [
			'label' => esc_html__( 'Preview card on hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'separator' => 'before',
		] );

		$this->add_control( 'add_to_calendar', [
			'label' => esc_html__( '"Add to calendar" in the card', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'preview' => 'yes' ],
		] );

		$this->add_control( 'view_label', [
			'label' => esc_html__( 'Card button', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'View event', 'refraction' ),
			'condition' => [ 'preview' => 'yes' ],
		] );

		$this->add_control( 'new_event_hint', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => sprintf(
				/* translators: %s: link to a new event. */
				esc_html__( 'Events are pages of their own: %s, or open Refraction > Events.', 'refraction' ),
				'<a href="' . esc_url( Module::new_event_url() ) . '" target="_blank">' . esc_html__( 'make a new event', 'refraction' ) . '</a>'
			),
			'content_classes' => 'refraction-descriptor',
			'separator' => 'before',
		] );

		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function color( string $key, string $label, string $variable, string $default = '' ) {
		$this->add_control( $key, [
			'label' => $label,
			'type' => Controls_Manager::COLOR,
			'default' => $default,
			'selectors' => [ '{{WRAPPER}} .rf-cal, .rf-cal-pop[data-for="{{ID}}"]' => $variable . ': {{VALUE}};' ],
		] );
	}

	private function register_style_controls() {
		$this->start_controls_section( 'section_style_colors', [
			'label' => esc_html__( 'Colors', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->color( 'primary_color', esc_html__( 'Main color (buttons, search)', 'refraction' ), '--rf-cal-primary' );
		$this->color( 'accent_color', esc_html__( 'Accent (weekdays, today, card time)', 'refraction' ), '--rf-cal-warm' );
		$this->color( 'event_color', esc_html__( 'Events without a category', 'refraction' ), '--rf-cal-ev-default' );
		$this->color( 'text_color', esc_html__( 'Text', 'refraction' ), '--rf-cal-ink' );
		$this->color( 'muted_color', esc_html__( 'Quiet text', 'refraction' ), '--rf-cal-muted' );
		$this->color( 'line_color', esc_html__( 'Grid lines', 'refraction' ), '--rf-cal-line' );
		$this->color( 'cell_color', esc_html__( 'Day background', 'refraction' ), '--rf-cal-cell' );
		$this->color( 'other_color', esc_html__( 'Days of the next and previous month', 'refraction' ), '--rf-cal-other' );
		$this->color( 'surface_color', esc_html__( 'Toolbar and switch background', 'refraction' ), '--rf-cal-surface' );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_layout', [
			'label' => esc_html__( 'Layout and text', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_responsive_control( 'cell_height', [
			'label' => esc_html__( 'Day height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 60, 'max' => 260 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-cal' => '--rf-cal-cell-h: {{SIZE}}px;' ],
		] );

		$this->add_control( 'radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 30 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-cal, .rf-cal-pop[data-for="{{ID}}"]' => '--rf-cal-radius: {{SIZE}}px;' ],
		] );

		$this->add_control( 'toolbar_box', [
			'label' => esc_html__( 'Toolbar as a card', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'card',
			'return_value' => 'card',
			'prefix_class' => 'rf-cal-toolbar-',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'title_typography',
			'label' => esc_html__( 'Month title', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-cal-title',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'daynum_typography',
			'label' => esc_html__( 'Day numbers', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-cal-daynum',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'event_typography',
			'label' => esc_html__( 'Events', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-cal-ev, {{WRAPPER}} .rf-cal-agenda-title, {{WRAPPER}} .rf-cal-day-title',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_card', [
			'label' => esc_html__( 'Preview card', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => [ 'preview' => 'yes' ],
		] );

		$card = '.rf-cal-pop[data-for="{{ID}}"]';

		$this->add_control( 'card_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 220, 'max' => 480 ] ],
			'selectors' => [ $card => 'width: {{SIZE}}px;' ],
		] );

		$this->add_control( 'card_background', [
			'label' => esc_html__( 'Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ $card => 'background-color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'card_title_typography',
			'label' => esc_html__( 'Title', 'refraction' ),
			'selector' => $card . ' .rf-cal-pop-title',
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'card_shadow',
			'selector' => $card,
		] );

		$this->end_controls_section();
	}

	private static function chevron( string $points ): string {
		return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="' . $points . '"/></svg>';
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$on = static fn( $key ) => 'yes' === ( $s[ $key ] ?? '' );
		$options = Calendar::options( [
			'week_start' => $s['week_start'] ?? 1,
			'per_day' => $s['per_day'] ?? 3,
			'times' => $on( 'show_times' ),
			'categories' => (array) ( $s['categories'] ?? [] ),
		] );
		$views = array_values( array_filter( [ 'list', 'month', 'day' ], static fn( $view ) => $on( 'view_' . $view ) ) );
		$view = in_array( $s['default_view'] ?? 'month', $views ?: [ 'month' ], true ) ? $s['default_view'] : ( $views[0] ?? 'month' );
		$data = ( new Calendar( $options ) )->views( current_time( 'Y-m-d' ) );
		$labels = [ 'list' => __( 'List', 'refraction' ), 'month' => __( 'Month', 'refraction' ), 'day' => __( 'Day', 'refraction' ) ];
		$config = [
			'rest' => esc_url_raw( rest_url( 'refraction/v1/events/calendar' ) ),
			'week_start' => $options['week_start'],
			'per_day' => $options['per_day'],
			'times' => $options['times'] ? '1' : '0',
			'categories' => implode( ',', $options['categories'] ),
			'preview' => $on( 'preview' ),
			'addToCalendar' => $on( 'add_to_calendar' ),
			'id' => $this->get_id(),
			'i18n' => [
				'view' => '' !== trim( (string) ( $s['view_label'] ?? '' ) ) ? $s['view_label'] : __( 'View event', 'refraction' ),
				'add' => __( 'Add to calendar', 'refraction' ),
				'providers' => Event_Data::calendar_labels(),
				'prevMonth' => __( 'Previous month', 'refraction' ),
				'nextMonth' => __( 'Next month', 'refraction' ),
				'months' => array_map( static fn( $m ) => date_i18n( 'F', gmmktime( 0, 0, 0, $m, 1, 2023 ) ), range( 1, 12 ) ),
				'days' => array_map( static fn( $d ) => mb_substr( date_i18n( 'D', gmmktime( 0, 0, 0, 1, 1 + $d, 2023 ) ), 0, 1 ), range( 0, 6 ) ),
			],
		];
		?>
		<div class="rf-cal" data-view="<?php echo esc_attr( $view ); ?>" data-date="<?php echo esc_attr( $data['date'] ); ?>" data-month-title="<?php echo esc_attr( $data['monthTitle'] ); ?>" data-day-title="<?php echo esc_attr( $data['dayTitle'] ); ?>" data-config="<?php echo esc_attr( (string) wp_json_encode( $config ) ); ?>">
			<?php if ( $on( 'show_search' ) || count( $views ) > 1 ) : ?>
				<div class="rf-cal-toolbar">
					<?php if ( $on( 'show_search' ) ) : ?>
						<form class="rf-cal-search" role="search">
							<span class="rf-cal-search-ic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg></span>
							<input type="search" class="rf-cal-q" placeholder="<?php echo esc_attr( $s['search_placeholder'] ?? '' ); ?>" aria-label="<?php echo esc_attr( $s['search_placeholder'] ?: __( 'Search for events', 'refraction' ) ); ?>" autocomplete="off">
							<button type="submit" class="rf-cal-find"><?php echo esc_html( $s['search_button'] ?: __( 'Find events', 'refraction' ) ); ?></button>
						</form>
					<?php endif; ?>
					<?php if ( count( $views ) > 1 ) : ?>
						<div class="rf-cal-views" role="tablist" aria-label="<?php esc_attr_e( 'Calendar view', 'refraction' ); ?>">
							<?php foreach ( $views as $name ) : ?>
								<button type="button" class="rf-cal-view<?php echo $name === $view ? ' is-active' : ''; ?>" data-view="<?php echo esc_attr( $name ); ?>" role="tab" aria-selected="<?php echo $name === $view ? 'true' : 'false'; ?>"><?php echo esc_html( $labels[ $name ] ); ?></button>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
				</div>
			<?php endif; ?>

			<div class="rf-cal-nav">
				<div class="rf-cal-nav-btns">
					<button type="button" class="rf-cal-arrow rf-cal-prev" aria-label="<?php esc_attr_e( 'Previous', 'refraction' ); ?>"><?php echo self::chevron( '15 18 9 12 15 6' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?></button>
					<button type="button" class="rf-cal-arrow rf-cal-next" aria-label="<?php esc_attr_e( 'Next', 'refraction' ); ?>"><?php echo self::chevron( '9 18 15 12 9 6' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?></button>
				</div>
				<button type="button" class="rf-cal-today-btn"><?php esc_html_e( 'Today', 'refraction' ); ?></button>
				<div class="rf-cal-titlewrap">
					<button type="button" class="rf-cal-title" aria-haspopup="dialog" aria-expanded="false">
						<span class="rf-cal-title-text" aria-live="polite"><?php echo esc_html( 'day' === $view ? $data['dayTitle'] : $data['monthTitle'] ); ?></span>
						<svg class="rf-cal-title-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
					</button>
					<div class="rf-cal-picker"></div>
				</div>
			</div>

			<div class="rf-cal-body">
				<div class="rf-cal-month"<?php echo 'month' === $view ? '' : ' hidden'; ?>><?php echo $data['month']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Calendar. ?></div>
				<div class="rf-cal-agenda"<?php echo 'list' === $view ? '' : ' hidden'; ?>><?php echo $data['list']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Calendar. ?></div>
				<div class="rf-cal-day"<?php echo 'day' === $view ? '' : ' hidden'; ?>><?php echo $data['day']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in Calendar. ?></div>
				<div class="rf-cal-loader" hidden aria-hidden="true"><span class="rf-cal-spinner"></span></div>
			</div>
		</div>
		<?php
	}
}
