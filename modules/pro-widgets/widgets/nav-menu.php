<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
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
					'icon' => esc_html__( 'Choose an icon', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--indicator-',
			]
		);

		$this->add_control(
			'indicator_icon',
			[
				'label' => esc_html__( 'Submenu Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'default' => [ 'value' => 'fas fa-chevron-down', 'library' => 'fa-solid' ],
				'skin' => 'inline',
				'label_block' => false,
				'condition' => [ 'indicator' => 'icon' ],
			]
		);

		$this->end_section();

		$this->register_bar_brand_controls();

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
			'panel_style',
			[
				'label' => esc_html__( 'Menu Panel', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'dropdown',
				'options' => [
					'dropdown' => esc_html__( 'Dropdown under the button', 'refraction' ),
					'offcanvas-right' => esc_html__( 'Slide in from the right', 'refraction' ),
					'offcanvas-left' => esc_html__( 'Slide in from the left', 'refraction' ),
					'fullscreen' => esc_html__( 'Full screen', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--panel-',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'panel_stretch',
			[
				'label' => esc_html__( 'Dropdown Width', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'full',
				'options' => [
					'full' => esc_html__( 'Full width of the screen', 'refraction' ),
					'widget' => esc_html__( 'Width of the widget', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--stretch-',
				'condition' => [ 'panel_style' => 'dropdown', 'panel_full_width' => 'yes' ],
			]
		);

		$this->add_control(
			'panel_animation',
			[
				'label' => esc_html__( 'Open Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'slide-down',
				'options' => [
					'none' => esc_html__( 'None', 'refraction' ),
					'fade' => esc_html__( 'Fade', 'refraction' ),
					'slide-down' => esc_html__( 'Slide down', 'refraction' ),
					'slide-up' => esc_html__( 'Slide up', 'refraction' ),
					'zoom' => esc_html__( 'Zoom', 'refraction' ),
					'side' => esc_html__( 'Slide from the side', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--panel-anim-',
				'description' => esc_html__( 'The panels that slide in from a side always slide; this is for the dropdown and full screen.', 'refraction' ),
			]
		);

		$this->add_control(
			'panel_duration',
			[
				'label' => esc_html__( 'Animation Duration', 'refraction' ) . ' (ms)',
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 1500, 'step' => 50 ] ],
				'default' => [ 'size' => 300, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-panel-duration: {{SIZE}}ms;' ],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'panel_close_button',
			[
				'label' => esc_html__( 'Close Button In The Panel', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'condition' => [ 'panel_style!' => 'dropdown' ],
			]
		);

		$this->add_control(
			'panel_brand',
			[
				'label' => esc_html__( 'Panel Header', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'none',
				'options' => [
					'none' => esc_html__( 'None', 'refraction' ),
					'logo' => esc_html__( 'Site logo', 'refraction' ),
					'name' => esc_html__( 'Site name', 'refraction' ),
					'image' => esc_html__( 'Choose an image', 'refraction' ),
					'text' => esc_html__( 'Your own text', 'refraction' ),
				],
				'description' => esc_html__( 'Shown at the top of the opened menu, linked to the home page. The site logo and name are set in Site Settings > Site Identity.', 'refraction' ),
				'separator' => 'before',
			]
		);

		$this->add_control(
			'panel_brand_image',
			[
				'label' => esc_html__( 'Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'condition' => [ 'panel_brand' => 'image' ],
			]
		);

		$this->add_control(
			'panel_brand_text',
			[
				'label' => esc_html__( 'Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => get_bloginfo( 'name' ),
				'condition' => [ 'panel_brand' => 'text' ],
			]
		);

		$panel_buttons = new \Refraction\Repeater();

		$panel_buttons->add_control( 'text', [
			'label' => esc_html__( 'Text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Book now', 'refraction' ),
			'dynamic' => [ 'active' => true ],
		] );

		$panel_buttons->add_control( 'link', [
			'label' => esc_html__( 'Link', 'refraction' ),
			'type' => Controls_Manager::URL,
			'dynamic' => [ 'active' => true ],
			'default' => [ 'url' => '#' ],
		] );

		$panel_buttons->add_control( 'style', [
			'label' => esc_html__( 'Style', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'filled',
			'options' => [
				'filled' => esc_html__( 'Filled', 'refraction' ),
				'outline' => esc_html__( 'Outline', 'refraction' ),
			],
		] );

		$panel_buttons->add_control( 'icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'skin' => 'inline',
			'label_block' => false,
		] );

		$this->add_control(
			'panel_buttons',
			[
				'label' => esc_html__( 'Buttons In The Panel', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $panel_buttons->get_controls(),
				'default' => [],
				'title_field' => '{{{ text }}}',
				'prevent_empty' => false,
				'description' => esc_html__( 'Shown under the menu items when the menu is opened.', 'refraction' ),
			]
		);

		$this->add_control(
			'toggle_animation',
			[
				'label' => esc_html__( 'Button Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'x',
				'options' => [
					'x' => esc_html__( 'Turns into an X', 'refraction' ),
					'spin' => esc_html__( 'Spins into an X', 'refraction' ),
					'arrow-left' => esc_html__( 'Turns into an arrow (left)', 'refraction' ),
					'arrow-right' => esc_html__( 'Turns into an arrow (right)', 'refraction' ),
					'collapse' => esc_html__( 'Lines collapse into one', 'refraction' ),
					'none' => esc_html__( 'None', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--burger-',
				'separator' => 'before',
				'condition' => [ 'toggle_icon[value]' => '' ],
			]
		);

		$this->add_control(
			'toggle_icon',
			[
				'label' => esc_html__( 'Button Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'skin' => 'inline',
				'label_block' => false,
				'description' => esc_html__( 'Empty: the three lines.', 'refraction' ),
			]
		);

		$this->add_control(
			'toggle_close_icon',
			[
				'label' => esc_html__( 'Close Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'skin' => 'inline',
				'label_block' => false,
				'condition' => [ 'toggle_icon[value]!' => '' ],
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
				'condition' => [ 'panel_style' => 'dropdown' ],
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
					'strike' => esc_html__( 'Line Through', 'refraction' ),
					'highlight' => esc_html__( 'Highlighter', 'refraction' ),
					'dot' => esc_html__( 'Dot', 'refraction' ),
					'framed' => esc_html__( 'Framed', 'refraction' ),
					'corners' => esc_html__( 'Corners', 'refraction' ),
					'brackets' => esc_html__( 'Brackets', 'refraction' ),
					'background' => esc_html__( 'Background Fill', 'refraction' ),
					'pill' => esc_html__( 'Pill', 'refraction' ),
					'glow' => esc_html__( 'Glow', 'refraction' ),
					'lift' => esc_html__( 'Lift', 'refraction' ),
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
					'from-left' => esc_html__( 'Grow from the left', 'refraction' ),
					'from-right' => esc_html__( 'Grow from the right', 'refraction' ),
					'drop' => esc_html__( 'Drop in', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--anim-',
				'condition' => [ 'hover_effect' => [ 'underline', 'overline', 'double', 'strike', 'highlight', 'dot', 'corners', 'brackets' ] ],
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
				'condition' => [ 'hover_effect' => [ 'underline', 'overline', 'double', 'strike', 'highlight', 'dot', 'framed', 'corners' ] ],
			]
		);

		$lines = [ 'hover_effect' => [ 'underline', 'overline', 'double', 'strike', 'highlight' ] ];

		$this->add_responsive_control(
			'pointer_width',
			[
				'label' => esc_html__( 'Effect Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%', 'px', 'em' ],
				'range' => [
					'%' => [ 'min' => 5, 'max' => 100 ],
					'px' => [ 'min' => 4, 'max' => 300 ],
					'em' => [ 'min' => 0.2, 'max' => 15, 'step' => 0.1 ],
				],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-pointer-width: {{SIZE}}{{UNIT}};' ],
				'description' => esc_html__( 'Empty: as wide as the text. % is of the whole item.', 'refraction' ),
				'condition' => $lines,
			]
		);

		$this->add_control(
			'pointer_align',
			[
				'label' => esc_html__( 'Effect Position', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				],
				'selectors_dictionary' => [ 'left' => '0', 'center' => '0.5', 'right' => '1' ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-pointer-pos: {{VALUE}};' ],
				'condition' => array_merge( $lines, [ 'pointer_width[size]!' => '' ] ),
			]
		);

		$this->add_responsive_control(
			'pointer_offset',
			[
				'label' => esc_html__( 'Distance From The Edge', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [
					'px' => [ 'min' => -20, 'max' => 40 ],
					'em' => [ 'min' => -1, 'max' => 2, 'step' => 0.05 ],
				],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-pointer-offset: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'hover_effect' => [ 'underline', 'overline', 'double', 'dot' ] ],
			]
		);

		$this->add_control(
			'pointer_radius',
			[
				'label' => esc_html__( 'Effect Roundness', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-pointer-radius: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'hover_effect' => [ 'underline', 'overline', 'double', 'strike', 'highlight', 'framed', 'background' ] ],
			]
		);

		$this->add_control(
			'pointer_text',
			[
				'label' => esc_html__( 'Text Color On The Effect', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-pointer-text: {{VALUE}};' ],
				'condition' => [ 'hover_effect' => [ 'background', 'pill' ] ],
			]
		);

		$this->add_control(
			'pointer_speed',
			[
				'label' => esc_html__( 'Effect Speed', 'refraction' ) . ' (ms)',
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 1500, 'step' => 50 ] ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-pointer-speed: {{SIZE}}ms;' ],
				'condition' => [ 'hover_effect!' => 'none' ],
			]
		);

		$this->add_responsive_control(
			'item_padding',
			[
				'label' => esc_html__( 'Item Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', 'rem' ],
				'selectors' => [ $link => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}; --refraction-nav-link-pl: {{LEFT}}{{UNIT}}; --refraction-nav-link-pr: {{RIGHT}}{{UNIT}}; --refraction-nav-link-pb: {{BOTTOM}}{{UNIT}};' ],
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

		$this->end_section();

		$sub_toggle = '{{WRAPPER}} .refraction-nav-menu__subtoggle';

		$this->style_section( 'style_indicator', esc_html__( 'Submenu Icon', 'refraction' ) );

		$this->add_responsive_control(
			'indicator_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 6, 'max' => 40 ] ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-indicator: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'indicator_gap',
			[
				'label' => esc_html__( 'Space From The Text', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'selectors' => [ $sub_toggle => 'margin-inline-start: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'indicator_rotate',
			[
				'label' => esc_html__( 'Turn When Open', 'refraction' ) . ' (deg)',
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => -360, 'max' => 360 ] ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-indicator-turn: {{SIZE}}deg;' ],
				'condition' => [ 'indicator' => [ 'icon', 'caret' ] ],
			]
		);

		$this->start_controls_tabs( 'indicator_tabs' );

		foreach ( [
			'normal' => [ esc_html__( 'Normal', 'refraction' ), $sub_toggle ],
			'hover' => [ esc_html__( 'Hover', 'refraction' ), $sub_toggle . ':hover, ' . $sub_toggle . ':focus-visible, {{WRAPPER}} .refraction-nav-menu__item:hover > .refraction-nav-menu__subtoggle' ],
			'open' => [ esc_html__( 'Open', 'refraction' ), '{{WRAPPER}} .refraction-nav-menu__item.is-open > .refraction-nav-menu__subtoggle' ],
		] as $state => $info ) {
			$this->start_controls_tab( 'indicator_tab_' . $state, [ 'label' => $info[0] ] );

			$this->add_control(
				'normal' === $state ? 'indicator_color' : 'indicator_color_' . $state,
				[
					'label' => esc_html__( 'Icon Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $info[1] => 'color: {{VALUE}};' ],
				]
			);

			$this->add_control(
				'indicator_bg_' . $state,
				[
					'label' => esc_html__( 'Button Background', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $info[1] => 'background-color: {{VALUE}};' ],
				]
			);

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_responsive_control(
			'indicator_padding',
			[
				'label' => esc_html__( 'Button Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ $sub_toggle => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'indicator_radius',
			[
				'label' => esc_html__( 'Button Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ $sub_toggle => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'indicator_border',
				'selector' => $sub_toggle,
			]
		);

		$this->end_section();

		$sub = '{{WRAPPER}} .refraction-nav-menu__sub';

		$this->style_section( 'style_submenu', esc_html__( 'Submenu', 'refraction' ) );

		$this->add_control(
			'sub_hover_effect',
			[
				'label' => esc_html__( 'Hover Effect', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'background',
				'options' => [
					'background' => esc_html__( 'Background (the color below)', 'refraction' ),
					'underline' => esc_html__( 'Underline', 'refraction' ),
					'bar' => esc_html__( 'Bar at the side', 'refraction' ),
					'slide' => esc_html__( 'Text slides in', 'refraction' ),
					'arrow' => esc_html__( 'Arrow appears', 'refraction' ),
					'dot' => esc_html__( 'Dot', 'refraction' ),
					'highlight' => esc_html__( 'Highlighter', 'refraction' ),
					'none' => esc_html__( 'None', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--subfx-',
				'description' => esc_html__( 'Its own effect, separate from the main menu items.', 'refraction' ),
			]
		);

		$this->add_control(
			'sub_pointer_color',
			[
				'label' => esc_html__( 'Effect Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-sub-pointer: {{VALUE}};' ],
				'condition' => [ 'sub_hover_effect!' => [ 'background', 'none' ] ],
			]
		);

		$this->add_control(
			'sub_pointer_size',
			[
				'label' => esc_html__( 'Effect Thickness', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 1, 'max' => 12 ] ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-sub-pointer-size: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'sub_hover_effect' => [ 'underline', 'bar', 'slide', 'dot' ] ],
			]
		);

		$this->add_control(
			'sub_animation',
			[
				'label' => esc_html__( 'Open Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'fade-up',
				'options' => [
					'fade-up' => esc_html__( 'Fade up', 'refraction' ),
					'fade' => esc_html__( 'Fade', 'refraction' ),
					'slide-down' => esc_html__( 'Slide down', 'refraction' ),
					'zoom' => esc_html__( 'Zoom', 'refraction' ),
					'flip' => esc_html__( 'Flip down', 'refraction' ),
					'none' => esc_html__( 'None', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--subanim-',
				'separator' => 'before',
				'description' => esc_html__( 'How a submenu opens under its item (side by side menus).', 'refraction' ),
			]
		);

		$this->add_control(
			'sub_align',
			[
				'label' => esc_html__( 'Position Under The Item', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				],
				'default' => 'start',
				'prefix_class' => 'refraction-nav-menu--sub-align-',
			]
		);

		$this->add_responsive_control(
			'sub_offset',
			[
				'label' => esc_html__( 'Distance From The Item', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-sub-offset: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'sub_panel_padding',
			[
				'label' => esc_html__( 'Panel Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ $sub => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'sub_item_gap',
			[
				'label' => esc_html__( 'Space Between Items', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 30 ] ],
				'selectors' => [ $sub . ' > .refraction-nav-menu__item + .refraction-nav-menu__item' => 'margin-top: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'sub_divider',
			[
				'label' => esc_html__( 'Line Between Items', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sub . ' > .refraction-nav-menu__item + .refraction-nav-menu__item' => 'border-top: 1px solid {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'sub_item_radius',
			[
				'label' => esc_html__( 'Item Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ $sub . ' .refraction-nav-menu__link' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'separator' => 'after',
			]
		);

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

		$this->add_control(
			'sub_color_active',
			[
				'label' => esc_html__( 'Text Color (Current Page)', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sub . ' .current-menu-item > .refraction-nav-menu__link' => 'color: {{VALUE}};' ],
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
				'selectors' => [ $sub . ' .refraction-nav-menu__link' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}; --refraction-nav-sub-pl: {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->end_section();

		$toggle = '{{WRAPPER}} .refraction-nav-menu__toggle';

		$this->register_bar_brand_style();

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
			'toggle_bg_hover',
			[
				'label' => esc_html__( 'Hover Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $toggle . ':hover, ' . $toggle . ':focus-visible' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'toggle_hover_anim',
			[
				'label' => esc_html__( 'Hover Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'none',
				'options' => [
					'none' => esc_html__( 'None', 'refraction' ),
					'grow' => esc_html__( 'Grow', 'refraction' ),
					'shrink' => esc_html__( 'Shrink', 'refraction' ),
					'lift' => esc_html__( 'Lift', 'refraction' ),
					'rotate' => esc_html__( 'Turn', 'refraction' ),
					'wiggle' => esc_html__( 'Wiggle', 'refraction' ),
					'pulse' => esc_html__( 'Pulse', 'refraction' ),
					'lines' => esc_html__( 'Lines shift (three lines only)', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--toggle-hover-',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'toggle_click_anim',
			[
				'label' => esc_html__( 'Click Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'none',
				'options' => [
					'none' => esc_html__( 'None', 'refraction' ),
					'press' => esc_html__( 'Press', 'refraction' ),
					'bounce' => esc_html__( 'Bounce', 'refraction' ),
					'jelly' => esc_html__( 'Jelly', 'refraction' ),
					'ripple' => esc_html__( 'Ripple', 'refraction' ),
					'spin' => esc_html__( 'Spin', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--toggle-click-',
				'description' => esc_html__( 'Plays on every click, along with the button turning into a close button.', 'refraction' ),
			]
		);

		$this->add_control(
			'toggle_ripple_color',
			[
				'label' => esc_html__( 'Ripple Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $toggle => '--refraction-nav-ripple: {{VALUE}};' ],
				'condition' => [ 'toggle_click_anim' => 'ripple' ],
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

		$this->add_responsive_control(
			'toggle_line',
			[
				'label' => esc_html__( 'Line Thickness', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 1, 'max' => 8 ] ],
				'selectors' => [ $toggle => '--refraction-nav-burger-line: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'toggle_icon[value]' => '' ],
			]
		);

		$this->add_control(
			'toggle_speed',
			[
				'label' => esc_html__( 'Animation Speed', 'refraction' ) . ' (ms)',
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 1200, 'step' => 50 ] ],
				'selectors' => [ $toggle => '--refraction-nav-burger-speed: {{SIZE}}ms;' ],
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

		$this->add_responsive_control(
			'panel_width',
			[
				'label' => esc_html__( 'Panel Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vw' ],
				'range' => [ 'px' => [ 'min' => 200, 'max' => 800 ] ],
				'selectors' => [ $panel => '--refraction-nav-panel-width: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'panel_style' => [ 'offcanvas-right', 'offcanvas-left' ] ],
			]
		);

		$this->add_control(
			'panel_backdrop',
			[
				'label' => esc_html__( 'Backdrop Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-nav-menu__backdrop' => 'background-color: {{VALUE}};' ],
				'condition' => [ 'panel_style!' => 'dropdown' ],
			]
		);

		$this->add_responsive_control(
			'panel_align',
			[
				'label' => esc_html__( 'Item Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				],
				'selectors' => [ $panel => '--refraction-nav-panel-align: {{VALUE}};' ],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'panel_divider',
			[
				'label' => esc_html__( 'Line Between Items', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $panel => '--refraction-nav-panel-divider: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'panel_close_color',
			[
				'label' => esc_html__( 'Close Button Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-nav-menu__close' => 'color: {{VALUE}};' ],
				'condition' => [ 'panel_style!' => 'dropdown', 'panel_close_button' => 'yes' ],
			]
		);

		$this->add_control(
			'panel_brand_style_heading',
			[
				'label' => esc_html__( 'Panel Header', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
				'condition' => [ 'panel_brand!' => 'none' ],
			]
		);

		$this->add_responsive_control(
			'panel_brand_width',
			[
				'label' => esc_html__( 'Logo Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'range' => [ 'px' => [ 'min' => 20, 'max' => 400 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-nav-menu__brand img' => 'width: {{SIZE}}{{UNIT}}; max-width: 100%; height: auto;' ],
				'condition' => [ 'panel_brand' => [ 'logo', 'image' ] ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'panel_brand_typography',
				'selector' => '{{WRAPPER}} .refraction-nav-menu__brand-text',
				'condition' => [ 'panel_brand' => [ 'name', 'text' ] ],
			]
		);

		$this->add_control(
			'panel_brand_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-nav-menu__brand-text' => 'color: {{VALUE}};' ],
				'condition' => [ 'panel_brand' => [ 'name', 'text' ] ],
			]
		);

		$buttons = '{{WRAPPER}} .refraction-nav-menu__panel-button';

		$this->add_control(
			'panel_buttons_style_heading',
			[
				'label' => esc_html__( 'Panel Buttons', 'refraction' ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'panel_buttons_typography',
				'selector' => $buttons,
			]
		);

		$this->add_control(
			'panel_buttons_layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'stack',
				'options' => [
					'stack' => esc_html__( 'Full width, one under the other', 'refraction' ),
					'row' => esc_html__( 'Side by side', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--buttons-',
			]
		);

		$this->start_controls_tabs( 'panel_buttons_tabs' );

		foreach ( [ 'normal' => esc_html__( 'Normal', 'refraction' ), 'hover' => esc_html__( 'Hover', 'refraction' ) ] as $state => $state_label ) {
			$sel = 'hover' === $state ? $buttons . ':hover, ' . $buttons . ':focus-visible' : $buttons;

			$this->start_controls_tab( 'panel_buttons_tab_' . $state, [ 'label' => $state_label ] );

			$this->add_control( 'panel_buttons_color_' . $state, [
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $sel => 'color: {{VALUE}};' ],
			] );

			$this->add_control( 'panel_buttons_bg_' . $state, [
				'label' => esc_html__( 'Background (Filled)', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ str_replace( $buttons, $buttons . '--filled', $sel ) => 'background-color: {{VALUE}}; border-color: {{VALUE}};' ],
			] );

			$this->add_control( 'panel_buttons_border_color_' . $state, [
				'label' => esc_html__( 'Border Color (Outline)', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ str_replace( $buttons, $buttons . '--outline', $sel ) => 'border-color: {{VALUE}};' ],
			] );

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_responsive_control(
			'panel_buttons_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ $buttons => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'panel_buttons_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ $buttons => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'panel_buttons_gap',
			[
				'label' => esc_html__( 'Space Between', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-nav-menu__panel-buttons' => 'gap: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'panel_z_index',
			[
				'label' => esc_html__( 'Z-Index', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 999,
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-panel-z: {{VALUE}};' ],
				'description' => esc_html__( 'Raise it if the opened menu hides behind sticky or overlapping content.', 'refraction' ),
			]
		);

		$this->end_section();
	}

	/**
	 * Content > Logo or Site Title: the site logo, site title, an image or a text in the menu bar, on the left, in the
	 * middle (the items share out on both sides) or on the right; shown always, only once the page is scrolled down
	 * past a number of pixels, or until then, with an animation (nav-menu.js toggles is-brand-hidden).
	 */
	private function register_bar_brand_controls(): void {
		$this->content_section( 'section_bar_brand', esc_html__( 'Logo or Site Title', 'refraction' ) );

		$on = [ 'bar_brand!' => '' ];

		$this->add_control(
			'bar_brand',
			[
				'label' => esc_html__( 'Show', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [
					'' => esc_html__( 'Nothing', 'refraction' ),
					'logo' => esc_html__( 'Site logo', 'refraction' ),
					'title' => esc_html__( 'Site title', 'refraction' ),
					'logo_title' => esc_html__( 'Site logo and title', 'refraction' ),
					'image' => esc_html__( 'An image', 'refraction' ),
					'text' => esc_html__( 'A text', 'refraction' ),
				],
				'description' => esc_html__( 'The site logo and title come from Appearance > Customize > Site Identity (or Site Settings); without a logo the title shows.', 'refraction' ),
				'render_type' => 'template',
				'frontend_available' => true,
				'prefix_class' => 'refraction-nav-menu--bar-brand-',
			]
		);

		$this->add_control(
			'bar_brand_image',
			[
				'label' => esc_html__( 'Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'condition' => [ 'bar_brand' => 'image' ],
			]
		);

		$this->add_control(
			'bar_brand_text',
			[
				'label' => esc_html__( 'Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => get_bloginfo( 'name' ),
				'condition' => [ 'bar_brand' => 'text' ],
			]
		);

		$this->add_control(
			'bar_brand_position',
			[
				'label' => esc_html__( 'Position', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'default' => 'left',
				'toggle' => false,
				'options' => [
					'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
					'center' => [ 'title' => esc_html__( 'Middle (menu items on both sides)', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
					'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				],
				'prefix_class' => 'refraction-nav-menu--brand-',
				'render_type' => 'template',
				'condition' => $on,
			]
		);

		$this->add_control(
			'bar_brand_link',
			[
				'label' => esc_html__( 'Link to the home page', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'render_type' => 'template',
				'condition' => $on,
			]
		);

		$this->add_control(
			'bar_brand_show',
			[
				'label' => esc_html__( 'When', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'always',
				'options' => [
					'always' => esc_html__( 'Always', 'refraction' ),
					'after' => esc_html__( 'Show once the page is scrolled down', 'refraction' ),
					'before' => esc_html__( 'Hide once the page is scrolled down', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--brand-show-',
				'frontend_available' => true,
				'separator' => 'before',
				'condition' => $on,
			]
		);

		$scrolled = [
			'bar_brand!' => '',
			'bar_brand_show!' => 'always',
		];

		$this->add_control(
			'bar_brand_offset',
			[
				'label' => esc_html__( 'Scroll point (px)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 5000,
				'default' => 100,
				'description' => esc_html__( 'How far the page is scrolled down before it shows or hides, and before Style > After Scrolling applies.', 'refraction' ),
				'frontend_available' => true,
				'condition' => $on,
			]
		);

		$this->add_control(
			'bar_brand_animation',
			[
				'label' => esc_html__( 'Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'fade',
				'options' => [
					'fade' => esc_html__( 'Fade', 'refraction' ),
					'slide-down' => esc_html__( 'Slide down', 'refraction' ),
					'slide-up' => esc_html__( 'Slide up', 'refraction' ),
					'slide-side' => esc_html__( 'Slide in from the side', 'refraction' ),
					'zoom' => esc_html__( 'Zoom', 'refraction' ),
					'pop' => esc_html__( 'Pop (with a little bounce)', 'refraction' ),
					'flip' => esc_html__( 'Flip', 'refraction' ),
					'blur' => esc_html__( 'Sharpen from blur', 'refraction' ),
					'collapse' => esc_html__( 'Grow in (the menu makes room)', 'refraction' ),
				],
				'prefix_class' => 'refraction-nav-menu--brand-anim-',
				'condition' => $scrolled,
			]
		);

		$this->add_control(
			'bar_brand_duration',
			[
				'label' => esc_html__( 'Duration (ms)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 3000,
				'placeholder' => '400',
				'selectors' => [ '{{WRAPPER}}' => '--refraction-nav-brand-speed: {{VALUE}}ms;' ],
				'condition' => $on,
			]
		);

		$this->end_section();
	}

	/**
	 * Style > Logo or Site Title, in two tabs: Before Scrolling and After Scrolling (once the page is scrolled past
	 * the scroll point, nav-menu.js puts is-scrolled on the nav), so the logo can shrink, the title change color, etc.
	 * The before ids are the ones of 0.81.0; the after ids end in _scrolled.
	 */
	private function register_bar_brand_style(): void {
		$this->style_section( 'style_bar_brand', esc_html__( 'Logo or Site Title', 'refraction' ), [ 'bar_brand!' => '' ] );

		$this->start_controls_tabs( 'bar_brand_style_tabs' );

		foreach ( [
			'' => [ esc_html__( 'Before Scrolling', 'refraction' ), '{{WRAPPER}} .refraction-nav-menu' ],
			'_scrolled' => [ esc_html__( 'After Scrolling', 'refraction' ), '{{WRAPPER}} .refraction-nav-menu.is-scrolled' ],
		] as $suffix => [ $label, $nav ] ) {
			$this->start_controls_tab( 'bar_brand_tab' . ( $suffix ? $suffix : '_before' ), [ 'label' => $label ] );
			$this->bar_brand_state_controls( $suffix, $nav );
			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_control(
			'bar_brand_style_note',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'After Scrolling applies once the page is scrolled past the scroll point (Content > Logo or Site Title); empty settings keep the Before Scrolling ones. It changes smoothly over the Duration.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);

		$this->end_section();
	}

	/**
	 * One tab of Style > Logo or Site Title.
	 *
	 * @param string $suffix '' (before scrolling) or '_scrolled'.
	 * @param string $nav    Selector of the nav in that state.
	 */
	private function bar_brand_state_controls( string $suffix, string $nav ): void {
		$brand = $nav . ' .refraction-nav-menu__bar-brand';
		$logo_kinds = [ 'bar_brand' => [ 'logo', 'logo_title', 'image' ] ];

		$this->add_responsive_control(
			'bar_brand_width' . $suffix,
			[
				'label' => esc_html__( 'Logo width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'vw' ],
				'range' => [ 'px' => [ 'min' => 20, 'max' => 400 ] ],
				'default' => $suffix ? [] : [ 'unit' => 'px', 'size' => 140 ],
				'selectors' => [ $brand . ' img' => 'width: {{SIZE}}{{UNIT}};' ],
				'condition' => $logo_kinds,
			]
		);

		$this->add_responsive_control(
			'bar_brand_max_height' . $suffix,
			[
				'label' => esc_html__( 'Logo max height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 10, 'max' => 200 ] ],
				'selectors' => [ $brand . ' img' => 'max-height: {{SIZE}}{{UNIT}}; object-fit: contain;' ],
				'condition' => $logo_kinds,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'bar_brand_typography' . $suffix,
				'label' => esc_html__( 'Title', 'refraction' ),
				'selector' => $brand . ' .refraction-nav-menu__brand-text',
			]
		);

		$this->add_control(
			'bar_brand_color' . $suffix,
			[
				'label' => esc_html__( 'Title color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $brand . ', ' . $brand . ' a' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'bar_brand_color_hover' . $suffix,
			[
				'label' => esc_html__( 'Title color on hover', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $brand . ' a:hover, ' . $brand . ' a:focus-visible' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'bar_brand_background' . $suffix,
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $brand => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'bar_brand_gap' . $suffix,
			[
				'label' => esc_html__( 'Space beside the menu', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'max' => 120 ] ],
				'selectors' => [ $suffix ? $nav : '{{WRAPPER}}' => '--refraction-nav-brand-gap: {{SIZE}}{{UNIT}};' ],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'bar_brand_inner_gap' . $suffix,
			[
				'label' => esc_html__( 'Space between logo and title', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'max' => 60 ] ],
				'selectors' => [ $brand . ' .refraction-nav-menu__brand' => 'gap: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'bar_brand' => 'logo_title' ],
			]
		);

		$this->add_responsive_control(
			'bar_brand_padding' . $suffix,
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ $brand => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'bar_brand_radius' . $suffix,
			[
				'label' => esc_html__( 'Corners', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'range' => [ 'px' => [ 'max' => 60 ] ],
				'selectors' => [ $brand => 'border-radius: {{SIZE}}{{UNIT}};' ],
			]
		);
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$menu_id = isset( $settings['menu'] ) ? (int) $settings['menu'] : 0;

		if ( ! $menu_id ) {
			$this->render_editor_hint( esc_html__( 'Choose a menu in the widget settings.', 'refraction' ) );
			return;
		}

		$brand_kind = (string) ( $settings['bar_brand'] ?? '' );
		$brand_html = '' !== $brand_kind ? $this->bar_brand_html( $settings ) : '';
		$brand_where = in_array( $settings['bar_brand_position'] ?? 'left', [ 'left', 'center', 'right' ], true ) ? $settings['bar_brand_position'] : 'left';
		$split_at = 0;

		// In the middle: the walker closes the list halfway through the top-level items and opens a second one, with the
		// brand between them.
		if ( '' !== $brand_html && 'center' === $brand_where ) {
			$top = array_filter( (array) wp_get_nav_menu_items( $menu_id ), static fn( $item ) => 0 === (int) $item->menu_item_parent );
			$split_at = (int) ceil( count( $top ) / 2 );
		}

		$menu_html = wp_nav_menu( [
			'menu' => $menu_id,
			'container' => false,
			'menu_class' => 'refraction-nav-menu__list',
			'items_wrap' => '<ul id="%1$s" class="%2$s">%3$s</ul>',
			'menu_id' => 'refraction-nav-' . $this->get_id(),
			'depth' => (int) ( $settings['depth'] ?? 0 ),
			'walker' => new Nav_Menu_Walker(
				'icon' === ( $settings['indicator'] ?? '' ) && ! empty( $settings['indicator_icon']['value'] ) ? (string) Icons_Manager::try_get_icon_html( $settings['indicator_icon'], [ 'aria-hidden' => 'true' ] ) : '',
				$split_at,
				$split_at ? '<div class="refraction-nav-menu__bar-brand refraction-nav-menu__bar-brand--middle">' . $brand_html . '</div>' : ''
			),
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
			<?php if ( '' !== $brand_html ) : ?>
				<div class="refraction-nav-menu__bar-brand refraction-nav-menu__bar-brand--<?php echo esc_attr( 'center' === $brand_where ? 'collapsed' : $brand_where ); ?>"><?php echo $brand_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?></div>
			<?php endif; ?>
			<div class="refraction-nav-menu__toggle-wrap">
				<button type="button" class="refraction-nav-menu__toggle" aria-expanded="false" aria-controls="<?php echo esc_attr( $panel_id ); ?>" aria-label="<?php echo esc_attr( $label ); ?>">
					<?php if ( ! empty( $settings['toggle_icon']['value'] ) ) : ?>
						<span class="refraction-nav-menu__toggle-icon refraction-nav-menu__toggle-icon--open" aria-hidden="true"><?php Icons_Manager::render_icon( $settings['toggle_icon'], [ 'aria-hidden' => 'true' ] ); ?></span>
						<span class="refraction-nav-menu__toggle-icon refraction-nav-menu__toggle-icon--close" aria-hidden="true">
							<?php
							if ( ! empty( $settings['toggle_close_icon']['value'] ) ) {
								Icons_Manager::render_icon( $settings['toggle_close_icon'], [ 'aria-hidden' => 'true' ] );
							} else {
								echo '<span class="refraction-nav-menu__x"></span>';
							}
							?>
						</span>
					<?php else : ?>
						<span class="refraction-nav-menu__burger" aria-hidden="true"><span></span><span></span><span></span></span>
					<?php endif; ?>
					<?php if ( 'yes' === ( $settings['toggle_show_label'] ?? '' ) ) : ?>
						<span class="refraction-nav-menu__toggle-label"><?php echo esc_html( $label ); ?></span>
					<?php endif; ?>
				</button>
			</div>
			<?php if ( 'dropdown' !== ( $settings['panel_style'] ?? 'dropdown' ) ) : ?>
				<div class="refraction-nav-menu__backdrop" aria-hidden="true"></div>
			<?php endif; ?>
			<div class="refraction-nav-menu__panel" id="<?php echo esc_attr( $panel_id ); ?>">
				<?php
				$brand = $this->panel_brand_html( $settings );
				$close = 'dropdown' !== ( $settings['panel_style'] ?? 'dropdown' ) && 'yes' === ( $settings['panel_close_button'] ?? 'yes' );
				?>
				<?php if ( '' !== $brand || $close ) : ?>
					<div class="refraction-nav-menu__panel-head">
						<?php echo $brand; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?>
						<?php if ( $close ) : ?>
							<button type="button" class="refraction-nav-menu__close" aria-label="<?php esc_attr_e( 'Close menu', 'refraction' ); ?>"><span class="refraction-nav-menu__x" aria-hidden="true"></span></button>
						<?php endif; ?>
					</div>
				<?php endif; ?>
				<?php echo $menu_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by wp_nav_menu() with an escaping walker. ?>
				<?php $this->render_panel_buttons( $settings ); ?>
			</div>
		</nav>
		<?php
	}

	/** The logo, title, both, image or text of the menu bar ('' for none), linked to the home page unless switched off. */
	private function bar_brand_html( array $settings ): string {
		$kind = (string) ( $settings['bar_brand'] ?? '' );
		$name = get_bloginfo( 'name' );
		$logo = '';
		$text = '';

		if ( in_array( $kind, [ 'logo', 'logo_title' ], true ) && has_custom_logo() ) {
			$logo = wp_get_attachment_image( (int) get_theme_mod( 'custom_logo' ), 'medium', false, [ 'alt' => $name ] );
		} elseif ( 'image' === $kind ) {
			$id = (int) ( $settings['bar_brand_image']['id'] ?? 0 );
			$url = (string) ( $settings['bar_brand_image']['url'] ?? '' );
			$logo = $id ? (string) wp_get_attachment_image( $id, 'medium', false, [ 'alt' => $name ] ) : '';

			if ( '' === $logo && '' !== $url ) {
				$logo = '<img src="' . esc_url( $url ) . '" alt="' . esc_attr( $name ) . '">';
			}
		}

		if ( 'title' === $kind || 'logo_title' === $kind || ( 'logo' === $kind && '' === $logo ) ) {
			$text = $name;
		} elseif ( 'text' === $kind ) {
			$text = (string) ( $settings['bar_brand_text'] ?? '' );
		}

		$inner = $logo . ( '' !== trim( $text ) ? '<span class="refraction-nav-menu__brand-text">' . esc_html( $text ) . '</span>' : '' );

		if ( '' === $inner ) {
			return '';
		}

		return 'yes' === ( $settings['bar_brand_link'] ?? 'yes' )
			? '<a class="refraction-nav-menu__brand" href="' . esc_url( home_url( '/' ) ) . '">' . $inner . '</a>'
			: '<span class="refraction-nav-menu__brand">' . $inner . '</span>';
	}

	/** The logo, site name or text at the top of the opened menu, linked to the home page ('' for none). */
	private function panel_brand_html( array $settings ): string {
		$kind = (string) ( $settings['panel_brand'] ?? 'none' );
		$inner = '';

		if ( 'logo' === $kind && has_custom_logo() ) {
			$inner = wp_get_attachment_image( (int) get_theme_mod( 'custom_logo' ), 'medium', false, [ 'alt' => get_bloginfo( 'name' ) ] );
		} elseif ( 'image' === $kind && ! empty( $settings['panel_brand_image']['url'] ) ) {
			$id = (int) ( $settings['panel_brand_image']['id'] ?? 0 );
			$inner = $id ? wp_get_attachment_image( $id, 'medium', false, [ 'alt' => get_bloginfo( 'name' ) ] ) : '<img src="' . esc_url( $settings['panel_brand_image']['url'] ) . '" alt="' . esc_attr( get_bloginfo( 'name' ) ) . '">';
		}

		// The site name when there is no logo yet, or when asked for.
		if ( '' === $inner && in_array( $kind, [ 'logo', 'name', 'text' ], true ) ) {
			$text = 'text' === $kind ? (string) ( $settings['panel_brand_text'] ?? '' ) : get_bloginfo( 'name' );
			$inner = '' !== trim( $text ) ? '<span class="refraction-nav-menu__brand-text">' . esc_html( $text ) . '</span>' : '';
		}

		return '' === $inner ? '' : '<a class="refraction-nav-menu__brand" href="' . esc_url( home_url( '/' ) ) . '">' . $inner . '</a>';
	}

	/** The buttons under the menu items in the opened menu. */
	private function render_panel_buttons( array $settings ): void {
		$buttons = array_filter( (array) ( $settings['panel_buttons'] ?? [] ), static fn( $b ) => is_array( $b ) && '' !== trim( (string) ( $b['text'] ?? '' ) ) );

		if ( ! $buttons ) {
			return;
		}

		echo '<div class="refraction-nav-menu__panel-buttons">';

		foreach ( $buttons as $i => $button ) {
			$key = 'panel_button_' . $i;
			$this->add_render_attribute( $key, 'class', [ 'refraction-nav-menu__panel-button', 'refraction-nav-menu__panel-button--' . ( 'outline' === ( $button['style'] ?? '' ) ? 'outline' : 'filled' ), 'refraction-repeater-item-' . ( $button['_id'] ?? '' ) ] );

			if ( ! empty( $button['link']['url'] ) ) {
				$this->add_link_attributes( $key, $button['link'] );
			}

			echo '<a ' . $this->get_render_attribute_string( $key ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by the render attributes.

			if ( ! empty( $button['icon']['value'] ) ) {
				Icons_Manager::render_icon( $button['icon'], [ 'aria-hidden' => 'true' ] );
			}

			echo '<span>' . esc_html( $button['text'] ) . '</span></a>';
		}

		echo '</div>';
	}
}
