<?php
namespace Refraction\Modules\RecordsDashboard\Widgets;

use Refraction\Controls_Manager;
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
 * Record Details (0.129.0): the record chosen in a Records Table (or given as ?record=ID), laid out in the sections
 * you list: headings, fields (in full or half width, plain, bold, as a row or a badge), the journey, the person with
 * Call and Email buttons, and the status as buttons that change it. Put it in an Off-Canvas opening from the right.
 * Edit Mode shows the newest record so the layout can be styled.
 */
class Record_Details extends Widget_Base {

	public function get_name() {
		return 'refraction-record-details';
	}

	public function get_title() {
		return esc_html__( 'Record Details', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-info-box';
	}

	public function get_categories() {
		return [ Module::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'record', 'booking', 'details', 'drawer', 'status', 'customer', 'journey', 'form builder' ];
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
		return 'refraction-widget-record-details';
	}

	protected function register_controls() {
		$fields = Records_View::field_options();

		$this->start_controls_section( 'section_record', [ 'label' => esc_html__( 'Record', 'refraction' ) ] );

		$this->add_control( 'collection', [
			'label' => esc_html__( 'Collection', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => Records_View::collection_options(),
			'default' => '',
			'description' => esc_html__( 'The same collection as the Records Table it works with.', 'refraction' ),
		] );

		$this->add_control( 'access', [
			'label' => esc_html__( 'Who can see the records', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => Records_View::access_options(),
			'default' => 'admins',
			'description' => esc_html__( 'Only editors and administrators can change a status.', 'refraction' ),
		] );

		$this->add_control( 'title_field', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => $fields,
			'default' => '_title',
		] );

		$this->add_control( 'show_booked', [
			'label' => esc_html__( 'Show the date booked', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'booked_label', [
			'label' => esc_html__( 'Words before the date', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Booked', 'refraction' ),
			'condition' => [ 'show_booked' => 'yes' ],
		] );

		$this->add_control( 'admin_link', [
			'label' => esc_html__( 'Link to the record in the Builder (administrators)', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'empty_text', [
			'label' => esc_html__( 'Before a record is chosen', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Choose a booking to see its details.', 'refraction' ),
			'label_block' => true,
			'dynamic' => [ 'active' => true ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_sections', [ 'label' => esc_html__( 'Sections', 'refraction' ) ] );

		$repeater = new Repeater();

		$repeater->add_control( 'sec_type', [
			'label' => esc_html__( 'Shows', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'field',
			'options' => [
				'field' => esc_html__( 'A field', 'refraction' ),
				'heading' => esc_html__( 'Heading', 'refraction' ),
				'journey' => esc_html__( 'Journey (A, stops, B)', 'refraction' ),
				'person' => esc_html__( 'Person with Call / Email', 'refraction' ),
				'status' => esc_html__( 'Status buttons', 'refraction' ),
				'divider' => esc_html__( 'Divider', 'refraction' ),
			],
		] );

		$repeater->add_control( 'sec_label', [
			'label' => esc_html__( 'Label', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'description' => esc_html__( 'For a field, empty uses the field\'s own label.', 'refraction' ),
			'condition' => [ 'sec_type!' => 'divider' ],
		] );

		$repeater->add_control( 'sec_field', [
			'label' => esc_html__( 'Field', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'options' => $fields,
			'default' => '',
			'condition' => [ 'sec_type' => [ 'field', 'person' ] ],
		] );

		$repeater->add_control( 'sec_look', [
			'label' => esc_html__( 'Look', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'plain',
			'options' => [
				'plain' => esc_html__( 'Label above the value', 'refraction' ),
				'strong' => esc_html__( 'Bold value', 'refraction' ),
				'row' => esc_html__( 'Label and value in a row', 'refraction' ),
				'money' => esc_html__( 'Amount in a row', 'refraction' ),
				'total' => esc_html__( 'Total (bold row with a line above)', 'refraction' ),
				'badge' => esc_html__( 'Badge', 'refraction' ),
			],
			'condition' => [ 'sec_type' => 'field' ],
		] );

		$repeater->add_control( 'sec_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'full',
			'options' => [ 'full' => esc_html__( 'Full', 'refraction' ), 'half' => esc_html__( 'Half (two side by side)', 'refraction' ) ],
			'condition' => [ 'sec_type' => 'field' ],
		] );

		foreach ( [ 'sec_from' => __( 'From (A)', 'refraction' ), 'sec_stops' => __( 'Stops (a repeater or one per line)', 'refraction' ), 'sec_to' => __( 'To (B)', 'refraction' ) ] as $key => $label ) {
			$repeater->add_control( $key, [
				'label' => esc_html( $label ),
				'type' => Controls_Manager::SELECT,
				'options' => $fields,
				'default' => '',
				'condition' => [ 'sec_type' => 'journey' ],
			] );
		}

		foreach ( [ 'sec_phone' => __( 'Phone field', 'refraction' ), 'sec_email' => __( 'Email field', 'refraction' ) ] as $key => $label ) {
			$repeater->add_control( $key, [
				'label' => esc_html( $label ),
				'type' => Controls_Manager::SELECT,
				'options' => $fields,
				'default' => '',
				'condition' => [ 'sec_type' => 'person' ],
			] );
		}

		$this->add_control( 'sections', [
			'label' => esc_html__( 'Sections (drag to reorder)', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $repeater->get_controls(),
			'title_field' => '{{{ sec_label || sec_type }}}',
			'default' => [
				[ 'sec_type' => 'status', 'sec_label' => esc_html__( 'Status', 'refraction' ) ],
				[ 'sec_type' => 'journey', 'sec_label' => esc_html__( 'Journey', 'refraction' ) ],
				[ 'sec_type' => 'person', 'sec_label' => esc_html__( 'Customer', 'refraction' ) ],
				[ 'sec_type' => 'heading', 'sec_label' => esc_html__( 'Fare', 'refraction' ) ],
				[ 'sec_type' => 'field', 'sec_label' => esc_html__( 'Total', 'refraction' ), 'sec_look' => 'total' ],
			],
		] );

		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls(): void {
		$this->start_controls_section( 'section_style', [ 'label' => esc_html__( 'Details', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_control( 'accent', [
			'label' => esc_html__( 'Accent color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-rec-accent: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'title_type',
			'label' => esc_html__( 'Title', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-rd-title',
		] );

		$this->add_control( 'title_color', [
			'label' => esc_html__( 'Title color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-rd-title' => 'color: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'heading_type',
			'label' => esc_html__( 'Headings', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-rd-heading',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'label_type',
			'label' => esc_html__( 'Labels', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-rd-label',
		] );

		$this->add_control( 'label_color', [
			'label' => esc_html__( 'Labels color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--rf-rd-label: {{VALUE}};' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'value_type',
			'label' => esc_html__( 'Values', 'refraction' ),
			'selector' => '{{WRAPPER}} .rf-rd-value',
		] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Space between sections', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'selectors' => [ '{{WRAPPER}}' => '--rf-rd-gap: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'button_radius', [
			'label' => esc_html__( 'Button radius', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 30 ] ],
			'selectors' => [ '{{WRAPPER}}' => '--rf-rd-btn-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->end_controls_section();
	}

	private function config( array $s ): array {
		$secs = [];

		foreach ( (array) ( $s['sections'] ?? [] ) as $sec ) {
			$secs[] = [
				't' => (string) ( $sec['sec_type'] ?? 'field' ),
				'label' => (string) ( $sec['sec_label'] ?? '' ),
				'f' => (string) ( $sec['sec_field'] ?? '' ),
				'look' => in_array( $sec['sec_look'] ?? '', [ 'strong', 'row', 'money', 'total', 'badge' ], true ) ? $sec['sec_look'] : 'plain',
				'w' => 'half' === ( $sec['sec_width'] ?? '' ) ? 'half' : 'full',
				'from' => (string) ( $sec['sec_from'] ?? '' ),
				'stops' => (string) ( $sec['sec_stops'] ?? '' ),
				'to' => (string) ( $sec['sec_to'] ?? '' ),
				'phone' => (string) ( $sec['sec_phone'] ?? '' ),
				'email' => (string) ( $sec['sec_email'] ?? '' ),
			];
		}

		return [
			'c' => (string) ( $s['collection'] ?? '' ),
			'a' => array_key_exists( (string) ( $s['access'] ?? '' ), Records_View::access_options() ) ? $s['access'] : 'admins',
			'tf' => (string) ( $s['title_field'] ?? '_title' ),
			'booked' => 'yes' === ( $s['show_booked'] ?? '' ) ? 'yes' : 'no',
			'bl' => (string) ( $s['booked_label'] ?? '' ),
			'admin' => 'yes' === ( $s['admin_link'] ?? '' ) ? 'yes' : 'no',
			'secs' => $secs,
		];
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$config = $this->config( $s );
		$definition = '' !== $config['c'] ? Records_View::collections()->get( $config['c'] ) : null;
		$editor = Plugin::$instance->editor && Plugin::$instance->editor->is_edit_mode();

		if ( ! $definition ) {
			if ( $editor ) {
				echo '<div class="rf-rec-placeholder">' . esc_html__( 'Record Details: choose a collection in Content > Record.', 'refraction' ) . '</div>';
			}

			return;
		}

		if ( ! Records_View::can_view( $config['a'] ) ) {
			return;
		}

		$signed = Records_View::sign( $config );
		$record = null;
		$asked = isset( $_GET['record'] ) ? absint( $_GET['record'] ) : 0; // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read only, access checked.

		if ( $asked ) {
			$record = Records_View::records()->get( $asked, $definition['slug'] );
		} elseif ( $editor ) {
			$record = Records_View::latest( $definition );
		}

		$this->add_render_attribute( 'wrap', [
			'class' => 'rf-rd',
			'data-config' => $signed['config'],
			'data-sig' => $signed['sig'],
			'data-collection' => $definition['slug'],
			'data-id' => $record ? (int) $record['id'] : 0,
		] + Records_View::ajax_attributes() );
		?>
		<div <?php $this->print_render_attribute_string( 'wrap' ); ?>>
			<div class="rf-rd__inner" aria-live="polite">
				<?php
				if ( $record ) {
					echo Records_View::details( $definition, $config, $record ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in Records_View::details().
				} else {
					echo '<div class="rf-rd-empty">' . esc_html( (string) ( $s['empty_text'] ?? '' ) ) . '</div>';
				}
				?>
			</div>
			<div class="rf-rd__error" role="alert" hidden></div>
		</div>
		<?php
	}
}
