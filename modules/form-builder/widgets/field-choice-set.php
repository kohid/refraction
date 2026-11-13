<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Modules\FormBuilder\Base\Field_Settings;
use Refraction\Modules\FormBuilder\Base\Field_Widget;
use Refraction\Modules\FormBuilder\Base\Form_Field;
use Refraction\Modules\FormBuilder\Classes\Conditions;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Classes\Field_Renderer;
use Refraction\Modules\FormBuilder\Classes\Money;
use Refraction\Modules\FormBuilder\Classes\Schema;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Choice cards: the visitor picks one card (or several). Each card is a container you fill with any widgets (image,
 * heading, badge, price, icon list...). What is saved is the picked card's name and price from the card's settings, never
 * what the visitor could change; fields inside a card are shown but locked.
 */
class Field_Choice_Set extends Widget_Nested_Base implements Form_Field {

	use Field_Settings;

	public function get_name() {
		return Field_Widget::PREFIX . 'choice_set';
	}

	public function get_title() {
		return esc_html__( 'Choice cards', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-price-table';
	}

	public function get_keywords() {
		return [ 'form', 'choice', 'card', 'plan', 'option', 'radio', 'pick' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function card_container( int $index ): array {
		/* translators: %d: Card number. */
		return [ 'elType' => 'container', 'settings' => [ '_title' => sprintf( __( 'Card %d', 'refraction' ), $index ), 'content_width' => 'full', 'flex_gap' => [ 'size' => 6, 'column' => '6', 'row' => '6', 'unit' => 'px' ] ] ];
	}

	protected function get_default_children_elements() {
		return [ $this->card_container( 1 ), $this->card_container( 2 ) ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'card_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Card number. */
		return esc_html__( 'Card %d', 'refraction' );
	}

	protected function get_default_children_placeholder_selector() {
		return '.rfb-cc-list';
	}

	protected function get_default_children_container_placeholder_selector() {
		return '.rfb-choice-card';
	}

	protected function get_initial_config(): array {
		return array_merge( parent::get_initial_config(), [
			'support_improved_repeaters' => true,
			'target_container' => [ '.rfb-cc-list' ],
			'node' => 'div',
			'is_interlaced' => true,
		] );
	}

	private static function positions( bool $inherit ): array {
		$list = [ 'left' => esc_html__( 'Left', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ), 'top-left' => esc_html__( 'Top left corner', 'refraction' ), 'top-right' => esc_html__( 'Top right corner', 'refraction' ), 'hidden' => esc_html__( 'Hidden (the whole card is clickable)', 'refraction' ) ];

		return $inherit ? [ '' => esc_html__( 'Same as the set', 'refraction' ) ] + $list : $list;
	}

	private static function looks( bool $inherit ): array {
		$list = [ 'radio' => esc_html__( 'Radio circle', 'refraction' ), 'tick' => esc_html__( 'Tick badge once picked', 'refraction' ), 'none' => esc_html__( 'None', 'refraction' ) ];

		return $inherit ? [ '' => esc_html__( 'Same as the set', 'refraction' ) ] + $list : $list;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_field', [ 'label' => esc_html__( 'Choice cards', 'refraction' ) ] );
		$this->add_control( 'field_label', [ 'label' => esc_html__( 'Label', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Choose one', 'refraction' ), 'label_block' => true ] );
		$this->add_control( 'hide_label', [ 'label' => esc_html__( 'Hide the label', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'field_required', [ 'label' => esc_html__( 'Required', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'multiple', [ 'label' => esc_html__( 'Visitors can pick several cards', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );

		$card = new Repeater();
		$card->add_control( 'card_title', [ 'label' => esc_html__( 'Card name', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Option', 'refraction' ), 'label_block' => true, 'description' => esc_html__( 'Saved with the record. Show it on the card with a Heading.', 'refraction' ) ] );
		$card->add_control( 'card_price', [ 'label' => esc_html__( 'Price saved with the record', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'step' => 'any', 'description' => esc_html__( 'Leave empty for none. A Price widget in the card shows it.', 'refraction' ) ] );
		$card->add_control( 'card_per', [ 'label' => esc_html__( 'Price period', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => '', 'options' => Money::periods() ] );
		$card->add_control( 'card_per_label', [ 'label' => esc_html__( 'Period text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'card_per' => 'custom' ] ] );
		$card->add_control( 'card_width', [ 'label' => esc_html__( 'Card width', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'auto', 'options' => [ 'auto' => esc_html__( 'Automatic (cards per row)', 'refraction' ) ] + Schema::width_choices() ] );
		$card->add_control( 'card_marker_pos', [ 'label' => esc_html__( 'Pick control position', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => '', 'options' => self::positions( true ) ] );
		$card->add_control( 'card_marker_look', [ 'label' => esc_html__( 'Pick control look', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => '', 'options' => self::looks( true ) ] );
		// 0.90.0: a key of its own (saved with the record, used by rules and prefill) and rules for when the card is offered.
		$card->add_control( 'card_key', [ 'label' => esc_html__( 'Card key', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'saloon', 'separator' => 'before', 'description' => esc_html__( 'Rules, totals and prefilled answers name the card by it. Empty: made from the name.', 'refraction' ) ] );
		$card->add_control( 'card_when_field', [ 'label' => esc_html__( 'Offer this card only when field (key)', 'refraction' ), 'type' => Controls_Manager::TEXT, 'placeholder' => 'passengers' ] );
		$card->add_control( 'card_when_op', [ 'label' => esc_html__( 'Condition', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators(), 'condition' => [ 'card_when_field!' => '' ] ] );
		$card->add_control( 'card_when_value', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'card_when_field!' => '', 'card_when_op!' => [ 'empty', 'not_empty' ] ] ] );
		$card->add_control( 'card_when_field2', [ 'label' => esc_html__( 'And field (key)', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'card_when_field!' => '' ] ] );
		$card->add_control( 'card_when_op2', [ 'label' => esc_html__( 'Condition', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'equals', 'options' => Conditions::operators(), 'condition' => [ 'card_when_field2!' => '' ] ] );
		$card->add_control( 'card_when_value2', [ 'label' => esc_html__( 'Value', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'card_when_field2!' => '', 'card_when_op2!' => [ 'empty', 'not_empty' ] ] ] );
		$this->add_control( 'cards', [
			'label' => esc_html__( 'Cards', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $card->get_controls(),
			'default' => [ [ 'card_title' => esc_html__( 'Basic', 'refraction' ), 'card_price' => 10 ], [ 'card_title' => esc_html__( 'Premium', 'refraction' ), 'card_price' => 20 ] ],
			'title_field' => '{{{ card_title }}}',
			'button_text' => esc_html__( 'Add card', 'refraction' ),
			'separator' => 'before',
		] );
		$this->add_control( 'default_card', [ 'label' => esc_html__( 'Card picked at first (number, 0 = none)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 50, 'default' => 0 ] );
		$this->add_control( 'card_columns', [ 'label' => esc_html__( 'Cards per row', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 6, 'default' => 1, 'separator' => 'before' ] );
		$this->add_control( 'card_gap', [ 'label' => esc_html__( 'Space between cards (px)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 60, 'default' => 10 ] );
		$this->add_control( 'marker_pos', [ 'label' => esc_html__( 'Pick control position', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'left', 'options' => self::positions( false ) ] );
		$this->add_control( 'marker_look', [ 'label' => esc_html__( 'Pick control look', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'radio', 'options' => self::looks( false ) ] );
		$this->add_control( 'field_description', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true, 'separator' => 'before' ] );
		$this->add_control( 'cards_hint', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Fill each card on the page with any widgets. Fields inside a card are shown but visitors can not change them.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );
		$this->end_controls_section();

		$this->register_card_style();
		$this->register_condition_controls();
		$this->register_record_controls();
	}

	private function register_card_style(): void {
		$card = '{{WRAPPER}} .rfb-choice-card';
		$this->start_controls_section( 'section_style_cards', [ 'label' => esc_html__( 'Cards', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'card_padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $card => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'card_radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', '%' ], 'selectors' => [ $card => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->start_controls_tabs( 'card_states' );

		foreach ( [ 'normal' => [ esc_html__( 'Normal', 'refraction' ), '' ], 'hover' => [ esc_html__( 'Hover', 'refraction' ), ':hover' ], 'selected' => [ esc_html__( 'Selected', 'refraction' ), '.is-selected' ] ] as $state => $spec ) {
			$selector = $card . $spec[1];
			$this->start_controls_tab( 'card_' . $state, [ 'label' => $spec[0] ] );
			$this->add_control( 'card_bg_' . $state, [ 'label' => esc_html__( 'Background color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $selector => 'background-color: {{VALUE}};' ] ] );
			$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'card_border_' . $state, 'selector' => $selector ] );
			$this->add_group_control( Group_Control_Box_Shadow::get_type(), [ 'name' => 'card_shadow_' . $state, 'selector' => $selector ] );
			$this->end_controls_tab();
		}

		$this->end_controls_tabs();
		$this->end_controls_section();

		$mark = '{{WRAPPER}} .rfb-cc-mark';
		$this->start_controls_section( 'section_style_mark', [ 'label' => esc_html__( 'Pick control', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'mark_size', [ 'label' => esc_html__( 'Size', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 10, 'max' => 60 ] ], 'selectors' => [ $mark => 'font-size: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_control( 'mark_border', [ 'label' => esc_html__( 'Border color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-choice-card:not(.is-selected) .rfb-cc-mark' => 'border-color: {{VALUE}};' ] ] );
		$this->add_control( 'mark_on_bg', [ 'label' => esc_html__( 'Picked color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-choice-card.is-selected .rfb-cc-mark' => 'border-color: {{VALUE}}; background-color: {{VALUE}};', '{{WRAPPER}} .rfb-choice-card.rfb-mlook-radio.is-selected .rfb-cc-mark:not(.is-check)' => 'background: radial-gradient({{VALUE}} 42%, var(--rfb-form-bg) 46%);' ] ] );
		$this->add_control( 'mark_tick', [ 'label' => esc_html__( 'Tick color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-choice-card.is-selected .rfb-cc-mark' => 'color: {{VALUE}};' ] ] );
		$this->end_controls_section();
	}

	/** The set and its cards (without the fields inside them, which Editor_Forms::collect() adds). */
	public function raw_field(): array {
		$s = $this->get_settings();

		return $this->shared_raw() + [
			'type' => 'choice_set',
			'required' => 'yes' === ( $s['field_required'] ?? '' ),
			'multiple' => 'yes' === ( $s['multiple'] ?? '' ),
			'card_columns' => $s['card_columns'] ?? 1,
			'card_gap' => $s['card_gap'] ?? 10,
			'marker_pos' => (string) ( $s['marker_pos'] ?? 'left' ),
			'marker_look' => (string) ( $s['marker_look'] ?? 'radio' ),
		];
	}

	/** One card as a Builder card (a free Group): its name, price and look. */
	public function card_raw( int $index ): array {
		$item = array_values( (array) $this->get_settings( 'cards' ) )[ $index ] ?? [];
		$rules = [];

		foreach ( [ '', '2' ] as $n ) {
			if ( '' !== trim( (string) ( $item[ 'card_when_field' . $n ] ?? '' ) ) ) {
				$rules[] = [ 'field' => (string) $item[ 'card_when_field' . $n ], 'op' => (string) ( $item[ 'card_when_op' . $n ] ?? 'equals' ), 'value' => (string) ( $item[ 'card_when_value' . $n ] ?? '' ) ];
			}
		}

		return [
			'key' => (string) ( $item['card_key'] ?? '' ),
			'conditions' => [ 'enabled' => (bool) $rules, 'action' => 'show', 'match' => 'all', 'rules' => $rules ],
			'type' => 'group',
			'card_mode' => 'free',
			'label' => (string) ( $item['card_title'] ?? '' ),
			'card_price' => $item['card_price'] ?? null,
			'per' => (string) ( $item['card_per'] ?? '' ),
			'per_label' => (string) ( $item['card_per_label'] ?? '' ),
			'card_width' => (string) ( $item['card_width'] ?? 'auto' ),
			'marker_pos' => (string) ( $item['card_marker_pos'] ?? '' ),
			'marker_look' => (string) ( $item['card_marker_look'] ?? '' ),
		];
	}

	public function card_count(): int {
		return count( (array) $this->get_settings( 'cards' ) );
	}

	/** Which card (1-based number) is picked at first. */
	public function default_index(): int {
		return (int) $this->get_settings( 'default_card' );
	}

	protected function render() {
		$state = Editor_Forms::rendering();
		$field = null;

		if ( $state ) {
			$key = $state['keys'][ $this->get_id() ] ?? '';
			$field = '' !== $key ? Schema::field( $state['definition'], $key ) : null;
		} else {
			$raw = $this->raw_field();
			$raw['key'] = '' !== $raw['key'] ? $raw['key'] : 'cards';
			$raw['children'] = [];
			$field = Schema::clean_field( $raw );
			$field['children'] = array_map( function ( $i ) {
				$card = $this->card_raw( $i );
				$card['key'] = 'card_' . $i;
				$card['children'] = [];

				return Schema::clean_field( $card, 'choice_set' ) + [ 'children' => [] ];
			}, range( 0, max( 0, $this->card_count() - 1 ) ) );
		}

		if ( ! $field ) {
			return;
		}

		$scope = Editor_Forms::scope();
		$values = $scope ? $scope['values'] : (array) ( $state['values'] ?? [] );
		$name = ( $scope ? $scope['name'] : 'values' ) . '[' . $field['key'] . ']';
		$picked = isset( $values[ $field['key'] ] )
			? array_map( static function ( $pick ) {
				return is_array( $pick ) ? (string) ( $pick['key'] ?? '' ) : (string) $pick;
			}, (array) $values[ $field['key'] ] )
			: ( '' !== $field['default'] ? [ $field['default'] ] : [] );
		$kind = $field['multiple'] ? 'checkbox' : 'radio';
		$id = 'rfb-' . $field['key'];
		$cond = ! empty( $field['conditions']['enabled'] ) ? ' data-rfb-cond="' . esc_attr( (string) wp_json_encode( $field['conditions'] ) ) . '"' : '';
		$error = (string) ( $state['errors'][ $field['key'] ] ?? '' );

		echo '<div class="rfb-field rfb-w-full rfb-t-choice_set' . ( '' !== $error ? ' has-error' : '' ) . '" data-rfb-key="' . esc_attr( $field['key'] ) . '" data-rfb-type="choice_set"' . $cond . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
		echo '<fieldset class="rfb-choice rfb-cards' . ( $field['multiple'] ? ' is-multiple' : '' ) . '"><legend class="rfb-label' . ( $field['required'] ? ' is-required' : '' ) . ( $field['hide_label'] ? ' screen-reader-text' : '' ) . '">' . esc_html( $field['label'] ) . '</legend>' . Field_Renderer::description( $field, $id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo '<div class="rfb-cc-list" style="--rfb-cc-gap:' . (int) $field['card_gap'] . 'px">';

		foreach ( $field['children'] as $i => $card ) {
			$on = in_array( $card['key'], $picked, true );
			$percent = 'auto' === $card['card_width'] ? 100 / max( 1, (int) $field['card_columns'] ) : Schema::width_percent( $card['card_width'] );
			$basis = 'calc(' . round( $percent, 3 ) . '% - var(--rfb-cc-gap) * ' . round( 1 - $percent / 100, 4 ) . ')';
			$pos = '' !== $card['marker_pos'] ? $card['marker_pos'] : $field['marker_pos'];
			$look = '' !== $card['marker_look'] ? $card['marker_look'] : $field['marker_look'];
			$card_cond = ! empty( $card['conditions']['enabled'] ) ? ' data-rfb-cond="' . esc_attr( (string) wp_json_encode( $card['conditions'] ) ) . '"' : '';

			echo '<div class="' . esc_attr( 'rfb-choice-card rfb-t-card is-free rfb-mpos-' . $pos . ' rfb-mlook-' . $look . ( $on ? ' is-selected' : '' ) ) . '" style="flex-basis:' . esc_attr( $basis ) . '" data-rfb-key="' . esc_attr( $card['key'] ) . '" data-rfb-type="card"' . $card_cond . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			echo '<label class="rfb-cc-pick" for="' . esc_attr( $id . '-' . $i ) . '"><input type="' . esc_attr( $kind ) . '" id="' . esc_attr( $id . '-' . $i ) . '" name="' . esc_attr( $name . ( $field['multiple'] ? '[]' : '' ) ) . '" value="' . esc_attr( $card['key'] ) . '" data-rfb-title="' . esc_attr( $card['label'] ) . '"' . ( null !== $card['card_price'] ? ' data-rfb-n="' . esc_attr( (string) (float) $card['card_price'] ) . '"' : '' ) . checked( $on, true, false ) . ( $field['required'] && ! $field['multiple'] ? ' required' : '' ) . '><span class="rfb-cc-mark' . ( $field['multiple'] ? ' is-check' : '' ) . '" aria-hidden="true"></span><span class="screen-reader-text">' . esc_html( $card['label'] ) . '</span></label>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped

			// Whatever is in the card is shown, but a field in it can not be changed (nothing in it is read on submit).
			Editor_Forms::push_card( $card );
			ob_start();
			$this->print_child( $i );
			Editor_Forms::pop_card();
			echo '<div class="rfb-cc-content">' . preg_replace( '/<(input|select|textarea)\b/i', '<$1 disabled', (string) ob_get_clean() ) . '</div></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Printed by the editor's own widgets.
		}

		echo '</div></fieldset>' . ( '' !== $error ? '<p class="rfb-error" role="alert">' . esc_html( $error ) . '</p>' : '' ) . '</div>';
	}

	protected function content_template_single_repeater_item() {
		?>
		<#
		const pos = data.card_marker_pos || settings.marker_pos || 'left';
		const look = data.card_marker_look || settings.marker_look || 'radio';
		#>
		<div class="rfb-choice-card rfb-t-card is-free rfb-mpos-{{ pos }} rfb-mlook-{{ look }}"><span class="rfb-cc-pick"><span class="rfb-cc-mark<# if ( 'yes' === settings.multiple ) { #> is-check<# } #>"></span></span></div>
		<?php
	}

	protected function content_template() {
		$widths = wp_json_encode( Schema::WIDTH_PERCENT );
		?>
		<#
		const widths = <?php echo $widths; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Numbers only. ?>;
		const perRow = Math.max( 1, parseInt( settings.card_columns, 10 ) || 1 );
		const gap = parseInt( settings.card_gap, 10 ) || 0;
		const picked = parseInt( settings.default_card, 10 ) || 0;
		#>
		<div class="rfb-field rfb-w-full rfb-t-choice_set">
			<fieldset class="rfb-choice rfb-cards<# if ( 'yes' === settings.multiple ) { #> is-multiple<# } #>">
				<legend class="rfb-label<# if ( 'yes' === settings.field_required ) { #> is-required<# } #>">{{{ settings.field_label }}}</legend>
				<# if ( settings.field_description ) { #><p class="rfb-description">{{{ settings.field_description }}}</p><# } #>
				<div class="rfb-cc-list" style="--rfb-cc-gap:{{ gap }}px">
					<# _.each( settings.cards, function( card, index ) {
						const pos = card.card_marker_pos || settings.marker_pos || 'left';
						const look = card.card_marker_look || settings.marker_look || 'radio';
						const percent = 'auto' === ( card.card_width || 'auto' ) ? 100 / perRow : ( widths[ card.card_width ] || 100 );
						const basis = 'calc(' + percent + '% - ' + gap + 'px * ' + ( 1 - percent / 100 ) + ')';
					#>
					<div class="rfb-choice-card rfb-t-card is-free rfb-mpos-{{ pos }} rfb-mlook-{{ look }}<# if ( picked === index + 1 ) { #> is-selected<# } #>" style="flex-basis:{{ basis }}"><span class="rfb-cc-pick"><span class="rfb-cc-mark<# if ( 'yes' === settings.multiple ) { #> is-check<# } #>"></span></span></div>
					<# } ); #>
				</div>
			</fieldset>
		</div>
		<?php
	}
}
