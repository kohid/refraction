<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

use Refraction\Core\Kits\Documents\Tabs\Global_Colors;
use Refraction\Core\Kits\Documents\Tabs\Global_Typography;

/**
 * Refraction toggle widget.
 *
 * Refraction widget that displays a collapsible display of content in an toggle
 * style, allowing the user to open multiple items.
 *
 * @since 1.0.0
 */
class Widget_Toggle extends Widget_Base {

	/**
	 * Get widget name.
	 *
	 * Retrieve toggle widget name.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget name.
	 */
	public function get_name() {
		return 'toggle';
	}

	/**
	 * Get widget title.
	 *
	 * Retrieve toggle widget title.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget title.
	 */
	public function get_title() {
		return esc_html__( 'Toggle', 'refraction' );
	}

	/**
	 * Get widget icon.
	 *
	 * Retrieve toggle widget icon.
	 *
	 * @since 1.0.0
	 * @access public
	 *
	 * @return string Widget icon.
	 */
	public function get_icon() {
		return 'rficon-toggle';
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
		return [ 'widget-toggle' ];
	}

	/**
	 * Hide widget from panel.
	 *
	 * Hide the toggle widget from the panel if nested-accordion experiment is active.
	 *
	 * @since 3.15.0
	 * @return bool
	 */
	public function show_in_panel(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'container' );
	}

	public function has_widget_inner_wrapper(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
	}

	/**
	 * Register toggle widget controls.
	 *
	 * Adds different input fields to allow the user to change and customize the widget settings.
	 *
	 * @since 3.1.0
	 * @access protected
	 */
	protected function register_controls() {
		$this->start_controls_section(
			'section_toggle',
			[
				'label' => esc_html__( 'Toggle', 'refraction' ),
			]
		);

		$repeater = new Repeater();

		$repeater->add_control(
			'tab_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Toggle Title', 'refraction' ),
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
				'type' => Controls_Manager::WYSIWYG,
				'default' => esc_html__( 'Toggle Content', 'refraction' ),
				'dynamic' => [
					'active' => true,
				],
			]
		);

		if ( Plugin::$instance->widgets_manager->get_widget_types( 'nested-accordion' ) ) {
			$this->add_deprecation_message(
				'3.15.0',
				esc_html__(
					'You are currently editing a Toggle widget in its old version. Drag a new Accordion widget onto your page to use a newer version, providing nested capabilities.',
					'refraction'
				),
				'nested-accordion'
			);
		}

		$this->add_control(
			'tabs',
			[
				'label' => esc_html__( 'Toggle Items', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[
						'tab_title' => esc_html__( 'Toggle #1', 'refraction' ),
						'tab_content' => esc_html__( 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.', 'refraction' ),
					],
					[
						'tab_title' => esc_html__( 'Toggle #2', 'refraction' ),
						'tab_content' => esc_html__( 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.', 'refraction' ),
					],
				],
				'title_field' => '{{{ tab_title }}}',
			]
		);

		$this->add_control(
			'selected_icon',
			[
				'label' => esc_html__( 'Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'separator' => 'before',
				'fa4compatibility' => 'icon',
				'default' => [
					'value' => 'fas fa-caret' . ( is_rtl() ? '-left' : '-right' ),
					'library' => 'fa-solid',
				],
				'recommended' => [
					'fa-solid' => [
						'chevron-down',
						'angle-down',
						'angle-double-down',
						'caret-down',
						'caret-square-down',
					],
					'fa-regular' => [
						'caret-square-down',
					],
				],
				'label_block' => false,
				'skin' => 'inline',
			]
		);

		$this->add_control(
			'selected_active_icon',
			[
				'label' => esc_html__( 'Active Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'fa4compatibility' => 'icon_active',
				'default' => [
					'value' => 'fas fa-caret-up',
					'library' => 'fa-solid',
				],
				'recommended' => [
					'fa-solid' => [
						'chevron-up',
						'angle-up',
						'angle-double-up',
						'caret-up',
						'caret-square-up',
					],
					'fa-regular' => [
						'caret-square-up',
					],
				],
				'skin' => 'inline',
				'label_block' => false,
				'condition' => [
					'selected_icon[value]!' => '',
				],
			]
		);

		$this->add_control(
			'title_html_tag',
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
				],
				'default' => 'div',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'faq_schema',
			[
				'label' => esc_html__( 'FAQ Schema', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'separator' => 'before',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_toggle_style',
			[
				'label' => esc_html__( 'Toggle', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'border_width',
			[
				'label' => esc_html__( 'Border Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'range' => [
					'px' => [
						'max' => 20,
					],
					'em' => [
						'max' => 2,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title' => 'border-width: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .refraction-tab-content' => 'border-width: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'border_color',
			[
				'label' => esc_html__( 'Border Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-content' => 'border-block-end-color: {{VALUE}};',
					'{{WRAPPER}} .refraction-tab-title' => 'border-color: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'space_between',
			[
				'label' => esc_html__( 'Space Between', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'range' => [
					'px' => [
						'max' => 100,
					],
					'em' => [
						'max' => 10,
					],
					'rem' => [
						'max' => 10,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-toggle-item:not(:last-child)' => 'margin-block-end: {{SIZE}}{{UNIT}}',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'box_shadow',
				'selector' => '{{WRAPPER}} .refraction-toggle-item',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_toggle_style_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'title_background',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title' => 'background-color: {{VALUE}};',
				],
			]
		);

		// The title selector specificity is to override Theme Style
		$this->add_control(
			'title_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-toggle-title, {{WRAPPER}} .refraction-toggle-icon' => 'color: {{VALUE}};',
					'{{WRAPPER}} .refraction-toggle-icon svg' => 'fill: {{VALUE}};',
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
					'{{WRAPPER}} .refraction-tab-title.refraction-active a, {{WRAPPER}} .refraction-tab-title.refraction-active .refraction-toggle-icon' => 'color: {{VALUE}};',
				],
				'global' => [
					'default' => Global_Colors::COLOR_ACCENT,
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'title_typography',
				'selector' => '{{WRAPPER}} .refraction-toggle-title',
				'global' => [
					'default' => Global_Typography::TYPOGRAPHY_PRIMARY,
				],
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => 'title_shadow',
				'selector' => '{{WRAPPER}} .refraction-toggle-title',
			]
		);

		$this->add_responsive_control(
			'title_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_toggle_style_icon',
			[
				'label' => esc_html__( 'Icon', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [
					'selected_icon[value]!' => '',
				],
			]
		);

		$this->add_control(
			'icon_align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'left' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'rficon-h-align-left',
					],
					'right' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'rficon-h-align-right',
					],
				],
				'default' => is_rtl() ? 'right' : 'left',
				'toggle' => false,
			]
		);

		$this->add_control(
			'icon_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title .refraction-toggle-icon i:before' => 'color: {{VALUE}};',
					'{{WRAPPER}} .refraction-tab-title .refraction-toggle-icon svg' => 'fill: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'icon_active_color',
			[
				'label' => esc_html__( 'Active Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-title.refraction-active .refraction-toggle-icon i:before' => 'color: {{VALUE}};',
					'{{WRAPPER}} .refraction-tab-title.refraction-active .refraction-toggle-icon svg' => 'fill: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'icon_space',
			[
				'label' => esc_html__( 'Spacing', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem', 'custom' ],
				'range' => [
					'px' => [
						'max' => 100,
					],
					'em' => [
						'max' => 10,
					],
					'rem' => [
						'max' => 10,
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-toggle-icon' => 'margin-inline-end: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_toggle_style_content',
			[
				'label' => esc_html__( 'Content', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'content_background_color',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-content' => 'background-color: {{VALUE}};',
				],
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

		$this->add_responsive_control(
			'content_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-tab-content' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Render toggle widget output on the frontend.
	 *
	 * Written in PHP and used to generate the final HTML.
	 *
	 * @since 1.0.0
	 * @access protected
	 */
	protected function render() {
		$settings = $this->get_settings_for_display();

		$id_int = substr( $this->get_id_int(), 0, 3 );
		$migrated = isset( $settings['__fa4_migrated']['selected_icon'] );

		if ( ! isset( $settings['icon'] ) && ! Icons_Manager::is_migration_allowed() ) {
			// @todo: remove when deprecated
			// added as bc in 2.6
			// add old default
			$settings['icon'] = 'fa fa-caret' . ( is_rtl() ? '-left' : '-right' );
			$settings['icon_active'] = 'fa fa-caret-up';
			$settings['icon_align'] = $this->get_settings( 'icon_align' );
		}

		$is_new = empty( $settings['icon'] ) && Icons_Manager::is_migration_allowed();
		$has_icon = ( ! $is_new || ! empty( $settings['selected_icon']['value'] ) );

		?>
		<div class="refraction-toggle">
			<?php
			foreach ( $settings['tabs'] as $index => $item ) :
				$tab_count = $index + 1;

				$tab_title_setting_key = $this->get_repeater_setting_key( 'tab_title', 'tabs', $index );

				$tab_content_setting_key = $this->get_repeater_setting_key( 'tab_content', 'tabs', $index );

				$this->add_render_attribute( $tab_title_setting_key, [
					'id' => 'refraction-tab-title-' . $id_int . $tab_count,
					'class' => [ 'refraction-tab-title' ],
					'data-tab' => $tab_count,
					'role' => 'button',
					'aria-controls' => 'refraction-tab-content-' . $id_int . $tab_count,
					'aria-expanded' => 'false',
				] );

				$this->add_render_attribute( $tab_content_setting_key, [
					'id' => 'refraction-tab-content-' . $id_int . $tab_count,
					'class' => [ 'refraction-tab-content', 'refraction-clearfix' ],
					'data-tab' => $tab_count,
					'role' => 'region',
					'aria-labelledby' => 'refraction-tab-title-' . $id_int . $tab_count,
				] );

				$this->add_inline_editing_attributes( $tab_content_setting_key, 'advanced' );
				?>
				<div class="refraction-toggle-item">
					<<?php Utils::print_validated_html_tag( $settings['title_html_tag'] ); ?> <?php $this->print_render_attribute_string( $tab_title_setting_key ); ?>>
						<?php if ( $has_icon ) : ?>
						<span class="refraction-toggle-icon refraction-toggle-icon-<?php echo esc_attr( $settings['icon_align'] ); ?>" aria-hidden="true">
							<?php
							if ( $is_new || $migrated ) { ?>
								<span class="refraction-toggle-icon-closed"><?php Icons_Manager::render_icon( $settings['selected_icon'] ); ?></span>
								<span class="refraction-toggle-icon-opened"><?php Icons_Manager::render_icon( $settings['selected_active_icon'], [ 'class' => 'refraction-toggle-icon-opened' ] ); ?></span>
							<?php } else { ?>
								<i class="refraction-toggle-icon-closed <?php echo esc_attr( $settings['icon'] ); ?>"></i>
								<i class="refraction-toggle-icon-opened <?php echo esc_attr( $settings['icon_active'] ); ?>"></i>
							<?php } ?>
						</span>
						<?php endif; ?>
						<a class="refraction-toggle-title" tabindex="0"><?php $this->print_unescaped_setting( 'tab_title', 'tabs', $index ); ?></a>
					</<?php Utils::print_validated_html_tag( $settings['title_html_tag'] ); ?>>

					<div <?php $this->print_render_attribute_string( $tab_content_setting_key ); ?>><?php Utils::print_unescaped_internal_string( $this->parse_text_editor( $item['tab_content'] ) ); ?></div>
				</div>
			<?php endforeach; ?>
			<?php
			if ( isset( $settings['faq_schema'] ) && 'yes' === $settings['faq_schema'] ) {
				$json = [
					'@context' => 'https://schema.org',
					'@type' => 'FAQPage',
					'mainEntity' => [],
				];

				foreach ( $settings['tabs'] as $index => $item ) {
					$json['mainEntity'][] = [
						'@type' => 'Question',
						'name' => wp_strip_all_tags( $item['tab_title'] ),
						'acceptedAnswer' => [
							'@type' => 'Answer',
							'text' => $this->parse_text_editor( $item['tab_content'] ),
						],
					];
				}
				?>
				<script type="application/ld+json"><?php echo wp_json_encode( $json ); ?></script>
			<?php } ?>
		</div>
		<?php
	}

	/**
	 * Render toggle widget output in the editor.
	 *
	 * Written as a Backbone JavaScript template and used to generate the live preview.
	 *
	 * @since 2.9.0
	 * @access protected
	 */
	protected function content_template() {
		?>
		<div class="refraction-toggle">
			<#
			if ( settings.tabs ) {
				var tabindex = view.getIDInt().toString().substr( 0, 3 ),
					iconHTML = refraction.helpers.renderIcon( view, settings.selected_icon, {}, 'i' , 'object' ),
					iconActiveHTML = refraction.helpers.renderIcon( view, settings.selected_active_icon, {}, 'i' , 'object' ),
					migrated = refraction.helpers.isIconMigrated( settings, 'selected_icon' ),
					titleHTMLTag = refraction.helpers.validateHTMLTag( settings.title_html_tag );

				_.each( settings.tabs, function( item, index ) {
					var tabCount = index + 1,
						tabTitleKey = view.getRepeaterSettingKey( 'tab_title', 'tabs', index ),
						tabContentKey = view.getRepeaterSettingKey( 'tab_content', 'tabs', index );

					view.addRenderAttribute( tabTitleKey, {
						'id': 'refraction-tab-title-' + tabindex + tabCount,
						'class': [ 'refraction-tab-title' ],
						'data-tab': tabCount,
						'role': 'button',
						'aria-controls': 'refraction-tab-content-' + tabindex + tabCount,
						'aria-expanded': 'false',
					} );

					view.addRenderAttribute( tabContentKey, {
						'id': 'refraction-tab-content-' + tabindex + tabCount,
						'class': [ 'refraction-tab-content', 'refraction-clearfix' ],
						'data-tab': tabCount,
						'role': 'region',
						'aria-labelledby': 'refraction-tab-title-' + tabindex + tabCount
					} );

					view.addInlineEditingAttributes( tabContentKey, 'advanced' );
					#>
					<div class="refraction-toggle-item">
						<{{{ titleHTMLTag }}} {{{ view.getRenderAttributeString( tabTitleKey ) }}}>
							<# if ( settings.icon || settings.selected_icon ) { #>
							<span class="refraction-toggle-icon refraction-toggle-icon-{{ settings.icon_align }}" aria-hidden="true">
								<# if ( iconHTML && iconHTML.rendered && ( ! settings.icon || migrated ) ) { #>
									<span class="refraction-toggle-icon-closed">{{{ iconHTML.value }}}</span>
									<span class="refraction-toggle-icon-opened">{{{ iconActiveHTML.value }}}</span>
								<# } else { #>
									<i class="refraction-toggle-icon-closed {{ settings.icon }}"></i>
									<i class="refraction-toggle-icon-opened {{ settings.icon_active }}"></i>
								<# } #>
							</span>
							<# } #>
							<a class="refraction-toggle-title" tabindex="0">{{{ item.tab_title }}}</a>
						</{{{ titleHTMLTag }}}>
						<div {{{ view.getRenderAttributeString( tabContentKey ) }}}>{{{ item.tab_content }}}</div>
					</div>
					<#
				} );
			} #>
		</div>
		<?php
	}

	public function render_markdown(): string {
		$settings = $this->get_settings_for_display();
		if ( empty( $settings['tabs'] ) ) {
			return '';
		}
		$sections = [];
		foreach ( $settings['tabs'] as $item ) {
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
}
