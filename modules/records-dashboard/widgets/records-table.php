<?php
namespace Refraction\Modules\RecordsDashboard\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Repeater;
use Refraction\Widget_Base;
use Refraction\Modules\RecordsDashboard\Classes\Records_View;
use Refraction\Modules\RecordsDashboard\Module;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Records Table (0.129.0): a Form Builder collection's records (bookings...) in a table whose columns you arrange:
 * drag them into any order in the panel, and viewers can drag the headings too (remembered in their browser).
 * Search, status and date filters, sorting, pages, Refresh and Export CSV. Choosing a row opens an Off-Canvas and
 * shows the record in a Record Details widget.
 */
class Records_Table extends Widget_Base {

	public function get_name() {
		return 'refraction-records-table';
	}

	public function get_title() {
		return esc_html__( 'Records Table', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-table';
	}

	public function get_categories() {
		return [ Module::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'records', 'bookings', 'table', 'list', 'orders', 'dashboard', 'form builder', 'admin' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-records-dashboard' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-records-table';
	}

	protected function register_controls() {
		$fields = Records_View::field_options();

		$this->start_controls_section( 'section_records', [ 'label' => esc_html__( 'Records', 'refraction' ) ] );

		$this->add_control( 'collection', [
			'label' => esc_html__( 'Collection', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => Records_View::collection_options(),
			'default' => '',
			'description' => esc_html__( 'A collection made in Refraction > Builder (Bookings, Orders...).', 'refraction' ),
		] );

		$this->add_control( 'access', [
			'label' => esc_html__( 'Who can see the records', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => Records_View::access_options(),
			'default' => 'admins',
			'description' => esc_html__( 'Records are never public. Others see the message below instead.', 'refraction' ),
		] );

		$this->add_control( 'denied_text', [
			'label' => esc_html__( 'Message for others', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Sign in with an account that can see these records.', 'refraction' ),
			'label_block' => true,
			'dynamic' => [ 'active' => true ],
		] );

		$this->add_control( 'title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Bookings', 'refraction' ),
			'dynamic' => [ 'active' => true ],
		] );

		$this->add_control( 'show_count', [
			'label' => esc_html__( 'Show the number of records', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'per_page', [
			'label' => esc_html__( 'Rows per page', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1,
			'max' => 100,
			'default' => 10,
		] );

		$this->add_control( 'orderby', [
			'label' => esc_html__( 'Sort by', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => array_diff_key( $fields, [ '' => '', '_title' => '', '_modified' => '' ] ),
			'default' => '_created',
		] );

		$this->add_control( 'order', [
			'label' => esc_html__( 'Order', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => [ 'desc' => esc_html__( 'Newest / highest first', 'refraction' ), 'asc' => esc_html__( 'Oldest / lowest first', 'refraction' ) ],
			'default' => 'desc',
		] );

		$this->add_control( 'empty_text', [
			'label' => esc_html__( 'When nothing matches', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'No bookings match.', 'refraction' ),
			'label_block' => true,
			'dynamic' => [ 'active' => true ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_columns', [ 'label' => esc_html__( 'Columns', 'refraction' ) ] );

		$repeater = new Repeater();

		$repeater->add_control( 'col_label', [
			'label' => esc_html__( 'Heading', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Column', 'refraction' ),
			'dynamic' => [ 'active' => true ],
		] );

		$repeater->add_control( 'col_type', [
			'label' => esc_html__( 'Shows', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'text',
			'options' => [
				'text' => esc_html__( 'Text (and a second line)', 'refraction' ),
				'reference' => esc_html__( 'Reference and date booked', 'refraction' ),
				'person' => esc_html__( 'Person (initials, name, details)', 'refraction' ),
				'journey' => esc_html__( 'Journey (A, stops, B)', 'refraction' ),
				'badge' => esc_html__( 'Badge (status)', 'refraction' ),
				'money' => esc_html__( 'Amount', 'refraction' ),
				'created' => esc_html__( 'Date booked', 'refraction' ),
			],
		] );

		$repeater->add_control( 'col_field', [
			'label' => esc_html__( 'Field', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => $fields,
			'default' => '',
			'condition' => [ 'col_type!' => [ 'journey', 'created' ] ],
		] );

		foreach ( [ 'col_from' => __( 'From (A)', 'refraction' ), 'col_stops' => __( 'Stops (a repeater or one per line)', 'refraction' ), 'col_to' => __( 'To (B)', 'refraction' ) ] as $key => $label ) {
			$repeater->add_control( $key, [
				'label' => esc_html( $label ),
				'type' => Controls_Manager::SELECT,
				'options' => $fields,
				'default' => '',
				'condition' => [ 'col_type' => 'journey' ],
			] );
		}

		$repeater->add_control( 'col_sub', [
			'label' => esc_html__( 'Second line', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => $fields,
			'default' => '',
			'condition' => [ 'col_type!' => [ 'journey', 'badge' ] ],
		] );

		$repeater->add_control( 'col_width', [
			'label' => esc_html__( 'Width (px, empty = automatic)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 40,
			'max' => 800,
		] );

		$repeater->add_control( 'col_align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'default' => 'start',
			'toggle' => false,
			'options' => [
				'start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
			],
		] );

		$repeater->add_control( 'col_sort', [
			'label' => esc_html__( 'Sort by clicking the heading', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'col_type!' => 'journey' ],
		] );

		$this->add_control( 'columns', [
			'label' => esc_html__( 'Columns (drag to reorder)', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $repeater->get_controls(),
			'title_field' => '{{{ col_label }}}',
			'default' => [
				[ 'col_label' => esc_html__( 'Reference', 'refraction' ), 'col_type' => 'reference', 'col_field' => '_title' ],
				[ 'col_label' => esc_html__( 'Booked', 'refraction' ), 'col_type' => 'created' ],
				[ 'col_label' => esc_html__( 'Status', 'refraction' ), 'col_type' => 'badge', 'col_field' => '_status' ],
			],
		] );

		$this->add_control( 'reorder', [
			'label' => esc_html__( 'Viewers can drag the headings to reorder', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Their order is kept in their browser; "Reset columns" brings yours back.', 'refraction' ),
		] );

		$this->add_control( 'cards_on_phone', [
			'label' => esc_html__( 'Rows as cards on phones', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'prefix_class' => 'rf-rt-cards-',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_tools', [ 'label' => esc_html__( 'Toolbar and rows', 'refraction' ) ] );

		foreach ( [
			'tool_search' => __( 'Search', 'refraction' ),
			'tool_status' => __( 'Status filter', 'refraction' ),
			'tool_dates' => __( 'From / to dates', 'refraction' ),
			'tool_refresh' => __( 'Refresh button', 'refraction' ),
			'tool_export' => __( 'Export CSV button', 'refraction' ),
		] as $key => $label ) {
			$this->add_control( $key, [ 'label' => esc_html( $label ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		}

		$this->add_control( 'search_placeholder', [
			'label' => esc_html__( 'Search placeholder', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Search bookings', 'refraction' ),
			'condition' => [ 'tool_search' => 'yes' ],
		] );

		$this->add_control( 'open_panel', [
			'label' => esc_html__( 'A row opens this Off-Canvas', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => 'booking-details',
			'description' => esc_html__( 'The Panel ID of an Off-Canvas holding a Record Details widget. Empty: the row only fills Record Details widgets on the page.', 'refraction' ),
		] );

		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls(): void {
		$this->start_controls_section( 'section_style_table', [ 'label' => esc_html__( 'Table', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'accent', [
			'label' => esc_html__( 'Accent color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'description' => esc_html__( 'Avatars, journey markers, the chosen row and the buttons.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}}' => '--rf-rec-accent: {{VALUE}};' ],
		] );

		$this->add_control( 'card_bg', [
			'label' => esc_html__( 'Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-rt-bg: {{VALUE}};' ],
		] );

		$this->add_control( 'line_color', [
			'label' => esc_html__( 'Lines', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-rt-line: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'card_border', 'selector' => '{{WRAPPER}} .rf-rt' ] );

		$this->add_responsive_control( 'card_radius', [
			'label' => esc_html__( 'Border radius', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}}' => '--rf-rt-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'card_shadow', 'selector' => '{{WRAPPER}} .rf-rt' ] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'title_type',
			'label' => esc_html__( 'Title', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-rt__title',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_rows', [ 'label' => esc_html__( 'Headings and rows', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'head_type',
			'label' => esc_html__( 'Headings', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-rt__table th',
		] );

		$this->add_control( 'head_color', [
			'label' => esc_html__( 'Headings color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-rt__table th' => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'head_bg', [
			'label' => esc_html__( 'Headings background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-rt__table thead' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'row_type',
			'label' => esc_html__( 'Rows', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-rt__table td',
		] );

		$this->add_control( 'row_color', [
			'label' => esc_html__( 'Rows text color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-rt__table td' => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'row_hover', [
			'label' => esc_html__( 'Row under the pointer', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-rt-hover: {{VALUE}};' ],
		] );

		$this->add_control( 'row_selected', [
			'label' => esc_html__( 'Chosen row', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-rt-selected: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'cell_padding', [
			'label' => esc_html__( 'Cell padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ '{{WRAPPER}} .rf-rt__table td, {{WRAPPER}} .rf-rt__table th' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_control( 'badge_radius', [
			'label' => esc_html__( 'Badge radius', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 20 ] ],
			'selectors' => [ '{{WRAPPER}}' => '--rf-rec-badge-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->end_controls_section();
	}

	/** The settings the script sends back with every request, signed so they cannot be changed in the browser. */
	private function config( array $s ): array {
		$cols = [];

		foreach ( (array) ( $s['columns'] ?? [] ) as $col ) {
			$cols[] = [
				't' => (string) ( $col['col_type'] ?? 'text' ),
				'label' => (string) ( $col['col_label'] ?? '' ),
				'f' => (string) ( $col['col_field'] ?? '' ),
				'sub' => (string) ( $col['col_sub'] ?? '' ),
				'from' => (string) ( $col['col_from'] ?? '' ),
				'stops' => (string) ( $col['col_stops'] ?? '' ),
				'to' => (string) ( $col['col_to'] ?? '' ),
				'al' => in_array( $col['col_align'] ?? '', [ 'center', 'end' ], true ) ? $col['col_align'] : 'start',
			];
		}

		return [
			'c' => (string) ( $s['collection'] ?? '' ),
			'a' => array_key_exists( (string) ( $s['access'] ?? '' ), Records_View::access_options() ) ? $s['access'] : 'admins',
			'pp' => max( 1, min( 100, (int) ( $s['per_page'] ?? 10 ) ) ),
			'ob' => (string) ( $s['orderby'] ?? '_created' ),
			'o' => 'asc' === ( $s['order'] ?? '' ) ? 'asc' : 'desc',
			'empty' => (string) ( $s['empty_text'] ?? '' ),
			'cols' => $cols,
		];
	}

	/** The query key a column sorts by, or '' when it cannot be sorted. */
	private static function sort_key( array $col, array $definition ): string {
		if ( 'yes' !== ( $col['col_sort'] ?? '' ) ) {
			return '';
		}

		$type = (string) ( $col['col_type'] ?? 'text' );
		$key = (string) ( $col['col_field'] ?? '' );

		if ( 'created' === $type || ( 'reference' === $type && in_array( $key, [ '', '_title' ], true ) ) || '_created' === $key ) {
			return '_created';
		}

		if ( '_status' === $key || ( 'badge' === $type && '' === $key ) ) {
			return '_status';
		}

		$field = Records_View::field( $definition, $key );

		return $field && \Refraction\Modules\FormBuilder\Classes\Schema::is_scalar_type( $field['type'] ) ? $key : '';
	}

	private function is_editor(): bool {
		return Plugin::$instance->editor && Plugin::$instance->editor->is_edit_mode();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$config = $this->config( $s );
		$definition = '' !== $config['c'] ? Records_View::collections()->get( $config['c'] ) : null;

		if ( ! $definition ) {
			if ( $this->is_editor() ) {
				echo '<div class="rf-rec-placeholder">' . esc_html__( 'Records Table: choose a collection in Content > Records.', 'refraction' ) . '</div>';
			}

			return;
		}

		if ( ! Records_View::can_view( $config['a'] ) ) {
			if ( '' !== (string) ( $s['denied_text'] ?? '' ) ) {
				echo '<div class="rf-rec-denied">' . esc_html( $s['denied_text'] ) . '</div>';
			}

			return;
		}

		$signed = Records_View::sign( $config );
		$args = Records_View::query_args( $config, [] );
		$rows = Records_View::rows( $definition, $config, $args );
		$cols = Records_View::columns( $config );
		$settings_cols = array_values( (array) ( $s['columns'] ?? [] ) );
		$sort = '_created' === $config['ob'] ? '_created' : $config['ob'];

		$this->add_render_attribute( 'wrap', [
			'class' => 'rf-rt',
			'data-config' => $signed['config'],
			'data-sig' => $signed['sig'],
			'data-panel' => sanitize_key( (string) ( $s['open_panel'] ?? '' ) ),
			'data-reorder' => 'yes' === ( $s['reorder'] ?? '' ) ? 'yes' : 'no',
			'data-key' => 'rf-rt-' . $this->get_id() . '-' . substr( md5( wp_json_encode( array_column( $cols, 'label' ) ) ), 0, 8 ),
			'data-sort' => $sort,
			'data-order' => $config['o'],
		] + Records_View::ajax_attributes() );
		?>
		<div <?php $this->print_render_attribute_string( 'wrap' ); ?>>
			<div class="rf-rt__top">
				<?php if ( '' !== (string) ( $s['title'] ?? '' ) ) : ?>
					<h3 class="rf-rt__title"><?php echo esc_html( $s['title'] ); ?><?php if ( 'yes' === ( $s['show_count'] ?? '' ) ) : ?> <span class="rf-rt__count"><?php echo (int) $rows['total']; ?></span><?php endif; ?></h3>
				<?php endif; ?>
				<div class="rf-rt__actions">
					<?php if ( 'yes' === ( $s['reorder'] ?? '' ) ) : ?>
						<button type="button" class="rf-rt__btn rf-rt__reset" hidden><?php echo esc_html__( 'Reset columns', 'refraction' ); ?></button>
					<?php endif; ?>
					<?php if ( 'yes' === ( $s['tool_refresh'] ?? '' ) ) : ?>
						<button type="button" class="rf-rt__btn rf-rt__refresh" aria-label="<?php echo esc_attr__( 'Refresh', 'refraction' ); ?>"><?php echo Records_View::icon( 'refresh' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><span><?php echo esc_html__( 'Refresh', 'refraction' ); ?></span></button>
					<?php endif; ?>
					<?php if ( 'yes' === ( $s['tool_export'] ?? '' ) ) : ?>
						<button type="button" class="rf-rt__btn rf-rt__export is-primary"><?php echo Records_View::icon( 'download' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><span><?php echo esc_html__( 'Export CSV', 'refraction' ); ?></span></button>
					<?php endif; ?>
				</div>
			</div>
			<?php if ( 'yes' === ( $s['tool_search'] ?? '' ) || 'yes' === ( $s['tool_status'] ?? '' ) || 'yes' === ( $s['tool_dates'] ?? '' ) ) : ?>
				<div class="rf-rt__filters" role="search">
					<?php if ( 'yes' === ( $s['tool_search'] ?? '' ) ) : ?>
						<label class="rf-rt__search"><?php echo Records_View::icon( 'search' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><input type="search" name="search" placeholder="<?php echo esc_attr( (string) ( $s['search_placeholder'] ?? '' ) ); ?>" aria-label="<?php echo esc_attr__( 'Search', 'refraction' ); ?>"></label>
					<?php endif; ?>
					<?php if ( 'yes' === ( $s['tool_status'] ?? '' ) ) : ?>
						<select name="status" aria-label="<?php echo esc_attr__( 'Status', 'refraction' ); ?>">
							<option value=""><?php echo esc_html__( 'All statuses', 'refraction' ); ?></option>
							<?php foreach ( $definition['statuses'] as $status ) : ?>
								<option value="<?php echo esc_attr( $status['key'] ); ?>"><?php echo esc_html( $status['label'] ); ?></option>
							<?php endforeach; ?>
						</select>
					<?php endif; ?>
					<?php if ( 'yes' === ( $s['tool_dates'] ?? '' ) ) : ?>
						<label class="rf-rt__date"><span><?php echo esc_html__( 'From', 'refraction' ); ?></span><input type="date" name="from"></label>
						<label class="rf-rt__date"><span><?php echo esc_html__( 'To', 'refraction' ); ?></span><input type="date" name="to"></label>
					<?php endif; ?>
					<button type="button" class="rf-rt__btn rf-rt__clear" hidden><?php echo esc_html__( 'Clear', 'refraction' ); ?></button>
				</div>
			<?php endif; ?>
			<div class="rf-rt__scroll">
				<table class="rf-rt__table">
					<colgroup>
						<?php foreach ( $cols as $i => $col ) : ?>
							<?php $width = (int) ( $settings_cols[ $i ]['col_width'] ?? 0 ); ?>
							<col data-col="<?php echo (int) $i; ?>"<?php echo $width ? ' style="width:' . (int) $width . 'px"' : ''; ?>>
						<?php endforeach; ?>
					</colgroup>
					<thead>
						<tr>
							<?php foreach ( $cols as $i => $col ) : ?>
								<?php
								$key = self::sort_key( $settings_cols[ $i ] ?? [], $definition );
								$align = in_array( $settings_cols[ $i ]['col_align'] ?? '', [ 'center', 'end' ], true ) ? $settings_cols[ $i ]['col_align'] : 'start';
								$sorted = '' !== $key && $key === $sort;
								?>
								<th scope="col" data-col="<?php echo (int) $i; ?>" data-align="<?php echo esc_attr( $align ); ?>"<?php echo '' !== $key ? ' data-sort="' . esc_attr( $key ) . '" aria-sort="' . ( $sorted ? ( 'asc' === $config['o'] ? 'ascending' : 'descending' ) : 'none' ) . '"' : ''; ?><?php echo 'yes' === ( $s['reorder'] ?? '' ) ? ' draggable="true"' : ''; ?>>
									<?php if ( '' !== $key ) : ?>
										<button type="button" class="rf-rt__sort"><?php echo esc_html( (string) ( $col['label'] ?? '' ) ); ?><span class="rf-rt__arrow" aria-hidden="true"></span></button>
									<?php else : ?>
										<span><?php echo esc_html( (string) ( $col['label'] ?? '' ) ); ?></span>
									<?php endif; ?>
								</th>
							<?php endforeach; ?>
						</tr>
					</thead>
					<tbody aria-live="polite"><?php echo $rows['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in Records_View::rows(). ?></tbody>
				</table>
			</div>
			<div class="rf-rt__foot">
				<span class="rf-rt__summary"><?php echo esc_html( $rows['summary'] ); ?></span>
				<div class="rf-rt__pager">
					<button type="button" class="rf-rt__btn rf-rt__prev" aria-label="<?php echo esc_attr__( 'Previous page', 'refraction' ); ?>" disabled><?php echo Records_View::icon( 'chevron-left' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
					<span class="rf-rt__page">
						<?php
						/* translators: 1: page, 2: number of pages. */
						echo esc_html( sprintf( __( 'Page %1$d of %2$d', 'refraction' ), 1, $rows['pages'] ) );
						?>
					</span>
					<button type="button" class="rf-rt__btn rf-rt__next" aria-label="<?php echo esc_attr__( 'Next page', 'refraction' ); ?>"<?php echo $rows['pages'] > 1 ? '' : ' disabled'; ?>><?php echo Records_View::icon( 'chevron-right' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
				</div>
			</div>
		</div>
		<?php
	}
}
