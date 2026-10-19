<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Nav_Menu_Walker;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Nav_Menu extends Pro_Widget {

	public function get_name() {
		return 'refraction-nav-menu';
	}

	public function get_title() {
		return esc_html__( 'Nav Menu', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-nav-menu';
	}

	public function get_keywords() {
		return [ 'menu', 'nav', 'navigation', 'header', 'hamburger', 'links' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-nav-menu' ];
	}

	private function get_menu_options(): array {
		$options = [];

		foreach ( wp_get_nav_menus() as $menu ) {
			$options[ (string) $menu->term_id ] = $menu->name;
		}

		return $options;
	}

	protected function register_controls() {
		$menus = $this->get_menu_options();
		$not_dropdown = [ 'layout!' => 'dropdown' ];

		/* ---------------------------------------------------------- content */
		$this->content_section( 'section_menu', esc_html__( 'Menu', 'refraction' ) );

		if ( $menus ) {
			$this->add_control(
				'menu',
				[
					'label' => esc_html__( 'Menu', 'refraction' ),
					'type' => Controls_Manager::SELECT,
					'options' => $menus,
					'default' => (string) array_key_first( $menus ),
					'save_default' => true,
					'description' => sprintf(
						/* translators: %s: link to the Menus screen */
						esc_html__( 'Go to the %s to manage your menus.', 'refraction' ),
						'<a href="' . esc_url( admin_url( 'nav-menus.php' ) ) . '" target="_blank">' . esc_html__( 'Menus screen', 'refraction' ) . '</a>'
					),
				]
			);
		} else {
			$this->add_control(
				'menu_empty',
				[
					'type' => Controls_Manager::RAW_HTML,
					'raw' => sprintf(
						/* translators: %s: link to the Menus screen */
						esc_html__( 'There are no menus yet. Create one on the %s.', 'refraction' ),
						'<a href="' . esc_url( admin_url( 'nav-menus.php?action=edit&menu=0' ) ) . '" target="_blank">' . esc_html__( 'Menus screen', 'refraction' ) . '</a>'
					),
					'content_classes' => 'refraction-panel-alert refraction-panel-alert-info',
				]
			);
		}

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'horizontal',
				'options' => [
					'horizontal' => esc_html__( 'Horizontal', 'refraction' ),
					'vertical' => esc_html__( 'Vertical', 'refraction' ),
					'dropdown' => esc_html__( 'Dropdown (always collapsed)', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--layout-',
			]
		);

		$this->add_responsive_control(
			'align_items',
			[
				'label' => esc_html__( 'Align Items', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'flex-start' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'rficon-h-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'rficon-h-align-center',
					],
					'flex-end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'rficon-h-align-right',
					],
					'space-between' => [
						'title' => esc_html__( 'Space Between', 'refraction' ),
						'icon' => 'rficon-h-align-stretch',
					],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-nav-menu__list' => 'justify-content: {{VALUE}};',
				],
				'condition' => [ 'layout' => 'horizontal' ],
			]
		);

		$this->add_control(
			'depth',
			[
				'label' => esc_html__( 'Submenu Levels', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '0',
				'options' => [
					'1' => esc_html__( 'Top level only', 'refraction' ),
					'2' => '2',
					'3' => '3',
					'0' => esc_html__( 'All levels', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'indicator',
			[
				'label' => esc_html__( 'Submenu Indicator', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'chevron',
				'options' => [
					'none' => esc_html__( 'None', 'refraction' ),
					'chevron' => esc_html__( 'Chevron', 'refraction' ),
					'caret' => esc_html__( 'Caret', 'refraction' ),
					'plus' => esc_html__( 'Plus', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--indicator-',
			]
		);

		$this->end_section();

		$this->content_section( 'section_toggle', esc_html__( 'Mobile Menu', 'refraction' ) );

		$this->add_control(
			'breakpoint',
			[
				'label' => esc_html__( 'Collapse At', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'mobile',
				'options' => [
					'mobile' => esc_html__( 'Mobile and below', 'refraction' ),
					'tablet' => esc_html__( 'Tablet and below', 'refraction' ),
					'none' => esc_html__( 'Never (always full menu)', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--bp-',
				'condition' => $not_dropdown,
				'description' => esc_html__( 'Below this width the menu turns into a hamburger button.', 'refraction' ),
			]
		);

		$this->add_control(
			'toggle_label',
			[
				'label' => esc_html__( 'Button Label', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Menu', 'refraction' ),
				'description' => esc_html__( 'Read by screen readers. Also shown next to the icon when "Show Label" is on.', 'refraction' ),
				'label_block' => true,
			]
		);

		$this->add_control(
			'toggle_show_label',
			[
				'label' => esc_html__( 'Show Label', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$this->add_responsive_control(
			'toggle_align',
			[
				'label' => esc_html__( 'Button Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'flex-start' => [
						'title' => esc_html__( 'Left', 'refraction' ),
						'icon' => 'rficon-text-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'rficon-text-align-center',
					],
					'flex-end' => [
						'title' => esc_html__( 'Right', 'refraction' ),
						'icon' => 'rficon-text-align-right',
					],
				],
				'default' => 'flex-start',
				'selectors' => [
					'{{WRAPPER}} .refraction-nav-menu__toggle-wrap' => 'justify-content: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'panel_full_width',
			[
				'label' => esc_html__( 'Open Over Content', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default' => 'yes',
				'prefix_class' => 'refraction-nav-menu--overlay-',
				'description' => esc_html__( 'The opened menu floats under the button instead of pushing the page down. Works inside sticky headers.', 'refraction' ),
			]
		);

		$this->end_section();

		/* -------------------------------------------------------------- style */
		$link = '{{WRAPPER}} .refraction-nav-menu__link';
		$link_hover = '{{WRAPPER}} .refraction-nav-menu__item:hover > .refraction-nav-menu__link, {{WRAPPER}} .refraction-nav-menu__link:focus-visible';
		$link_active = '{{WRAPPER}} .current-menu-item > .refraction-nav-menu__link, {{WRAPPER}} .current-menu-ancestor > .refraction-nav-menu__link';

		$this->style_section( 'style_items', esc_html__( 'Menu Items', 'refraction' ) );

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'item_typography',
				'selector' => $link,
			]
		);

		$this->start_controls_tabs( 'item_tabs' );

		foreach ( [
			'normal' => [ esc_html__( 'Normal', 'refraction' ), $link ],
			'hover' => [ esc_html__( 'Hover', 'refraction' ), $link_hover ],
			'active' => [ esc_html__( 'Active', 'refraction' ), $link_active ],
		] as $state => $info ) {
			$this->start_controls_tab( 'item_tab_' . $state, [ 'label' => $info[0] ] );

			$this->add_control(
				'item_color_' . $state,
				[
					'label' => esc_html__( 'Text Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $info[1] => 'color: {{VALUE}};' ],
				]
			);

			$this->add_control(
				'item_bg_' . $state,
				[
					'label' => esc_html__( 'Background Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $info[1] => 'background-color: {{VALUE}};' ],
				]
			);

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_control(
			'hover_effect',
			[
				'label' => esc_html__( 'Hover Effect', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'underline',
				'options' => [
					'none' => esc_html__( 'None', 'refraction' ),
					'underline' => esc_html__( 'Underline', 'refraction' ),
					'overline' => esc_html__( 'Overline', 'refraction' ),
					'double' => esc_html__( 'Double Line', 'refraction' ),
					'framed' => esc_html__( 'Framed', 'refraction' ),
					'background' => esc_html__( 'Background Fill', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--fx-',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'hover_animation',
			[
				'label' => esc_html__( 'Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'slide',
				'options' => [
					'fade' => esc_html__( 'Fade', 'refraction' ),
					'slide' => esc_html__( 'Slide', 'refraction' ),
					'grow' => esc_html__( 'Grow', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--anim-',
				'condition' => [ 'hover_effect!' => 'none' ],
			]
		);

		$this->add_control(
			'pointer_color',
			[
				'label' => esc_html__( 'Effect Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-pointer: {{VALUE}};' ],
				'condition' => [ 'hover_effect!' => 'none' ],
			]
		);

		$this->add_control(
			'pointer_height',
			[
				'label' => esc_html__( 'Effect Thickness', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 1, 'max' => 12 ] ],
				'default' => [ 'size' => 2, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-pointer-size: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'hover_effect!' => 'none' ],
			]
		);

		$this->add_responsive_control(
			'item_padding',
			[
				'label' => esc_html__( 'Item Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem' ],
				'selectors' => [ $link => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'item_gap',
			[
				'label' => esc_html__( 'Space Between Items', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'max' => 80 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-nav-menu__list' => 'gap: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'item_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ $link => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'indicator_color',
			[
				'label' => esc_html__( 'Indicator Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-nav-menu__indicator' => 'color: {{VALUE}};' ],
				'condition' => [ 'indicator!' => 'none' ],
			]
		);

		$this->end_section();

		$sub = '{{WRAPPER}} .refraction-nav-menu__sub';

		$this->style_section( 'style_submenu', esc_html__( 'Submenu', 'refraction' ) );

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'sub_typography',
				'selector' => $sub . ' .refraction-nav-menu__link',
			]
		);

		$this->add_control(
			'sub_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sub . ' .refraction-nav-menu__link' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'sub_color_hover',
			[
				'label' => esc_html__( 'Text Color (Hover)', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sub . ' .refraction-nav-menu__link:hover, ' . $sub . ' .refraction-nav-menu__link:focus-visible' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'sub_bg_hover',
			[
				'label' => esc_html__( 'Background (Hover)', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sub . ' .refraction-nav-menu__link:hover, ' . $sub . ' .refraction-nav-menu__link:focus-visible' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'sub_panel_bg',
				'types' => [ 'classic', 'gradient' ],
				'exclude' => [ 'image' ],
				'selector' => $sub,
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'sub_panel_border',
				'selector' => $sub,
			]
		);

		$this->add_responsive_control(
			'sub_panel_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ $sub => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'sub_panel_shadow',
				'selector' => $sub,
			]
		);

		$this->add_responsive_control(
			'sub_width',
			[
				'label' => esc_html__( 'Minimum Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 100, 'max' => 500 ] ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-sub-width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'sub_item_padding',
			[
				'label' => esc_html__( 'Item Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem' ],
				'selectors' => [ $sub . ' .refraction-nav-menu__link' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->end_section();

		$toggle = '{{WRAPPER}} .refraction-nav-menu__toggle';

		$this->style_section( 'style_toggle', esc_html__( 'Hamburger Button', 'refraction' ) );

		$this->add_control(
			'toggle_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $toggle => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'toggle_color_hover',
			[
				'label' => esc_html__( 'Hover Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $toggle . ':hover, ' . $toggle . ':focus-visible' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'toggle_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $toggle => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'toggle_size',
			[
				'label' => esc_html__( 'Icon Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 12, 'max' => 64 ] ],
				'selectors' => [ $toggle => '--refraction-nav-burger: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'toggle_typography',
				'selector' => $toggle . ' .refraction-nav-menu__toggle-label',
				'condition' => [ 'toggle_show_label' => 'yes' ],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'toggle_border',
				'selector' => $toggle,
			]
		);

		$this->add_responsive_control(
			'toggle_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ $toggle => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'toggle_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ $toggle => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->end_section();

		$panel = '{{WRAPPER}} .refraction-nav-menu__panel';

		$this->style_section( 'style_panel', esc_html__( 'Collapsed Menu Panel', 'refraction' ) );

		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => 'panel_bg',
				'types' => [ 'classic', 'gradient' ],
				'exclude' => [ 'image' ],
				'selector' => $panel,
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'panel_border',
				'selector' => $panel,
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'panel_shadow',
				'selector' => $panel,
			]
		);

		$this->add_responsive_control(
			'panel_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ $panel => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'panel_z_index',
			[
				'label' => esc_html__( 'Z-Index', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 999,
				'selectors' => [ $panel => 'z-index: {{VALUE}};' ],
				'description' => esc_html__( 'Raise it if the opened menu hides behind sticky or overlapping content.', 'refraction' ),
			]
		);

		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$menu_id = isset( $settings['menu'] ) ? (int) $settings['menu'] : 0;

		if ( ! $menu_id ) {
			$this->render_editor_hint( esc_html__( 'Choose a menu in the widget settings.', 'refraction' ) );
			return;
		}

		$menu_html = wp_nav_menu( [
			'menu' => $menu_id,
			'container' => false,
			'menu_class' => 'refraction-nav-menu__list',
			'items_wrap' => '<ul id="%1$s" class="%2$s">%3$s</ul>',
			'menu_id' => 'refraction-nav-' . $this->get_id(),
			'depth' => (int) ( $settings['depth'] ?? 0 ),
			'walker' => new Nav_Menu_Walker(),
			'fallback_cb' => false,
			'echo' => false,
		] );

		if ( ! $menu_html ) {
			$this->render_editor_hint( esc_html__( 'This menu has no items yet.', 'refraction' ) );
			return;
		}

		$label = '' !== trim( (string) ( $settings['toggle_label'] ?? '' ) ) ? $settings['toggle_label'] : __( 'Menu', 'refraction' );
		$panel_id = 'refraction-nav-panel-' . $this->get_id();

		$this->add_render_attribute( 'nav', [
			'class' => 'refraction-nav-menu',
			'aria-label' => $label,
		] );
		?>
		<nav <?php $this->print_render_attribute_string( 'nav' ); ?>>
			<div class="refraction-nav-menu__toggle-wrap">
				<button type="button" class="refraction-nav-menu__toggle" aria-expanded="false" aria-controls="<?php echo esc_attr( $panel_id ); ?>" aria-label="<?php echo esc_attr( $label ); ?>">
					<span class="refraction-nav-menu__burger" aria-hidden="true"><span></span><span></span><span></span></span>
					<?php if ( 'yes' === ( $settings['toggle_show_label'] ?? '' ) ) : ?>
						<span class="refraction-nav-menu__toggle-label"><?php echo esc_html( $label ); ?></span>
					<?php endif; ?>
				</button>
			</div>
			<div class="refraction-nav-menu__panel" id="<?php echo esc_attr( $panel_id ); ?>">
				<?php echo $menu_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_nav_menu() with an escaping walker. ?>
			</div>
		</nav>
		<?php
	}
}
