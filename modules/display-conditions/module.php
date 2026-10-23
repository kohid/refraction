<?php
namespace Refraction\Modules\DisplayConditions;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\DocumentTypes\PageBase;
use Refraction\Core\Kits\Documents\Kit;
use Refraction\Core\Utils\Icons;
use Refraction\Element_Base;
use Refraction\Modules\DisplayConditions\Classes\Condition_Evaluator;
use Refraction\Modules\DisplayConditions\Classes\Wp_Context;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Display Conditions per element (Advanced tab). Evaluated on the server: an element that does not match is not in
 * the HTML at all. See docs/refraction/extras-a.md.
 */
class Module extends BaseModule {

	const ITEMS = 'refraction_dc_items';
	const LOGIC = 'refraction_dc_logic';
	const MODE = 'refraction_dc_mode';
	const EDITOR_SHOW = 'refraction_dc_editor_show';

	public function get_name() {
		return 'display-conditions';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/element/after_section_end', [ $this, 'register_element_section' ], 10, 2 );
		add_action( 'refraction/documents/register_controls', [ $this, 'register_document_control' ] );
		add_filter( 'refraction/frontend/should_print_element', [ $this, 'should_print' ], 10, 2 );
		add_filter( 'refraction/element/is_dynamic_content', [ $this, 'is_dynamic' ], 10, 2 );
		add_action( 'refraction/editor/before_enqueue_scripts', [ $this, 'enqueue_editor_assets' ] );
		add_action( 'refraction/preview/enqueue_styles', [ $this, 'enqueue_preview_styles' ] );
	}

