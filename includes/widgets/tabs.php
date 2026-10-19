<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Refraction\Core\Kits\Documents\Tabs\Global_Colors;
use Refraction\Core\Kits\Documents\Tabs\Global_Typography;

/**
 * Refraction tabs widget.
 *
 * Refraction widget that displays vertical or horizontal tabs with different
 * pieces of content.
 *
 * @since 1.0.0
 */
class Widget_Tabs extends Widget_Base {

	/**
	 * Get widget name.
	 *
	 * Retrieve tabs widget name.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget name.
	 */
	public function get_name() {
		return 'tabs';
	}

	/**
	 * Get widget title.
	 *
	 * Retrieve tabs widget title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget title.
	 */
	public function get_title() {
		return esc_html__( 'Tabs', 'refraction' );
	}

	/**
	 * Get widget icon.
	 *
	 * Retrieve tabs widget icon.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget icon.
	 */
	public function get_icon() {
		return 'rficon-tabs';
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
		return [ 'tabs', 'accordion', 'toggle' ];
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
		return [ 'widget-tabs' ];
	}

	public function show_in_panel(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'container' );
	}

	public function has_widget_inner_wrapper(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
	}

	/**
	 * Register tabs widget controls.
	 *
	 * Adds different input fields to allow the user to change and customize the widget settings.
	 *
	 * @since 3.1.0
	 * @access protected
	 */
	protected function register_controls() {
		$start = is_rtl() ? 'end' : 'start';
		$end = is_rtl() ? 'start' : 'end';

		$this->start_controls_section(
			'section_tabs',
			[
				'label' => esc_html__( 'Tabs', 'refraction' ),
			]
		);

		$repeater = new Repeater();

		$repeater->add_control(
			'tab_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Tab Title', 'refraction' ),
				'placeholder' => esc_html__( 'Tab Title', 'refraction' ),
				'label_block' => true,
				'dynamic' => [
					'active' => true,
				],
			]
		);

		$repeater->add_control(
			'tab_content',
			[
				'label' => esc_html__( 'Content', 'refraction' ),
				'default' => esc_html__( 'Tab Content', 'refraction' ),
				'placeholder' => esc_html__( 'Tab Content', 'refraction' ),
				'type' => Controls_Manager::WYSIWYG,
			]
		);

		$is_nested_tabs_active = Plugin::$instance->widgets_manager->get_widget_types( 'nested-tabs' );

		if ( $is_nested_tabs_active ) {
			$this->add_deprecation_message(
				'3.8.0',
				esc_html__(
					'You are currently editing a Tabs Widget in its old version. Any new tabs widget dragged into the canvas will be the new Tab widget, with the improved Nested capabilities.',
					'refraction'
				),
				'nested-tabs'
			);
		}

		$this->add_control(
			'tabs',
			[
				'label' => esc_html__( 'Tabs Items', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[
						'tab_title' => esc_html__( 'Tab #1', 'refraction' ),
						'tab_content' => esc_html__( 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.', 'refraction' ),
					],
					[
						'tab_title' => esc_html__( 'Tab #2', 'refraction' ),
						'tab_content' => esc_html__( 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.', 'refraction' ),
					],
				],
				'title_field' => '{{{ tab_title }}}',
			]
		);

		$this->add_control(
			'type',
			[
				'label' => esc_html__( 'Position', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'default' => 'horizontal',
				'options' => [
					'vertical' => [
						'title' => esc_html__( 'Vertical', 'refraction' ),
						'icon' => 'rficon-h-align-left',
					],
					'horizontal' => [
						'title' => esc_html__( 'Horizontal', 'refraction' ),
						'icon' => 'rficon-v-align-top',
					],
				],
				'classes' => 'refraction-control-start-end',
				'prefix_class' => 'refraction-tabs-view-',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'tabs_align_horizontal',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => "rficon-align-$start-h",
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'rficon-align-center-h',
					],
					'end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => "rficon-align-$end-h",
					],
					'stretch' => [
						'title' => esc_html__( 'Stretch', 'refraction' ),
						'icon' => 'rficon-align-stretch-h',
					],
				],
				'prefix_class' => 'refraction-tabs-alignment-',
				'condition' => [
					'type' => 'horizontal',
				],
			]
		);

		$this->add_control(
			'tabs_align_vertical',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'rficon-align-start-v',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'rficon-align-center-v',
					],
					'end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'rficon-align-end-v',
					],
					'stretch' => [
						'title' => esc_html__( 'Stretch', 'refraction' ),
						'icon' => 'rficon-align-stretch-v',
					],
				],
				'prefix_class' => 'refraction-tabs-alignment-',
				'condition' => [
					'type' => 'vertical',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_tabs_style',
			[
				'label' => esc_html__( 'Tabs', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'navigation_width',
			[
				'label' => esc_html__( 'Navigation Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
				'default' => [
					'unit' => '%',
				],
				'range' => [
					'px' => [
						'min' => 10,
						'max' => 500,
					],
					'%' => [
						'min' => 10,
						'max' => 50,
					],
					'em' => [
						'min' => 1,
						'max' => 50,
					],
					'rem' => [
						'min' => 1,
						'max' => 50,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-tabs-wrapper' => 'width: {{SIZE}}{{UNIT}}',
				],
				'condition' => [
					'type' => 'vertical',
				],
			]
		);

		$this->add_control(
			'border_width',
			[
				'label' => esc_html__( 'Border Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'default' => [
					'size' => 1,
				],
				'range' => [
					'px' => [
						'max' => 20,
					],
					'em' => [
						'max' => 2,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title, {{WRAPPER}} .refraction-tab-title:before, {{WRAPPER}} .refraction-tab-title:after, {{WRAPPER}} .refraction-tab-content, {{WRAPPER}} .refraction-tabs-content-wrapper' => 'border-width: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'border_color',
			[
				'label' => esc_html__( 'Border Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-mobile-title, {{WRAPPER}} .refraction-tab-desktop-title.refraction-active, {{WRAPPER}} .refraction-tab-title:before, {{WRAPPER}} .refraction-tab-title:after, {{WRAPPER}} .refraction-tab-content, {{WRAPPER}} .refraction-tabs-content-wrapper' => 'border-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'background_color',
			[
				'label' => esc_html__( 'Background Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-desktop-title.refraction-active' => 'background-color: {{VALUE}};',
					'{{WRAPPER}} .refraction-tabs-content-wrapper' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'heading_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'tab_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title, {{WRAPPER}} .refraction-tab-title a' => 'color: {{VALUE}}',
				],
				'global' => [
					'default' => Global_Colors::COLOR_PRIMARY,
				],
			]
		);

		$this->add_control(
			'tab_active_color',
			[
				'label' => esc_html__( 'Active Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title.refraction-active,
					 {{WRAPPER}} .refraction-tab-title.refraction-active a' => 'color: {{VALUE}}',
				],
				'global' => [
					'default' => Global_Colors::COLOR_ACCENT,
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'tab_typography',
				'selector' => '{{WRAPPER}} .refraction-tab-title',
				'global' => [
					'default' => Global_Typography::TYPOGRAPHY_PRIMARY,
				],
			]
		);

		$this->add_group_control(
			Group_Control_Text_Stroke::get_type(),
			[
				'name' => 'text_stroke',
				'selector' => '{{WRAPPER}} .refraction-tab-title',
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => 'title_shadow',
				'selector' => '{{WRAPPER}} .refraction-tab-title',
			]
		);

		$this->add_control(
			'title_align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'rficon-text-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'rficon-text-align-center',
					],
					'end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'rficon-text-align-right',
					],
				],
				'classes' => 'refraction-control-start-end',
				'selectors_dictionary' => [
					'left' => is_rtl() ? 'end' : 'start',
					'right' => is_rtl() ? 'start' : 'end',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title' => 'text-align: {{VALUE}};',
				],
				'condition' => [
					'tabs_align' => 'stretch',
				],
			]
		);

		$this->add_control(
			'heading_content',
			[
				'label' => esc_html__( 'Content', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'content_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-content' => 'color: {{VALUE}};',
				],
				'global' => [
					'default' => Global_Colors::COLOR_TEXT,
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'content_typography',
				'selector' => '{{WRAPPER}} .refraction-tab-content',
				'global' => [
					'default' => Global_Typography::TYPOGRAPHY_TEXT,
				],
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => 'content_shadow',
				'selector' => '{{WRAPPER}} .refraction-tab-content',
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Render tabs widget output on the frontend.
	 *
	 * Written in PHP and used to generate the final HTML.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function render() {
		$tabs = $this->get_settings_for_display( 'tabs' );

		$id_int = substr( $this->get_id_int(), 0, 3 );

		$this->add_render_attribute( 'refraction-tabs', 'class', 'refraction-tabs' );

		?>
		<div <?php $this->print_render_attribute_string( 'refraction-tabs' ); ?>>
			<div class="refraction-tabs-wrapper" role="tablist" >
				<?php
				foreach ( $tabs as $index => $item ) :
					$tab_count = $index + 1;
					$tab_title_setting_key = $this->get_repeater_setting_key( 'tab_title', 'tabs', $index );

					$this->add_render_attribute( $tab_title_setting_key, [
						'id' => 'refraction-tab-title-' . $id_int . $tab_count,
						'class' => [ 'refraction-tab-title', 'refraction-tab-desktop-title' ],
						'aria-selected' => 1 === $tab_count ? 'true' : 'false',
						'data-tab' => $tab_count,
						'role' => 'tab',
						'tabindex' => 1 === $tab_count ? '0' : '-1',
						'aria-controls' => 'refraction-tab-content-' . $id_int . $tab_count,
						'aria-expanded' => 'false',
					] );
					?>
					<div <?php $this->print_render_attribute_string( $tab_title_setting_key ); ?>><?php
						// PHPCS - the main text of a widget should not be escaped.
						echo $item['tab_title']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					?></div>
				<?php endforeach; ?>
			</div>
			<div class="refraction-tabs-content-wrapper" role="tablist" aria-orientation="vertical">
				<?php
				foreach ( $tabs as $index => $item ) :
					$tab_count = $index + 1;
					$hidden = 1 === $tab_count ? 'false' : 'hidden';
					$tab_content_setting_key = $this->get_repeater_setting_key( 'tab_content', 'tabs', $index );

					$tab_title_mobile_setting_key = $this->get_repeater_setting_key( 'tab_title_mobile', 'tabs', $tab_count );

					$this->add_render_attribute( $tab_content_setting_key, [
						'id' => 'refraction-tab-content-' . $id_int . $tab_count,
						'class' => [ 'refraction-tab-content', 'refraction-clearfix' ],
						'data-tab' => $tab_count,
						'role' => 'tabpanel',
						'aria-labelledby' => 'refraction-tab-title-' . $id_int . $tab_count,
						'tabindex' => '0',
						'hidden' => $hidden,
					] );

					$this->add_render_attribute( $tab_title_mobile_setting_key, [
						'class' => [ 'refraction-tab-title', 'refraction-tab-mobile-title' ],
						'aria-selected' => 1 === $tab_count ? 'true' : 'false',
						'data-tab' => $tab_count,
						'role' => 'tab',
						'tabindex' => 1 === $tab_count ? '0' : '-1',
						'aria-controls' => 'refraction-tab-content-' . $id_int . $tab_count,
						'aria-expanded' => 'false',
					] );

					$this->add_inline_editing_attributes( $tab_content_setting_key, 'advanced' );
					?>
					<div <?php $this->print_render_attribute_string( $tab_title_mobile_setting_key ); ?>><?php
						$this->print_unescaped_setting( 'tab_title', 'tabs', $index );
					?></div>
					<div <?php $this->print_render_attribute_string( $tab_content_setting_key ); ?>><?php
						$this->print_text_editor( $item['tab_content'] );
					?></div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
	}

	/**
	 * Render tabs widget output in the editor.
	 *
	 * Written as a Backbone JavaScript template and used to generate the live preview.
	 *
	 * @since 2.9.0
	 * @access protected
	 */
	public function render_markdown(): string {
		$tabs = $this->get_settings_for_display( 'tabs' );

		if ( empty( $tabs ) ) {
			return '';
		}

		$sections = [];

		foreach ( $tabs as $item ) {
			$title = Utils::html_to_plain_text( $item['tab_title'] ?? '' );
			$content = \Refraction\Modules\MarkdownRender\Html_To_Markdown::convert( $item['tab_content'] ?? '' );

			if ( empty( $title ) && empty( $content ) ) {
				continue;
			}

			$section = '### ' . $title;

			if ( ! empty( $content ) ) {
				$section .= "\n\n" . $content;
			}

			$sections[] = $section;
		}

		return implode( "\n\n", $sections );
	}

	protected function content_template() {
		?>
		<div class="refraction-tabs" role="tablist" aria-orientation="vertical">
			<# if ( settings.tabs ) {
				var elementUid = view.getIDInt().toString().substr( 0, 3 ); #>
				<div class="refraction-tabs-wrapper" role="tablist">
					<# _.each( settings.tabs, function( item, index ) {
						var tabCount = index + 1,
							tabUid = elementUid + tabCount,
							tabTitleKey = 'tab-title-' + tabUid;

					view.addRenderAttribute( tabTitleKey, {
						'id': 'refraction-tab-title-' + tabUid,
						'class': [ 'refraction-tab-title','refraction-tab-desktop-title' ],
						'data-tab': tabCount,
						'role': 'tab',
						'tabindex': 1 === tabCount ? '0' : '-1',
						'aria-controls': 'refraction-tab-content-' + tabUid,
						'aria-expanded': 'false',
						} );
					#>
						<div {{{ view.getRenderAttributeString( tabTitleKey ) }}}>{{{ item.tab_title }}}</div>
					<# } ); #>
				</div>
				<div class="refraction-tabs-content-wrapper">
					<# _.each( settings.tabs, function( item, index ) {
						var tabCount = index + 1,
							tabContentKey = view.getRepeaterSettingKey( 'tab_content', 'tabs',index );

						view.addRenderAttribute( tabContentKey, {
							'id': 'refraction-tab-content-' + elementUid + tabCount,
							'class': [ 'refraction-tab-content', 'refraction-clearfix', 'refraction-repeater-item-' + item._id ],
							'data-tab': tabCount,
							'role' : 'tabpanel',
							'aria-labelledby' : 'refraction-tab-title-' + elementUid + tabCount
						} );

						view.addInlineEditingAttributes( tabContentKey, 'advanced' ); #>
						<div class="refraction-tab-title refraction-tab-mobile-title" data-tab="{{ tabCount }}" role="tab">{{{ item.tab_title }}}</div>
						<div {{{ view.getRenderAttributeString( tabContentKey ) }}}>{{{ item.tab_content }}}</div>
					<# } ); #>
				</div>
			<# } #>
		</div>
		<?php
	}
}
