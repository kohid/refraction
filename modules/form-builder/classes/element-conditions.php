<?php
namespace Refraction\Modules\FormBuilder\Classes;

use Refraction\Controls_Manager;
use Refraction\Element_Base;
use Refraction\Modules\FormBuilder\Base\Form_Field;
use Refraction\Plugin;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Conditional visibility for every element of a Form page (0.124.0): a heading, a picture, a container of fields can be
 * shown, hidden or disabled by the answers, with the same rules as a field (Advanced > Conditional visibility). The
 * element carries its rules as data-rfb-cond for the form's script; the fields inside it get the rules as "guards",
 * so the server does not ask for, or keep, an answer the visitor could not give.
 */
class Element_Conditions {

	const PREFIX = 'rfb_el_cond_';

	/** Elements whose Advanced tab gets the section (widgets through their common controls). */
	const HOSTS = [ 'common', 'common-optimized', 'container', 'section', 'column' ];

	public static function boot(): void {
		add_action( 'refraction/element/after_section_end', [ self::class, 'register' ], 20, 2 );
		add_action( 'refraction/frontend/before_render', [ self::class, 'add_rules' ] );
	}

	/** Advanced > Conditional visibility, after Responsive (widgets, containers). */
	public static function register( $element, $section_id ): void {
		if ( '_section_responsive' !== $section_id || ! in_array( $element->get_name(), self::HOSTS, true ) || $element->get_controls( self::PREFIX . 'enabled' ) ) {
			return;
		}

		self::controls( $element, self::PREFIX, 'section_rfb_conditions' );
	}

	/**
	 * The controls of Conditional visibility, on a field ('cond_', Base\Field_Settings) or any element (PREFIX).
	 *
	 * @param \Refraction\Controls_Stack $stack The element or widget.
	 */
	public static function controls( $stack, string $prefix, string $section ): void {
		$on = [ $prefix . 'enabled' => 'yes' ];

		$stack->start_controls_section( $section, [ 'label' => esc_html__( 'Conditional visibility', 'refraction' ), 'tab' => Controls_Manager::TAB_ADVANCED ] );
		$stack->add_control( $prefix . 'enabled', [ 'label' => esc_html__( 'Show or hide depending on other answers', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$stack->add_control( $prefix . 'action', [
			'label' => 'cond_' === $prefix ? esc_html__( 'This field is', 'refraction' ) : esc_html__( 'This element is', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'show',
			'options' => [ 'show' => esc_html__( 'Shown when', 'refraction' ), 'hide' => esc_html__( 'Hidden when', 'refraction' ), 'disable' => esc_html__( 'Disabled when', 'refraction' ) ],
			'description' => esc_html__( 'Disabled: it stays in view, greyed, and can not be answered.', 'refraction' ),
			'condition' => $on,
		] );
		$stack->add_control( $prefix . 'match', [
			'label' => esc_html__( 'Rules to match', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'all',
			'options' => [ 'all' => esc_html__( 'All of them', 'refraction' ), 'any' => esc_html__( 'Any of them', 'refraction' ) ],
			'condition' => $on,
		] );

		$rule = new Repeater();
		$rule->add_control( 'field', [ 'label' => esc_html__( 'Field key', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'service', 'description' => esc_html__( 'The Field key of the field to look at (Advanced > Records table).', 'refraction' ) ] );
		$rule->add_control( 'op', [ 'label' => esc_html__( 'Condition', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators() ] );
		$rule->add_control( 'value', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'op!' => [ 'empty', 'not_empty' ] ] ] );
		$stack->add_control( $prefix . 'rules', [
			'label' => esc_html__( 'Rules', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $rule->get_controls(),
			'title_field' => '{{{ field }}} {{{ op }}} {{{ value }}}',
			'default' => [],
			'condition' => $on,
		] );
		$stack->end_controls_section();
	}

	/** The cleaned rules of a settings array with the given prefix (disabled or empty: enabled false). */
	public static function of( array $settings, string $prefix = self::PREFIX ): array {
		$rules = [];

		foreach ( (array) ( $settings[ $prefix . 'rules' ] ?? [] ) as $rule ) {
			if ( is_array( $rule ) ) {
				$rules[] = [ 'field' => (string) ( $rule['field'] ?? '' ), 'op' => (string) ( $rule['op'] ?? 'equals' ), 'value' => (string) ( $rule['value'] ?? '' ) ];
			}
		}

		return Conditions::clean( [ 'enabled' => 'yes' === ( $settings[ $prefix . 'enabled' ] ?? '' ), 'action' => $settings[ $prefix . 'action' ] ?? 'show', 'match' => $settings[ $prefix . 'match' ] ?? 'all', 'rules' => $rules ] );
	}

	/** On the site, an element with rules carries them for the form's script. */
	public static function add_rules( $element ): void {
		if ( ! $element instanceof Element_Base || $element instanceof Form_Field || Plugin::$instance->editor->is_edit_mode() || Plugin::$instance->preview->is_preview_mode() ) {
			return;
		}

		$conditions = self::of( (array) $element->get_settings() );

		if ( $conditions['enabled'] ) {
			$element->add_render_attribute( '_wrapper', 'data-rfb-cond', (string) wp_json_encode( $conditions ) );
		}
	}

	/**
	 * The rules an element of a saved page puts on the fields inside it (and on itself when it is a field): its
	 * Conditional visibility, and Display Conditions made only of form fields' answers.
	 */
	public static function guards_of( array $element ): array {
		$settings = (array) ( $element['settings'] ?? [] );
		$guards = [];
		$own = self::of( $settings );

		if ( $own['enabled'] ) {
			$guards[] = $own;
		}

		$items = (array) ( $settings['refraction_dc_items'] ?? [] );
		$fields = array_filter( $items, static fn( $row ) => is_array( $row ) && 'form_field' === ( $row['dc_type'] ?? '' ) && '' !== (string) ( $row['dc_field'] ?? '' ) );

		// Only when every Display Condition is a form field's answer: the others are the visitor's (not known on submit).
		if ( $fields && count( $fields ) === count( array_filter( $items, 'is_array' ) ) ) {
			$guard = Conditions::clean( [
				'enabled' => true,
				'action' => 'hide' === ( $settings['refraction_dc_mode'] ?? '' ) ? 'hide' : 'show',
				'match' => 'or' === ( $settings['refraction_dc_logic'] ?? '' ) ? 'any' : 'all',
				'rules' => array_map( static fn( $row ) => [ 'field' => (string) $row['dc_field'], 'op' => (string) ( $row['dc_field_op'] ?? 'equals' ), 'value' => (string) ( $row['dc_value'] ?? '' ) ], array_values( $fields ) ),
			] );

			if ( $guard['enabled'] ) {
				$guards[] = $guard;
			}
		}

		return $guards;
	}
}
