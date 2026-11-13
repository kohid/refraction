<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Typography;
use Refraction\Modules\FormBuilder\Base\Field_Settings;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Summary (0.90.0): the answers given so far, label and value, filled in by the form's script as the visitor answers.
 * Put it in the last step for a look before sending. Nothing is stored.
 */
class Summary extends Widget_Base {

	use Field_Settings;

	public function get_name() {
		return 'rfb-summary';
	}

	public function get_title() {
		return esc_html__( 'Summary', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-bullet-list';
	}

	public function get_keywords() {
		return [ 'summary', 'review', 'answers', 'booking', 'check' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_summary', [ 'label' => esc_html__( 'Summary', 'refraction' ) ] );
		$this->add_control( 'title', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Your booking', 'refraction' ), 'label_block' => true ] );
		$this->add_control( 'empty', [ 'label' => esc_html__( 'Text before any answer', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Your answers will show here.', 'refraction' ), 'label_block' => true ] );
		$this->end_controls_section();

		$box = '{{WRAPPER}} .rfb-summary';
		$this->start_controls_section( 'section_summary_style', [ 'label' => esc_html__( 'Summary', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $box => 'background-color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Border::get_type(), [ 'name' => 'border', 'selector' => $box ] );
		$this->add_responsive_control( 'radius', [ 'label' => esc_html__( 'Rounded corners', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $box => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $box => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'title_typography', 'label' => esc_html__( 'Title', 'refraction' ), 'selector' => $box . ' .rfb-summary-title' ] );
		$this->add_control( 'label_color', [ 'label' => esc_html__( 'Label color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $box . ' dt' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'value_color', [ 'label' => esc_html__( 'Answer color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $box . ' dd' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'row_typography', 'label' => esc_html__( 'Rows', 'refraction' ), 'selector' => $box . ' .rfb-summary-row' ] );
		$this->add_control( 'line_color', [ 'label' => esc_html__( 'Line between rows', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $box . ' .rfb-summary-row + .rfb-summary-row' => 'border-top-color: {{VALUE}};' ] ] );
		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$title = trim( (string) ( $s['title'] ?? '' ) );

		echo '<div class="rfb-summary" data-rfb-summary data-rfb-empty="' . esc_attr( (string) ( $s['empty'] ?? '' ) ) . '">' . ( '' !== $title ? '<div class="rfb-summary-title">' . esc_html( $title ) . '</div>' : '' ) . '<dl class="rfb-summary-list"><div class="rfb-summary-empty">' . esc_html( (string) ( $s['empty'] ?? '' ) ) . '</div></dl></div>';
	}
}
