<?php
namespace Refraction\Modules\Timeline\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Timeline (0.139.0): entries along a line. Each entry is an empty container to design freely (a card, a step, an
 * event...), with a marker on the line: a dot, an icon, its number or a text such as a year or a time.
 *
 * Layout, per screen size: the line on the left, on the right, or in the middle with the entries on alternate sides
 * (by default: alternating on desktop, the line on the left on phones). In the middle, an entry can have a short text
 * on the other side of the line (a date). A pointer can join each entry to the line; the line can fill as the page
 * scrolls, colouring the markers it reaches.
 *
 * Markup: .rf-tl > .rf-tl__line (> .rf-tl__fill) + .rf-tl__items > .rf-tl__item (one per entry: its marker, pointer,
 * other-side text and container). The places are CSS grid, driven by custom properties the layout writes for each
 * screen size (assets/scss/frontend.scss); assets/js/frontend/handlers/timeline.js trims the line to the first and
 * last markers and draws the scroll fill.
 */
class Timeline extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-timeline';
	}

	public function get_title() {
		return esc_html__( 'Timeline', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-time-line';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'timeline', 'time line', 'history', 'steps', 'process', 'events', 'schedule', 'agenda', 'milestones', 'roadmap', 'nested' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-timeline' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-timeline';
	}

	// ---------------------------------------------------------------- the entries

	/** An entry: an empty container, as a white card to start from. */
	private function entry_container( int $index ): array {
		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Entry index. */
				'_title' => sprintf( __( 'Entry #%d', 'refraction' ), $index ),
				'content_width' => 'full',
				'min_height' => [ 'unit' => 'px', 'size' => 120 ],
				'padding' => [ 'unit' => 'px', 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20', 'isLinked' => true ],
				'background_background' => 'classic',
				'background_color' => '#FFFFFF',
				'border_radius' => [ 'unit' => 'px', 'top' => '12', 'right' => '12', 'bottom' => '12', 'left' => '12', 'isLinked' => true ],
				'box_shadow_box_shadow_type' => 'yes',
				'box_shadow_box_shadow' => [ 'horizontal' => 0, 'vertical' => 8, 'blur' => 24, 'spread' => 0, 'color' => 'rgba(17, 24, 39, 0.10)' ],
			],
			'elements' => [],
		];
	}

	protected function get_default_children_elements() {
		return [ $this->entry_container( 1 ), $this->entry_container( 2 ), $this->entry_container( 3 ) ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'item_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Entry index. */
		return esc_html__( 'Entry #%d', 'refraction' );
	}

	/** One slot per entry: its container goes into the entry of the same place, beside its marker. */
	protected function get_default_children_container_placeholder_selector() {
		return '.rf-tl__item';
	}

	/** A new entry gets the same white card as the first ones. */
	protected function new_items_like_defaults(): bool {
		return true;
	}

	// ---------------------------------------------------------------- controls

	protected function register_controls() {
		$this->start_controls_section( 'section_items', [ 'label' => esc_html__( 'Entries', 'refraction' ) ] );

		$repeater = new Repeater();
		$repeater->add_control( 'item_title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Entry', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'For the panel and Structure. The entry itself is the container under this widget: design it with any widgets.', 'refraction' ),
		] );
		$repeater->add_control( 'marker_text', [
			'label' => esc_html__( 'Marker Text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => '2026',
			'description' => esc_html__( 'Shown when the markers are Text (a year, a time, a short word). Empty: the entry\'s number.', 'refraction' ),
		] );
		$repeater->add_control( 'marker_icon', [
			'label' => esc_html__( 'Marker Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'default' => [ 'value' => 'fas fa-star', 'library' => 'fa-solid' ],
			'description' => esc_html__( 'Shown when the markers are Icons.', 'refraction' ),
		] );
		$repeater->add_control( 'side', [
			'label' => esc_html__( 'Side', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Alternate (the next side)', 'refraction' ),
				'left' => esc_html__( 'Left of the line', 'refraction' ),
				'right' => esc_html__( 'Right of the line', 'refraction' ),
			],
			'description' => esc_html__( 'When the line is in the middle.', 'refraction' ),
		] );
		$repeater->add_control( 'aside', [
			'label' => esc_html__( 'Text On The Other Side', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 2,
			'placeholder' => esc_html__( 'March 2026', 'refraction' ),
			'description' => esc_html__( 'When the line is in the middle (not in the Zigzag, where the entry before is there): a date or a few words across the line from the entry.', 'refraction' ),
		] );

		$this->add_control( 'items', [
			'label' => esc_html__( 'Entries', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'item_title' => esc_html__( 'Entry #1', 'refraction' ), 'marker_text' => '2017' ],
				[ 'item_title' => esc_html__( 'Entry #2', 'refraction' ), 'marker_text' => '2018' ],
				[ 'item_title' => esc_html__( 'Entry #3', 'refraction' ), 'marker_text' => '2019' ],
			],
			'title_field' => '{{{ item_title }}}',
			'button_text' => esc_html__( 'Add Entry', 'refraction' ),
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Line and markers
		$this->start_controls_section( 'section_layout', [ 'label' => esc_html__( 'Line And Markers', 'refraction' ) ] );

		$root = '{{WRAPPER}} .rf-tl';

		// Each layout writes where the line, the markers, the entries, their pointers and the other-side texts go.
		// "l": an entry left of the line; "r": right of it (assets/scss/frontend.scss).
		$right_of_line = '--rf-tl-r-col: %1$s; --rf-tl-r-justify: start; --rf-tl-r-shift: -100%%; --rf-tl-r-clip: polygon(100%% 0, 0 50%%, 100%% 100%%); --rf-tl-r-aside: %2$s; --rf-tl-r-aside-align: end;';
		$left_of_line = '--rf-tl-l-col: %1$s; --rf-tl-l-justify: end; --rf-tl-l-shift: 100%%; --rf-tl-l-clip: polygon(0 0, 100%% 50%%, 0 100%%); --rf-tl-l-aside: %2$s; --rf-tl-l-aside-align: start;';

		$this->add_responsive_control( 'layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Line on the left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'alternate' => [ 'title' => esc_html__( 'Line in the middle, entries on alternate sides', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'right' => [ 'title' => esc_html__( 'Line on the right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				'zigzag' => [ 'title' => esc_html__( 'Zigzag: alternate sides, each entry starting part-way down the one before', 'refraction' ), 'icon' => 'rficon-time-line' ],
			],
			'default' => 'alternate',
			'mobile_default' => 'left',
			'toggle' => false,
			'description' => esc_html__( 'Per screen size (the device icon). Phones start with the line on the left, so every entry has the whole width. Zigzag: the entries on both sides interlock instead of standing in rows.', 'refraction' ),
			'selectors_dictionary' => [
				// Every entry right of the line.
				'left' => '--rf-tl-cols: var(--rf-tl-rail, 48px) minmax(0, 1fr); --rf-tl-mark-col: 1; --rf-tl-line-x: calc(var(--rf-tl-rail, 48px) / 2); --rf-tl-aside-display: none; --rf-tl-zigzag: 0; '
					. sprintf( $right_of_line, '2', '2' ) . str_replace( '-r-', '-l-', sprintf( $right_of_line, '2', '2' ) ),
				// Every entry left of the line.
				'right' => '--rf-tl-cols: minmax(0, 1fr) var(--rf-tl-rail, 48px); --rf-tl-mark-col: 2; --rf-tl-line-x: calc(100% - var(--rf-tl-rail, 48px) / 2); --rf-tl-aside-display: none; --rf-tl-zigzag: 0; '
					. sprintf( $left_of_line, '1', '1' ) . str_replace( '-l-', '-r-', sprintf( $left_of_line, '1', '1' ) ),
				// Left of the line in column 1 (its other-side text in 3), right of it in column 3.
				'alternate' => '--rf-tl-cols: minmax(0, 1fr) var(--rf-tl-rail, 48px) minmax(0, 1fr); --rf-tl-mark-col: 2; --rf-tl-line-x: 50%; --rf-tl-aside-display: block; --rf-tl-zigzag: 0; '
					. sprintf( $left_of_line, '1', '3' ) . sprintf( $right_of_line, '3', '1' ),
				// As the middle layout; timeline.js then pulls each entry up beside the one before (Zigzag Overlap).
				// The text across the line is not shown: there the entry before is.
				'zigzag' => '--rf-tl-cols: minmax(0, 1fr) var(--rf-tl-rail, 48px) minmax(0, 1fr); --rf-tl-mark-col: 2; --rf-tl-line-x: 50%; --rf-tl-aside-display: none; --rf-tl-zigzag: 1; '
					. sprintf( $left_of_line, '1', '3' ) . sprintf( $right_of_line, '3', '1' ),
			],
			'selectors' => [ $root => '{{VALUE}}' ],
		] );

		$this->add_responsive_control( 'zigzag_start', [
			'label' => esc_html__( 'Zigzag: Next Entry Starts At', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 10, 'max' => 100 ] ],
			'default' => [ 'size' => 50 ],
			'description' => esc_html__( 'How far down the entry before it (on the other side) the next entry starts. Never over an entry on its own side: it waits for it, with the space between entries.', 'refraction' ),
			// A plain number: timeline.js reads it for each screen size.
			'selectors' => [ $root => '--rf-tl-zz-start: {{SIZE}};' ],
		] );

		$this->add_control( 'marker', [
			'label' => esc_html__( 'Markers', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'dot',
			'options' => [
				'dot' => esc_html__( 'Dot', 'refraction' ),
				'icon' => esc_html__( 'Icon (each entry\'s)', 'refraction' ),
				'number' => esc_html__( 'Number (1, 2, 3...)', 'refraction' ),
				'text' => esc_html__( 'Text (each entry\'s: a year, a time...)', 'refraction' ),
			],
			'separator' => 'before',
		] );

		$this->add_control( 'number_format', [
			'label' => esc_html__( 'Numbers', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '1',
			'options' => [ '1' => '1, 2, 3', '01' => '01, 02, 03' ],
			'condition' => [ 'marker' => [ 'number', 'text' ] ],
		] );

		$this->add_responsive_control( 'marker_align', [
			'label' => esc_html__( 'Marker Beside The Entry', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'start' => [ 'title' => esc_html__( 'At the top', 'refraction' ), 'icon' => 'rficon-v-align-top' ],
				'center' => [ 'title' => esc_html__( 'In the middle', 'refraction' ), 'icon' => 'rficon-v-align-middle' ],
			],
			'default' => 'start',
			'toggle' => false,
			'selectors_dictionary' => [
				'start' => '--rf-tl-align: start; --rf-tl-top: var(--rf-tl-offset, 20px); --rf-tl-ptr-top: calc(var(--rf-tl-offset, 20px) + var(--rf-tl-mark-size) / 2 - var(--rf-tl-ptr, 10px));',
				'center' => '--rf-tl-align: center; --rf-tl-top: 0px; --rf-tl-ptr-top: 0px;',
			],
			'selectors' => [ $root => '{{VALUE}}' ],
		] );

		$this->add_responsive_control( 'marker_offset', [
			'label' => esc_html__( 'Distance From The Top', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 200 ] ],
			'selectors' => [ $root => '--rf-tl-offset: {{SIZE}}px;' ],
			'condition' => [ 'marker_align' => 'start' ],
		] );

		$this->add_control( 'progress', [
			'label' => esc_html__( 'Line Fills As The Page Scrolls', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'The line colours in up to the middle of the screen, and the markers it reaches take their "reached" colours (Style > Markers).', 'refraction' ),
			'frontend_available' => true,
			'separator' => 'before',
		] );

		$this->add_control( 'pointer', [
			'label' => esc_html__( 'Pointer To The Line', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'A small arrow from each entry towards its marker. Give it the entry\'s background colour in Style > Pointer.', 'refraction' ),
			'selectors_dictionary' => [ '' => 'none', 'yes' => 'block' ],
			'selectors' => [ $root => '--rf-tl-ptr-display: {{VALUE}};' ],
		] );

		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls() {
		$root = '{{WRAPPER}} .rf-tl';
		$marker = '{{WRAPPER}} .rf-tl__marker';

		// ------------------------------------------------ Spacing
		$this->start_controls_section( 'section_style_space', [ 'label' => esc_html__( 'Spacing', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_responsive_control( 'rail', [
			'label' => esc_html__( 'Room For The Line', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 8, 'max' => 200 ] ],
			'default' => [ 'size' => 56 ],
			'mobile_default' => [ 'size' => 40 ],
			'description' => esc_html__( 'The column the line and the markers sit in. Wider than the markers.', 'refraction' ),
			'selectors' => [ $root => '--rf-tl-rail: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Space Between Line And Entries', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 120 ] ],
			'default' => [ 'size' => 24 ],
			'mobile_default' => [ 'size' => 12 ],
			'selectors' => [ $root => '--rf-tl-gap: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'row_gap', [
			'label' => esc_html__( 'Space Between Entries', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 200 ] ],
			'default' => [ 'size' => 40 ],
			'mobile_default' => [ 'size' => 24 ],
			'selectors' => [ $root => '--rf-tl-row-gap: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'list_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%', 'em', 'vw' ],
			'selectors' => [ $root => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			'separator' => 'before',
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Line
		$this->start_controls_section( 'section_style_line', [ 'label' => esc_html__( 'Line', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'line_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#D5D8DC',
			'selectors' => [ $root => '--rf-tl-line-color: {{VALUE}};' ],
		] );
		$this->add_control( 'line_fill', [
			'label' => esc_html__( 'Filled Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#2563EB',
			'selectors' => [ $root => '--rf-tl-fill: {{VALUE}};' ],
			'condition' => [ 'progress' => 'yes' ],
		] );
		$this->add_responsive_control( 'line_width', [
			'label' => esc_html__( 'Width', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 20 ] ],
			'default' => [ 'size' => 2 ],
			'selectors' => [ $root => '--rf-tl-line-w: {{SIZE}}px;' ],
		] );
		$this->add_control( 'line_style', [
			'label' => esc_html__( 'Style', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'solid',
			'options' => [ 'solid' => esc_html__( 'Solid', 'refraction' ), 'dashed' => esc_html__( 'Dashed', 'refraction' ), 'dotted' => esc_html__( 'Dotted', 'refraction' ) ],
			'selectors' => [ $root => '--rf-tl-line-style: {{VALUE}};' ],
		] );
		$this->add_control( 'line_ends', [
			'label' => esc_html__( 'Line Reaches', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'markers',
			'options' => [
				'markers' => esc_html__( 'From the first marker to the last', 'refraction' ),
				'full' => esc_html__( 'The whole height', 'refraction' ),
			],
			'frontend_available' => true,
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Markers
		$this->start_controls_section( 'section_style_markers', [ 'label' => esc_html__( 'Markers', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_responsive_control( 'dot_size', [
			'label' => esc_html__( 'Dot Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 4, 'max' => 60 ] ],
			'default' => [ 'size' => 14 ],
			'selectors' => [ $root => '--rf-tl-dot: {{SIZE}}px;' ],
			'condition' => [ 'marker' => 'dot' ],
		] );
		$this->add_responsive_control( 'marker_size', [
			'label' => esc_html__( 'Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 16, 'max' => 160 ] ],
			'default' => [ 'size' => 44 ],
			'mobile_default' => [ 'size' => 36 ],
			'description' => esc_html__( 'The smallest a marker is; a longer text makes it wider.', 'refraction' ),
			'selectors' => [ $root => '--rf-tl-mark: {{SIZE}}px;' ],
			'condition' => [ 'marker!' => 'dot' ],
		] );
		$this->add_responsive_control( 'icon_size', [
			'label' => esc_html__( 'Icon Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 8, 'max' => 120 ] ],
			'default' => [ 'size' => 18 ],
			'selectors' => [ $marker => '--rf-tl-icon: {{SIZE}}px;' ],
			'condition' => [ 'marker' => 'icon' ],
		] );
		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'marker_typography',
			'selector' => '{{WRAPPER}} .rf-tl__marker-text',
			'condition' => [ 'marker' => [ 'number', 'text' ] ],
		] );

		$this->start_controls_tabs( 'marker_tabs' );
		foreach ( [ 'normal' => esc_html__( 'Normal', 'refraction' ), 'reached' => esc_html__( 'Reached', 'refraction' ) ] as $state => $label ) {
			$this->start_controls_tab( 'marker_tab_' . $state, [ 'label' => $label ] );
			$sel = 'normal' === $state ? $marker : '{{WRAPPER}} .rf-tl__item.is-reached .rf-tl__marker';
			$cond = 'normal' === $state ? [] : [ 'condition' => [ 'progress' => 'yes' ] ];

			if ( 'reached' === $state ) {
				$this->add_control( 'marker_reached_note', [
					'type' => Controls_Manager::RAW_HTML,
					'raw' => esc_html__( 'Markers the scroll fill has reached (Content > Line Fills As The Page Scrolls).', 'refraction' ),
					'content_classes' => 'refraction-descriptor',
				] );
			}

			$this->add_control( 'marker_bg' . ( 'normal' === $state ? '' : '_reached' ), [
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => 'normal' === $state ? '#2563EB' : '',
				'selectors' => [ $sel => 'background-color: {{VALUE}};' ],
			] + $cond );
			$this->add_control( 'marker_color' . ( 'normal' === $state ? '' : '_reached' ), [
				'label' => esc_html__( 'Icon / Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => 'normal' === $state ? '#FFFFFF' : '',
				'selectors' => [ $sel => 'color: {{VALUE}};' ],
			] + $cond );
			$this->add_control( 'marker_border_color' . ( 'normal' === $state ? '' : '_reached' ), [
				'label' => esc_html__( 'Ring Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => 'normal' === $state ? '#FFFFFF' : '',
				'selectors' => [ $sel => 'border-color: {{VALUE}};' ],
			] + $cond );
			$this->end_controls_tab();
		}
		$this->end_controls_tabs();

		$this->add_responsive_control( 'marker_border_width', [
			'label' => esc_html__( 'Ring Width', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 12 ] ],
			'default' => [ 'size' => 3 ],
			'description' => esc_html__( 'A ring around the marker, in the page\'s colour, sets it off the line.', 'refraction' ),
			'selectors' => [ $marker => 'border-width: {{SIZE}}px;' ],
			'separator' => 'before',
		] );
		$this->add_responsive_control( 'marker_radius', [
			'label' => esc_html__( 'Roundness', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 50 ] ],
			'default' => [ 'size' => 50 ],
			'selectors' => [ $marker => 'border-radius: {{SIZE}}%;' ],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Pointer
		$this->start_controls_section( 'section_style_pointer', [ 'label' => esc_html__( 'Pointer', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE, 'condition' => [ 'pointer' => 'yes' ] ] );

		$this->add_control( 'pointer_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#FFFFFF',
			'description' => esc_html__( 'The entries\' background colour, so the arrow looks part of them.', 'refraction' ),
			'selectors' => [ $root => '--rf-tl-ptr-color: {{VALUE}};' ],
		] );
		$this->add_responsive_control( 'pointer_size', [
			'label' => esc_html__( 'Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 4, 'max' => 40 ] ],
			'default' => [ 'size' => 10 ],
			'selectors' => [ $root => '--rf-tl-ptr: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Text on the other side
		$this->start_controls_section( 'section_style_aside', [ 'label' => esc_html__( 'Text On The Other Side', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'aside_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Shown when the line is in the middle; each entry\'s text is in Content > Entries.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );
		$this->add_control( 'aside_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-tl__aside' => 'color: {{VALUE}};' ],
		] );
		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'aside_typography',
			'selector' => '{{WRAPPER}} .rf-tl__aside',
		] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- output

	/** A marker's inside: nothing (a dot), the entry's icon, its number, or its text. */
	private function marker_html( array $settings, array $item, int $index ): string {
		$type = in_array( $settings['marker'] ?? '', [ 'icon', 'number', 'text' ], true ) ? $settings['marker'] : 'dot';
		$number = '01' === ( $settings['number_format'] ?? '' ) ? sprintf( '%02d', $index + 1 ) : (string) ( $index + 1 );

		if ( 'icon' === $type ) {
			$icon = '';

			if ( ! empty( $item['marker_icon']['value'] ) ) {
				ob_start();
				Icons_Manager::render_icon( $item['marker_icon'], [ 'aria-hidden' => 'true' ] );
				$icon = (string) ob_get_clean();
			}

			return $icon;
		}

		if ( 'number' === $type || 'text' === $type ) {
			$text = 'text' === $type ? trim( (string) ( $item['marker_text'] ?? '' ) ) : '';

			return '<span class="rf-tl__marker-text">' . esc_html( '' !== $text ? $text : $number ) . '</span>';
		}

		return '';
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$items = array_values( (array) ( $settings['items'] ?? [] ) );
		$type = in_array( $settings['marker'] ?? '', [ 'icon', 'number', 'text' ], true ) ? $settings['marker'] : 'dot';
		?>
		<div class="rf-tl rf-tl--marker-<?php echo esc_attr( $type ); ?>">
			<span class="rf-tl__line" aria-hidden="true"><span class="rf-tl__fill"></span></span>
			<div class="rf-tl__items">
				<?php foreach ( $this->get_children() as $index => $child ) :
					$item = $items[ $index ] ?? [];
					$side = in_array( $item['side'] ?? '', [ 'left', 'right' ], true ) ? ' rf-tl__item--side-' . $item['side'] : '';
					$aside = trim( (string) ( $item['aside'] ?? '' ) );
					?>
					<div class="rf-tl__item<?php echo esc_attr( $side ); ?> refraction-repeater-item-<?php echo esc_attr( $item['_id'] ?? $index ); ?>">
						<span class="rf-tl__marker" aria-hidden="true"><?php echo $this->marker_html( $settings, $item, $index ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped text or icon markup. ?></span>
						<span class="rf-tl__pointer" aria-hidden="true"></span>
						<?php if ( '' !== $aside ) : ?>
							<div class="rf-tl__aside"><?php echo nl2br( esc_html( $aside ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped text. ?></div>
						<?php endif; ?>
						<?php $child->print_element(); ?>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
	}

	protected function content_template() {
		?>
		<#
		const items = settings.items || [];
		const type = [ 'icon', 'number', 'text' ].includes( settings.marker ) ? settings.marker : 'dot';
		const markerHtml = ( item, index ) => {
			const number = '01' === settings.number_format ? String( index + 1 ).padStart( 2, '0' ) : String( index + 1 );
			if ( 'icon' === type ) {
				const icon = item.marker_icon && item.marker_icon.value ? refraction.helpers.renderIcon( view, item.marker_icon, { 'aria-hidden': true }, 'i', 'object' ) : null;
				return icon && icon.rendered ? icon.value : '';
			}
			if ( 'number' === type || 'text' === type ) {
				const text = 'text' === type ? String( item.marker_text || '' ).trim() : '';
				return '<span class="rf-tl__marker-text">' + _.escape( text || number ) + '</span>';
			}
			return '';
		};
		#>
		<div class="rf-tl rf-tl--marker-{{ type }}">
			<span class="rf-tl__line" aria-hidden="true"><span class="rf-tl__fill"></span></span>
			<div class="rf-tl__items">
				<# _.each( items, ( item, index ) => {
					const side = [ 'left', 'right' ].includes( item.side ) ? ' rf-tl__item--side-' + item.side : '';
					const aside = String( item.aside || '' ).trim();
				#>
					<div class="rf-tl__item{{ side }} refraction-repeater-item-{{ item._id }}">
						<span class="rf-tl__marker" aria-hidden="true">{{{ markerHtml( item, index ) }}}</span>
						<span class="rf-tl__pointer" aria-hidden="true"></span>
						<# if ( aside ) { #><div class="rf-tl__aside">{{{ _.escape( aside ).replace( /\n/g, '<br>' ) }}}</div><# } #>
					</div>
				<# } ); #>
			</div>
		</div>
		<?php
	}
}
