<?php
namespace Refraction\Modules\MegaMenu\Widgets;

use Refraction\Controls_Manager;
use Refraction\Core\Utils\Icons;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\MegaMenu\Classes\Mega_Menu_Logic;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Plugin;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Mega Menu: menu items that are plain links or open a dropdown made of a container (any widgets).
 */
class Mega_Menu extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-mega-menu';
	}

	public function get_title() {
		return esc_html__( 'Mega Menu', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-nav-menu';
	}

	public function get_keywords() {
		return [ 'menu', 'mega', 'navigation', 'nav', 'dropdown', 'header', 'nested' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-mega-menu' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-mega-menu';
	}

	private function item_container( int $index, array $elements = [] ): array {
		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Item index. */
				'_title' => sprintf( __( 'Dropdown #%d', 'refraction' ), $index ),
				'content_width' => 'full',
			],
			'elements' => $elements,
		];
	}

	protected function get_default_children_elements() {
		return [
			$this->item_container( 1 ),
			$this->item_container( 2, [
				[
					'id' => Utils::generate_random_string(),
					'elType' => 'widget',
					'widgetType' => 'heading',
					'settings' => [ 'title' => __( 'Dropdown content', 'refraction' ), 'header_size' => 'h3' ],
				],
				[
					'id' => Utils::generate_random_string(),
					'elType' => 'widget',
					'widgetType' => 'text-editor',
					'settings' => [ 'editor' => '<p>' . esc_html__( 'Any widget can go here: links, images, a form, even a carousel.', 'refraction' ) . '</p>' ],
				],
			] ),
			$this->item_container( 3 ),
		];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'item_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Item index. */
		return esc_html__( 'Dropdown #%d', 'refraction' );
	}

	protected function get_default_children_placeholder_selector() {
		return '.refraction-mm__list';
	}

	protected function get_default_children_container_placeholder_selector() {
		return '.refraction-mm__item';
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_items', [
			'label' => esc_html__( 'Menu', 'refraction' ),
		] );

		$repeater = new Repeater();

		$repeater->add_control( 'item_title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Menu item', 'refraction' ),
			'label_block' => true,
			'dynamic' => [ 'active' => true ],
		] );

		$repeater->add_control( 'item_type', [
			'label' => esc_html__( 'Type', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'link',
			'options' => [
				'link' => esc_html__( 'Link', 'refraction' ),
				'dropdown' => esc_html__( 'Dropdown', 'refraction' ),
			],
		] );

		$repeater->add_control( 'item_link', [
			'label' => esc_html__( 'Link', 'refraction' ),
			'type' => Controls_Manager::URL,
			'placeholder' => esc_html__( 'Paste URL or type', 'refraction' ),
			'dynamic' => [ 'active' => true ],
			'condition' => [ 'item_type' => 'link' ],
		] );

		$repeater->add_control( 'item_icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'skin' => 'inline',
			'label_block' => false,
		] );

		$repeater->add_control( 'element_css_id', [
			'label' => esc_html__( 'CSS ID', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '',
			'ai' => [ 'active' => false ],
			'title' => esc_html__( 'Add your custom id WITHOUT the Pound key. e.g: my-id', 'refraction' ),
			'style_transfer' => false,
		] );

		$this->add_control( 'items', [
			'label' => esc_html__( 'Items', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'item_title' => esc_html__( 'Home', 'refraction' ), 'item_type' => 'link', 'item_link' => [ 'url' => '#' ] ],
				[ 'item_title' => esc_html__( 'Explore', 'refraction' ), 'item_type' => 'dropdown' ],
				[ 'item_title' => esc_html__( 'Contact', 'refraction' ), 'item_type' => 'link', 'item_link' => [ 'url' => '#' ] ],
			],
			'title_field' => '{{{ item_title }}}',
			'button_text' => esc_html__( 'Add Item', 'refraction' ),
		] );

		$this->add_control( 'menu_label', [
			'label' => esc_html__( 'Accessible name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Main menu', 'refraction' ),
			'label_block' => true,
			'separator' => 'before',
		] );

		$this->add_control( 'layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'horizontal',
			'options' => [
				'horizontal' => esc_html__( 'Horizontal', 'refraction' ),
				'vertical' => esc_html__( 'Vertical', 'refraction' ),
			],
			'prefix_class' => 'refraction-mm-layout-',
		] );

		$this->add_responsive_control( 'items_align', [
			'label' => esc_html__( 'Alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'flex-start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'flex-end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'default' => 'flex-start',
			'selectors' => [ '{{WRAPPER}}' => '--refraction-mm-justify: {{VALUE}};' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_dropdown', [
			'label' => esc_html__( 'Dropdown', 'refraction' ),
		] );

		$this->add_control( 'trigger', [
			'label' => esc_html__( 'Open on', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'hover',
			'options' => [
				'hover' => esc_html__( 'Hover (and click or touch)', 'refraction' ),
				'click' => esc_html__( 'Click', 'refraction' ),
			],
		] );

		$this->add_control( 'hover_delay', [
			'label' => esc_html__( 'Open delay (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 150,
			'min' => 0,
			'max' => 2000,
			'step' => 50,
			'condition' => [ 'trigger' => 'hover' ],
		] );

		$this->add_control( 'close_delay', [
			'label' => esc_html__( 'Close delay (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'default' => 250,
			'min' => 0,
			'max' => 2000,
			'step' => 50,
			'condition' => [ 'trigger' => 'hover' ],
		] );

		$this->add_control( 'dropdown_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'container',
			'options' => [
				'container' => esc_html__( 'Menu width', 'refraction' ),
				'full' => esc_html__( 'Full width', 'refraction' ),
				'custom' => esc_html__( 'Custom', 'refraction' ),
			],
			'prefix_class' => 'refraction-mm-width-',
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'dropdown_custom_width', [
			'label' => esc_html__( 'Custom width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vw' ],
			'range' => [ 'px' => [ 'min' => 160, 'max' => 1400 ], 'vw' => [ 'min' => 10, 'max' => 100 ] ],
			'default' => [ 'size' => 420, 'unit' => 'px' ],
			'condition' => [ 'dropdown_width' => 'custom' ],
			'selectors' => [ '{{WRAPPER}}' => '--refraction-mm-dd-width: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'dropdown_position', [
			'label' => esc_html__( 'Align to item', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'start',
			'options' => [
				'start' => esc_html__( 'Start', 'refraction' ),
				'center' => esc_html__( 'Center', 'refraction' ),
				'end' => esc_html__( 'End', 'refraction' ),
			],
			'condition' => [ 'dropdown_width' => 'custom' ],
			'prefix_class' => 'refraction-mm-align-',
		] );

		$this->add_control( 'show_indicator', [
			'label' => esc_html__( 'Dropdown indicator', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'return_value' => 'yes',
			'separator' => 'before',
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_mobile', [
			'label' => esc_html__( 'Mobile', 'refraction' ),
		] );

		$this->add_control( 'breakpoint', [
			'label' => esc_html__( 'Switch to the mobile menu at', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'tablet',
			'options' => [
				'mobile' => esc_html__( 'Mobile', 'refraction' ),
				'mobile_extra' => esc_html__( 'Mobile Extra', 'refraction' ),
				'tablet' => esc_html__( 'Tablet', 'refraction' ),
				'tablet_extra' => esc_html__( 'Tablet Extra', 'refraction' ),
				'laptop' => esc_html__( 'Laptop', 'refraction' ),
				'none' => esc_html__( 'Never', 'refraction' ),
			],
			'description' => esc_html__( 'At and below this width the items collapse behind a menu button.', 'refraction' ),
		] );

		$this->add_control( 'mobile_layout', [
			'label' => esc_html__( 'Mobile menu', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'accordion',
			'options' => [
				'accordion' => esc_html__( 'Stacked list (accordion)', 'refraction' ),
				'offcanvas' => esc_html__( 'Slide-in panel', 'refraction' ),
			],
			'condition' => [ 'breakpoint!' => 'none' ],
		] );

		$this->add_control( 'toggle_label', [
			'label' => esc_html__( 'Menu button label', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Menu', 'refraction' ),
			'condition' => [ 'breakpoint!' => 'none' ],
		] );

		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls() {
		$this->start_controls_section( 'section_style_items', [
			'label' => esc_html__( 'Items', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'item_typography',
			'selector' => '{{WRAPPER}} .refraction-mm__link',
		] );

		$this->start_controls_tabs( 'tabs_item' );

		foreach ( [
			'normal' => [ esc_html__( 'Normal', 'refraction' ), '' ],
			'hover' => [ esc_html__( 'Hover', 'refraction' ), ':hover, {{WRAPPER}} .refraction-mm__item.is-open > .refraction-mm__link' ],
			'active' => [ esc_html__( 'Current', 'refraction' ), '[aria-current="page"]' ],
		] as $state => $info ) {
			$this->start_controls_tab( "tab_item_$state", [ 'label' => $info[0] ] );

			$this->add_control( "item_color_$state", [
				'label' => esc_html__( 'Text color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-mm__link' . $info[1] => 'color: {{VALUE}};' ],
			] );

			$this->add_control( "item_bg_$state", [
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-mm__link' . $info[1] => 'background-color: {{VALUE}};' ],
			] );

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_responsive_control( 'item_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em' ],
			'selectors' => [ '{{WRAPPER}} .refraction-mm__link' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'item_gap', [
			'label' => esc_html__( 'Space between items', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
			'selectors' => [ '{{WRAPPER}}' => '--refraction-mm-gap: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'item_radius', [
			'label' => esc_html__( 'Border radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'selectors' => [ '{{WRAPPER}} .refraction-mm__link' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_dropdown', [
			'label' => esc_html__( 'Dropdown', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'dropdown_background',
			'types' => [ 'classic', 'gradient' ],
			'selector' => '{{WRAPPER}} .refraction-mm__panel',
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'dropdown_border',
			'selector' => '{{WRAPPER}} .refraction-mm__panel',
		] );

		$this->add_responsive_control( 'dropdown_radius', [
			'label' => esc_html__( 'Border radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'selectors' => [ '{{WRAPPER}} .refraction-mm__panel' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'dropdown_shadow',
			'selector' => '{{WRAPPER}} .refraction-mm__panel',
		] );

		$this->add_responsive_control( 'dropdown_offset', [
			'label' => esc_html__( 'Distance from the item', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'size' => 8, 'unit' => 'px' ],
			'selectors' => [ '{{WRAPPER}}' => '--refraction-mm-dd-offset: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_indicator', [
			'label' => esc_html__( 'Indicator and mobile button', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_control( 'indicator_color', [
			'label' => esc_html__( 'Indicator color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .refraction-mm__indicator' => 'color: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'indicator_size', [
			'label' => esc_html__( 'Indicator size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 8, 'max' => 40 ] ],
			'default' => [ 'size' => 18, 'unit' => 'px' ],
			'selectors' => [ '{{WRAPPER}} .refraction-mm__indicator svg' => 'width: {{SIZE}}px; height: {{SIZE}}px;' ],
		] );

		$this->add_control( 'toggle_color', [
			'label' => esc_html__( 'Menu button color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .refraction-mm__toggle' => 'color: {{VALUE}};' ],
			'separator' => 'before',
		] );

		$this->add_control( 'mobile_menu_bg', [
			'label' => esc_html__( 'Mobile menu background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}}' => '--refraction-mm-mobile-bg: {{VALUE}};' ],
		] );

		$this->end_controls_section();
	}

	private function is_current( array $link ): bool {
		$url = (string) ( $link['url'] ?? '' );

		if ( '' === $url || '#' === $url[0] ) {
			return false;
		}

		$current = home_url( add_query_arg( [] ) );

		return untrailingslashit( strtok( $url, '#?' ) ) === untrailingslashit( strtok( $current, '#?' ) );
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$logic = Mega_Menu_Logic::sanitize( [
			'layout' => $settings['layout'] ?? '',
			'trigger' => $settings['trigger'] ?? '',
			'hover_delay' => $settings['hover_delay'] ?? 150,
			'close_delay' => $settings['close_delay'] ?? 250,
			'dropdown_width' => $settings['dropdown_width'] ?? '',
			'dropdown_position' => $settings['dropdown_position'] ?? '',
			'breakpoint' => $settings['breakpoint'] ?? '',
			'mobile_layout' => $settings['mobile_layout'] ?? '',
		] );
		$widget_id = $this->get_id();
		$list_id = "refraction-mm-$widget_id-list";
		$items = $settings['items'] ?? [];
		$toggle_label = '' !== (string) ( $settings['toggle_label'] ?? '' ) ? $settings['toggle_label'] : __( 'Menu', 'refraction' );

		$this->add_render_attribute( 'nav', [
			'class' => 'refraction-mm',
			'aria-label' => '' !== (string) ( $settings['menu_label'] ?? '' ) ? $settings['menu_label'] : __( 'Main menu', 'refraction' ),
			'data-layout' => $logic['layout'],
			'data-trigger' => $logic['trigger'],
			'data-hover-delay' => $logic['hover_delay'],
			'data-close-delay' => $logic['close_delay'],
			'data-breakpoint' => $logic['breakpoint'],
			'data-mobile-layout' => $logic['mobile_layout'],
			'data-width' => $logic['dropdown_width'],
		] );
		?>
		<nav <?php $this->print_render_attribute_string( 'nav' ); ?>>
			<?php if ( 'none' !== $logic['breakpoint'] ) : ?>
				<button type="button" class="refraction-mm__toggle" aria-expanded="false" aria-controls="<?php echo esc_attr( $list_id ); ?>">
					<?php echo Icons::svg( 'menu', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<span class="refraction-mm__toggle-label"><?php echo esc_html( $toggle_label ); ?></span>
				</button>
				<div class="refraction-mm__scrim" hidden></div>
			<?php endif; ?>
			<div class="refraction-mm__drawer">
				<?php if ( 'none' !== $logic['breakpoint'] ) : ?>
					<button type="button" class="refraction-mm__close" aria-label="<?php echo esc_attr__( 'Close menu', 'refraction' ); ?>"><?php echo Icons::svg( 'close', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
				<?php endif; ?>
				<ul class="refraction-mm__list" id="<?php echo esc_attr( $list_id ); ?>">
					<?php foreach ( $items as $index => $item ) {
						$this->render_item( $item, $index, $widget_id, $settings );
					} ?>
				</ul>
			</div>
		</nav>
		<?php
	}

	private function render_item( array $item, int $index, string $widget_id, array $settings ) {
		$ids = Mega_Menu_Logic::item_ids( $widget_id, $index );
		$has_dropdown = Mega_Menu_Logic::has_dropdown( $item );
		$key = 'link-' . $index;

		$this->add_render_attribute( $key, 'class', 'refraction-mm__link' );

		if ( ! empty( $item['element_css_id'] ) ) {
			$this->add_render_attribute( $key, 'id', $item['element_css_id'] );
		}

		ob_start();
		if ( ! empty( $item['item_icon']['value'] ) ) {
			echo '<span class="refraction-mm__icon">';
			Icons_Manager::render_icon( $item['item_icon'], [ 'aria-hidden' => 'true' ] );
			echo '</span>';
		}
		echo '<span class="refraction-mm__text">' . esc_html( $item['item_title'] ?? '' ) . '</span>';
		$inner = ob_get_clean();
		?>
		<li class="refraction-mm__item<?php echo $has_dropdown ? ' has-dropdown' : ''; ?>">
			<?php if ( $has_dropdown ) :
				$this->add_render_attribute( $key, [
					'type' => 'button',
					'id' => $ids['trigger'],
					'class' => 'refraction-mm__trigger',
					'aria-haspopup' => 'true',
					'aria-expanded' => 'false',
					'aria-controls' => $ids['panel'],
				] );
				?>
				<button <?php $this->print_render_attribute_string( $key ); ?>><?php echo $inner; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php if ( 'yes' === ( $settings['show_indicator'] ?? '' ) ) : ?><span class="refraction-mm__indicator" aria-hidden="true"><?php echo Icons::svg( 'expand-more', [ 'size' => 18 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span><?php endif; ?></button>
				<?php $this->print_panel( $index, $ids ); ?>
			<?php else :
				if ( ! empty( $item['item_link']['url'] ) ) {
					$this->add_link_attributes( $key, $item['item_link'] );
				}

				if ( $this->is_current( $item['item_link'] ?? [] ) ) {
					$this->add_render_attribute( $key, 'aria-current', 'page' );
				}
				?>
				<a <?php $this->print_render_attribute_string( $key ); ?>><?php echo $inner; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></a>
			<?php endif; ?>
		</li>
		<?php
	}

	/**
	 * Prints the dropdown container with the attributes that make it the item's panel: closed, labelled by its trigger.
	 */
	private function print_panel( int $index, array $ids ) {
		$children = $this->get_children();

		if ( empty( $children[ $index ] ) ) {
			return;
		}

		$decorate = function ( $should_render, $container ) use ( $ids ) {
			$container->add_render_attribute( '_wrapper', [
				'id' => $ids['panel'],
				'class' => 'refraction-mm__panel',
				'role' => 'region',
				'aria-labelledby' => $ids['trigger'],
				'hidden' => 'hidden',
			] );

			return $should_render;
		};

		add_filter( 'refraction/frontend/container/should_render', $decorate, 10, 2 );
		$children[ $index ]->print_element();
		remove_filter( 'refraction/frontend/container/should_render', $decorate, 10 );
	}

	protected function content_template() {
		?>
		<#
		const id = view.getID(),
			listId = 'refraction-mm-' + id + '-list',
			breakpoint = settings.breakpoint || 'tablet';
		#>
		<nav class="refraction-mm" aria-label="{{ settings.menu_label }}" data-layout="{{ settings.layout }}" data-trigger="{{ settings.trigger }}" data-breakpoint="{{ breakpoint }}" data-mobile-layout="{{ settings.mobile_layout }}" data-width="{{ settings.dropdown_width }}">
			<# if ( 'none' !== breakpoint ) { #>
				<button type="button" class="refraction-mm__toggle" aria-expanded="false" aria-controls="{{ listId }}"><?php echo Icons::svg( 'menu', [ 'size' => 24 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><span class="refraction-mm__toggle-label">{{ settings.toggle_label }}</span></button>
			<# } #>
			<div class="refraction-mm__drawer">
				<ul class="refraction-mm__list" id="{{ listId }}">
					<# _.each( settings.items, function( item, index ) {
						const n = index + 1,
							isDropdown = 'dropdown' === item.item_type,
							iconHTML = item.item_icon && item.item_icon.value ? refraction.helpers.renderIcon( view, item.item_icon, { 'aria-hidden': true }, 'i', 'object' ) : null;
					#>
					<li class="refraction-mm__item {{ isDropdown ? 'has-dropdown' : '' }}">
						<# if ( isDropdown ) { #>
							<button type="button" class="refraction-mm__link refraction-mm__trigger" id="refraction-mm-{{ id }}-t{{ n }}" data-index="{{ n }}" aria-haspopup="true" aria-expanded="false" aria-controls="refraction-mm-{{ id }}-p{{ n }}">
						<# } else { #>
							<a class="refraction-mm__link" href="{{ item.item_link && item.item_link.url ? item.item_link.url : '#' }}">
						<# } #>
							<# if ( iconHTML && iconHTML.value ) { #><span class="refraction-mm__icon">{{{ iconHTML.value }}}</span><# } #>
							<span class="refraction-mm__text">{{{ item.item_title }}}</span>
							<# if ( isDropdown && 'yes' === settings.show_indicator ) { #><span class="refraction-mm__indicator" aria-hidden="true"><?php echo Icons::svg( 'expand-more', [ 'size' => 18 ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span><# } #>
						<# if ( isDropdown ) { #></button><# } else { #></a><# } #>
					</li>
					<# } ); #>
				</ul>
			</div>
		</nav>
		<?php
	}
}
