<?php
namespace Refraction\Modules\DashboardWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\DashboardWidgets\Classes\Card_Controls;
use Refraction\Modules\DashboardWidgets\Classes\Pure_Dashboard as D;
use Refraction\Modules\DashboardWidgets\Module;
use Refraction\Repeater;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Data Table: columns of your own (text, number, badge, progress, date, link) over rows typed in (each cell open to
 * Dynamic Tags), a pasted table, or this site's latest posts. Sortable, searchable and paged in the browser
 * (dashboard.js), and on a phone either scrolled sideways or stacked as cards. A dashboard look: muted uppercase
 * headings, dashed rows, tinted badges.
 */
class Data_Table extends Widget_Base {

	use Card_Controls;

	/** The most fields a typed-in row offers (one per column). */
	const ROW_FIELDS = 12;

	const CELL_TYPES = [ 'text', 'number', 'badge', 'progress', 'date', 'link' ];

	/** Words that pick a badge's color when it is set to automatic. */
	const BADGE_WORDS = [
		'success' => [ 'paid', 'active', 'done', 'complete', 'completed', 'approved', 'success', 'delivered', 'online', 'yes', 'published', 'confirmed', 'open' ],
		'warning' => [ 'pending', 'in progress', 'progress', 'review', 'waiting', 'draft', 'scheduled', 'processing', 'on hold' ],
		'danger' => [ 'failed', 'cancelled', 'canceled', 'rejected', 'overdue', 'error', 'offline', 'no', 'closed', 'declined', 'expired' ],
		'info' => [ 'new', 'info', 'trial', 'beta' ],
	];

	public function get_name() {
		return 'refraction-data-table';
	}

