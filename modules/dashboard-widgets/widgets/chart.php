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
 * Chart: bar, horizontal bar, line, area, pie and donut, from series typed in (values open to Dynamic Tags), a
 * pasted table, or this site's own numbers (posts, comments, users, form submissions). Drawn on the server: bars,
 * grid and labels are HTML placed in percent (they scale with the widget without stretching text), lines and areas
 * an SVG path, rings SVG circles. A table of the numbers is there for screen readers. dashboard.js adds the tooltip
 * and draws it in when it comes into view.
 */
class Chart extends Widget_Base {

	use Card_Controls;

	const TYPES = [ 'bar', 'hbar', 'line', 'area', 'pie', 'donut' ];

	public function get_name() {
		return 'refraction-chart';
	}

	public function get_title() {
		return esc_html__( 'Chart', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-dashboard';
	}

	public function get_categories() {
		return [ Module::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'chart', 'graph', 'bar', 'line', 'area', 'pie', 'donut', 'dashboard', 'statistics', 'data' ];
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
		$this->add_card_content_controls( esc_html__( 'Monthly sales', 'refraction' ), esc_html__( 'Sales and costs, this half year', 'refraction' ), '+12.5%' );

		// ---------------------------------------------------------------- data
		$this->start_controls_section( 'section_data', [ 'label' => esc_html__( 'Data', 'refraction' ) ] );

		$this->add_control( 'source', [
			'label' => esc_html__( 'Data From', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'manual',
			'options' => [
				'manual' => esc_html__( 'Series typed in', 'refraction' ),
				'table' => esc_html__( 'A pasted table (CSV)', 'refraction' ),
				'wordpress' => esc_html__( 'This site', 'refraction' ),
			],
		] );

		$manual = [ 'source' => 'manual' ];

		$this->add_control( 'labels', [
			'label' => esc_html__( 'Labels', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 2,
			'dynamic' => [ 'active' => true ],
			'default' => 'Jan, Feb, Mar, Apr, May, Jun',
			'description' => esc_html__( 'Separated by commas (or one per line). For a pie or donut, the slices.', 'refraction' ),
			'condition' => $manual,
		] );

		$series = new Repeater();
		$series->add_control( 'name', [ 'label' => esc_html__( 'Name', 'refraction' ), 'type' => Controls_Manager::TEXT, 'dynamic' => [ 'active' => true ], 'default' => esc_html__( 'Series', 'refraction' ) ] );
		$series->add_control( 'values', [
			'label' => esc_html__( 'Values', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 2,
			'dynamic' => [ 'active' => true ],
			'description' => esc_html__( 'In the order of the labels, separated by commas. Each can come from a dynamic tag.', 'refraction' ),
		] );
		$series->add_control( 'color', [ 'label' => esc_html__( 'Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'description' => esc_html__( 'Empty: the next color of the palette.', 'refraction' ) ] );

		$this->add_control( 'series', [
			'label' => esc_html__( 'Series', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $series->get_controls(),
			'default' => [
				[ 'name' => esc_html__( 'Sales', 'refraction' ), 'values' => '30, 40, 35, 50, 49, 60' ],
				[ 'name' => esc_html__( 'Costs', 'refraction' ), 'values' => '20, 25, 30, 28, 32, 35' ],
			],
			'title_field' => '{{{ name }}}',
			'condition' => $manual,
		] );

		$this->add_control( 'table_data', [
			'label' => esc_html__( 'Table', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 7,
			'dynamic' => [ 'active' => true ],
			'default' => "Month, Sales, Costs\nJan, 30, 20\nFeb, 40, 25\nMar, 35, 30\nApr, 50, 28",
			'description' => esc_html__( 'The first row names the series, the first column holds the labels. Commas, semicolons, tabs or | between cells (a spreadsheet paste works).', 'refraction' ),
			'condition' => [ 'source' => 'table' ],
		] );

		$wp = [ 'source' => 'wordpress' ];

		$this->add_control( 'wp_metric', [
			'label' => esc_html__( 'Show', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'posts_month',
			'options' => [
				'posts_month' => esc_html__( 'Posts published per month', 'refraction' ),
				'posts_category' => esc_html__( 'Posts per category', 'refraction' ),
				'comments_month' => esc_html__( 'Comments per month', 'refraction' ),
				'users_role' => esc_html__( 'Users per role', 'refraction' ),
				'submissions_month' => esc_html__( 'Form submissions per month', 'refraction' ),
			],
			'condition' => $wp,
		] );

		$types = [];

		foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $name => $type ) {
			$types[ $name ] = $type->labels->name;
		}

		$this->add_control( 'wp_post_type', [
			'label' => esc_html__( 'Post Type', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'post',
			'options' => $types,
			'condition' => array_merge( $wp, [ 'wp_metric' => 'posts_month' ] ),
		] );

		$this->add_control( 'wp_months', [
			'label' => esc_html__( 'Months', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 6,
			'min' => 2,
			'max' => 24,
			'condition' => array_merge( $wp, [ 'wp_metric' => [ 'posts_month', 'comments_month', 'submissions_month' ] ] ),
		] );

		$this->end_controls_section();

		// ---------------------------------------------------------------- chart
		$this->start_controls_section( 'section_chart', [ 'label' => esc_html__( 'Chart', 'refraction' ) ] );

		$this->add_control( 'type', [
			'label' => esc_html__( 'Type', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'bar',
			'options' => [
				'bar' => esc_html__( 'Bars', 'refraction' ),
				'hbar' => esc_html__( 'Horizontal bars', 'refraction' ),
				'line' => esc_html__( 'Line', 'refraction' ),
				'area' => esc_html__( 'Area', 'refraction' ),
				'pie' => esc_html__( 'Pie', 'refraction' ),
				'donut' => esc_html__( 'Donut', 'refraction' ),
			],
		] );

		$axes = [ 'type' => [ 'bar', 'hbar', 'line', 'area' ] ];
		$ring = [ 'type' => [ 'pie', 'donut' ] ];

		$this->add_control( 'stacked', [ 'label' => esc_html__( 'Stack The Series', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'condition' => [ 'type' => [ 'bar', 'hbar' ] ] ] );
		$this->add_control( 'smooth', [ 'label' => esc_html__( 'Smooth Curves', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'condition' => [ 'type' => [ 'line', 'area' ] ] ] );
		$this->add_control( 'points', [ 'label' => esc_html__( 'Show Points', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'condition' => [ 'type' => [ 'line', 'area' ] ] ] );
		$this->add_control( 'show_values', [ 'label' => esc_html__( 'Show Values', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'condition' => [ 'type' => [ 'bar', 'hbar' ] ] ] );
		$this->add_control( 'grid', [ 'label' => esc_html__( 'Grid Lines', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'condition' => $axes ] );

		$this->add_control( 'ticks', [
			'label' => esc_html__( 'Axis Steps', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 5,
			'min' => 2,
			'max' => 10,
			'condition' => $axes,
		] );

		$this->add_control( 'center_label', [
			'label' => esc_html__( 'Text Under The Total', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'default' => esc_html__( 'Total', 'refraction' ),
			'description' => esc_html__( 'The total shows in the middle of the donut.', 'refraction' ),
			'condition' => [ 'type' => 'donut' ],
		] );

		$this->add_control( 'slice_colors', [
			'label' => esc_html__( 'Slice Colors', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => '#3699FF, #1BC5BD, #8950FC',
			'description' => esc_html__( 'Separated by commas. Empty: the palette.', 'refraction' ),
			'condition' => $ring,
		] );

		$this->add_control( 'legend', [
			'label' => esc_html__( 'Legend', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'bottom',
			'options' => [
				'top' => esc_html__( 'Above', 'refraction' ),
				'bottom' => esc_html__( 'Below', 'refraction' ),
				'side' => esc_html__( 'Beside (pie and donut)', 'refraction' ),
				'none' => esc_html__( 'None', 'refraction' ),
			],
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'height', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 120, 'max' => 800 ] ],
			'default' => [ 'unit' => 'px', 'size' => 300 ],
			'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-h: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'prefix', [ 'label' => esc_html__( 'Before The Numbers', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '$', 'separator' => 'before' ] );
		$this->add_control( 'suffix', [ 'label' => esc_html__( 'After The Numbers', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '%' ] );
		$this->add_control( 'decimals', [ 'label' => esc_html__( 'Decimals', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'default' => 0, 'min' => 0, 'max' => 4 ] );
		$this->add_control( 'compact', [ 'label' => esc_html__( 'Short Numbers (1.2K, 3.4M)', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'animate', [ 'label' => esc_html__( 'Draw In When Shown', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );

		$this->end_controls_section();

		$this->add_card_style_controls();

		// ---------------------------------------------------------------- style: chart
		$this->start_controls_section( 'section_style_chart', [ 'label' => esc_html__( 'Chart', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'axis_color', [ 'label' => esc_html__( 'Axis Labels', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-axis: {{VALUE}};' ], 'condition' => $axes ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'axis_typography', 'label' => esc_html__( 'Axis Typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-chart__tick, {{WRAPPER}} .rf-chart__label', 'condition' => $axes ] );
		$this->add_control( 'grid_color', [ 'label' => esc_html__( 'Grid Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-grid: {{VALUE}};' ], 'condition' => $axes ] );

		$this->add_control( 'bar_radius', [ 'label' => esc_html__( 'Bar Corners', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'max' => 30 ] ], 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-radius: {{SIZE}}px;' ], 'condition' => [ 'type' => [ 'bar', 'hbar' ] ], 'separator' => 'before' ] );
		$this->add_control( 'bar_width', [ 'label' => esc_html__( 'Bar Width', 'refraction' ) . ' (%)', 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 10, 'max' => 100 ] ], 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-bar: {{SIZE}}%;' ], 'condition' => [ 'type' => [ 'bar', 'hbar' ] ] ] );
		$this->add_control( 'line_width', [ 'label' => esc_html__( 'Line Width', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 1, 'max' => 10 ] ], 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-line: {{SIZE}}px;' ], 'condition' => [ 'type' => [ 'line', 'area' ] ] ] );
		$this->add_control( 'area_opacity', [ 'label' => esc_html__( 'Area Opacity', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 1, 'step' => 0.05 ] ], 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-fill: {{SIZE}};' ], 'condition' => [ 'type' => 'area' ] ] );
		$this->add_control( 'donut_thickness', [ 'label' => esc_html__( 'Ring Thickness', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 4, 'max' => 40 ] ], 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-ring: {{SIZE}};' ], 'condition' => [ 'type' => 'donut' ] ] );

		$this->add_control( 'values_color', [ 'label' => esc_html__( 'Value Labels', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-chart__value' => 'color: {{VALUE}};' ], 'separator' => 'before', 'condition' => [ 'type' => [ 'bar', 'hbar' ], 'show_values' => 'yes' ] ] );
		$this->add_control( 'total_color', [ 'label' => esc_html__( 'Total Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-chart__total' => 'color: {{VALUE}};' ], 'condition' => [ 'type' => 'donut' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'total_typography', 'label' => esc_html__( 'Total Typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-chart__total', 'condition' => [ 'type' => 'donut' ] ] );

		$this->add_control( 'legend_color', [ 'label' => esc_html__( 'Legend Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-chart__legend' => 'color: {{VALUE}};' ], 'separator' => 'before', 'condition' => [ 'legend!' => 'none' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'legend_typography', 'label' => esc_html__( 'Legend Typography', 'refraction' ), 'selector' => '{{WRAPPER}} .rf-chart__legend', 'condition' => [ 'legend!' => 'none' ] ] );

		$this->add_control( 'tooltip_bg', [ 'label' => esc_html__( 'Tooltip Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-tip-bg: {{VALUE}};' ], 'separator' => 'before' ] );
		$this->add_control( 'tooltip_color', [ 'label' => esc_html__( 'Tooltip Text', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf-chart' => '--rf-chart-tip-color: {{VALUE}};' ] ] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- data

	/**
	 * The chart's data from its source.
	 *
	 * @return array{labels: string[], series: array<int, array{name: string, color: string, values: array}>}
	 */
	public function data( array $s ): array {
		$source = $s['source'] ?? 'manual';

		if ( 'table' === $source ) {
			$data = D::chart_from_table( D::table( (string) ( $s['table_data'] ?? '' ) ) );
		} elseif ( 'wordpress' === $source ) {
			$data = $this->site_data( $s );
		} else {
			$data = [
				'labels' => D::items( (string) ( $s['labels'] ?? '' ) ),
				'series' => array_map( static fn( $row ) => [ 'name' => (string) ( $row['name'] ?? '' ), 'color' => (string) ( $row['color'] ?? '' ), 'values' => D::numbers( (string) ( $row['values'] ?? '' ) ) ], (array) ( $s['series'] ?? [] ) ),
			];
		}

		$count = max( count( $data['labels'] ), ...array_map( static fn( $se ) => count( $se['values'] ), $data['series'] ?: [ [ 'values' => [] ] ] ) );

		// Every series as long as the labels (a missing value is a gap); labels made up where missing.
		foreach ( $data['series'] as $i => &$series ) {
			$series['values'] = array_pad( array_slice( $series['values'], 0, $count ), $count, null );
			$series['color'] = D::color( $series['color'] ?? '', $i );
		}
		unset( $series );

		for ( $i = count( $data['labels'] ); $i < $count; $i++ ) {
			$data['labels'][] = (string) ( $i + 1 );
		}

		return $data;
	}

	/** This site's numbers: posts, comments or submissions per month, posts per category, users per role. */
	private function site_data( array $s ): array {
		global $wpdb;

		$metric = $s['wp_metric'] ?? 'posts_month';

		if ( 'posts_category' === $metric ) {
			$terms = get_terms( [ 'taxonomy' => 'category', 'orderby' => 'count', 'order' => 'DESC', 'number' => 8, 'hide_empty' => true ] );
			$terms = is_array( $terms ) ? $terms : [];

			return [ 'labels' => wp_list_pluck( $terms, 'name' ), 'series' => [ [ 'name' => __( 'Posts', 'refraction' ), 'values' => array_map( 'floatval', wp_list_pluck( $terms, 'count' ) ) ] ] ];
		}

		if ( 'users_role' === $metric ) {
			$counts = count_users();
			$names = wp_roles()->get_names();
			$labels = [];
			$values = [];

			foreach ( (array) ( $counts['avail_roles'] ?? [] ) as $role => $n ) {
				if ( $n > 0 && isset( $names[ $role ] ) ) {
					$labels[] = translate_user_role( $names[ $role ] );
					$values[] = (float) $n;
				}
			}

			return [ 'labels' => $labels, 'series' => [ [ 'name' => __( 'Users', 'refraction' ), 'values' => $values ] ] ];
		}

		$months = max( 2, min( 24, (int) ( $s['wp_months'] ?? 6 ) ) );
		$start = gmdate( 'Y-m-01 00:00:00', strtotime( gmdate( 'Y-m-01' ) . ' -' . ( $months - 1 ) . ' months' ) );
		$labels = [];
		$keys = [];

		for ( $m = $months - 1; $m >= 0; $m-- ) {
			$time = strtotime( gmdate( 'Y-m-01' ) . " -{$m} months" );
			$keys[] = gmdate( 'Y-m', $time );
			$labels[] = date_i18n( 'M', $time );
		}

		if ( 'comments_month' === $metric ) {
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT DATE_FORMAT(comment_date_gmt, '%%Y-%%m') m, COUNT(*) n FROM {$wpdb->comments} WHERE comment_approved = '1' AND comment_date_gmt >= %s GROUP BY m", $start ), OBJECT_K );
			$name = __( 'Comments', 'refraction' );
		} elseif ( 'submissions_month' === $metric ) {
			$table = $wpdb->prefix . 'refraction_submissions';
			$rows = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) === $table
				? $wpdb->get_results( $wpdb->prepare( "SELECT DATE_FORMAT(created_gmt, '%%Y-%%m') m, COUNT(*) n FROM {$table} WHERE created_gmt >= %s GROUP BY m", $start ), OBJECT_K ) // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Our own table name.
				: [];
			$name = __( 'Submissions', 'refraction' );
		} else {
			$type = sanitize_key( (string) ( $s['wp_post_type'] ?? 'post' ) );
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT DATE_FORMAT(post_date_gmt, '%%Y-%%m') m, COUNT(*) n FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish' AND post_date_gmt >= %s GROUP BY m", $type, $start ), OBJECT_K );
			$object = get_post_type_object( $type );
			$name = $object ? $object->labels->name : __( 'Posts', 'refraction' );
		}

		return [ 'labels' => $labels, 'series' => [ [ 'name' => $name, 'values' => array_map( static fn( $k ) => (float) ( $rows[ $k ]->n ?? 0 ), $keys ) ] ] ];
	}

	// ---------------------------------------------------------------- render

	protected function render() {
		$s = $this->get_settings_for_display();
		$type = in_array( $s['type'] ?? '', self::TYPES, true ) ? $s['type'] : 'bar';
		$data = $this->data( $s );
		$fmt = fn( $v ) => D::format( null === $v ? null : (float) $v, (int) ( $s['decimals'] ?? 0 ), (string) ( $s['prefix'] ?? '' ), (string) ( $s['suffix'] ?? '' ), 'yes' === ( $s['compact'] ?? '' ) );

		echo $this->card_open( $s, 'rf-dash--chart' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

		if ( ! $data['labels'] || ! $data['series'] ) {
			echo '<p class="rf-chart__empty">' . esc_html__( 'No data to show yet.', 'refraction' ) . '</p>';
			echo $this->card_close(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return;
		}

		$ring = in_array( $type, [ 'pie', 'donut' ], true );
		$legend = in_array( $s['legend'] ?? '', [ 'top', 'bottom', 'side', 'none' ], true ) ? $s['legend'] : 'bottom';
		$legend = 'side' === $legend && ! $ring ? 'bottom' : $legend;

		// The tooltip's numbers, already formatted.
		$tip = [
			'labels' => $data['labels'],
			'series' => array_map( static fn( $se ) => [ 'name' => $se['name'], 'color' => $se['color'], 'values' => array_map( $fmt, $se['values'] ) ], $data['series'] ),
		];

		printf(
			'<figure class="rf-chart rf-chart--%1$s rf-chart--legend-%2$s%3$s%4$s" data-rf-chart="%5$s">',
			esc_attr( $type ),
			esc_attr( $legend ),
			'yes' === ( $s['animate'] ?? 'yes' ) ? ' rf-chart--animate' : '',
			'yes' === ( $s['grid'] ?? 'yes' ) ? '' : ' rf-chart--no-grid',
			esc_attr( wp_json_encode( $tip ) )
		);

		$legend_html = 'none' === $legend ? '' : $this->legend( $data, $ring, $s, $fmt );

		if ( 'top' === $legend ) {
			echo $legend_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		}

		if ( $ring ) {
			echo '<div class="rf-chart__ring-wrap">';
			echo $this->ring( $data, $type, $s, $fmt ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.

			if ( 'side' === $legend ) {
				echo $legend_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			}

			echo '</div>';
		} else {
			echo $this->cartesian( $data, $type, $s, $fmt ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		}

		if ( 'bottom' === $legend ) {
			echo $legend_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}

		echo $this->sr_table( $data, $fmt ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
		echo '<div class="rf-chart__tip" role="presentation" aria-hidden="true"></div>';
		echo '</figure>';
		echo $this->card_close(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	private function slice_colors( array $s, int $count ): array {
		$own = array_map( 'trim', array_filter( explode( ',', (string) ( $s['slice_colors'] ?? '' ) ) ) );

		return array_map( static fn( $i ) => D::color( $own[ $i ] ?? '', $i ), range( 0, max( 0, $count - 1 ) ) );
	}

	private function legend( array $data, bool $ring, array $s, callable $fmt ): string {
		$items = '';

		if ( $ring ) {
			$values = $data['series'][0]['values'];
			$colors = $this->slice_colors( $s, count( $values ) );
			$shares = D::shares( $values );

			foreach ( $data['labels'] as $i => $label ) {
				$items .= sprintf(
					'<li><i style="background:%1$s"></i><span class="rf-chart__legend-name">%2$s</span><span class="rf-chart__legend-value">%3$s <small>%4$s%%</small></span></li>',
					esc_attr( $colors[ $i ] ),
					esc_html( $label ),
					esc_html( $fmt( $values[ $i ] ?? null ) ),
					esc_html( (string) round( $shares[ $i ]['share'] ?? 0 ) )
				);
			}
		} else {
			foreach ( $data['series'] as $se ) {
				$items .= sprintf( '<li><i style="background:%1$s"></i><span class="rf-chart__legend-name">%2$s</span></li>', esc_attr( $se['color'] ), esc_html( $se['name'] ) );
			}
		}

		return '<ul class="rf-chart__legend">' . $items . '</ul>';
	}

	/** Bars, horizontal bars, line and area: a plot with an axis of values and one of labels. */
	private function cartesian( array $data, string $type, array $s, callable $fmt ): string {
		$n = count( $data['labels'] );
		$stacked = 'yes' === ( $s['stacked'] ?? '' ) && in_array( $type, [ 'bar', 'hbar' ], true );
		$values = [];

		foreach ( $data['series'] as $se ) {
			foreach ( $se['values'] as $v ) {
				if ( null !== $v ) {
					$values[] = $v;
				}
			}
		}

		if ( $stacked ) {
			$values = [];

			for ( $i = 0; $i < $n; $i++ ) {
				$values[] = array_sum( array_map( static fn( $se ) => max( 0, (float) $se['values'][ $i ] ), $data['series'] ) );
				$values[] = array_sum( array_map( static fn( $se ) => min( 0, (float) $se['values'][ $i ] ), $data['series'] ) );
			}
		}

		$whole = (bool) $values && array_reduce( $values, static fn( $ok, $v ) => $ok && abs( $v - round( $v ) ) < 1e-9, true );
		$scale = D::scale( $values ? min( $values ) : 0, $values ? max( $values ) : 1, max( 2, min( 10, (int) ( $s['ticks'] ?? 5 ) ) ), true, $whole );
		$tick_decimals = max( (int) ( $s['decimals'] ?? 0 ), D::step_decimals( $scale['step'] ) );
		$tick = static fn( $v ) => D::format( (float) $v, $tick_decimals, (string) ( $s['prefix'] ?? '' ), (string) ( $s['suffix'] ?? '' ), 'yes' === ( $s['compact'] ?? '' ) );
		$span = $scale['max'] - $scale['min'];
		$pct = static fn( $v ) => ( $v - $scale['min'] ) / $span * 100;
		$zero = $pct( 0 );
		$horizontal = 'hbar' === $type;
		$show_values = 'yes' === ( $s['show_values'] ?? '' );

		// Axis of values: grid lines and their numbers.
		$grid = '';
		$ticks = '';
		$widest = '';

		for ( $v = $scale['min']; $v <= $scale['max'] + ( $scale['step'] / 2 ); $v += $scale['step'] ) {
			$at = round( $pct( $v ), 3 );
			$text = $tick( round( $v, 6 ) );
			$widest = strlen( $text ) > strlen( $widest ) ? $text : $widest;
			$grid .= '<span class="rf-chart__grid" style="--at:' . $at . '%"></span>';
			$ticks .= '<span class="rf-chart__tick" style="--at:' . $at . '%">' . esc_html( $text ) . '</span>';
		}

		// The widest number, invisible, gives the axis its width (the numbers themselves are placed absolutely).
		$ticks .= '<span class="rf-chart__tick-sizer">' . esc_html( $widest ) . '</span>';

		$plot = '';

		if ( in_array( $type, [ 'bar', 'hbar' ], true ) ) {
			foreach ( $data['labels'] as $i => $label ) {
				$bars = '';
				$up = 0.0;
				$down = 0.0;

				foreach ( $data['series'] as $k => $se ) {
					$v = $se['values'][ $i ];

					if ( null === $v ) {
						$bars .= '<span class="rf-chart__bar is-empty"></span>';
						continue;
					}

					if ( $stacked ) {
						$from = $v >= 0 ? $up : $down;
						$to = $from + $v;
						$v >= 0 ? $up = $to : $down = $to;
					} else {
						$from = 0.0;
						$to = $v;
					}

					$a = $pct( min( $from, $to ) );
					$b = $pct( max( $from, $to ) );
					$bars .= sprintf(
						'<span class="rf-chart__bar%1$s" style="--from:%2$s%%;--size:%3$s%%;--c:%4$s" data-s="%5$d">%6$s</span>',
						$v < 0 ? ' is-negative' : '',
						round( $a, 3 ),
						round( $b - $a, 3 ),
						esc_attr( $se['color'] ),
						(int) $k,
						$show_values ? '<span class="rf-chart__value">' . esc_html( $fmt( $v ) ) . '</span>' : ''
					);
				}

				$plot .= sprintf( '<div class="rf-chart__group%1$s" data-i="%2$d" style="--i:%2$d">%3$s</div>', $stacked ? ' is-stacked' : '', (int) $i, $bars );
			}
		} else {
			$svg = '';
			$dots = '';
			$smooth = 'yes' === ( $s['smooth'] ?? 'yes' );

			foreach ( $data['series'] as $k => $se ) {
				$points = [];

				foreach ( $se['values'] as $i => $v ) {
					if ( null === $v ) {
						$points[] = null;
						continue;
					}

					$x = ( $i + 0.5 ) / $n * 1000;
					$y = 1000 - ( $pct( $v ) * 10 );
					$points[] = [ $x, $y ];

					if ( 'yes' === ( $s['points'] ?? '' ) ) {
						$dots .= sprintf( '<span class="rf-chart__dot" style="--x:%1$s%%;--y:%2$s%%;--c:%3$s"></span>', round( ( $i + 0.5 ) / $n * 100, 3 ), round( $pct( $v ), 3 ), esc_attr( $se['color'] ) );
					}
				}

				$d = D::line_path( $points, $smooth );
				$filled = array_values( array_filter( $points ) );

				if ( 'area' === $type && count( $filled ) > 1 ) {
					$base = round( 1000 - ( $zero * 10 ), 2 );
					$area = $d . 'L' . round( end( $filled )[0], 2 ) . ' ' . $base . 'L' . round( $filled[0][0], 2 ) . ' ' . $base . 'Z';
					$gradient = 'rf-g-' . $this->get_id() . '-' . $k;
					$svg .= '<defs><linearGradient id="' . esc_attr( $gradient ) . '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' . esc_attr( $se['color'] ) . '" stop-opacity="1"/><stop offset="1" stop-color="' . esc_attr( $se['color'] ) . '" stop-opacity="0"/></linearGradient></defs>';
					$svg .= '<path class="rf-chart__area" d="' . esc_attr( $area ) . '" fill="url(#' . esc_attr( $gradient ) . ')"/>';
				}

				$svg .= '<path class="rf-chart__line" d="' . esc_attr( $d ) . '" stroke="' . esc_attr( $se['color'] ) . '" pathLength="1"/>';
			}

			$plot .= '<svg class="rf-chart__svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">' . $svg . '</svg>' . $dots;

			// Hover columns for the tooltip.
			foreach ( $data['labels'] as $i => $label ) {
				$plot .= '<div class="rf-chart__group rf-chart__hit" data-i="' . (int) $i . '" style="--i:' . (int) $i . '"></div>';
			}
		}

		$labels = '';

		foreach ( $data['labels'] as $i => $label ) {
			$labels .= '<span class="rf-chart__label" style="--i:' . (int) $i . '">' . esc_html( $label ) . '</span>';
		}

		return sprintf(
			'<div class="rf-chart__frame%1$s" style="--n:%2$d;--zero:%3$s%%;--rf-chart-series:%8$d" aria-hidden="true"><div class="rf-chart__ticks">%4$s</div><div class="rf-chart__plot">%5$s%6$s</div><div class="rf-chart__labels">%7$s</div></div>',
			$horizontal ? ' is-horizontal' : '',
			$n,
			round( $zero, 3 ),
			$ticks,
			$grid,
			$plot,
			$labels,
			$stacked ? 1 : max( 1, count( $data['series'] ) )
		);
	}

	/** Pie and donut: the first series, one slice per label. */
	private function ring( array $data, string $type, array $s, callable $fmt ): string {
		$values = $data['series'][0]['values'];
		$shares = D::shares( $values );
		$colors = $this->slice_colors( $s, count( $values ) );
		$donut = 'donut' === $type;
		$slices = '';

		foreach ( $shares as $i => $sh ) {
			if ( $sh['share'] <= 0 ) {
				continue;
			}

			$slices .= sprintf(
				'<circle class="rf-chart__slice" cx="50" cy="50" r="40" pathLength="100" stroke="%1$s" style="--share:%2$s;--start:%3$s" data-i="%4$d"/>',
				esc_attr( $colors[ $i ] ),
				$sh['share'],
				$sh['start'],
				(int) $i
			);
		}

		$total = array_sum( array_map( static fn( $v ) => max( 0, (float) $v ), $values ) );
		$center = $donut ? '<div class="rf-chart__center"><span class="rf-chart__total">' . esc_html( $fmt( $total ) ) . '</span><span class="rf-chart__caption">' . esc_html( (string) ( $s['center_label'] ?? '' ) ) . '</span></div>' : '';

		return '<div class="rf-chart__ring' . ( $donut ? ' is-donut' : '' ) . '" aria-hidden="true"><svg viewBox="0 0 100 100" focusable="false">' . $slices . '</svg>' . $center . '</div>';
	}

	/** The numbers as a table, for screen readers. */
	private function sr_table( array $data, callable $fmt ): string {
		$head = '<th scope="col"></th>';

		foreach ( $data['series'] as $se ) {
			$head .= '<th scope="col">' . esc_html( $se['name'] ) . '</th>';
		}

		$rows = '';

		foreach ( $data['labels'] as $i => $label ) {
			$rows .= '<tr><th scope="row">' . esc_html( $label ) . '</th>';

			foreach ( $data['series'] as $se ) {
				$rows .= '<td>' . esc_html( $fmt( $se['values'][ $i ] ) ) . '</td>';
			}

			$rows .= '</tr>';
		}

		return '<table class="rf-chart__sr"><thead><tr>' . $head . '</tr></thead><tbody>' . $rows . '</tbody></table>';
	}

	public function render_plain_content() {
		$data = $this->data( $this->get_settings_for_display() );

		foreach ( $data['labels'] as $i => $label ) {
			echo esc_html( $label . ': ' . implode( ', ', array_map( static fn( $se ) => $se['name'] . ' ' . ( $se['values'][ $i ] ?? '' ), $data['series'] ) ) ) . "\n";
		}
	}
}
