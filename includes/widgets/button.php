<?php
namespace Refraction;

use Refraction\Includes\Widgets\Traits\Button_Trait;
use Refraction\Includes\Widgets\Traits\Icon_Box_Style;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction button widget.
 *
 * Refraction widget that displays a button with the ability to control every
 * aspect of the button design.
 *
 * @since 1.0.0
 */
class Widget_Button extends Widget_Base {

	use Button_Trait;

	/**
	 * Get widget name.
	 *
	 * Retrieve button widget name.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget name.
	 */
	public function get_name() {
		return 'button';
	}

	/**
	 * Get widget title.
	 *
	 * Retrieve button widget title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget title.
	 */
	public function get_title() {
		return esc_html__( 'Button', 'refraction' );
	}

	/**
	 * Get widget icon.
	 *
	 * Retrieve button widget icon.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget icon.
	 */
	public function get_icon() {
		return 'rficon-button';
	}

	/**
	 * Get widget categories.
	 *
	 * Retrieve the list of categories the button widget belongs to.
	 *
	 * Used to determine where to display the widget in the editor.
	 *
	 * @since 2.0.0
	 * @access public
	 *
	 * @return array Widget categories.
	 */
	public function get_categories() {
		return [ 'basic' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	public function has_widget_inner_wrapper(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_button',
			[
				'label' => esc_html__( 'Button', 'refraction' ),
			]
		);

		$this->register_button_content_controls();

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			[
				'label' => esc_html__( 'Button', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->register_button_style_controls();

		$this->end_controls_section();

		// The button's icon in a box of its own: size, padding, corners, colors and hover colors.
		$this->start_controls_section(
			'section_style_icon',
			[
				'label' => esc_html__( 'Icon', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [ 'selected_icon[value]!' => '' ],
			]
		);

		$icon_box = '{{WRAPPER}} .refraction-button .refraction-button-icon';

		Icon_Box_Style::controls( $this, 'button_icon', $icon_box, [ 'condition' => [ 'selected_icon[value]!' => '' ] ] );

		$this->add_control(
			'button_icon_hover_color',
			[
				'label' => esc_html__( 'Icon Color on Hover', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-button:hover .refraction-button-icon, {{WRAPPER}} .refraction-button:focus-visible .refraction-button-icon' => 'color: {{VALUE}}; fill: {{VALUE}};' ],
				'condition' => [ 'selected_icon[value]!' => '' ],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'button_icon_hover_bg',
			[
				'label' => esc_html__( 'Icon Background on Hover', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-button:hover .refraction-button-icon, {{WRAPPER}} .refraction-button:focus-visible .refraction-button-icon' => 'background-color: {{VALUE}};' ],
				'condition' => [ 'selected_icon[value]!' => '' ],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'button_icon_border',
				'selector' => $icon_box,
				'condition' => [ 'selected_icon[value]!' => '' ],
			]
		);

		$this->add_responsive_control(
			'button_icon_offset',
			[
				'label' => esc_html__( 'Move Up or Down', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => -20, 'max' => 20 ], 'em' => [ 'min' => -1, 'max' => 1, 'step' => 0.05 ] ],
				'selectors' => [ $icon_box => 'position: relative; top: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'selected_icon[value]!' => '' ],
			]
		);

		$this->add_control(
			'button_icon_transition',
			[
				'label' => esc_html__( 'Hover Transition (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 2000,
				'placeholder' => '300',
				'selectors' => [ $icon_box => 'transition: color {{VALUE}}ms, background-color {{VALUE}}ms, border-color {{VALUE}}ms, fill {{VALUE}}ms;' ],
				'condition' => [ 'selected_icon[value]!' => '' ],
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Render button widget output on the frontend.
	 *
	 * Written in PHP and used to generate the final HTML.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function render() {
		$this->render_button();
	}

	public function render_markdown(): string {
		$settings = $this->get_settings_for_display();

		$text = Utils::html_to_plain_text( $settings['text'] ?? '' );

		if ( empty( $text ) ) {
			return '';
		}

		if ( ! empty( $settings['link']['url'] ) ) {
			return '[' . $text . '](' . esc_url( $settings['link']['url'] ) . ')';
		}

		return '**' . $text . '**';
	}
}
