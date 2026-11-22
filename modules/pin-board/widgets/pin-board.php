<?php
namespace Refraction\Modules\PinBoard\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Pin Board (0.143.0): notes pinned to a board. Each note is a white card with a pin on top holding a container to
 * design (its number, a title, a few words: whatever you like), tilted a little, and a dashed line runs from each note to
 * the next.
 *
 * Layout, per screen size: a zigzag (one note per row, left then right, overlapping a little) or a grid of columns.
 * Phones start with wider notes, less overlap and a gentler tilt. The board can look like lined paper, grid paper or
 * dots. Pins: a 3D pushpin, a flat pin, a strip of tape or none, each note with its own colour (or the next of a set).
 *
 * 0.144.0: the board has a container's background, border, shadow and size (Style > Board); a Heading and a Footer,
 * each a container to design, can be turned on above and below the notes (rows with a role in the Notes list); a Free
 * layout in which each note is dragged into place and resized in Edit Mode (its place and width saved per screen size);
 * a Reveal (the notes appearing as they come into view, then the lines drawing themselves); more lines (shapes,
 * patterns, ends, flowing).
 *
 * Markup: .rf-pb > svg.rf-pb__links (drawn by assets/js/frontend/handlers/pin-board.js) + .rf-pb__notes >
 * .rf-pb__slot (one per row: the heading, each note with its pin, the footer). The layout and sizes are custom
 * properties written per screen size (assets/scss/frontend.scss); the tilt, pin colour and place are on each note.
 */
class Pin_Board extends Widget_Nested_Base {

	/** The set the notes take in turn when they have no colour or tilt of their own. */
	const PINS = [ '#F2643B', '#3B6CF2', '#8B5CF6' ];
	const PAPERS = [ '#FDEBDF', '#E4E9FE', '#F2E5FD' ];
	const TILTS = [ -5, 4, -3, 5, -4, 3 ];

	public function get_name() {
		return 'refraction-pin-board';
	}

