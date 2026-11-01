<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\FormBuilder\Base\Field_Settings;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Classes\Money;
use Refraction\Modules\FormBuilder\Documents\Form_Document;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A price in the form's currency with its period ("$20.00 / month"). In a choice card it shows the card's own price
 * (the one saved with the record), so the two never differ; elsewhere it shows its own amount. No price, nothing shown.
 */
class Price extends Widget_Base {

	use Field_Settings;

	public function get_name() {
		return 'rfb-price';
	}

	public function get_title() {
		return esc_html__( 'Price', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-price-list';
	}

	public function get_keywords() {
		return [ 'price', 'amount', 'cost', 'money', 'plan' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_price', [ 'label' => esc_html__( 'Price', 'refraction' ) ] );
		$this->add_control( 'use_card', [ 'label' => esc_html__( 'In a choice card, show the card\'s price', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'description' => esc_html__( 'Set it in the Choice cards widget, card by card. It is also what is saved with the record.', 'refraction' ) ] );
		$this->add_control( 'amount', [ 'label' => esc_html__( 'Amount', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'step' => 'any', 'description' => esc_html__( 'Used outside a choice card, or when the option above is off.', 'refraction' ) ] );
		$this->add_control( 'per', [ 'label' => esc_html__( 'Price period', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => '', 'options' => Money::periods() ] );
		$this->add_control( 'per_label', [ 'label' => esc_html__( 'Period text', 'refraction' ), 'type' => Controls_Manager::TEXT, 'condition' => [ 'per' => 'custom' ] ] );
		$this->add_responsive_control( 'align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
			],
			'selectors' => [ '{{WRAPPER}}' => 'text-align: {{VALUE}};' ],
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_price_style', [ 'label' => esc_html__( 'Price', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'amount_color', [ 'label' => esc_html__( 'Amount color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-price-amount' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'amount_typography', 'selector' => '{{WRAPPER}} .rfb-price-amount' ] );
		$this->add_control( 'per_color', [ 'label' => esc_html__( 'Period color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => [ '{{WRAPPER}} .rfb-price-per' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'per_typography', 'selector' => '{{WRAPPER}} .rfb-price-per' ] );
		$this->end_controls_section();
	}

	/** The amount and period to show: the card's (while a card prints, or found in the page in the editor), else the widget's own. */
	private function shown(): array {
		$s = $this->get_settings();
		$own = [ 'amount' => is_numeric( $s['amount'] ?? null ) ? (float) $s['amount'] : null, 'per' => (string) ( $s['per'] ?? '' ), 'per_label' => (string) ( $s['per_label'] ?? '' ) ];

		if ( 'yes' !== ( $s['use_card'] ?? '' ) ) {
			return $own;
		}

		$card = Editor_Forms::card();

		if ( $card ) {
			return [ 'amount' => is_numeric( $card['card_price'] ?? null ) ? (float) $card['card_price'] : null, 'per' => (string) ( $card['per'] ?? '' ), 'per_label' => (string) ( $card['per_label'] ?? '' ) ];
		}

		$document = Form_Document::current();
		$item = $document ? Editor_Forms::card_item_of( (array) json_decode( (string) get_post_meta( $document->get_main_id(), '_refraction_data', true ), true ), (string) $this->get_id() ) : null;

		return $item ? [ 'amount' => is_numeric( $item['card_price'] ?? null ) ? (float) $item['card_price'] : null, 'per' => (string) ( $item['card_per'] ?? '' ), 'per_label' => (string) ( $item['card_per_label'] ?? '' ) ] : $own;
	}

	protected function render() {
		$shown = $this->shown();

		if ( null === $shown['amount'] ) {
			if ( Plugin::$instance->editor->is_edit_mode() ) {
				echo '<span class="rfb-price rfb-price-empty">' . esc_html__( 'Price: set it on the card (Choice cards) or here', 'refraction' ) . '</span>';
			}

			return;
		}

		$state = Editor_Forms::rendering();
		$document = Form_Document::current();
		$money = $state ? (array) ( $state['ctx']['money'] ?? [] ) : ( $document ? $document->form_settings()['settings'] : [] );
		$per = Money::per_label( $shown['per'], $shown['per_label'] );

		echo '<span class="rfb-price"><span class="rfb-price-amount">' . esc_html( Money::display( $shown['amount'], Money::config( $money ) ) ) . '</span>' . ( '' !== $per ? ' <span class="rfb-price-per">' . esc_html( $per ) . '</span>' : '' ) . '</span>';
	}
}
