<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Refraction\Core\Kits\Documents\Tabs\Global_Colors;
use Refraction\Core\Kits\Documents\Tabs\Global_Typography;

/**
 * Refraction progress widget.
 *
 * Refraction widget that displays an escalating progress bar.
 *
 * @since 1.0.0
 */
class Widget_Progress extends Widget_Base {

	/**
	 * Get widget name.
	 *
	 * Retrieve progress widget name.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget name.
	 */
	public function get_name() {
		return 'progress';
	}

	/**
	 * Get widget title.
	 *
	 * Retrieve progress widget title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget title.
	 */
	public function get_title() {
		return esc_html__( 'Progress Bar', 'refraction' );
	}

	/**
	 * Get widget icon.
	 *
	 * Retrieve progress widget icon.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget icon.
	 */
	public function get_icon() {
		return 'eicon-skill-bar';
	}

	/**
	 * Get widget keywords.
	 *
	 * Retrieve the list of keywords the widget belongs to.
	 *
	 * @since 2.1.0
	 * @access public
	 *
	 * @return array Widget keywords.
	 */
	public function get_keywords() {
		return [ 'progress', 'bar' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	/**
	 * Get style dependencies.
	 *
	 * Retrieve the list of style dependencies the widget requires.
	 *
	 * @since 3.24.0
	 * @access public
	 *
	 * @return array Widget style dependencies.
	 */
	public function get_style_depends(): array {
		return [ 'widget-progress' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
	}

	/**
	 * Register progress widget controls.
	 *
	 * Adds different input fields to allow the user to change and customize the widget settings.
	 *
	 * @since 3.1.0
	 * @access protected
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'section_progress',
			[
				'label' => esc_html__( 'Progress Bar', 'refraction' ),
			]
		);

		$this->add_control(
			'title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'dynamic' => [
					'active' => true,
				],
				'placeholder' => esc_html__( 'Enter your title', 'refraction' ),
				'default' => esc_html__( 'My Skill', 'refraction' ),
				'label_block' => true,
			]
		);

		$this->add_control(
			'title_tag',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'h1' => 'H1',
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
					'h5' => 'H5',
					'h6' => 'H6',
					'div' => 'div',
					'span' => 'span',
					'p' => 'p',
				],
				'default' => 'span',
				'condition' => [
					'title!' => '',
				],
			]
		);

		$this->add_control(
			'title_display',
			[
				'label' => esc_html__( 'Display Title', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => esc_html__( 'Show', 'refraction' ),
				'label_off' => esc_html__( 'Hide', 'refraction' ),
				'default' => 'yes',
				'condition' => [
					'title!' => '',
				],
			]
		);

		$this->add_control(
			'progress_type',
			[
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'' => esc_html__( 'Default', 'refraction' ),
					'info' => esc_html__( 'Info', 'refraction' ),
					'success' => esc_html__( 'Success', 'refraction' ),
					'warning' => esc_html__( 'Warning', 'refraction' ),
					'danger' => esc_html__( 'Danger', 'refraction' ),
				],
				'default' => '',
				'condition' => [
					'progress_type!' => '', // a workaround to hide the control, unless it's in use (not default).
				],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'percent',
			[
				'label' => esc_html__( 'Percentage', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'default' => [
					'size' => 50,
					'unit' => '%',
				],
				'dynamic' => [
					'active' => true,
				],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'display_percentage',
			[
				'label' => esc_html__( 'Display Percentage', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'label_on' => esc_html__( 'Show', 'refraction' ),
				'label_off' => esc_html__( 'Hide', 'refraction' ),
				'return_value' => 'show',
				'default' => 'show',
				'condition' => [
					'percent!' => '',
				],
			]
		);

		$this->add_control(
			'inner_text',
			[
				'label' => esc_html__( 'Inner Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'dynamic' => [
					'active' => true,
				],
				'placeholder' => esc_html__( 'e.g. Web Designer', 'refraction' ),
				'default' => esc_html__( 'Web Designer', 'refraction' ),
				'label_block' => true,
				'separator' => 'before',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_progress_style',
			[
				'label' => esc_html__( 'Progress Bar', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'title_heading',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'condition' => [
					'title!' => '',
				],
			]
		);

		$this->add_control(
			'title_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-title' => 'color: {{VALUE}};',
				],
				'global' => [
					'default' => Global_Colors::COLOR_PRIMARY,
				],
				'condition' => [
					'title!' => '',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'typography',
				'selector' => '{{WRAPPER}} .refraction-title',
				'global' => [
					'default' => Global_Typography::TYPOGRAPHY_TEXT,
				],
				'condition' => [
					'title!' => '',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => 'title_shadow',
				'selector' => '{{WRAPPER}} .refraction-title',
				'condition' => [
					'title!' => '',
				],
			]
		);

		$this->add_control(
			'percentage_heading',
			[
				'label' => esc_html__( 'Percentage', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'bar_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'global' => [
					'default' => Global_Colors::COLOR_PRIMARY,
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-progress-wrapper .refraction-progress-bar' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'bar_bg_color',
			[
				'label' => esc_html__( 'Background Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-progress-wrapper' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'bar_height',
			[
				'label' => esc_html__( 'Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-progress-bar' => 'height: {{SIZE}}{{UNIT}}; line-height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'bar_border_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-progress-wrapper' => 'border-radius: {{SIZE}}{{UNIT}}; overflow: hidden;',
				],
			]
		);

		$this->add_control(
			'inner_text_heading',
			[
				'label' => esc_html__( 'Inner Text', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
				'condition' => [
					'inner_text!' => '',
				],
			]
		);

		$this->add_control(
			'bar_inline_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-progress-bar' => 'color: {{VALUE}};',
				],
				'condition' => [
					'inner_text!' => '',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'bar_inner_typography',
				'selector' => '{{WRAPPER}} .refraction-progress-bar',
				'exclude' => [
					'line_height',
				],
				'condition' => [
					'inner_text!' => '',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => 'bar_inner_shadow',
				'selector' => '{{WRAPPER}} .refraction-progress-bar',
				'condition' => [
					'inner_text!' => '',
				],
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Render progress widget output on the frontend.
	 * Make sure value does no exceed 100%.
	 *
	 * Written in PHP and used to generate the final HTML.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();

		if ( empty( $settings['title'] ) && empty( $settings['percent']['size'] ) ) {
			return;
		}

		$progressbar_id = 'refraction-progress-bar-' . $this->get_id();

		$progress_percentage = is_numeric( $settings['percent']['size'] ) ? $settings['percent']['size'] : '0';
		if ( 100 < $progress_percentage ) {
			$progress_percentage = 100;
		}

		if ( ! Utils::is_empty( $settings['title'] ) ) {

			if ( 'yes' === $settings['title_display'] ) {

				$this->add_render_attribute(
					'title',
					[
						'class' => 'refraction-title',
						'id' => $progressbar_id,
					]
				);

				$this->add_inline_editing_attributes( 'title' );

				$this->add_render_attribute( 'wrapper', 'aria-labelledby', $progressbar_id );

			} else {

				$this->add_render_attribute( 'wrapper', 'aria-label', $settings['title'] );

			}
		}

		$this->add_render_attribute(
			'wrapper',
			[
				'class' => 'refraction-progress-wrapper',
				'role' => 'progressbar',
				'aria-valuemin' => '0',
				'aria-valuemax' => '100',
				'aria-valuenow' => $progress_percentage,
			]
		);

		if ( ! empty( $settings['inner_text'] ) ) {
			$this->add_render_attribute( 'wrapper', 'aria-valuetext', "{$progress_percentage}% ({$settings['inner_text']})" );
		}

		if ( ! empty( $settings['progress_type'] ) ) {
			$this->add_render_attribute( 'wrapper', 'class', 'progress-' . $settings['progress_type'] );
		}

		$this->add_render_attribute(
			'progress-bar',
			[
				'class' => 'refraction-progress-bar',
				'data-max' => $progress_percentage,
			]
		);

		$this->add_render_attribute( 'inner_text', 'class', 'refraction-progress-text' );

		$this->add_inline_editing_attributes( 'inner_text' );

		if ( ! Utils::is_empty( $settings['title'] ) && 'yes' === $settings['title_display'] ) { ?>
			<<?php Utils::print_validated_html_tag( $settings['title_tag'] ); ?> <?php $this->print_render_attribute_string( 'title' ); ?>>
				<?php echo wp_kses_post( $settings['title'] ); ?>
			</<?php Utils::print_validated_html_tag( $settings['title_tag'] ); ?>>
		<?php } ?>

		<div <?php $this->print_render_attribute_string( 'wrapper' ); ?>>
			<div <?php $this->print_render_attribute_string( 'progress-bar' ); ?>>
				<span <?php $this->print_render_attribute_string( 'inner_text' ); ?>><?php echo wp_kses_post( $settings['inner_text'] ); ?></span>
				<?php if ( 'show' === $settings['display_percentage'] ) { ?>
					<span class="refraction-progress-percentage"><?php echo $progress_percentage; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>%</span>
				<?php } ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Render progress widget output in the editor.
	 *
	 * Written as a Backbone JavaScript template and used to generate the live preview.
	 *
	 * @since 2.9.0
	 * @access protected
	 */
	protected function content_template() {
		?>
		<#
		if ( '' === settings.title && '' === settings.percent.size ) {
			return;
		}

		const title_tag = refraction.helpers.validateHTMLTag( settings.title_tag );
		const progressbar_id = 'refraction-progress-bar-<?php echo esc_attr( $this->get_id() ); ?>';

		let progress_percentage = 0;
		if ( ! isNaN( settings.percent.size ) ) {
			progress_percentage = 100 < settings.percent.size ? 100 : settings.percent.size;
		}

		if ( settings.title ) {

			if ( 'yes' === settings.title_display ) {

				view.addRenderAttribute(
					'title',
					{
						'class': 'refraction-title',
						'id': progressbar_id,
					}
				);

				view.addInlineEditingAttributes( 'title' );

				view.addRenderAttribute( 'progressWrapper', 'aria-labelledby', progressbar_id );

			} else {

				view.addRenderAttribute( 'progressWrapper', 'aria-label', settings.title );

			}
		}

		view.addRenderAttribute(
			'progressWrapper',
			{
				'class': [ 'refraction-progress-wrapper', 'progress-' + settings.progress_type ],
				'role': 'progressbar',
				'aria-valuemin': '0',
				'aria-valuemax': '100',
				'aria-valuenow': progress_percentage,
			}
		);

		if ( '' !== settings.inner_text ) {
			view.addRenderAttribute( 'progressWrapper', 'aria-valuetext', progress_percentage + '% (' + settings.inner_text + ')' );
		}

		view.addRenderAttribute( 'inner_text', 'class', 'refraction-progress-text' );

		view.addInlineEditingAttributes( 'inner_text' );
		#>
		<# if ( settings.title && 'yes' === settings.title_display  ) { #>
			<{{ title_tag }} {{{ view.getRenderAttributeString( 'title' ) }}}>{{ settings.title }}</{{ title_tag }}>
		<# } #>
		<div {{{ view.getRenderAttributeString( 'progressWrapper' ) }}}>
			<div class="refraction-progress-bar" data-max="{{ progress_percentage }}">
				<span {{{ view.getRenderAttributeString( 'inner_text' ) }}}>{{ settings.inner_text }}</span>
				<# if ( 'show' === settings.display_percentage ) { #>
					<span class="refraction-progress-percentage">{{{ progress_percentage }}}%</span>
				<# } #>
			</div>
		</div>
		<?php
	}

	public function render_markdown(): string {
		$settings = $this->get_settings_for_display();
		$title = Utils::html_to_plain_text( $settings['title'] ?? '' );
		$inner_text = Utils::html_to_plain_text( $settings['inner_text'] ?? '' );
		$percent = $settings['percent']['size'] ?? ( $settings['percent'] ?? '' );

		$parts = [];

		if ( ! empty( $title ) ) {
			$parts[] = $title;
		}

		if ( ! empty( $inner_text ) ) {
			$parts[] = $inner_text;
		}

		if ( empty( $parts ) && empty( $percent ) ) {
			return '';
		}

		$label = implode( ' - ', $parts );

		if ( ! empty( $percent ) ) {
			return ! empty( $label ) ? $label . ': ' . $percent . '%' : $percent . '%';
		}

		return $label;
	}
}