	public function register_element_section( $element, $section_id ) {
		if ( '_section_responsive' !== $section_id || $element->get_controls( self::ITEMS ) ) {
			return;
		}

		$element->start_controls_section(
			'section_display_conditions',
			[
				'label' => esc_html__( 'Display Conditions', 'refraction' ),
				'tab' => Controls_Manager::TAB_ADVANCED,
			]
		);

		$element->add_control(
			self::MODE,
			[
				'label' => esc_html__( 'When the conditions are met', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'show',
				'options' => [
					'show' => esc_html__( 'Show this element', 'refraction' ),
					'hide' => esc_html__( 'Hide this element', 'refraction' ),
				],
				'render_type' => 'ui',
			]
		);

		$element->add_control(
			self::LOGIC,
			[
				'label' => esc_html__( 'Conditions are met when', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'and',
				'options' => [
					'and' => esc_html__( 'All of them match (AND)', 'refraction' ),
					'or' => esc_html__( 'Any of them matches (OR)', 'refraction' ),
				],
				'render_type' => 'ui',
			]
		);

		$repeater = new \Refraction\Repeater();

		$repeater->add_control( 'dc_type', [
			'label' => esc_html__( 'Condition', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'logged_in',
			'options' => $this->get_type_options(),
		] );

		$repeater->add_control( 'dc_op', [
			'label' => esc_html__( 'Is', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'is',
			'options' => [
				'is' => esc_html__( 'True', 'refraction' ),
				'is_not' => esc_html__( 'Not true', 'refraction' ),
			],
		] );

		$select2 = static function ( string $name, string $label, array $options, array $types ) use ( $repeater ) {
			$repeater->add_control( $name, [
				'label' => $label,
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'options' => $options,
				'label_block' => true,
				'condition' => [ 'dc_type' => $types ],
			] );
		};

		$roles = [];
		foreach ( wp_roles()->get_names() as $slug => $name ) {
			$roles[ $slug ] = translate_user_role( $name );
		}

		$post_types = [];
		foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $slug => $type ) {
			$post_types[ $slug ] = $type->labels->singular_name;
		}

		$select2( 'dc_roles', esc_html__( 'Roles', 'refraction' ), $roles, [ 'user_role' ] );
		$select2( 'dc_post_types', esc_html__( 'Post types', 'refraction' ), $post_types, [ 'post_type' ] );
		$select2( 'dc_devices', esc_html__( 'Devices', 'refraction' ), [
			'mobile' => esc_html__( 'Mobile', 'refraction' ),
			'tablet' => esc_html__( 'Tablet', 'refraction' ),
			'desktop' => esc_html__( 'Desktop', 'refraction' ),
		], [ 'device' ] );
		$select2( 'dc_days', esc_html__( 'Days', 'refraction' ), [
			'mon' => esc_html__( 'Monday', 'refraction' ),
			'tue' => esc_html__( 'Tuesday', 'refraction' ),
			'wed' => esc_html__( 'Wednesday', 'refraction' ),
			'thu' => esc_html__( 'Thursday', 'refraction' ),
			'fri' => esc_html__( 'Friday', 'refraction' ),
			'sat' => esc_html__( 'Saturday', 'refraction' ),
			'sun' => esc_html__( 'Sunday', 'refraction' ),
		], [ 'day_of_week' ] );

		$repeater->add_control( 'dc_value', [
			'label' => esc_html__( 'Value', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
			'condition' => [ 'dc_type' => [ 'user', 'post', 'term', 'author', 'url_param', 'cookie', 'referrer', 'language' ] ],
			'description' => esc_html__( 'Separate several values with commas. Terms: taxonomy:slug. URL parameter and cookie: name or name=value. Language: en or en-US.', 'refraction' ),
		] );

		$repeater->add_control( 'dc_from', [
			'label' => esc_html__( 'From (site time)', 'refraction' ),
			'type' => Controls_Manager::DATE_TIME,
			'condition' => [ 'dc_type' => 'date_range' ],
		] );

		$repeater->add_control( 'dc_to', [
			'label' => esc_html__( 'Until (site time)', 'refraction' ),
			'type' => Controls_Manager::DATE_TIME,
			'condition' => [ 'dc_type' => 'date_range' ],
		] );

		$repeater->add_control( 'dc_time_from', [
			'label' => esc_html__( 'From time (HH:MM)', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => '09:00',
			'condition' => [ 'dc_type' => 'time_of_day' ],
		] );

		$repeater->add_control( 'dc_time_to', [
			'label' => esc_html__( 'Until time (HH:MM)', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => '17:30',
			'condition' => [ 'dc_type' => 'time_of_day' ],
		] );

		$element->add_control(
			self::ITEMS,
			[
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'title_field' => '{{{ dc_type.replace( /_/g, " " ) }}}',
				'prevent_empty' => false,
				'render_type' => 'ui',
				'button_text' => esc_html__( 'Add condition', 'refraction' ),
			]
		);

		$element->add_control(
			'refraction_dc_note',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'Checked on the server for every visitor: an element that does not match is not in the page HTML. Device and language are approximate. In the editor every element stays visible and shows a badge.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);

		$element->end_controls_section();
	}

	private function get_type_options(): array {
		return [
			'logged_in' => esc_html__( 'Logged in', 'refraction' ),
			'user_role' => esc_html__( 'User role', 'refraction' ),
			'user' => esc_html__( 'Specific user (ID or login)', 'refraction' ),
			'post_type' => esc_html__( 'Post type', 'refraction' ),
			'post' => esc_html__( 'Page or post (ID)', 'refraction' ),
			'term' => esc_html__( 'Taxonomy term', 'refraction' ),
			'author' => esc_html__( 'Author (ID)', 'refraction' ),
			'date_range' => esc_html__( 'Date range', 'refraction' ),
			'time_of_day' => esc_html__( 'Time of day', 'refraction' ),
			'day_of_week' => esc_html__( 'Day of the week', 'refraction' ),
			'url_param' => esc_html__( 'URL parameter', 'refraction' ),
			'cookie' => esc_html__( 'Cookie', 'refraction' ),
			'referrer' => esc_html__( 'Referrer contains', 'refraction' ),
			'device' => esc_html__( 'Device (approximate)', 'refraction' ),
			'language' => esc_html__( 'Browser language', 'refraction' ),
		];
	}

	public function register_document_control( $document ) {
		if ( ! $document instanceof PageBase || $document instanceof Kit ) {
			return;
		}

		$document->start_controls_section(
			'section_display_conditions_editor',
			[
				'label' => esc_html__( 'Display Conditions', 'refraction' ),
				'tab' => Controls_Manager::TAB_ADVANCED,
			]
		);

		$document->add_control(
			self::EDITOR_SHOW,
			[
				'label' => esc_html__( 'Show elements with conditions', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'render_type' => 'ui',
				'description' => esc_html__( 'Editor only. Turn off to preview the page without the elements that have display conditions.', 'refraction' ),
			]
		);

		$document->end_controls_section();
	}

	/** Turn the saved settings of one element into evaluator input. */
	public static function normalize_items( $rows ): array {
		$items = [];

		foreach ( is_array( $rows ) ? $rows : [] as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$type = (string) ( $row['dc_type'] ?? '' );
			$list = static fn( $v ) => is_array( $v ) ? implode( ',', array_map( 'strval', $v ) ) : (string) $v;
			$value = (string) ( $row['dc_value'] ?? '' );

			switch ( $type ) {
				case 'user_role':
					$value = $list( $row['dc_roles'] ?? '' );
					break;
				case 'post_type':
					$value = $list( $row['dc_post_types'] ?? '' );
					break;
				case 'device':
					$value = $list( $row['dc_devices'] ?? '' );
					break;
				case 'day_of_week':
					$value = $list( $row['dc_days'] ?? '' );
					break;
			}

			$item = [ 'type' => $type, 'op' => 'is_not' === ( $row['dc_op'] ?? '' ) ? 'is_not' : 'is', 'value' => $value ];

			if ( 'date_range' === $type ) {
				$item['from'] = (string) ( $row['dc_from'] ?? '' );
				$item['to'] = (string) ( $row['dc_to'] ?? '' );
			} elseif ( 'time_of_day' === $type ) {
				$item['from'] = (string) ( $row['dc_time_from'] ?? '' );
				$item['to'] = (string) ( $row['dc_time_to'] ?? '' );
			}

			$items[] = $item;
		}

		return $items;
	}

	private function in_editor(): bool {
		$plugin = Plugin::$instance;

		return $plugin->editor->is_edit_mode() || $plugin->preview->is_preview_mode();
	}

	public function should_print( $should, $element ) {
		if ( ! $should || ! $element instanceof Element_Base || $this->in_editor() ) {
			return $should;
		}

		$settings = $element->get_settings();

		if ( empty( $settings[ self::ITEMS ] ) ) {
			return $should;
		}

		$logic = 'or' === ( $settings[ self::LOGIC ] ?? '' ) ? 'or' : 'and';
		$mode = 'hide' === ( $settings[ self::MODE ] ?? '' ) ? 'hide' : 'show';

		return Condition_Evaluator::is_visible( self::normalize_items( $settings[ self::ITEMS ] ), $logic, $mode, new Wp_Context() );
	}

	/** A conditioned element depends on the visitor, so the element cache must render it per request. */
	public function is_dynamic( $is_dynamic, $raw_data ) {
		return $is_dynamic || ! empty( $raw_data['settings'][ self::ITEMS ] );
	}

	public function enqueue_editor_assets() {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_script( 'refraction-display-conditions-editor', REFRACTION_ASSETS_URL . 'js/display-conditions-editor' . $suffix . '.js', [ 'refraction-editor' ], REFRACTION_VERSION, true );
	}

	public function enqueue_preview_styles() {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_style( 'refraction-display-conditions-preview', REFRACTION_ASSETS_URL . 'css/modules/display-conditions/preview' . $suffix . '.css', [], REFRACTION_VERSION );
		wp_add_inline_style( 'refraction-display-conditions-preview', ':root{--refraction-dc-icon:url("' . esc_url_raw( Icons::url( 'visibility' ) ) . '")}' );
	}
}
