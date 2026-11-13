<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\FormBuilder\Base\Field_Widget;
use Refraction\Modules\FormBuilder\Classes\Conditions;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Form Builder "total" field as an editor widget (0.90.0): an amount worked out from the other answers, shown live
 * and worked out again by the server, which stores it. Rules pick another formula when answers match (the first rule
 * that matches wins), for prices that are not one formula, such as a fixed price for one tour.
 */
class Field_Total extends Field_Widget {

	protected function field_type(): string {
		return 'total';
	}

	public function get_icon() {
		return 'rficon-price-table';
	}

	public function get_keywords() {
		return [ 'form', 'total', 'price', 'calculation', 'formula', 'sum', 'quote' ];
	}

	protected function features(): array {
		return [ 'per' ];
	}

	protected function register_extra_controls(): void {
		$this->add_control( 'total_formula', [
			'label' => esc_html__( 'Formula', 'refraction' ),
			'type' => Controls_Manager::TEXTAREA,
			'rows' => 2,
			'placeholder' => '{vehicle} * {hours}',
			'separator' => 'before',
			'description' => esc_html__( 'Field keys in braces, numbers, + - * / ( ) and min( ), max( ), round( ), ceil( ), floor( ). A field counts as: its number; a choice\'s own number (value|Label|number); the price of the picked choice cards; 1 for a switched-on Yes / No.', 'refraction' ),
		] );

		$rule = new Repeater();
		$rule->add_control( 'field', [ 'label' => esc_html__( 'When field (key)', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'tour' ] );
		$rule->add_control( 'op', [ 'label' => esc_html__( 'Condition', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators() ] );
		$rule->add_control( 'value', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'op!' => [ 'empty', 'not_empty' ] ] ] );
		$rule->add_control( 'field2', [ 'label' => esc_html__( 'And field (key)', 'refraction' ), 'type' => Controls_Manager::TEXT, 'separator' => 'before', 'description' => esc_html__( 'Optional second rule; both must match.', 'refraction' ) ] );
		$rule->add_control( 'op2', [ 'label' => esc_html__( 'Condition', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators() ] );
		$rule->add_control( 'value2', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT ] );
		$rule->add_control( 'formula', [ 'label' => esc_html__( 'Then the formula is', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => '600', 'separator' => 'before', 'description' => esc_html__( 'Empty: no price (the text below shows).', 'refraction' ) ] );

		$this->add_control( 'total_rules', [
			'label' => esc_html__( 'Other formulas when...', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $rule->get_controls(),
			'title_field' => '{{{ field }}} {{{ value }}} → {{{ formula }}}',
			'default' => [],
		] );

		$this->add_control( 'total_none', [
			'label' => esc_html__( 'Text when there is no price', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'We will confirm the price', 'refraction' ),
			'label_block' => true,
		] );
	}

	public function raw_field(): array {
		$s = $this->get_settings();
		$rules = [];

		foreach ( (array) ( $s['total_rules'] ?? [] ) as $row ) {
			$conditions = [];

			foreach ( [ '', '2' ] as $n ) {
				if ( '' !== trim( (string) ( $row[ 'field' . $n ] ?? '' ) ) ) {
					$conditions[] = [ 'field' => (string) $row[ 'field' . $n ], 'op' => (string) ( $row[ 'op' . $n ] ?? 'equals' ), 'value' => (string) ( $row[ 'value' . $n ] ?? '' ) ];
				}
			}

			$rules[] = [ 'conditions' => [ 'enabled' => true, 'action' => 'show', 'match' => 'all', 'rules' => $conditions ], 'formula' => (string) ( $row['formula'] ?? '' ) ];
		}

		return [
			'formula' => (string) ( $s['total_formula'] ?? '' ),
			'rules' => $rules,
			'no_price' => (string) ( $s['total_none'] ?? '' ),
		] + parent::raw_field();
	}
}
