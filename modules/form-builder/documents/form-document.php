<?php
namespace Refraction\Modules\FormBuilder\Documents;

use Refraction\Controls_Manager;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Classes\Money;
use Refraction\Modules\FormBuilder\Classes\Schema;
use Refraction\Modules\FormBuilder\Classes\Settings;
use Refraction\Modules\Library\Documents\Library_Document;
use Refraction\Plugin;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A Form: a page you build in the editor with the Form Builder fields and the editor's own layout and content widgets.
 * Its settings (the cog) hold everything form-wide: names, statuses, submit, notifications, availability, currency and
 * the form's look. On save the field widgets are turned into a collection (see Classes\Editor_Forms), so records,
 * validation, exports and the [refraction_form] shortcode work as for any collection.
 */
class Form_Document extends Library_Document {

	const TYPE = 'rfb-form';

	public static function get_type() {
		return self::TYPE;
	}

	public static function get_title() {
		return esc_html__( 'Form', 'refraction' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Forms', 'refraction' );
	}

	public static function get_add_new_title() {
		return esc_html__( 'Add New Form', 'refraction' );
	}

	public static function get_properties() {
		$properties = parent::get_properties();

		$properties['support_kit'] = true;
		$properties['show_in_library'] = false;
		$properties['show_in_finder'] = false;

		return $properties;
	}

	/** The Form Builder fields come first in the panel: this page is for building a form. */
	protected static function get_editor_panel_categories() {
		$categories = parent::get_editor_panel_categories();

		if ( isset( $categories[ Editor_Forms::CATEGORY ] ) ) {
			$categories = [ Editor_Forms::CATEGORY => $categories[ Editor_Forms::CATEGORY ] ] + $categories;
		}

		return $categories;
	}

	public function get_css_wrapper_selector() {
		return '.refraction-' . $this->get_main_id();
	}

	/** The form's look (colors, inputs, buttons) is written as variables on this container, which also gets the form styles. */
	public function get_container_attributes() {
		$attributes = parent::get_container_attributes();
		$attributes['class'] = trim( ( $attributes['class'] ?? '' ) . ' rfb-front rfb-editor-form' );

		return $attributes;
	}

	/**
	 * A form is printed live every time, never from the page cache: its fields carry the visitor's answers and errors,
	 * and a Group or Repeater row names the fields inside it while it prints them.
	 */
	public function print_elements( $elements_data ) {
		$this->do_print_elements( $elements_data );
	}

	protected function register_controls() {
		parent::register_controls();

		$this->register_form_controls();
		$this->register_submit_controls();
		$this->register_notify_controls();
		$this->register_access_controls();
		$this->register_currency_controls();
		$this->register_style_controls();
	}

	private function register_form_controls(): void {
		$this->start_controls_section( 'rfb_form', [ 'label' => esc_html__( 'Form', 'refraction' ), 'tab' => Controls_Manager::TAB_SETTINGS ] );

		$this->add_control( 'rfb_singular', [
			'label' => esc_html__( 'Name of one record', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'Booking', 'refraction' ),
			'description' => esc_html__( 'The form title above is the name of the collection in Refraction > Builder.', 'refraction' ),
		] );
		$this->add_control( 'rfb_description', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::TEXT ] );
		$this->add_control( 'rfb_success_message', [
			'label' => esc_html__( 'Message after sending', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'default' => Schema::t( 'Thank you. We received your submission.' ),
		] );
		$this->add_control( 'rfb_public_form', [
			'label' => esc_html__( 'Accept submissions from visitors', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );
		$this->add_control( 'rfb_public_list', [
			'label' => esc_html__( 'Show records publicly (list)', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
		] );

		$statuses = new Repeater();
		$statuses->add_control( 'label', [ 'label' => esc_html__( 'Label', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'New', 'refraction' ) ] );
		$statuses->add_control( 'color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'primary',
			'options' => array_combine( Schema::COLORS, array_map( 'ucfirst', Schema::COLORS ) ),
		] );
		$this->add_control( 'rfb_statuses', [
			'label' => esc_html__( 'Statuses', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $statuses->get_controls(),
			'title_field' => '{{{ label }}}',
			'default' => [ [ 'label' => esc_html__( 'New', 'refraction' ), 'color' => 'primary' ], [ 'label' => esc_html__( 'Done', 'refraction' ), 'color' => 'success' ] ],
		] );

		$this->end_controls_section();
	}

	private function register_submit_controls(): void {
		$d = Settings::defaults();
		$this->start_controls_section( 'rfb_submit', [ 'label' => esc_html__( 'Submit and steps', 'refraction' ), 'tab' => Controls_Manager::TAB_SETTINGS ] );
		$this->add_control( 'rfb_submit_text', [ 'label' => esc_html__( 'Submit button text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => $d['submit_text'], 'description' => esc_html__( 'Used when the form has no Submit button widget.', 'refraction' ) ] );
		$this->add_control( 'rfb_next_text', [ 'label' => esc_html__( 'Next button text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => $d['next_text'] ] );
		$this->add_control( 'rfb_back_text', [ 'label' => esc_html__( 'Back button text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => $d['back_text'] ] );
		$this->add_control( 'rfb_progress', [
			'label' => esc_html__( 'Step progress', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'steps',
			'options' => [ 'steps' => esc_html__( 'Numbered steps', 'refraction' ), 'bar' => esc_html__( 'Bar', 'refraction' ), 'none' => esc_html__( 'None', 'refraction' ) ],
		] );
		$this->add_control( 'rfb_redirect_url', [ 'label' => esc_html__( 'Go to this address after sending', 'refraction' ), 'type' => Controls_Manager::URL, 'options' => false ] );
		$this->end_controls_section();
	}

	private function register_notify_controls(): void {
		$this->start_controls_section( 'rfb_notify', [ 'label' => esc_html__( 'Notifications', 'refraction' ), 'tab' => Controls_Manager::TAB_SETTINGS ] );
		$this->add_control( 'rfb_notify_enabled', [ 'label' => esc_html__( 'Email me new records', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'rfb_notify_to', [ 'label' => esc_html__( 'Send to', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'you@example.com', 'description' => esc_html__( 'Up to five addresses, separated by commas.', 'refraction' ), 'condition' => [ 'rfb_notify_enabled' => 'yes' ] ] );
		$this->add_control( 'rfb_notify_subject', [ 'label' => esc_html__( 'Subject', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'rfb_notify_enabled' => 'yes' ] ] );
		$this->add_control( 'rfb_reply_to_field', [ 'label' => esc_html__( 'Reply to the address in field (key)', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'email', 'condition' => [ 'rfb_notify_enabled' => 'yes' ] ] );
		$this->add_control( 'rfb_webhook_url', [ 'label' => esc_html__( 'Webhook address', 'refraction' ), 'type' => Controls_Manager::URL, 'options' => false, 'description' => esc_html__( 'Each new record is sent there as JSON.', 'refraction' ) ] );
		$this->end_controls_section();
	}

	private function register_access_controls(): void {
		$d = Settings::defaults();
		$this->start_controls_section( 'rfb_access', [ 'label' => esc_html__( 'Availability and spam', 'refraction' ), 'tab' => Controls_Manager::TAB_SETTINGS ] );
		$this->add_control( 'rfb_require_login', [ 'label' => esc_html__( 'Only logged-in visitors', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'rfb_opens', [ 'label' => esc_html__( 'Opens', 'refraction' ), 'type' => Controls_Manager::DATE_TIME ] );
		$this->add_control( 'rfb_closes', [ 'label' => esc_html__( 'Closes', 'refraction' ), 'type' => Controls_Manager::DATE_TIME ] );
		$this->add_control( 'rfb_max_submissions', [ 'label' => esc_html__( 'Stop after this many records (0 = no limit)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'default' => 0 ] );
		$this->add_control( 'rfb_closed_message', [ 'label' => esc_html__( 'Message when closed', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => $d['closed_message'] ] );
		$this->add_control( 'rfb_honeypot', [ 'label' => esc_html__( 'Hidden trap field for bots', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'separator' => 'before' ] );
		$this->add_control( 'rfb_min_seconds', [ 'label' => esc_html__( 'Minimum seconds to fill in', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 60, 'default' => $d['min_seconds'] ] );
		$this->add_control( 'rfb_hourly_limit', [ 'label' => esc_html__( 'Records per visitor per hour (0 = no limit)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 1000, 'default' => $d['hourly_limit'] ] );
		$this->end_controls_section();
	}

	private function register_currency_controls(): void {
		$m = Money::defaults();
		$this->start_controls_section( 'rfb_currency', [ 'label' => esc_html__( 'Currency', 'refraction' ), 'tab' => Controls_Manager::TAB_SETTINGS ] );
		$this->add_control( 'rfb_currency_symbol', [ 'label' => esc_html__( 'Currency symbol', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => $m['currency_symbol'] ] );
		$this->add_control( 'rfb_currency_position', [ 'label' => esc_html__( 'Symbol position', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => $m['currency_position'], 'options' => [ 'before' => esc_html__( 'Before the amount', 'refraction' ), 'after' => esc_html__( 'After the amount', 'refraction' ) ] ] );
		$this->add_control( 'rfb_thousands_sep', [ 'label' => esc_html__( 'Thousands separator', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => $m['thousands_sep'], 'options' => [ ',' => esc_html__( 'Comma (1,200)', 'refraction' ), '.' => esc_html__( 'Point (1.200)', 'refraction' ), ' ' => esc_html__( 'Space (1 200)', 'refraction' ), '' => esc_html__( 'None (1200)', 'refraction' ) ] ] );
		$this->add_control( 'rfb_decimal_sep', [ 'label' => esc_html__( 'Decimal separator', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => $m['decimal_sep'], 'options' => [ '.' => esc_html__( 'Point (350.45)', 'refraction' ), ',' => esc_html__( 'Comma (350,45)', 'refraction' ) ] ] );
		$this->add_control( 'rfb_decimals', [ 'label' => esc_html__( 'Decimal places', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 4, 'default' => $m['decimals'] ] );
		$this->end_controls_section();
	}

	/** Form-wide look: written as the variables every field reads, so a field's own Style tab still wins. */
	private function register_style_controls(): void {
		$var = static function ( string $name, string $unit = '' ): array {
			return [ '{{WRAPPER}}.rfb-front, {{WRAPPER}} .rfb-front' => $name . ': {{VALUE}}' . $unit . ';' ];
		};
		$size = static function ( string $name ): array {
			return [ '{{WRAPPER}}.rfb-front, {{WRAPPER}} .rfb-front' => $name . ': {{SIZE}}{{UNIT}};' ];
		};

		$this->start_controls_section( 'rfb_style_colors', [ 'label' => esc_html__( 'Form colors', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		foreach ( [
			'primary' => [ '--rfb-primary', esc_html__( 'Main color', 'refraction' ) ],
			'text' => [ '--rfb-ink', esc_html__( 'Text', 'refraction' ) ],
			'label' => [ '--rfb-label', esc_html__( 'Labels', 'refraction' ) ],
			'muted' => [ '--rfb-muted', esc_html__( 'Help text', 'refraction' ) ],
			'input_bg' => [ '--rfb-input-bg', esc_html__( 'Input background', 'refraction' ) ],
			'input_border' => [ '--rfb-input-border', esc_html__( 'Input border', 'refraction' ) ],
			'input_text' => [ '--rfb-input-text', esc_html__( 'Input text', 'refraction' ) ],
			'focus' => [ '--rfb-focus', esc_html__( 'Focus ring', 'refraction' ) ],
			'error' => [ '--rfb-error', esc_html__( 'Errors', 'refraction' ) ],
			'button_bg' => [ '--rfb-button-bg', esc_html__( 'Button', 'refraction' ) ],
			'button_text' => [ '--rfb-button-text', esc_html__( 'Button text', 'refraction' ) ],
		] as $key => $spec ) {
			$this->add_control( 'rfb_c_' . $key, [ 'label' => $spec[1], 'type' => Controls_Manager::COLOR, 'selectors' => $var( $spec[0] ) ] );
		}
		$this->end_controls_section();

		$this->start_controls_section( 'rfb_style_sizes', [ 'label' => esc_html__( 'Form sizes', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		foreach ( [
			'radius' => [ '--rfb-radius', esc_html__( 'Corner radius', 'refraction' ), 40 ],
			'input_height' => [ '--rfb-input-height', esc_html__( 'Input height', 'refraction' ), 80 ],
			'font_size' => [ '--rfb-font-size', esc_html__( 'Input text size', 'refraction' ), 30 ],
			'label_size' => [ '--rfb-label-size', esc_html__( 'Label size', 'refraction' ), 30 ],
			'gap' => [ '--rfb-gap', esc_html__( 'Space between fields', 'refraction' ), 80 ],
		] as $key => $spec ) {
			$this->add_responsive_control( 'rfb_s_' . $key, [
				'label' => $spec[1],
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => $spec[2] ] ],
				'selectors' => $size( $spec[0] ),
			] );
		}
		$this->end_controls_section();
	}

	/** The definition this page saves into: form-wide values from the cog, fields from the widgets (filled in by Editor_Forms). */
	public function form_settings(): array {
		$s = (array) $this->get_settings();
		$yes = static function ( $value ): bool {
			return 'yes' === $value || true === $value;
		};
		$url = static function ( $value ): string {
			return is_array( $value ) ? (string) ( $value['url'] ?? '' ) : (string) $value;
		};

		return [
			'settings' => [
				'submit_text' => $s['rfb_submit_text'] ?? '',
				'next_text' => $s['rfb_next_text'] ?? '',
				'back_text' => $s['rfb_back_text'] ?? '',
				'progress' => $s['rfb_progress'] ?? 'steps',
				'redirect_url' => $url( $s['rfb_redirect_url'] ?? '' ),
				'notify_enabled' => $yes( $s['rfb_notify_enabled'] ?? '' ),
				'notify_to' => $s['rfb_notify_to'] ?? '',
				'notify_subject' => $s['rfb_notify_subject'] ?? '',
				'reply_to_field' => $s['rfb_reply_to_field'] ?? '',
				'webhook_url' => $url( $s['rfb_webhook_url'] ?? '' ),
				'require_login' => $yes( $s['rfb_require_login'] ?? '' ),
				'opens' => substr( (string) ( $s['rfb_opens'] ?? '' ), 0, 16 ),
				'closes' => substr( (string) ( $s['rfb_closes'] ?? '' ), 0, 16 ),
				'max_submissions' => $s['rfb_max_submissions'] ?? 0,
				'closed_message' => $s['rfb_closed_message'] ?? '',
				'honeypot' => $yes( $s['rfb_honeypot'] ?? 'yes' ),
				'min_seconds' => $s['rfb_min_seconds'] ?? 3,
				'hourly_limit' => $s['rfb_hourly_limit'] ?? 10,
				'currency_symbol' => $s['rfb_currency_symbol'] ?? '$',
				'currency_position' => $s['rfb_currency_position'] ?? 'before',
				'thousands_sep' => $s['rfb_thousands_sep'] ?? ',',
				'decimal_sep' => $s['rfb_decimal_sep'] ?? '.',
				'decimals' => $s['rfb_decimals'] ?? 2,
			],
			'singular' => $s['rfb_singular'] ?? '',
			'description' => $s['rfb_description'] ?? '',
			'success_message' => $s['rfb_success_message'] ?? '',
			'public_form' => $yes( $s['rfb_public_form'] ?? 'yes' ),
			'public_list' => $yes( $s['rfb_public_list'] ?? '' ),
			'statuses' => array_map( static function ( $row ) {
				return [ 'label' => $row['label'] ?? '', 'color' => $row['color'] ?? 'primary' ];
			}, (array) ( $s['rfb_statuses'] ?? [] ) ),
		];
	}

	/** Shown in the editor preview: the current document's money format, for Amount fields. */
	public static function current(): ?self {
		$document = Plugin::$instance->documents->get_current();

		return $document instanceof self ? $document : null;
	}
}