	public function get_title() {
		return esc_html__( 'Pin Board', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-notes';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'pin', 'board', 'notes', 'sticky', 'cards', 'steps', 'zigzag', 'pushpin', 'paper', 'tips', 'nested' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-pin-board' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-pin-board';
	}

	// ---------------------------------------------------------------- the notes

	private static function widget( string $type, array $settings ): array {
		return [ 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => [] ];
	}

	/** A note: a pastel panel (the next of the set) with its number, a title and a few words. */
	private function note_container( int $index ): array {
		$pin = self::PINS[ ( $index - 1 ) % 3 ];

		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Note index. */
				'_title' => sprintf( __( 'Note #%d', 'refraction' ), $index ),
				'content_width' => 'full',
				'flex_gap' => [ 'unit' => 'px', 'size' => 6, 'column' => '6', 'row' => '6', 'isLinked' => true ],
				'padding' => [ 'unit' => 'px', 'top' => '22', 'right' => '22', 'bottom' => '24', 'left' => '22', 'isLinked' => false ],
				'background_background' => 'classic',
				'background_color' => self::PAPERS[ ( $index - 1 ) % 3 ],
				'border_radius' => [ 'unit' => 'px', 'top' => '14', 'right' => '14', 'bottom' => '14', 'left' => '14', 'isLinked' => true ],
			],
			'elements' => [
				self::widget( 'heading', [ 'title' => sprintf( '%02d', $index ), 'header_size' => 'div', 'title_color' => $pin, 'typography_typography' => 'custom', 'typography_font_size' => [ 'unit' => 'px', 'size' => 30 ], 'typography_font_weight' => '400' ] ),
				/* translators: %d: Note index. */
				self::widget( 'heading', [ 'title' => sprintf( __( 'Note %d', 'refraction' ), $index ), 'header_size' => 'h3', 'title_color' => '#111111', 'typography_typography' => 'custom', 'typography_font_size' => [ 'unit' => 'px', 'size' => 24 ], 'typography_font_weight' => '600' ] ),
				self::widget( 'text-editor', [ 'editor' => '<p>' . esc_html__( 'A few words for this note.', 'refraction' ) . '</p>', 'text_color' => '#4B5563' ] ),
			],
		];
	}

	protected function get_default_children_elements() {
		return array_map( [ $this, 'note_container' ], [ 1, 2, 3, 4, 5 ] );
	}

	protected function get_default_repeater_title_setting_key() {
		return 'item_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Note index. */
		return esc_html__( 'Note #%d', 'refraction' );
	}

	/** One slot per row: the heading, each note (the white card with its pin), the footer. */
	protected function get_default_children_container_placeholder_selector() {
		return '.rf-pb__slot';
	}

	/** What the Heading and Footer start with (turned on in Content > Heading And Footer). */
	protected function get_default_role_elements(): array {
		$part = static function ( string $title, array $elements ): array {
			return [
				'elType' => 'container',
				'settings' => [
					'_title' => $title,
					'content_width' => 'full',
					'flex_direction' => 'column',
					'flex_align_items' => 'center',
					'flex_gap' => [ 'unit' => 'px', 'size' => 8, 'column' => '8', 'row' => '8', 'isLinked' => true ],
					'padding' => [ 'unit' => 'px', 'top' => '8', 'right' => '8', 'bottom' => '8', 'left' => '8', 'isLinked' => true ],
				],
				'elements' => $elements,
			];
		};

		return [
			'heading' => $part( esc_html__( 'Heading', 'refraction' ), [
				self::widget( 'heading', [ 'title' => esc_html__( 'Our route', 'refraction' ), 'header_size' => 'h2', 'align' => 'center' ] ),
				self::widget( 'text-editor', [ 'editor' => '<p style="text-align:center">' . esc_html__( 'A few words about what follows.', 'refraction' ) . '</p>' ] ),
			] ),
			'footer' => $part( esc_html__( 'Footer', 'refraction' ), [
				self::widget( 'text-editor', [ 'editor' => '<p style="text-align:center">' . esc_html__( 'A closing line, or a button.', 'refraction' ) . '</p>' ] ),
			] ),
		];
	}

	/** A new note starts like the first ones (its panel, number, title and words). */
	protected function new_items_like_defaults(): bool {
		return true;
	}

	// ---------------------------------------------------------------- controls

	protected function register_controls() {
		$this->start_controls_section( 'section_parts', [ 'label' => esc_html__( 'Heading And Footer', 'refraction' ) ] );

		foreach ( [ 'heading' => esc_html__( 'Heading', 'refraction' ), 'footer' => esc_html__( 'Footer', 'refraction' ) ] as $role => $label ) {
			$this->add_control( 'show_' . $role, [
				'label' => $label,
				'type' => Controls_Manager::SWITCHER,
				'description' => 'heading' === $role
					? esc_html__( 'A container on the board above the notes, with all a container\'s settings (select it on the page or in Structure).', 'refraction' )
					: esc_html__( 'A container on the board below the notes, with all a container\'s settings.', 'refraction' ),
			] );
		}

		$this->end_controls_section();

		$this->start_controls_section( 'section_items', [ 'label' => esc_html__( 'Notes', 'refraction' ) ] );

		$repeater = new Repeater();
		$repeater->add_control( 'item_title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Note', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'For the panel and Structure. The note itself is the container under this widget: design it with any widgets.', 'refraction' ),
		] );
		$repeater->add_control( 'pin_color', [
			'label' => esc_html__( 'Pin Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'description' => esc_html__( 'Empty: orange, blue and purple in turn.', 'refraction' ),
			'condition' => [ 'role' => '' ],
		] );
		$repeater->add_control( 'tilt', [
			'label' => esc_html__( 'Tilt', 'refraction' ) . ' (deg)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -20, 'max' => 20, 'step' => 0.5 ] ],
			'description' => esc_html__( 'Empty: a little left or right in turn.', 'refraction' ),
			'condition' => [ 'role' => '' ],
		] );
		$repeater->add_control( 'side', [
			'label' => esc_html__( 'Side', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [ '' => esc_html__( 'In turn (left, right...)', 'refraction' ), 'left' => esc_html__( 'Left', 'refraction' ), 'center' => esc_html__( 'Middle', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ) ],
			'description' => esc_html__( 'In the zigzag.', 'refraction' ),
			'condition' => [ 'role' => '' ],
		] );

		// The row's role: '' a note, or the heading / footer (added and removed by their switches).
		$repeater->add_control( 'role', [
			'type' => Controls_Manager::HIDDEN,
			'default' => '',
		] );
		$repeater->add_control( 'place_heading', [
			'label' => esc_html__( 'Place (Free layout, per screen size)', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
			'condition' => [ 'role' => '' ],
		] );
		$repeater->add_responsive_control( 'pos_x', [
			'label' => esc_html__( 'From The Left', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 95, 'step' => 0.1 ] ],
			'description' => esc_html__( 'Or drag the note in Edit Mode (by its white frame or its pin).', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}' => '--rf-pb-x: {{SIZE}}%;' ],
			'condition' => [ 'role' => '' ],
		] );
		$repeater->add_responsive_control( 'pos_y', [
			'label' => esc_html__( 'From The Top', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 4000 ] ],
			'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}' => '--rf-pb-y: {{SIZE}}px;' ],
			'condition' => [ 'role' => '' ],
		] );
		$repeater->add_responsive_control( 'note_w', [
			'label' => esc_html__( 'Width', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 10, 'max' => 100, 'step' => 0.1 ] ],
			'description' => esc_html__( 'Or drag the handle on the note\'s right edge in Edit Mode.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}' => '--rf-pb-nw: {{SIZE}}%;' ],
			'condition' => [ 'role' => '' ],
		] );

		$this->add_control( 'items', [
			'label' => esc_html__( 'Notes', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $repeater->get_controls(),
			'default' => array_map( static fn( $n ) => [ 'item_title' => sprintf( /* translators: %d: Note index. */ esc_html__( 'Note #%d', 'refraction' ), $n ) ], [ 1, 2, 3, 4, 5 ] ),
			'title_field' => '{{{ item_title }}}',
			'button_text' => esc_html__( 'Add Note', 'refraction' ),
			'description' => esc_html__( 'The Heading and Footer are in this list too (first and last) once turned on above.', 'refraction' ),
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Layout
		$this->start_controls_section( 'section_layout', [ 'label' => esc_html__( 'Layout', 'refraction' ) ] );

		$root = '{{WRAPPER}} .rf-pb';

		$this->add_responsive_control( 'layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'zigzag' => [ 'title' => esc_html__( 'Zigzag: one note per row, left and right in turn', 'refraction' ), 'icon' => 'rficon-time-line' ],
				'grid' => [ 'title' => esc_html__( 'Grid', 'refraction' ), 'icon' => 'rficon-container-grid' ],
				'free' => [ 'title' => esc_html__( 'Free: drag each note into place in Edit Mode', 'refraction' ), 'icon' => 'rficon-cursor-move' ],
			],
			'default' => 'zigzag',
			'toggle' => false,
			'description' => esc_html__( 'Per screen size (the device icon). Free: drag a note by its white frame or its pin, and its width by the handle on its right edge; the place is kept for this screen size. Dragging a note in the zigzag or the grid turns this screen size to Free, the notes staying where they are.', 'refraction' ),
			'selectors_dictionary' => [
				'zigzag' => '--rf-pb-display: flex; --rf-pb-cols-css: none; --rf-pb-note-w: var(--rf-pb-w, 44%); --rf-pb-odd: flex-start; --rf-pb-even: flex-end; --rf-pb-mt: calc(-1 * var(--rf-pb-overlap, 48px)); --rf-pb-zigzag: 1; --rf-pb-free: 0; --rf-pb-jself: auto; --rf-pb-row-gap: var(--rf-pb-gap, 36px); --rf-pb-note-row: auto; --rf-pb-note-col: auto; --rf-pb-foot-row: auto;',
				'grid' => '--rf-pb-display: grid; --rf-pb-cols-css: repeat(var(--rf-pb-cols, 3), minmax(0, 1fr)); --rf-pb-note-w: 100%; --rf-pb-odd: stretch; --rf-pb-even: stretch; --rf-pb-mt: 0px; --rf-pb-zigzag: 0; --rf-pb-free: 0; --rf-pb-jself: stretch; --rf-pb-row-gap: var(--rf-pb-gap, 36px); --rf-pb-note-row: auto; --rf-pb-note-col: auto; --rf-pb-foot-row: auto;',
				// The notes share one grid cell, each moved by its own margins (--rf-pb-x, --rf-pb-y): the board grows to the
				// lowest note.
				'free' => '--rf-pb-display: grid; --rf-pb-cols-css: minmax(0, 1fr); --rf-pb-note-w: var(--rf-pb-w, 44%); --rf-pb-odd: start; --rf-pb-even: start; --rf-pb-mt: 0px; --rf-pb-zigzag: 1; --rf-pb-free: 1; --rf-pb-jself: start; --rf-pb-row-gap: 0px; --rf-pb-note-row: 2; --rf-pb-note-col: 1; --rf-pb-foot-row: 3;',
			],
			'selectors' => [ $root => '{{VALUE}}' ],
		] );

		$this->add_responsive_control( 'note_width', [
			'label' => esc_html__( 'Note Width', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 20, 'max' => 100 ] ],
			'default' => [ 'size' => 44 ],
			'tablet_default' => [ 'size' => 50 ],
			'mobile_default' => [ 'size' => 82 ],
			'description' => esc_html__( 'In the zigzag: each note\'s width, a share of the board.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-w: {{SIZE}}%;' ],
		] );

		$this->add_responsive_control( 'overlap', [
			'label' => esc_html__( 'Overlap', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -120, 'max' => 300 ] ],
			'default' => [ 'size' => 48 ],
			'mobile_default' => [ 'size' => 8 ],
			'description' => esc_html__( 'In the zigzag: how far each note rises beside the one before. Negative: space between them.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-overlap: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'free_step', [
			'label' => esc_html__( 'Free: Starting Step Down', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 40, 'max' => 600 ] ],
			'default' => [ 'size' => 220 ],
			'description' => esc_html__( 'In the Free layout, a note not yet dragged stands this far below the one before (left and right in turn).', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-step: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'columns', [
			'label' => esc_html__( 'Columns', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1,
			'max' => 6,
			'default' => 3,
			'tablet_default' => 2,
			'mobile_default' => 1,
			'description' => esc_html__( 'In the grid.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-cols: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Space Between Notes', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 120 ] ],
			'default' => [ 'size' => 36 ],
			'mobile_default' => [ 'size' => 28 ],
			'selectors' => [ $root => '--rf-pb-gap: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'tilt_strength', [
			'label' => esc_html__( 'Tilt', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 200 ] ],
			'default' => [ 'size' => 100 ],
			'mobile_default' => [ 'size' => 60 ],
			'description' => esc_html__( 'Of every note\'s tilt: 0 stands them straight, 200 doubles it.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-k: calc({{SIZE}} / 100);' ],
		] );

		$this->add_control( 'hover', [
			'label' => esc_html__( 'On Hover', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'lift',
			'options' => [
				'' => esc_html__( 'Nothing', 'refraction' ),
				'lift' => esc_html__( 'The note lifts a little', 'refraction' ),
				'straighten' => esc_html__( 'The note straightens and lifts', 'refraction' ),
			],
			'prefix_class' => 'rf-pb-hover-',
		] );

		$this->add_responsive_control( 'board_padding', [
			'label' => esc_html__( 'Board Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%', 'em', 'vw' ],
			'default' => [ 'unit' => 'px', 'top' => '48', 'right' => '32', 'bottom' => '48', 'left' => '32', 'isLinked' => false ],
			'mobile_default' => [ 'unit' => 'px', 'top' => '36', 'right' => '18', 'bottom' => '36', 'left' => '18', 'isLinked' => false ],
			'selectors' => [ $root => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			'separator' => 'before',
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Pins and lines
		$this->start_controls_section( 'section_pins', [ 'label' => esc_html__( 'Pins And Lines', 'refraction' ) ] );

		$this->add_control( 'pin', [
			'label' => esc_html__( 'Pin', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'pushpin',
			'options' => [
				'pushpin' => esc_html__( 'Pushpin', 'refraction' ),
				'flat' => esc_html__( 'Flat pin', 'refraction' ),
				'tape' => esc_html__( 'Tape', 'refraction' ),
				'none' => esc_html__( 'None', 'refraction' ),
			],
		] );
		$this->add_control( 'pin_place', [
			'label' => esc_html__( 'Pin Place', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'20%' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'50%' => [ 'title' => esc_html__( 'Middle', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'80%' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'default' => '50%',
			'toggle' => false,
			'selectors' => [ $root => '--rf-pb-pin-x: {{VALUE}};' ],
			'condition' => [ 'pin!' => 'none' ],
		] );

		$this->add_control( 'links', [
			'label' => esc_html__( 'Lines Between The Notes', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'zigzag',
			'options' => [
				'zigzag' => esc_html__( 'In the zigzag', 'refraction' ),
				'always' => esc_html__( 'In the zigzag and the grid', 'refraction' ),
				'none' => esc_html__( 'None', 'refraction' ),
			],
			'description' => esc_html__( 'A curve from each note to the next.', 'refraction' ),
			'frontend_available' => true,
			'separator' => 'before',
		] );
		$this->add_control( 'link_shape', [
			'label' => esc_html__( 'Line Shape', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'curve',
			'options' => [
				'curve' => esc_html__( 'Curve', 'refraction' ),
				's-curve' => esc_html__( 'S-curve', 'refraction' ),
				'loose' => esc_html__( 'Loose string (hanging)', 'refraction' ),
				'straight' => esc_html__( 'Straight', 'refraction' ),
				'elbow' => esc_html__( 'Elbow (right angles)', 'refraction' ),
			],
			'frontend_available' => true,
			'condition' => [ 'links!' => 'none' ],
		] );
		$this->add_control( 'link_curve', [
			'label' => esc_html__( 'Curve Strength', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 200 ] ],
			'default' => [ 'size' => 100 ],
			'frontend_available' => true,
			'condition' => [ 'links!' => 'none', 'link_shape' => [ 'curve', 's-curve', 'loose' ] ],
		] );
		$this->add_control( 'link_style', [
			'label' => esc_html__( 'Line', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'dashed',
			'options' => [
				'dashed' => esc_html__( 'Dashed', 'refraction' ),
				'dotted' => esc_html__( 'Dotted', 'refraction' ),
				'solid' => esc_html__( 'Solid', 'refraction' ),
				'long' => esc_html__( 'Long dashes', 'refraction' ),
				'dash-dot' => esc_html__( 'Dash and dot', 'refraction' ),
			],
			'frontend_available' => true,
			'condition' => [ 'links!' => 'none' ],
		] );
		$this->add_control( 'link_end', [
			'label' => esc_html__( 'Line Ends At', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'side',
			'options' => [ 'side' => esc_html__( 'The next note\'s side', 'refraction' ), 'pin' => esc_html__( 'The next note\'s pin', 'refraction' ) ],
			'frontend_available' => true,
			'condition' => [ 'links!' => 'none' ],
		] );
		$this->add_control( 'link_marker', [
			'label' => esc_html__( 'Line Ends', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Plain', 'refraction' ),
				'arrow' => esc_html__( 'An arrow at the next note', 'refraction' ),
				'dots' => esc_html__( 'A dot at each end', 'refraction' ),
				'dot-arrow' => esc_html__( 'A dot, then an arrow', 'refraction' ),
			],
			'frontend_available' => true,
			'condition' => [ 'links!' => 'none' ],
		] );
		$this->add_control( 'link_flow', [
			'label' => esc_html__( 'Flowing Line', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'The dashes move towards the next note (not for visitors who ask for less motion).', 'refraction' ),
			'prefix_class' => 'rf-pb-flow-',
			'condition' => [ 'links!' => 'none', 'link_style!' => 'solid' ],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Reveal
		$this->start_controls_section( 'section_reveal', [ 'label' => esc_html__( 'Reveal', 'refraction' ) ] );

		$js = [ 'frontend_available' => true ];

		$this->add_control( 'reveal', $js + [
			'label' => esc_html__( 'Notes Appear', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'At once (no reveal)', 'refraction' ),
				'drop' => esc_html__( 'Dropped and pinned', 'refraction' ),
				'fade-up' => esc_html__( 'Fade in, moving up', 'refraction' ),
				'zoom' => esc_html__( 'Zoom in', 'refraction' ),
				'swing' => esc_html__( 'Swing on the pin', 'refraction' ),
			],
			'description' => esc_html__( 'Each note as it comes into view, one after another; the line to a note draws itself once the note is in. Not for visitors who ask for less motion.', 'refraction' ),
		] );
		$on = [ 'reveal!' => '' ];
		$this->add_control( 'reveal_lines', $js + [
			'label' => esc_html__( 'Lines Draw Themselves', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => $on,
		] );
		$this->add_control( 'reveal_parts', $js + [
			'label' => esc_html__( 'Heading And Footer Too', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'They fade in as they come into view.', 'refraction' ),
			'condition' => $on,
		] );
		$this->add_control( 'reveal_duration', $js + [
			'label' => esc_html__( 'Duration', 'refraction' ) . ' (ms)',
			'type' => Controls_Manager::NUMBER,
			'min' => 100,
			'max' => 3000,
			'step' => 50,
			'default' => 700,
			'condition' => $on,
		] );
		$this->add_control( 'reveal_stagger', $js + [
			'label' => esc_html__( 'Between Notes', 'refraction' ) . ' (ms)',
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 2000,
			'step' => 10,
			'default' => 180,
			'description' => esc_html__( 'When several come into view together.', 'refraction' ),
			'condition' => $on,
		] );
		$this->add_control( 'reveal_repeat', $js + [
			'label' => esc_html__( 'Every Time It Comes Into View', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Off: only the first time. In Edit Mode it plays again when a Reveal setting changes.', 'refraction' ),
			'condition' => $on,
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Style: board
		$this->start_controls_section( 'section_style_board', [ 'label' => esc_html__( 'Board', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'paper', [
			'label' => esc_html__( 'Paper', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'lined',
			'options' => [ 'lined' => esc_html__( 'Lined', 'refraction' ), 'grid' => esc_html__( 'Grid', 'refraction' ), 'dots' => esc_html__( 'Dots', 'refraction' ), 'plain' => esc_html__( 'Plain', 'refraction' ) ],
			'prefix_class' => 'rf-pb-paper-',
		] );
		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'board_background',
			'types' => [ 'classic', 'gradient' ],
			'selector' => $root,
			'fields_options' => [
				'background' => [ 'default' => 'classic' ],
				'color' => [ 'default' => '#F5F5F6' ],
			],
		] );
		// 0.143.0's colour, kept for the boards that set it (after the group, so it still wins there).
		$this->add_control( 'board_bg', [
			'type' => Controls_Manager::HIDDEN,
			'selectors' => [ $root => 'background-color: {{VALUE}};' ],
		] );
		$this->add_control( 'paper_color', [
			'label' => esc_html__( 'Lines Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#E4E4E7',
			'selectors' => [ $root => '--rf-pb-paper: {{VALUE}};' ],
			'condition' => [ 'paper!' => 'plain' ],
		] );
		$this->add_responsive_control( 'paper_gap', [
			'label' => esc_html__( 'Lines Spacing', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 8, 'max' => 120 ] ],
			'default' => [ 'size' => 34 ],
			'selectors' => [ $root => '--rf-pb-paper-gap: {{SIZE}}px;' ],
			'condition' => [ 'paper!' => 'plain' ],
		] );
		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'board_border',
			'selector' => $root,
			'separator' => 'before',
		] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'board_shadow',
			'selector' => $root,
		] );
		$this->add_responsive_control( 'board_min_height', [
			'label' => esc_html__( 'Min Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh', 'em' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 2000 ] ],
			'selectors' => [ $root => 'min-height: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'board_radius', [
			'label' => esc_html__( 'Corners', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'size' => 24 ],
			'selectors' => [ $root => 'border-radius: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Style: notes
		$this->start_controls_section( 'section_style_notes', [ 'label' => esc_html__( 'Notes', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'notes_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'The white card around each note. The coloured panel inside is the note\'s own container: select it to change its colour.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );
		$this->add_control( 'card_bg', [
			'label' => esc_html__( 'Card Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#FFFFFF',
			'selectors' => [ $root => '--rf-pb-card: {{VALUE}};' ],
		] );
		$this->add_responsive_control( 'card_padding', [
			'label' => esc_html__( 'Card Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'default' => [ 'unit' => 'px', 'top' => '34', 'right' => '14', 'bottom' => '16', 'left' => '14', 'isLinked' => false ],
			'selectors' => [ '{{WRAPPER}} .rf-pb__note' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );
		$this->add_responsive_control( 'card_radius', [
			'label' => esc_html__( 'Card Corners', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'size' => 24 ],
			'selectors' => [ $root => '--rf-pb-card-r: {{SIZE}}px;' ],
		] );
		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'card_shadow',
			'selector' => '{{WRAPPER}} .rf-pb__note',
			'fields_options' => [
				'box_shadow_type' => [ 'default' => 'yes' ],
				'box_shadow' => [ 'default' => [ 'horizontal' => 0, 'vertical' => 18, 'blur' => 40, 'spread' => -8, 'color' => 'rgba(17, 24, 39, 0.18)' ] ],
			],
		] );
		$this->add_responsive_control( 'pin_size', [
			'label' => esc_html__( 'Pin Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 12, 'max' => 90 ] ],
			'default' => [ 'size' => 44 ],
			'mobile_default' => [ 'size' => 36 ],
			'selectors' => [ $root => '--rf-pb-pin: {{SIZE}}px;' ],
			'separator' => 'before',
			'condition' => [ 'pin!' => 'none' ],
		] );
		$this->end_controls_section();

		// ------------------------------------------------ Style: lines (0.145.0)
		$this->start_controls_section( 'section_style_lines', [ 'label' => esc_html__( 'Lines', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE, 'condition' => [ 'links!' => 'none' ] ] );

		$this->add_control( 'link_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#9CA3AF',
			'selectors' => [ $root => '--rf-pb-link: {{VALUE}};' ],
			'condition' => [ 'links!' => 'none' ],
		] );
		$this->add_responsive_control( 'link_width', [
			'label' => esc_html__( 'Thickness', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.5, 'max' => 8, 'step' => 0.5 ] ],
			'default' => [ 'size' => 1.5 ],
			'selectors' => [ $root => '--rf-pb-link-w: {{SIZE}};' ],
			'frontend_available' => true,
			'condition' => [ 'links!' => 'none' ],
		] );

		$this->add_control( 'link_opacity', [
			'label' => esc_html__( 'Opacity', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 5, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-pb__links' => 'opacity: calc({{SIZE}} / 100);' ],
		] );
		$this->add_responsive_control( 'link_dash_len', [
			'label' => esc_html__( 'Dash Length', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 60 ] ],
			'description' => esc_html__( 'Empty: from the thickness. Dashed, long dashes, dash and dot.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-dash-len: {{SIZE}};' ],
			'frontend_available' => true,
			'condition' => [ 'link_style' => [ 'dashed', 'long', 'dash-dot' ] ],
		] );
		$this->add_responsive_control( 'link_dash_gap', [
			'label' => esc_html__( 'Space Between Dashes', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 60 ] ],
			'description' => esc_html__( 'Empty: from the thickness. For dots too.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-dash-gap: {{SIZE}};' ],
			'frontend_available' => true,
			'condition' => [ 'link_style!' => 'solid' ],
		] );
		$this->add_control( 'link_cap', [
			'label' => esc_html__( 'Line Ends', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'round',
			'options' => [ 'round' => esc_html__( 'Rounded', 'refraction' ), 'butt' => esc_html__( 'Square', 'refraction' ) ],
			'description' => esc_html__( 'Dotted lines need Rounded.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-pb__links path.rf-pb__link' => 'stroke-linecap: {{VALUE}};' ],
		] );
		$this->add_responsive_control( 'link_marker_size', [
			'label' => esc_html__( 'Arrow And Dot Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 4, 'max' => 40 ] ],
			'description' => esc_html__( 'Empty: from the thickness.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-marker: {{SIZE}};' ],
			'frontend_available' => true,
			'condition' => [ 'link_marker!' => '' ],
		] );
		$this->add_responsive_control( 'link_inset', [
			'label' => esc_html__( 'Space From The Notes', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -20, 'max' => 60 ] ],
			'description' => esc_html__( '0: the line touches the notes\' edges.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-link-inset: {{SIZE}};' ],
			'frontend_available' => true,
			'separator' => 'before',
		] );
		$this->add_responsive_control( 'link_from', [
			'label' => esc_html__( 'Leaves The Note At', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'description' => esc_html__( 'How far down its side (0: the top, 100: the bottom). Default 62.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-link-from: {{SIZE}};' ],
			'frontend_available' => true,
		] );
		$this->add_responsive_control( 'link_to', [
			'label' => esc_html__( 'Reaches The Next At', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'description' => esc_html__( 'How far down its side. Default 30.', 'refraction' ),
			'selectors' => [ $root => '--rf-pb-link-to: {{SIZE}};' ],
			'frontend_available' => true,
			'condition' => [ 'link_end' => 'side' ],
		] );
		$this->add_control( 'link_layer', [
			'label' => esc_html__( 'Layer', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '0',
			'options' => [ '0' => esc_html__( 'Behind the notes', 'refraction' ), '3' => esc_html__( 'Over the notes', 'refraction' ) ],
			'selectors' => [ '{{WRAPPER}} .rf-pb__links' => 'z-index: {{VALUE}};' ],
		] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- output

	/** A pin's drawing; its colour is the note's (currentcolor). */
	private static function pin_html( string $pin ): string {
		if ( 'pushpin' === $pin ) {
			// A round head with its rim, seen from slightly above, and its shadow on the card.
			return '<span class="rf-pb__pin" aria-hidden="true"><svg viewBox="0 0 48 52" focusable="false">'
				. '<ellipse class="rf-pb__pin-shadow" cx="27" cy="44" rx="13" ry="5"/>'
				. '<path d="M21 30 L24 46 L27 30 Z" fill="#9CA3AF"/>'
				. '<ellipse cx="24" cy="30" rx="13" ry="6" fill="currentColor"/>'
				. '<ellipse cx="24" cy="30" rx="13" ry="6" fill="#000" opacity="0.18"/>'
				. '<rect x="17" y="13" width="14" height="17" rx="3" fill="currentColor"/>'
				. '<ellipse cx="24" cy="13" rx="11" ry="8" fill="currentColor"/>'
				. '<ellipse cx="20" cy="10" rx="4.5" ry="2.6" fill="#fff" opacity="0.55"/>'
				. '<rect x="19" y="15" width="2.6" height="12" rx="1.3" fill="#fff" opacity="0.35"/>'
				. '</svg></span>';
		}

		if ( 'flat' === $pin ) {
			return '<span class="rf-pb__pin rf-pb__pin--flat" aria-hidden="true"></span>';
		}

		if ( 'tape' === $pin ) {
			return '<span class="rf-pb__pin rf-pb__pin--tape" aria-hidden="true"></span>';
		}

		return '';
	}

	/** A row's role: 'heading', 'footer' or '' (a note). */
	public static function role_of( array $item ): string {
		return in_array( $item['role'] ?? '', [ 'heading', 'footer' ], true ) ? $item['role'] : '';
	}

	/**
	 * A note's own look: its tilt and pin colour (its own, else the next of the set), and its place among the notes
	 * (the Free layout's starting place for a note not yet dragged).
	 *
	 * @param array $item The row.
	 * @param int   $n    The note's place among the notes (from 0; the heading and footer do not count).
	 */
	public static function note_style( array $item, int $n ): string {
		$tilt = isset( $item['tilt']['size'] ) && '' !== $item['tilt']['size'] ? (float) $item['tilt']['size'] : self::TILTS[ $n % count( self::TILTS ) ];
		$color = preg_match( '/^(#[0-9a-fA-F]{3,8}|rgba?\([0-9., ]+\))$/', (string) ( $item['pin_color'] ?? '' ) ) ? $item['pin_color'] : self::PINS[ $n % 3 ];

		return '--rf-pb-r: ' . $tilt . 'deg; --rf-pb-pin-color: ' . $color . '; --rf-pb-i: ' . $n . '; --rf-pb-alt: ' . ( $n % 2 ) . ';';
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$items = array_values( (array) ( $settings['items'] ?? [] ) );
		$pin = self::pin_html( (string) ( $settings['pin'] ?? 'pushpin' ) );
		$n = 0;
		?>
		<div class="rf-pb">
			<svg class="rf-pb__links" aria-hidden="true" focusable="false"></svg>
			<div class="rf-pb__notes">
				<?php foreach ( $this->get_children() as $index => $child ) :
					$item = $items[ $index ] ?? [];
					$role = self::role_of( $item );
					$id = 'refraction-repeater-item-' . ( $item['_id'] ?? $index );

					if ( '' !== $role ) :
						?>
						<div class="rf-pb__slot rf-pb__part rf-pb__part--<?php echo esc_attr( $role . ' ' . $id ); ?>">
							<?php $child->print_element(); ?>
						</div>
						<?php
						continue;
					endif;

					$side = in_array( $item['side'] ?? '', [ 'left', 'center', 'right' ], true ) ? ' rf-pb__note--' . $item['side'] : '';
					?>
					<div class="rf-pb__slot rf-pb__note<?php echo esc_attr( ( 1 === $n % 2 ? ' rf-pb__note--alt' : '' ) . $side . ' ' . $id ); ?>" style="<?php echo esc_attr( self::note_style( $item, $n ) ); ?>">
						<?php echo $pin; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static markup. ?>
						<?php $child->print_element(); ?>
					</div>
					<?php
					++$n;
				endforeach;
				?>
			</div>
		</div>
		<?php
	}

	protected function content_template() {
		$pins = [];

		foreach ( [ 'pushpin', 'flat', 'tape' ] as $pin ) {
			$pins[ $pin ] = self::pin_html( $pin );
		}
		?>
		<#
		const items = settings.items || [];
		const pins = <?php echo wp_json_encode( $pins ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static markup. ?>;
		const pinColors = <?php echo wp_json_encode( self::PINS ); ?>;
		const tilts = <?php echo wp_json_encode( self::TILTS ); ?>;
		const pin = pins[ settings.pin ] || ( 'none' === settings.pin ? '' : pins.pushpin );
		const styleOf = ( item, n ) => {
			const tilt = item.tilt && '' !== item.tilt.size && undefined !== item.tilt.size ? Number( item.tilt.size ) : tilts[ n % tilts.length ];
			const color = /^(#[0-9a-fA-F]{3,8}|rgba?\([0-9., ]+\))$/.test( item.pin_color || '' ) ? item.pin_color : pinColors[ n % 3 ];
			return '--rf-pb-r: ' + tilt + 'deg; --rf-pb-pin-color: ' + color + '; --rf-pb-i: ' + n + '; --rf-pb-alt: ' + ( n % 2 ) + ';';
		};
		let n = 0;
		#>
		<div class="rf-pb">
			<svg class="rf-pb__links" aria-hidden="true" focusable="false"></svg>
			<div class="rf-pb__notes">
				<# _.each( items, ( item, index ) => {
					const role = [ 'heading', 'footer' ].includes( item.role ) ? item.role : '';
					if ( role ) { #>
						<div class="rf-pb__slot rf-pb__part rf-pb__part--{{ role }} refraction-repeater-item-{{ item._id }}"></div>
					<# return; }
					const side = [ 'left', 'center', 'right' ].includes( item.side ) ? ' rf-pb__note--' + item.side : '';
					const alt = 1 === n % 2 ? ' rf-pb__note--alt' : '';
				#>
					<div class="rf-pb__slot rf-pb__note{{ alt }}{{ side }} refraction-repeater-item-{{ item._id }}" style="{{ styleOf( item, n ) }}">{{{ pin }}}</div>
				<# n++; } ); #>
			</div>
		</div>
		<?php
	}
}
