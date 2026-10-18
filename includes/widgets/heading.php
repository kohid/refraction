<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Refraction\Core\Kits\Documents\Tabs\Global_Colors;
use Refraction\Core\Kits\Documents\Tabs\Global_Typography;
use Refraction\Modules\ContentSanitizer\Interfaces\Sanitizable;

/**
 * Refraction heading widget.
 *
 * Refraction widget that displays an eye-catching headlines.
 *
 * @since 1.0.0
 */
class Widget_Heading extends Widget_Base implements Sanitizable {

	/**
	 * Get widget name.
	 *
	 * Retrieve heading widget name.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget name.
	 */
	public function get_name() {
		return 'heading';
	}

	/**
	 * Get widget title.
	 *
	 * Retrieve heading widget title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget title.
	 */
	public function get_title() {
		return esc_html__( 'Heading', 'refraction' );
	}

	/**
	 * Get widget icon.
	 *
	 * Retrieve heading widget icon.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget icon.
	 */
	public function get_icon() {
		return 'eicon-t-letter';
	}

	/**
	 * Get widget categories.
	 *
	 * Retrieve the list of categories the heading widget belongs to.
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
		return [ 'heading', 'title', 'text' ];
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
		return [ 'widget-heading' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
	}

	/**
	 * Remove data attributes from the html.
	 *
	 * @param string $content Heading title.
	 * @return string
	 */
	public function sanitize( $content ): string {
		$allowed_tags = wp_kses_allowed_html( 'post' );
		$allowed_tags_for_heading = [];
		$non_allowed_tags = [ 'img' ];

		foreach ( $allowed_tags as $tag => $attributes ) {
			if ( in_array( $tag, $non_allowed_tags, true ) ) {
				continue;
			}

			$filtered_attributes = array_filter( $attributes, function( $attribute ) {
				return ! substr( $attribute, 0, 5 ) === 'data-';
			}, ARRAY_FILTER_USE_KEY );

			$allowed_tags_for_heading[ $tag ] = $filtered_attributes;
		}

		return wp_kses( $content, $allowed_tags_for_heading );
	}

