<?php
namespace Refraction\Modules\FormBuilder\Base;

use Refraction\Controls_Manager;
use Refraction\Modules\FormBuilder\Classes\Conditions;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * What every Form Builder widget shares, whether it is a plain field (Field_Widget) or holds fields (Group, Repeater):
 * where it shows in the panel, the conditional visibility and records sections of its Advanced tab, and the part of
 * its Builder field those sections fill in.
 */
trait Field_Settings {

	/**
	 * Every text, number, link and picture setting of a form widget takes Dynamic Tags (0.122.0): the tag button beside
	 * the box, as on the editor's own widgets. Keys, formulas and patterns stay typed: they are read as code.
	 */
	public function add_control( $id, array $args, $options = [] ) {
		if ( ! isset( $args['dynamic'] ) && ! in_array( $id, self::typed_controls(), true ) && in_array( $args['type'] ?? '', [ Controls_Manager::TEXT, Controls_Manager::TEXTAREA, Controls_Manager::NUMBER, Controls_Manager::URL, Controls_Manager::MEDIA, Controls_Manager::WYSIWYG ], true ) ) {
			$args['dynamic'] = [ 'active' => true ];
		}

		return parent::add_control( $id, $args, $options );
	}

	/** Settings read as code, not as text: no Dynamic Tags. */
	protected static function typed_controls(): array {
		return [ 'field_key', 'total_formula', 'total_fields', 'phone_pattern', 'time_min', 'time_max', 'unavailable', 'currency_custom' ];
	}

	public function get_categories() {
		return [ Editor_Forms::CATEGORY ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-form-builder-front' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-form-builder-front' ];
	}

	/** Only offered while you build a Form page: a field means nothing on an ordinary page. */
	public function show_in_panel() {
		$editor = Plugin::$instance->editor;
		$post_id = $editor ? (int) $editor->get_post_id() : 0;

		return ! $post_id || Plugin::$instance->documents->get( $post_id ) instanceof Form_Document;
	}

	/** Advanced tab: show or hide this field depending on other answers (checked again on the server). */
	protected function register_condition_controls(): void {
		$this->start_controls_section( 'section_conditions', [ 'label' => esc_html__( 'Conditional visibility', 'refraction' ), 'tab' => Controls_Manager::TAB_ADVANCED ] );
		$this->add_control( 'cond_enabled', [ 'label' => esc_html__( 'Show or hide depending on other answers', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'cond_action', [
			'label' => esc_html__( 'This field is', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'show',
			'options' => [ 'show' => esc_html__( 'Shown when', 'refraction' ), 'hide' => esc_html__( 'Hidden when', 'refraction' ) ],
			'condition' => [ 'cond_enabled' => 'yes' ],
		] );
		$this->add_control( 'cond_match', [
			'label' => esc_html__( 'Rules to match', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'all',
			'options' => [ 'all' => esc_html__( 'All of them', 'refraction' ), 'any' => esc_html__( 'Any of them', 'refraction' ) ],
			'condition' => [ 'cond_enabled' => 'yes' ],
		] );

		$rule = new Repeater();
		$rule->add_control( 'field', [ 'label' => esc_html__( 'Field key', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'service', 'description' => esc_html__( 'The Field key of the field to look at (Advanced > Records table).', 'refraction' ) ] );
		$rule->add_control( 'op', [ 'label' => esc_html__( 'Condition', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators() ] );
		$rule->add_control( 'value', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'op!' => [ 'empty', 'not_empty' ] ] ] );
		$this->add_control( 'cond_rules', [
			'label' => esc_html__( 'Rules', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $rule->get_controls(),
			'title_field' => '{{{ field }}} {{{ op }}} {{{ value }}}',
			'default' => [],
			'condition' => [ 'cond_enabled' => 'yes' ],
		] );
		$this->end_controls_section();
	}

	/** Advanced tab: the key answers are saved under, and how they show in Refraction > Builder and the public list. */
	protected function register_record_controls( bool $table = false, bool $filter = false ): void {
		$this->start_controls_section( 'section_records', [ 'label' => esc_html__( 'Records table', 'refraction' ), 'tab' => Controls_Manager::TAB_ADVANCED ] );
		$this->add_control( 'field_key', [
			'label' => esc_html__( 'Field key', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'description' => esc_html__( 'Used in exports, rules, notifications and webhooks. Leave empty to make one from the label; once given it does not change, so saved answers keep matching.', 'refraction' ),
		] );

		if ( $table ) {
			$this->add_control( 'in_table', [ 'label' => esc_html__( 'Show as a column in the records table', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
			$this->add_control( 'show_public', [ 'label' => esc_html__( 'Show publicly (in the public list)', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		}

		if ( $filter ) {
			$this->add_control( 'add_filter', [ 'label' => esc_html__( 'Add a filter above the table', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		}

		$this->end_controls_section();
	}

	/** The parts of a Builder field the shared sections hold. */
	protected function shared_raw(): array {
		$s = $this->get_settings_for_display();
		$rules = [];

		foreach ( (array) ( $s['cond_rules'] ?? [] ) as $rule ) {
			$rules[] = [ 'field' => (string) ( $rule['field'] ?? '' ), 'op' => (string) ( $rule['op'] ?? 'equals' ), 'value' => (string) ( $rule['value'] ?? '' ) ];
		}

		return [
			'key' => (string) ( $s['field_key'] ?? '' ),
			'label' => (string) ( $s['field_label'] ?? '' ),
			'hide_label' => 'yes' === ( $s['hide_label'] ?? '' ),
			'description' => (string) ( $s['field_description'] ?? '' ),
			'in_table' => 'yes' === ( $s['in_table'] ?? '' ),
			'public' => 'yes' === ( $s['show_public'] ?? '' ),
			'filter' => 'yes' === ( $s['add_filter'] ?? '' ),
			'conditions' => [ 'enabled' => 'yes' === ( $s['cond_enabled'] ?? '' ), 'action' => $s['cond_action'] ?? 'show', 'match' => $s['cond_match'] ?? 'all', 'rules' => $rules ],
		];
	}
}
