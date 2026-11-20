<?php
namespace Refraction\Modules\RecordsDashboard\Widgets;

use Refraction\Controls_Manager;
use Refraction\Core\Utils\Icons;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\RecordsDashboard\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Sidebar Panel (0.129.0): one container (a menu, a record's details, anything) held at the left or right edge.
 *
 * Docked: full height against the edge. Floating: a card a little away from the edge. In the page: it stays where
 * it is placed and sticks while the page scrolls. Docked and floating panels can move the page aside so nothing is
 * covered. Below a chosen screen size the panel folds into a button that opens it as a drawer.
 */
class Sidebar_Panel extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-sidebar-panel';
	}

	public function get_title() {
		return esc_html__( 'Sidebar Panel', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-sidebar';
	}

	public function get_categories() {
		return [ Module::CATEGORY, 'layout' ];
	}

	public function get_keywords() {
		return [ 'sidebar', 'panel', 'side', 'dock', 'docked', 'floating', 'menu', 'drawer', 'dashboard', 'nested' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-records-dashboard' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-sidebar-panel';
	}

	protected function get_default_children_elements() {
		return [
			[
				'elType' => 'container',
				'settings' => [
					'_title' => __( 'Sidebar content', 'refraction' ),
					'content_width' => 'full',
				],
			],
		];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'panel_label';
	}

	protected function get_default_children_placeholder_selector() {
		return '.rf-sbp__content';
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_panel', [ 'label' => esc_html__( 'Panel', 'refraction' ) ] );

		$this->add_control( 'side', [
			'label' => esc_html__( 'Side', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'default' => 'left',
			'toggle' => false,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'prefix_class' => 'rf-sbp-side-',
			'render_type' => 'template',
		] );

		$this->add_control( 'look', [
			'label' => esc_html__( 'Placement', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'docked',
			'options' => [
				'docked' => esc_html__( 'Docked to the edge', 'refraction' ),
				'floating' => esc_html__( 'Floating beside the edge', 'refraction' ),
				'inline' => esc_html__( 'In the page (sticks while scrolling)', 'refraction' ),
			],
			'prefix_class' => 'rf-sbp-look-',
			'render_type' => 'template',
		] );

		$this->add_control( 'push', [
			'label' => esc_html__( 'Move the page aside', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Off: the panel covers the page edge instead.', 'refraction' ),
			'condition' => [ 'look!' => 'inline' ],
			'render_type' => 'template',
		] );

		$this->add_responsive_control( 'width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vw', '%' ],
			'range' => [ 'px' => [ 'min' => 120, 'max' => 800 ], 'vw' => [ 'min' => 10, 'max' => 100 ], '%' => [ 'min' => 10, 'max' => 100 ] ],
			'default' => [ 'size' => 260, 'unit' => 'px' ],
			'selectors' => [ '{{WRAPPER}}' => '--rf-sbp-w: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Space from the edge', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
			'default' => [ 'size' => 16, 'unit' => 'px' ],
			'condition' => [ 'look' => 'floating' ],
			'selectors' => [ '{{WRAPPER}}' => '--rf-sbp-gap: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'top', [
			'label' => esc_html__( 'Space at the top', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 300 ] ],
			'description' => esc_html__( 'Leave room for a fixed header.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}}' => '--rf-sbp-top: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'full_height', [
			'label' => esc_html__( 'Full screen height', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'look' => 'inline' ],
			'prefix_class' => 'rf-sbp-full-',
		] );

		$this->add_control( 'panel_label', [
			'label' => esc_html__( 'Accessible name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Sidebar', 'refraction' ),
			'label_block' => true,
			'dynamic' => [ 'active' => true ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_small', [ 'label' => esc_html__( 'Small screens', 'refraction' ) ] );

		$this->add_control( 'collapse', [
			'label' => esc_html__( 'Fold into a button on', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'tablet',
			'options' => [
				'none' => esc_html__( 'Never', 'refraction' ),
				'mobile' => esc_html__( 'Phones', 'refraction' ),
				'tablet' => esc_html__( 'Tablets and phones', 'refraction' ),
				'all' => esc_html__( 'Every screen (always a drawer)', 'refraction' ),
			],
			'description' => esc_html__( 'Folded, the panel opens as a drawer from its side when the button is pressed.', 'refraction' ),
			'render_type' => 'template',
		] );

		$this->add_control( 'toggle_text', [
			'label' => esc_html__( 'Button text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Menu', 'refraction' ),
			'dynamic' => [ 'active' => true ],
			'condition' => [ 'collapse!' => 'none' ],
		] );

		$this->add_control( 'toggle_place', [
			'label' => esc_html__( 'Button place', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'fixed',
			'options' => [
				'fixed' => esc_html__( 'Fixed in the top corner', 'refraction' ),
				'inline' => esc_html__( 'Where the widget is', 'refraction' ),
			],
			'prefix_class' => 'rf-sbp-toggle-',
			'condition' => [ 'collapse!' => 'none' ],
		] );

		$this->add_control( 'preview_open', [
			'label' => esc_html__( 'Keep the drawer open in Edit Mode', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'So its content can be edited while the screen is small.', 'refraction' ),
			'condition' => [ 'collapse!' => 'none' ],
			'render_type' => 'template',
		] );

		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls(): void {
		$this->start_controls_section( 'section_style_panel', [ 'label' => esc_html__( 'Panel', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$this->add_group_control( Group_Control_Background::get_type(), [
			'name' => 'panel_bg',
			'types' => [ 'classic', 'gradient' ],
			'exclude' => [ 'image' ],
			'selector' => '{{WRAPPER}} .rf-sbp__panel',
		] );

		$this->add_control( 'panel_color', [
			'label' => esc_html__( 'Text color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sbp__panel' => 'color: {{VALUE}}; --rf-sbp-color: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'panel_padding', [
			'label' => esc_html__( 'Padding', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', 'em', 'rem' ],
			'selectors' => [ '{{WRAPPER}} .rf-sbp__panel' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'panel_border',
			'selector' => '{{WRAPPER}} .rf-sbp__panel',
		] );

		$this->add_responsive_control( 'panel_radius', [
			'label' => esc_html__( 'Border radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%' ],
			'selectors' => [ '{{WRAPPER}} .rf-sbp__panel' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'panel_shadow',
			'selector' => '{{WRAPPER}} .rf-sbp__panel',
		] );

		$this->add_control( 'z_index', [
			'label' => esc_html__( 'Stack order (z-index)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'selectors' => [ '{{WRAPPER}}' => '--rf-sbp-z: {{VALUE}};' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_toggle', [
			'label' => esc_html__( 'Button and drawer', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
			'condition' => [ 'collapse!' => 'none' ],
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'toggle_type',
			'selector' => '{{WRAPPER}} .rf-sbp__toggle',
		] );

		$this->add_control( 'toggle_color', [
			'label' => esc_html__( 'Button text color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sbp__toggle' => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'toggle_bg', [
			'label' => esc_html__( 'Button background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sbp__toggle' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'toggle_radius', [
			'label' => esc_html__( 'Button radius', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-sbp__toggle' => 'border-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'overlay_color', [
			'label' => esc_html__( 'Overlay behind the drawer', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sbp__overlay' => 'background-color: {{VALUE}};' ],
		] );

		$this->end_controls_section();
	}

	private function svg( string $name ): string {
		return Icons::svg( $name, [ 'size' => 22 ] );
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$id = 'rf-sbp-' . $this->get_id();
		$label = '' !== (string) ( $s['panel_label'] ?? '' ) ? $s['panel_label'] : __( 'Sidebar', 'refraction' );
		$text = (string) ( $s['toggle_text'] ?? '' );
		$this->add_render_attribute( 'wrap', [
			'class' => 'rf-sbp',
			'data-side' => 'right' === ( $s['side'] ?? '' ) ? 'right' : 'left',
			'data-look' => in_array( $s['look'] ?? '', [ 'floating', 'inline' ], true ) ? $s['look'] : 'docked',
			'data-push' => 'yes' === ( $s['push'] ?? '' ) ? 'yes' : 'no',
			'data-collapse' => in_array( $s['collapse'] ?? '', [ 'none', 'mobile', 'all' ], true ) ? $s['collapse'] : 'tablet',
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'wrap' ); ?>>
			<button type="button" class="rf-sbp__toggle" aria-expanded="false" aria-controls="<?php echo esc_attr( $id ); ?>"<?php echo '' === $text ? ' aria-label="' . esc_attr( $label ) . '"' : ''; ?>>
				<?php echo $this->svg( 'menu' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<?php if ( '' !== $text ) : ?><span><?php echo esc_html( $text ); ?></span><?php endif; ?>
			</button>
			<div class="rf-sbp__overlay" hidden></div>
			<aside class="rf-sbp__panel" id="<?php echo esc_attr( $id ); ?>" aria-label="<?php echo esc_attr( $label ); ?>" tabindex="-1">
				<button type="button" class="rf-sbp__close" aria-label="<?php echo esc_attr__( 'Close', 'refraction' ); ?>"><?php echo $this->svg( 'close' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
				<div class="rf-sbp__content">
					<?php $this->print_child( 0 ); ?>
				</div>
			</aside>
		</div>
		<?php
	}

	protected function get_initial_config(): array {
		return array_merge( parent::get_initial_config(), [
			'target_container' => [ '.rf-sbp__content' ],
		] );
	}

	protected function content_template() {
		?>
		<#
		const id = 'rf-sbp-' + view.getID(),
			label = settings.panel_label || 'Sidebar',
			look = [ 'floating', 'inline' ].includes( settings.look ) ? settings.look : 'docked',
			collapse = [ 'none', 'mobile', 'all' ].includes( settings.collapse ) ? settings.collapse : 'tablet';
		#>
		<div class="rf-sbp" data-side="{{ 'right' === settings.side ? 'right' : 'left' }}" data-look="{{ look }}" data-push="{{ 'yes' === settings.push ? 'yes' : 'no' }}" data-collapse="{{ collapse }}" data-preview-open="{{ 'yes' === settings.preview_open ? 'yes' : 'no' }}">
			<button type="button" class="rf-sbp__toggle" aria-expanded="false" aria-controls="{{ id }}">
				<?php echo $this->svg( 'menu' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<# if ( settings.toggle_text ) { #><span>{{ settings.toggle_text }}</span><# } #>
			</button>
			<div class="rf-sbp__overlay" hidden></div>
			<aside class="rf-sbp__panel" id="{{ id }}" aria-label="{{ label }}" tabindex="-1">
				<button type="button" class="rf-sbp__close" aria-label="Close"><?php echo $this->svg( 'close' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></button>
				<div class="rf-sbp__content"></div>
			</aside>
		</div>
		<?php
	}
}