	/**
	 * Register heading widget controls.
	 *
	 * Adds different input fields to allow the user to change and customize the widget settings.
	 *
	 * @since 3.1.0
	 * @access protected
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'section_title',
			[
				'label' => esc_html__( 'Heading', 'refraction' ),
			]
		);

		$this->add_control(
			'title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'ai' => [
					'type' => 'text',
				],
				'dynamic' => [
					'active' => true,
				],
				'placeholder' => esc_html__( 'Enter your title', 'refraction' ),
				'default' => esc_html__( 'Add Your Heading Text Here', 'refraction' ),
			]
		);

		$this->add_control(
			'link',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [
					'active' => true,
				],
				'default' => [
					'url' => '',
				],
			]
		);

		$this->add_control(
			'size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'default' => esc_html__( 'Default', 'refraction' ),
					'small' => esc_html__( 'Small', 'refraction' ),
					'medium' => esc_html__( 'Medium', 'refraction' ),
					'large' => esc_html__( 'Large', 'refraction' ),
					'xl' => esc_html__( 'XL', 'refraction' ),
					'xxl' => esc_html__( 'XXL', 'refraction' ),
				],
				'default' => 'default',
				'condition' => [
					'size!' => 'default', // a workaround to hide the control, unless it's in use (not default).
				],
			]
		);

		$this->add_control(
			'header_size',
			[
				'label' => esc_html__( 'HTML Tag', 'refraction' ),
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
				'default' => 'h2',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_title_style',
			[
				'label' => esc_html__( 'Heading', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'eicon-text-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'eicon-text-align-center',
					],
					'end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'eicon-text-align-right',
					],
					'justify' => [
						'title' => esc_html__( 'Justified', 'refraction' ),
						'icon' => 'eicon-text-align-justify',
					],
				],
				'classes' => 'refraction-control-start-end',
				'selectors_dictionary' => [
					'left' => is_rtl() ? 'end' : 'start',
					'right' => is_rtl() ? 'start' : 'end',
				],
				'default' => '',
				'selectors' => [
					'{{WRAPPER}}' => 'text-align: {{VALUE}};',
				],
				'separator' => 'after',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'typography',
				'global' => [
					'default' => Global_Typography::TYPOGRAPHY_PRIMARY,
				],
				'selector' => '{{WRAPPER}} .refraction-heading-title',
			]
		);

		$this->add_group_control(
			Group_Control_Text_Stroke::get_type(),
			[
				'name' => 'text_stroke',
				'selector' => '{{WRAPPER}} .refraction-heading-title',
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => 'text_shadow',
				'selector' => '{{WRAPPER}} .refraction-heading-title',
			]
		);

		$this->add_control(
			'blend_mode',
			[
				'label' => esc_html__( 'Blend Mode', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'' => esc_html__( 'Normal', 'refraction' ),
					'multiply' => esc_html__( 'Multiply', 'refraction' ),
					'screen' => esc_html__( 'Screen', 'refraction' ),
					'overlay' => esc_html__( 'Overlay', 'refraction' ),
					'darken' => esc_html__( 'Darken', 'refraction' ),
					'lighten' => esc_html__( 'Lighten', 'refraction' ),
					'color-dodge' => esc_html__( 'Color Dodge', 'refraction' ),
					'saturation' => esc_html__( 'Saturation', 'refraction' ),
					'color' => esc_html__( 'Color', 'refraction' ),
					'difference' => esc_html__( 'Difference', 'refraction' ),
					'exclusion' => esc_html__( 'Exclusion', 'refraction' ),
					'hue' => esc_html__( 'Hue', 'refraction' ),
					'luminosity' => esc_html__( 'Luminosity', 'refraction' ),
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-heading-title' => 'mix-blend-mode: {{VALUE}}',
				],
			]
		);

		$this->add_control(
			'separator',
			[
				'type' => Controls_Manager::DIVIDER,
			]
		);

		$this->start_controls_tabs( 'title_colors' );

		$this->start_controls_tab(
			'title_colors_normal',
			[
				'label' => esc_html__( 'Normal', 'refraction' ),
			]
		);

		$this->add_control(
			'title_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'global' => [
					'default' => Global_Colors::COLOR_PRIMARY,
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-heading-title' => 'color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->start_controls_tab(
			'title_colors_hover',
			[
				'label' => esc_html__( 'Hover', 'refraction' ),
			]
		);

		$this->add_control(
			'title_hover_color',
			[
				'label' => esc_html__( 'Link Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-heading-title a:hover, {{WRAPPER}} .refraction-heading-title a:focus' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'title_hover_color_transition_duration',
			[
				'label' => esc_html__( 'Transition Duration', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 's', 'ms', 'custom' ],
				'default' => [
					'unit' => 's',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-heading-title a' => 'transition-duration: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_tab();

		$this->end_controls_tabs();

		$this->end_controls_section();
	}

	/**
	 * Render heading widget output on the frontend.
	 *
	 * Written in PHP and used to generate the final HTML.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();

		if ( '' === $settings['title'] ) {
			return;
		}

		$this->add_render_attribute( 'title', 'class', 'refraction-heading-title' );

		if ( ! empty( $settings['size'] ) ) {
			$this->add_render_attribute( 'title', 'class', 'refraction-size-' . $settings['size'] );
		} else {
			$this->add_render_attribute( 'title', 'class', 'refraction-size-default' );
		}

		$this->add_inline_editing_attributes( 'title' );

		$title = wp_kses_post( $settings['title'] );

		if ( ! empty( $settings['link']['url'] ) ) {
			$this->add_link_attributes( 'url', $settings['link'] );

			$title = sprintf( '<a %1$s>%2$s</a>', $this->get_render_attribute_string( 'url' ), $title );
		}

		$title_html = sprintf( '<%1$s %2$s>%3$s</%1$s>', Utils::validate_html_tag( $settings['header_size'] ), $this->get_render_attribute_string( 'title' ), $title );

		// PHPCS - the variable $title_html holds safe data.
		echo $title_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	public function render_markdown(): string {
		$settings = $this->get_settings_for_display();

		if ( '' === $settings['title'] ) {
			return '';
		}

		$tag = $settings['header_size'] ?? 'h2';
		$level_map = [
			'h1' => 1,
			'h2' => 2,
			'h3' => 3,
			'h4' => 4,
			'h5' => 5,
			'h6' => 6,
		];
		$level = $level_map[ $tag ] ?? 2;
		$title = Utils::html_to_plain_text( $settings['title'] );

		$md = str_repeat( '#', $level ) . ' ' . $title;

		if ( ! empty( $settings['link']['url'] ) ) {
			$md = str_repeat( '#', $level ) . ' [' . $title . '](' . esc_url( $settings['link']['url'] ) . ')';
		}

		return $md;
	}

	/**
	 * Render heading widget output in the editor.
	 *
	 * Written as a Backbone JavaScript template and used to generate the live preview.
	 *
	 * @since 2.9.0
	 * @access protected
	 */
	protected function content_template() {
		?>
		<#
		let title = refraction.helpers.sanitize( settings.title, { ALLOW_DATA_ATTR: false } );

		if ( '' !== settings.link?.url ) {
			title = '<a href="' + refraction.helpers.sanitizeUrl( settings.link?.url ) + '">' + title + '</a>';
		}

		view.addRenderAttribute( 'title', 'class', [ 'refraction-heading-title' ] );

		if ( '' !== settings.size ) {
			view.addRenderAttribute( 'title', 'class', [ 'refraction-size-' + settings.size ] );
		} else {
			view.addRenderAttribute( 'title', 'class', [ 'refraction-size-default' ] );
		}

		view.addInlineEditingAttributes( 'title' );

		var headerSizeTag = refraction.helpers.validateHTMLTag( settings.header_size ),
			title_html = '<' + headerSizeTag  + ' ' + view.getRenderAttributeString( 'title' ) + '>' + title + '</' + headerSizeTag + '>';

		print( title_html );
		#>
		<?php
	}
}