	public function get_title() {
		return esc_html__( 'Data Table', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-table';
	}

	public function get_categories() {
		return [ Module::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'table', 'data', 'grid', 'list', 'dashboard', 'orders', 'report', 'csv' ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-dashboard' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-dashboard' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function register_controls() {
		$this->add_card_content_controls( esc_html__( 'Recent orders', 'refraction' ), esc_html__( 'The last orders of this week', 'refraction' ) );

		// ---------------------------------------------------------------- columns
		$this->start_controls_section( 'section_columns', [ 'label' => esc_html__( 'Columns', 'refraction' ) ] );

		$col = new Repeater();
		$col->add_control( 'heading', [ 'label' => esc_html__( 'Heading', 'refraction' ), 'type' => Controls_Manager::TEXT, 'dynamic' => [ 'active' => true ], 'default' => esc_html__( 'Column', 'refraction' ) ] );
		$col->add_control( 'kind', [
			'label' => esc_html__( 'Shows', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'text',
			'options' => [
				'text' => esc_html__( 'Text', 'refraction' ),
				'number' => esc_html__( 'Number', 'refraction' ),
				'badge' => esc_html__( 'Badge', 'refraction' ),
				'progress' => esc_html__( 'Progress bar (0-100)', 'refraction' ),
				'date' => esc_html__( 'Date', 'refraction' ),
				'link' => esc_html__( 'Link ("text | address")', 'refraction' ),
			],
		] );
		$col->add_control( 'tone', [
			'label' => esc_html__( 'Badge Color', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'auto',
			'options' => [ 'auto' => esc_html__( 'From the word (Paid, Pending, Failed...)', 'refraction' ) ] + self::tone_options(),
			'condition' => [ 'kind' => 'badge' ],
		] );
		$col->add_control( 'prefix', [ 'label' => esc_html__( 'Before', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '$', 'condition' => [ 'kind' => 'number' ] ] );
		$col->add_control( 'suffix', [ 'label' => esc_html__( 'After', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'kind' => 'number' ] ] );
		$col->add_control( 'decimals', [ 'label' => esc_html__( 'Decimals', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 0, 'min' => 0, 'max' => 4, 'condition' => [ 'kind' => 'number' ] ] );
		$col->add_control( 'align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
			],
			'default' => '',
		] );
		$col->add_control( 'bold', [ 'label' => esc_html__( 'Bold', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );

		$this->add_control( 'columns', [
			'label' => esc_html__( 'Columns', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $col->get_controls(),
			'default' => [
				[ 'heading' => esc_html__( 'Order', 'refraction' ), 'kind' => 'text', 'bold' => 'yes' ],
				[ 'heading' => esc_html__( 'Customer', 'refraction' ), 'kind' => 'text' ],
				[ 'heading' => esc_html__( 'Date', 'refraction' ), 'kind' => 'date' ],
				[ 'heading' => esc_html__( 'Total', 'refraction' ), 'kind' => 'number', 'prefix' => '$', 'decimals' => 2, 'align' => 'end', 'bold' => 'yes' ],
				[ 'heading' => esc_html__( 'Progress', 'refraction' ), 'kind' => 'progress' ],
				[ 'heading' => esc_html__( 'Status', 'refraction' ), 'kind' => 'badge', 'align' => 'end' ],
			],
			'title_field' => '{{{ heading }}}',
			'description' => esc_html__( 'Not used when the rows are your latest posts (their columns are set).', 'refraction' ),
		] );

		$this->end_controls_section();

		// ---------------------------------------------------------------- rows
		$this->start_controls_section( 'section_rows', [ 'label' => esc_html__( 'Rows', 'refraction' ) ] );

		$this->add_control( 'source', [
			'label' => esc_html__( 'Rows From', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'manual',
			'options' => [
				'manual' => esc_html__( 'Rows typed in', 'refraction' ),
				'cells' => esc_html__( 'Cell by cell', 'refraction' ),
				'table' => esc_html__( 'A pasted table (CSV)', 'refraction' ),
				'posts' => esc_html__( 'Latest posts of this site', 'refraction' ),
			],
		] );

		$this->add_control( 'manual_input', [
			'label' => esc_html__( 'Type Each Row', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'line',
			'options' => [
				'line' => esc_html__( 'On one line, cells separated by |', 'refraction' ),
				'fields' => esc_html__( 'Field per column', 'refraction' ),
			],
			'description' => esc_html__( 'Field per column shows a field for each column of the Columns list, named after its heading. Switching fills the fields from the line.', 'refraction' ),
			'condition' => [ 'source' => 'manual' ],
		] );

		$row = new Repeater();
		$row->add_control( 'cells', [
			'label' => esc_html__( 'Cells', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 2,
			'dynamic' => [ 'active' => true ],
			'description' => esc_html__( 'Separated by |, in the order of the columns. Use dynamic tags for live values.', 'refraction' ),
		] );

		// One field per column (Type Each Row: One field per column). The editor shows as many as there are columns and
		// names them after the headings (assets/js/dashboard-editor.js).
		for ( $i = 1; $i <= self::ROW_FIELDS; $i++ ) {
			$row->add_control( 'cell_' . $i, [
				/* translators: %d: Column number. */
				'label' => sprintf( esc_html__( 'Column %d', 'refraction' ), $i ),
				'type' => Controls_Manager::TEXT,
				'dynamic' => [ 'active' => true ],
				'label_block' => true,
				'classes' => 'rf-table-row-field',
			] );
		}

		$this->add_control( 'rows', [
			'label' => esc_html__( 'Rows', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $row->get_controls(),
			'default' => [
				[ 'cells' => '#1042 | Anna Brown | 2026-11-02 | 1250.50 | 100 | Paid' ],
				[ 'cells' => '#1043 | James Wilson | 2026-11-03 | 640 | 60 | Pending' ],
				[ 'cells' => '#1044 | Mia Clarke | 2026-11-04 | 2190 | 85 | In progress' ],
				[ 'cells' => '#1045 | Leo Grant | 2026-11-05 | 380 | 20 | Failed' ],
			],
			'title_field' => '<# var rfCells = [ cell_1, cell_2, cell_3, cell_4 ].filter( Boolean ); #>{{{ rfCells.length ? rfCells.join( " | " ) : cells }}}',
			'condition' => [ 'source' => 'manual' ],
		] );

		// Cell by cell: one item per cell, with a picture, an icon, a link, a small line under it, its own colors and a
		// span across columns. Items fill the columns from left to right; "Starts A New Row" begins the next row.
		$cell = new Repeater();
		$cell->add_control( 'new_row', [
			'label' => esc_html__( 'Starts A New Row', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Also starts one by itself when the row is full.', 'refraction' ),
		] );
		$cell->add_control( 'content', [ 'label' => esc_html__( 'Content', 'refraction' ), 'type' => Controls_Manager::TEXT, 'dynamic' => [ 'active' => true ], 'label_block' => true, 'description' => esc_html__( 'Shown as its column says: text, number, badge, progress, date or link.', 'refraction' ) ] );
		$cell->add_control( 'sub', [ 'label' => esc_html__( 'Small Text Under', 'refraction' ), 'type' => Controls_Manager::TEXT, 'dynamic' => [ 'active' => true ], 'label_block' => true, 'placeholder' => esc_html__( 'anna@example.com', 'refraction' ) ] );
		$cell->add_control( 'image', [ 'label' => esc_html__( 'Picture', 'refraction' ), 'type' => Controls_Manager::MEDIA, 'dynamic' => [ 'active' => true ], 'default' => [ 'url' => '' ], 'description' => esc_html__( 'A small round picture before the content (a person, a product, a logo).', 'refraction' ) ] );
		$cell->add_control( 'icon', [ 'label' => esc_html__( 'Icon', 'refraction' ), 'type' => Controls_Manager::ICONS, 'skin' => 'inline', 'label_block' => false ] );
		$cell->add_control( 'link', [ 'label' => esc_html__( 'Link', 'refraction' ), 'type' => Controls_Manager::URL, 'dynamic' => [ 'active' => true ] ] );
		$cell->add_control( 'cell_tone', [
			'label' => esc_html__( 'Badge Color', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [ '' => esc_html__( 'As the column', 'refraction' ) ] + self::tone_options(),
			'description' => esc_html__( 'In a badge column.', 'refraction' ),
		] );
		$cell->add_control( 'span', [ 'label' => esc_html__( 'Spans Columns', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 1, 'min' => 1, 'max' => 12 ] );
		$cell->add_control( 'cell_align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
			],
			'description' => esc_html__( 'Empty: as the column.', 'refraction' ),
		] );
		$cell->add_control( 'cell_bold', [ 'label' => esc_html__( 'Bold', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$cell->add_control( 'cell_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table {{CURRENT_ITEM}}' => 'color: {{VALUE}};' ] ] );
		$cell->add_control( 'cell_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table {{CURRENT_ITEM}}' => 'background-color: {{VALUE}};' ] ] );

		$this->add_control( 'cell_items', [
			'label' => esc_html__( 'Cells', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $cell->get_controls(),
			'default' => [
				[ 'new_row' => 'yes', 'content' => '#1042' ],
				[ 'content' => 'Anna Brown', 'sub' => 'anna@example.com' ],
				[ 'content' => '2026-11-02' ],
				[ 'content' => '1250.50' ],
				[ 'content' => '100' ],
				[ 'content' => 'Paid' ],
				[ 'new_row' => 'yes', 'content' => '#1043' ],
				[ 'content' => 'James Wilson', 'sub' => 'james@example.com' ],
				[ 'content' => '2026-11-03' ],
				[ 'content' => '640' ],
				[ 'content' => '60' ],
				[ 'content' => 'Pending' ],
			],
			'title_field' => '<# if ( new_row ) { #>↵ <# } #>{{{ content }}}',
			'description' => esc_html__( 'One item per cell, left to right in the order of the columns.', 'refraction' ),
			'condition' => [ 'source' => 'cells' ],
		] );

		$this->add_control( 'table_data', [
			'label' => esc_html__( 'Table', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 7,
			'dynamic' => [ 'active' => true ],
			'default' => "Order, Customer, Date, Total, Progress, Status\n#1042, Anna Brown, 2026-11-02, 1250.50, 100, Paid\n#1043, James Wilson, 2026-11-03, 640, 60, Pending",
			'description' => esc_html__( 'Commas, semicolons, tabs or | between cells (a spreadsheet paste works).', 'refraction' ),
			'condition' => [ 'source' => 'table' ],
		] );

		$this->add_control( 'table_header', [
			'label' => esc_html__( 'The First Row Is The Headings', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Used as headings where the Columns list has none.', 'refraction' ),
			'condition' => [ 'source' => 'table' ],
		] );

		$types = [];

		foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $name => $type ) {
			$types[ $name ] = $type->labels->name;
		}

		$this->add_control( 'post_type', [ 'label' => esc_html__( 'Post Type', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'post', 'options' => $types, 'condition' => [ 'source' => 'posts' ] ] );
		$this->add_control( 'post_count', [ 'label' => esc_html__( 'How Many', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 8, 'min' => 1, 'max' => 100, 'condition' => [ 'source' => 'posts' ] ] );

		$this->end_controls_section();

		// ---------------------------------------------------------------- features
		$this->start_controls_section( 'section_table', [ 'label' => esc_html__( 'Table', 'refraction' ) ] );

		$this->add_control( 'sortable', [ 'label' => esc_html__( 'Sort By Clicking A Heading', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'search', [ 'label' => esc_html__( 'Search Box', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'search_placeholder', [ 'label' => esc_html__( 'Search Placeholder', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Search', 'refraction' ), 'condition' => [ 'search' => 'yes' ] ] );
		$this->add_control( 'per_page', [ 'label' => esc_html__( 'Rows Per Page', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 0, 'min' => 0, 'max' => 200, 'description' => esc_html__( '0: all rows, no pages.', 'refraction' ) ] );
		$this->add_control( 'empty_text', [ 'label' => esc_html__( 'When Nothing Matches', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'No rows to show.', 'refraction' ) ] );

		$this->add_control( 'header_look', [
			'label' => esc_html__( 'Headings', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'muted',
			'options' => [
				'muted' => esc_html__( 'Muted, uppercase', 'refraction' ),
				'filled' => esc_html__( 'On a tinted band', 'refraction' ),
				'plain' => esc_html__( 'Plain', 'refraction' ),
			],
			'separator' => 'before',
		] );

		$this->add_control( 'rows_look', [
			'label' => esc_html__( 'Rows', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'dashed',
			'options' => [
				'dashed' => esc_html__( 'Dashed lines between', 'refraction' ),
				'lines' => esc_html__( 'Lines between', 'refraction' ),
				'striped' => esc_html__( 'Striped', 'refraction' ),
				'none' => esc_html__( 'No lines', 'refraction' ),
			],
		] );

		$this->add_control( 'hover', [ 'label' => esc_html__( 'Highlight The Row Under The Pointer', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );

		$this->add_control( 'phone', [
			'label' => esc_html__( 'On Phones', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'scroll',
			'options' => [
				'scroll' => esc_html__( 'Scroll sideways', 'refraction' ),
				'stack' => esc_html__( 'Each row as a card', 'refraction' ),
			],
		] );

		$this->end_controls_section();

		$this->add_card_style_controls();

		// ---------------------------------------------------------------- style: table
		$this->start_controls_section( 'section_style_table', [ 'label' => esc_html__( 'Table', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$th = '{{WRAPPER}} .rf-table th';
		$td = '{{WRAPPER}} .rf-table td';

		$this->add_control( 'head_color', [ 'label' => esc_html__( 'Heading Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $th => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'head_bg', [ 'label' => esc_html__( 'Heading Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table' => '--rf-table-head-bg: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'head_typography', 'label' => esc_html__( 'Heading Typography', 'refraction' ), 'selector' => $th ] );
		$this->add_control( 'cell_color', [ 'label' => esc_html__( 'Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $td => 'color: {{VALUE}};' ], 'separator' => 'before' ] );
		$this->add_control( 'strong_color', [ 'label' => esc_html__( 'Bold Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table td.is-bold' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'cell_typography', 'label' => esc_html__( 'Text Typography', 'refraction' ), 'selector' => $td ] );
		$this->add_control( 'line_color', [ 'label' => esc_html__( 'Line Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table' => '--rf-table-line: {{VALUE}};' ], 'separator' => 'before' ] );
		$this->add_control( 'stripe_bg', [ 'label' => esc_html__( 'Stripe Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table' => '--rf-table-stripe: {{VALUE}};' ], 'condition' => [ 'rows_look' => 'striped' ] ] );
		$this->add_control( 'hover_bg', [ 'label' => esc_html__( 'Highlight Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table' => '--rf-table-hover: {{VALUE}};' ], 'condition' => [ 'hover' => 'yes' ] ] );

		$this->add_responsive_control( 'cell_padding', [
			'label' => esc_html__( 'Cell Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ $th . ', ' . $td => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_control( 'badge_radius', [ 'label' => esc_html__( 'Badge Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'max' => 20 ] ], 'selectors' => [ '{{WRAPPER}} .rf-table__badge' => 'border-radius: {{SIZE}}px;' ], 'separator' => 'before' ] );
		$this->add_control( 'progress_color', [ 'label' => esc_html__( 'Progress Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table' => '--rf-table-progress: {{VALUE}};' ] ] );
		$this->add_control( 'progress_height', [ 'label' => esc_html__( 'Progress Height', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 2, 'max' => 16 ] ], 'selectors' => [ '{{WRAPPER}} .rf-table__progress' => 'height: {{SIZE}}px;' ] ] );
		$this->add_control( 'pic_size', [ 'label' => esc_html__( 'Cell Picture Size', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 16, 'max' => 96 ] ], 'selectors' => [ '{{WRAPPER}} .rf-table' => '--rf-table-pic: {{SIZE}}px;' ], 'separator' => 'before', 'condition' => [ 'source' => 'cells' ] ] );
		$this->add_control( 'pic_radius', [ 'label' => esc_html__( 'Cell Picture Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', '%' ], 'range' => [ 'px' => [ 'max' => 48 ], '%' => [ 'max' => 50 ] ], 'selectors' => [ '{{WRAPPER}} .rf-table' => '--rf-table-pic-radius: {{SIZE}}{{UNIT}};' ], 'condition' => [ 'source' => 'cells' ] ] );
		$this->add_control( 'icon_color', [ 'label' => esc_html__( 'Cell Icon Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table' => '--rf-table-icon: {{VALUE}};' ], 'condition' => [ 'source' => 'cells' ] ] );
		$this->add_control( 'sub_color', [ 'label' => esc_html__( 'Small Text Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table__sub' => 'color: {{VALUE}};' ], 'condition' => [ 'source' => 'cells' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'sub_typography', 'label' => esc_html__( 'Small Text Typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-table__sub', 'condition' => [ 'source' => 'cells' ] ] );
		$this->add_control( 'link_color', [ 'label' => esc_html__( 'Link Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table td a' => 'color: {{VALUE}};' ] ] );

		$this->add_control( 'search_border', [ 'label' => esc_html__( 'Search Box Border', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table-tools input' => 'border-color: {{VALUE}};' ], 'separator' => 'before', 'condition' => [ 'search' => 'yes' ] ] );
		$this->add_control( 'pager_active', [ 'label' => esc_html__( 'Current Page', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-table-pager button[aria-current="page"]' => 'background-color: {{VALUE}}; border-color: {{VALUE}};' ], 'condition' => [ 'per_page!' => 0 ] ] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- data

	/**
	 * The columns and the rows of cells (as text).
	 *
	 * @return array{columns: array, rows: array<int, string[]>}
	 */
	public function table( array $s ): array {
		$source = $s['source'] ?? 'manual';
		$columns = array_values( (array) ( $s['columns'] ?? [] ) );

		if ( 'posts' === $source ) {
			return $this->posts_table( $s );
		}

		if ( 'table' === $source ) {
			$rows = D::table( (string) ( $s['table_data'] ?? '' ) );

			if ( 'yes' === ( $s['table_header'] ?? 'yes' ) && $rows ) {
				$head = array_shift( $rows );

				foreach ( $head as $i => $name ) {
					if ( ! isset( $columns[ $i ] ) ) {
						$columns[ $i ] = [ 'heading' => $name, 'kind' => 'text' ];
					} elseif ( '' === trim( (string) ( $columns[ $i ]['heading'] ?? '' ) ) ) {
						$columns[ $i ]['heading'] = $name;
					}
				}
			}
		} elseif ( 'cells' === $source ) {
			$rows = D::cell_rows( (array) ( $s['cell_items'] ?? [] ), max( 1, count( $columns ) ) );
		} else {
			$fields = 'fields' === ( $s['manual_input'] ?? 'line' ) ? max( 1, min( self::ROW_FIELDS, count( $columns ) ) ) : 0;
			$rows = array_map( static fn( $r ) => D::typed_row( (array) $r, $fields ), (array) ( $s['rows'] ?? [] ) );
		}

		$width = max( count( $columns ), ...array_map( [ D::class, 'row_width' ], $rows ?: [ [] ] ) );

		for ( $i = count( $columns ); $i < $width; $i++ ) {
			$columns[] = [ 'heading' => '', 'kind' => 'text' ];
		}

		return [ 'columns' => $columns, 'rows' => array_map( static fn( $r ) => array_pad( $r, $width - D::row_width( $r ) + count( $r ), '' ), $rows ) ];
	}


	private function posts_table( array $s ): array {
		$posts = get_posts( [ 'post_type' => sanitize_key( (string) ( $s['post_type'] ?? 'post' ) ), 'numberposts' => max( 1, min( 100, (int) ( $s['post_count'] ?? 8 ) ) ), 'post_status' => 'publish' ] );
		$columns = [
			[ 'heading' => __( 'Title', 'refraction' ), 'kind' => 'link', 'bold' => 'yes' ],
			[ 'heading' => __( 'Author', 'refraction' ), 'kind' => 'text' ],
			[ 'heading' => __( 'Date', 'refraction' ), 'kind' => 'date' ],
			[ 'heading' => __( 'Comments', 'refraction' ), 'kind' => 'number', 'align' => 'end' ],
			[ 'heading' => __( 'Status', 'refraction' ), 'kind' => 'badge', 'align' => 'end' ],
		];
		$rows = array_map( static fn( $p ) => [
			get_the_title( $p ) . ' | ' . get_permalink( $p ),
			get_the_author_meta( 'display_name', (int) $p->post_author ),
			get_the_date( 'Y-m-d', $p ),
			(string) get_comments_number( $p ),
			__( 'Published', 'refraction' ),
		], $posts );

		return [ 'columns' => $columns, 'rows' => $rows ];
	}

	/** A badge's color: its own, or from the word in it. */
	public static function badge_tone( string $text, string $tone ): string {
		if ( 'auto' !== $tone && '' !== $tone ) {
			return $tone;
		}

		$word = strtolower( trim( $text ) );

		foreach ( self::BADGE_WORDS as $t => $words ) {
			if ( in_array( $word, $words, true ) ) {
				return $t;
			}
		}

		return 'primary';
	}

	// ---------------------------------------------------------------- render

	/** One cell: its markup, and the value it sorts by. */
	private function cell( string $raw, array $col ): array {
		$kind = in_array( $col['kind'] ?? 'text', self::CELL_TYPES, true ) ? $col['kind'] : 'text';
		$text = trim( wp_strip_all_tags( $raw ) );

		switch ( $kind ) {
			case 'number':
				$n = D::number( $text );

				return [ null === $n ? esc_html( $text ) : esc_html( D::format( $n, (int) ( $col['decimals'] ?? 0 ), (string) ( $col['prefix'] ?? '' ), (string) ( $col['suffix'] ?? '' ) ) ), null === $n ? $text : (string) $n ];

			case 'badge':
				return '' === $text ? [ '', '' ] : [ '<span class="rf-table__badge rf-dash-tone--' . esc_attr( self::badge_tone( $text, (string) ( $col['tone'] ?? 'auto' ) ) ) . '">' . esc_html( $text ) . '</span>', $text ];

			case 'progress':
				$n = max( 0, min( 100, (float) D::number( $text ) ) );

				return [ '<span class="rf-table__progress-wrap"><span class="rf-table__progress" role="progressbar" aria-valuenow="' . esc_attr( (string) $n ) . '" aria-valuemin="0" aria-valuemax="100"><i style="width:' . esc_attr( (string) $n ) . '%"></i></span><span class="rf-table__progress-num">' . esc_html( round( $n ) . '%' ) . '</span></span>', (string) $n ];

			case 'date':
				$time = strtotime( $text );

				return [ false === $time ? esc_html( $text ) : '<time datetime="' . esc_attr( gmdate( 'Y-m-d', $time ) ) . '">' . esc_html( date_i18n( (string) get_option( 'date_format', 'M j, Y' ), $time ) ) . '</time>', false === $time ? $text : (string) $time ];

			case 'link':
				$parts = array_map( 'trim', explode( ' | ', $raw, 2 ) );
				$url = $parts[1] ?? $parts[0];
				$label = wp_strip_all_tags( $parts[0] );

				return [ '' === $url ? esc_html( $label ) : '<a href="' . esc_url( $url ) . '">' . esc_html( $label ) . '</a>', $label ];
		}

		return [ esc_html( $text ), $text ];
	}

	/** A cell item's extras around its content: picture or icon before, a small line under, a link around. */
	private function dress( string $html, array $item, array $col ): string {
		$before = '';
		$picture = (string) ( $item['image']['url'] ?? '' );

		if ( '' !== $picture ) {
			$before = '<img class="rf-table__pic" src="' . esc_url( $picture ) . '" alt="" loading="lazy" />';
		} elseif ( ! empty( $item['icon']['value'] ) ) {
			$before = '<span class="rf-table__icon">' . \Refraction\Icons_Manager::try_get_icon_html( $item['icon'], [ 'aria-hidden' => 'true' ] ) . '</span>';
		}

		$sub = trim( (string) ( $item['sub'] ?? '' ) );
		$url = (string) ( $item['link']['url'] ?? '' );

		if ( '' !== $url && 'link' !== ( $col['kind'] ?? '' ) ) {
			$key = 'cell-link-' . ( $item['_id'] ?? wp_rand() );
			$this->add_link_attributes( $key, $item['link'] );
			$html = '<a ' . $this->get_render_attribute_string( $key ) . '>' . $html . '</a>';
		}

		if ( '' === $before && '' === $sub ) {
			return $html;
		}

		$text = '' === $sub ? $html : '<span class="rf-table__lines"><span class="rf-table__main">' . $html . '</span><span class="rf-table__sub">' . esc_html( wp_strip_all_tags( $sub ) ) . '</span></span>';

		return '<span class="rf-table__cell">' . $before . $text . '</span>';
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$table = $this->table( $s );
		$per_page = max( 0, min( 200, (int) ( $s['per_page'] ?? 0 ) ) );
		$sortable = 'yes' === ( $s['sortable'] ?? 'yes' );
		$id = 'rf-table-' . $this->get_id();
		$header = in_array( $s['header_look'] ?? '', [ 'muted', 'filled', 'plain' ], true ) ? $s['header_look'] : 'muted';
		$lines = in_array( $s['rows_look'] ?? '', [ 'dashed', 'lines', 'striped', 'none' ], true ) ? $s['rows_look'] : 'dashed';
		$phone = 'stack' === ( $s['phone'] ?? '' ) ? 'stack' : 'scroll';

		echo $this->card_open( $s, 'rf-dash--table' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

		printf(
			'<div class="rf-table-wrap rf-table-wrap--%1$s" data-rf-table="%2$s">',
			esc_attr( $phone ),
			esc_attr( wp_json_encode( [ 'perPage' => $per_page, 'sortable' => $sortable ] ) )
		);

		if ( 'yes' === ( $s['search'] ?? '' ) ) {
			printf( '<div class="rf-table-tools"><label class="screen-reader-text" for="%1$s-search">%2$s</label><input type="search" id="%1$s-search" placeholder="%3$s" /></div>', esc_attr( $id ), esc_html__( 'Search the table', 'refraction' ), esc_attr( (string) ( $s['search_placeholder'] ?? '' ) ) );
		}

		printf( '<div class="rf-table-scroll"><table class="rf-table rf-table--head-%1$s rf-table--rows-%2$s%3$s" id="%4$s">', esc_attr( $header ), esc_attr( $lines ), 'yes' === ( $s['hover'] ?? 'yes' ) ? ' rf-table--hover' : '', esc_attr( $id ) );

		$title = trim( (string) ( $s['card_title'] ?? '' ) );

		if ( '' !== $title ) {
			echo '<caption class="screen-reader-text">' . esc_html( $title ) . '</caption>';
		}

		echo '<thead><tr>';

		foreach ( $table['columns'] as $i => $col ) {
			$align = in_array( $col['align'] ?? '', [ 'start', 'center', 'end' ], true ) ? ' is-' . $col['align'] : '';
			$label = esc_html( (string) ( $col['heading'] ?? '' ) );

			if ( $sortable && '' !== $label ) {
				$label = '<button type="button" class="rf-table__sort" data-col="' . (int) $i . '">' . $label . '<span class="rf-table__arrow" aria-hidden="true"></span></button>';
			}

			echo '<th scope="col" class="rf-table__th' . esc_attr( $align ) . '"' . ( $sortable ? ' aria-sort="none"' : '' ) . '>' . $label . '</th>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
		}

		echo '</tr></thead><tbody>';

		$count = count( $table['columns'] );

		foreach ( $table['rows'] as $row ) {
			echo '<tr>';
			$i = 0;

			foreach ( $row as $value ) {
				if ( $i >= $count ) {
					break;
				}

				$col = $table['columns'][ $i ];
				$item = is_array( $value ) ? $value : null;
				$span = $item ? max( 1, min( $count - $i, (int) ( $item['span'] ?? 1 ) ) ) : 1;

				if ( $item && '' !== (string) ( $item['cell_tone'] ?? '' ) ) {
					$col['tone'] = $item['cell_tone'];
				}

				[ $html, $sort ] = $this->cell( $item ? (string) ( $item['content'] ?? '' ) : (string) $value, $col );
				$align = $item && in_array( $item['cell_align'] ?? '', [ 'start', 'center', 'end' ], true ) ? $item['cell_align'] : ( $col['align'] ?? '' );
				$bold = 'yes' === ( $col['bold'] ?? '' ) || ( $item && 'yes' === ( $item['cell_bold'] ?? '' ) );
				$classes = trim( ( in_array( $align, [ 'start', 'center', 'end' ], true ) ? 'is-' . $align : '' ) . ( $bold ? ' is-bold' : '' ) . ' is-' . ( $col['kind'] ?? 'text' ) . ( $item ? ' refraction-repeater-item-' . ( $item['_id'] ?? '' ) : '' ) );

				if ( $item ) {
					$html = $this->dress( $html, $item, $col );
				}

				printf(
					'<td class="%1$s" data-label="%2$s" data-sort="%3$s" data-col="%4$d"%5$s>%6$s</td>',
					esc_attr( $classes ),
					esc_attr( (string) ( $col['heading'] ?? '' ) ),
					esc_attr( $sort ),
					(int) $i,
					$span > 1 ? ' colspan="' . (int) $span . '"' : '',
					$html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts in cell() and dress().
				);

				$i += $span;
			}

			for ( ; $i < $count; $i++ ) {
				printf( '<td class="is-%1$s" data-label="%2$s" data-sort="" data-col="%3$d"></td>', esc_attr( (string) ( $table['columns'][ $i ]['kind'] ?? 'text' ) ), esc_attr( (string) ( $table['columns'][ $i ]['heading'] ?? '' ) ), (int) $i );
			}

			echo '</tr>';
		}

		echo '</tbody></table></div>';
		echo '<p class="rf-table__empty"' . ( $table['rows'] ? ' hidden' : '' ) . '>' . esc_html( (string) ( $s['empty_text'] ?? '' ) ) . '</p>';

		if ( $per_page > 0 ) {
			echo '<nav class="rf-table-pager" aria-label="' . esc_attr__( 'Table pages', 'refraction' ) . '"></nav>';
		}

		echo '</div>';
		echo $this->card_close(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	public function render_plain_content() {
		$table = $this->table( $this->get_settings_for_display() );

		echo esc_html( implode( ' | ', array_map( static fn( $c ) => (string) ( $c['heading'] ?? '' ), $table['columns'] ) ) ) . "\n";

		foreach ( $table['rows'] as $row ) {
			echo esc_html( implode( ' | ', array_map( static fn( $c ) => is_array( $c ) ? (string) ( $c['content'] ?? '' ) : (string) $c, $row ) ) ) . "\n";
		}
	}
}
