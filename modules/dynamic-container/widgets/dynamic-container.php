<?php
namespace Refraction\Modules\DynamicContainer\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Dynamic Container (0.120.0): a list of containers (three to start, Add Item for more), each the same as a Container
 * with all its settings, laid out per screen size as a grid (its own number of columns) or as a row that scrolls
 * sideways with no scrollbar, the next item peeking in (the default on phones).
 *
 * Markup: .rf-dc > the item containers. The layout is CSS only (assets/scss/frontend.scss): the settings write custom
 * properties and the grid or row declarations for each screen size.
 */
class Dynamic_Container extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-dynamic-container';
	}

	public function get_title() {
		return esc_html__( 'Dynamic Container', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-container-grid';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'container', 'grid', 'columns', 'repeater', 'list', 'cards', 'scroll', 'row', 'nested', 'dynamic' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-dynamic-container' ];
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-dynamic-container';
	}

	// ---------------------------------------------------------------- the items

	/** An item: a container like any other, with a little room and a soft outline to start from. */
	private function item_container( int $index ): array {
		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Item index. */
				'_title' => sprintf( __( 'Item #%d', 'refraction' ), $index ),
				'content_width' => 'full',
				'min_height' => [ 'unit' => 'px', 'size' => 240 ],
				'padding' => [ 'unit' => 'px', 'top' => '20', 'right' => '20', 'bottom' => '20', 'left' => '20', 'isLinked' => true ],
				'border_border' => 'solid',
				'border_width' => [ 'unit' => 'px', 'top' => '1', 'right' => '1', 'bottom' => '1', 'left' => '1', 'isLinked' => true ],
				'border_color' => '#D5D8DC',
				'border_radius' => [ 'unit' => 'px', 'top' => '12', 'right' => '12', 'bottom' => '12', 'left' => '12', 'isLinked' => true ],
			],
			'elements' => [],
		];
	}

	protected function get_default_children_elements() {
		return [ $this->item_container( 1 ), $this->item_container( 2 ), $this->item_container( 3 ) ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'item_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Item index. */
		return esc_html__( 'Item #%d', 'refraction' );
	}

	protected function get_default_children_placeholder_selector() {
		return '.rf-dc';
	}

	/** A new item gets the same start as the first ones (room and outline), like Focus Stack and Showcase Wheel. */
	protected function new_items_like_defaults(): bool {
		return true;
	}

	// ---------------------------------------------------------------- controls

	protected function register_controls() {
		$this->start_controls_section( 'section_items', [ 'label' => esc_html__( 'Items', 'refraction' ) ] );

		$repeater = new Repeater();
		$repeater->add_control( 'item_title', [
			'label' => esc_html__( 'Title', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Item', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'For the panel and the Navigator. The item is the container under this widget, with all a container\'s settings.', 'refraction' ),
		] );

		$this->add_control( 'items', [
			'label' => esc_html__( 'Items', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'item_title' => esc_html__( 'Item #1', 'refraction' ) ],
				[ 'item_title' => esc_html__( 'Item #2', 'refraction' ) ],
				[ 'item_title' => esc_html__( 'Item #3', 'refraction' ) ],
			],
			'title_field' => '{{{ item_title }}}',
			'button_text' => esc_html__( 'Add Item', 'refraction' ),
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Layout
		$this->start_controls_section( 'section_layout', [ 'label' => esc_html__( 'Layout', 'refraction' ) ] );

		$list = '{{WRAPPER}} .rf-dc';

		$this->add_responsive_control( 'layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'grid' => [ 'title' => esc_html__( 'Grid', 'refraction' ), 'icon' => 'rficon-container-grid' ],
				'scroll' => [ 'title' => esc_html__( 'Row scrolling sideways', 'refraction' ), 'icon' => 'rficon-h-align-stretch' ],
			],
			'default' => 'grid',
			'mobile_default' => 'scroll',
			'toggle' => false,
			'description' => esc_html__( 'Per screen size (the device icon). The row scrolls with a swipe or the trackpad, with no scrollbar shown.', 'refraction' ),
			// Each layout's own declarations; the custom properties come from the settings below.
			'selectors_dictionary' => [
				'grid' => 'grid-auto-flow: row; grid-template-columns: repeat(var(--rf-dc-cols, 3), minmax(0, 1fr)); grid-auto-columns: auto; overflow-x: visible; scroll-snap-type: none; padding-inline: 0;',
				'scroll' => 'grid-auto-flow: column; grid-template-columns: none; grid-auto-columns: calc((100% - (var(--rf-dc-show, 1.15) - 1) * var(--rf-dc-col-gap, 16px)) / var(--rf-dc-show, 1.15)); overflow-x: auto; scroll-snap-type: var(--rf-dc-snap, x mandatory); padding-inline: var(--rf-dc-edge, 0px); scroll-padding-inline: var(--rf-dc-edge, 0px);',
			],
			'selectors' => [ $list => '{{VALUE}}' ],
		] );

		$this->add_responsive_control( 'columns', [
			'label' => esc_html__( 'Columns', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1,
			'max' => 12,
			'step' => 1,
			'default' => 3,
			'tablet_default' => 2,
			'mobile_default' => 1,
			'description' => esc_html__( 'In the grid: how many items side by side on this screen size.', 'refraction' ),
			'selectors' => [ $list => '--rf-dc-cols: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'show', [
			'label' => esc_html__( 'Items in view', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1,
			'max' => 8,
			'step' => 0.05,
			'default' => 3.2,
			'tablet_default' => 2.2,
			'mobile_default' => 1.15,
			'description' => esc_html__( 'In the scrolling row: how many items fit across. A fraction lets the next one peek in, showing there is more.', 'refraction' ),
			'selectors' => [ $list => '--rf-dc-show: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'column_gap', [
			'label' => esc_html__( 'Space between columns', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em', 'rem' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 120 ] ],
			'default' => [ 'unit' => 'px', 'size' => 16 ],
			'selectors' => [ $list => '--rf-dc-col-gap: {{SIZE}}{{UNIT}};' ],
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'row_gap', [
			'label' => esc_html__( 'Space between rows', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em', 'rem' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 120 ] ],
			'default' => [ 'unit' => 'px', 'size' => 16 ],
			'selectors' => [ $list => '--rf-dc-row-gap: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'align', [
			'label' => esc_html__( 'Item height', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'stretch',
			'options' => [
				'stretch' => esc_html__( 'All as tall as the tallest in their row', 'refraction' ),
				'start' => esc_html__( 'Their own height, at the top', 'refraction' ),
				'center' => esc_html__( 'Their own height, in the middle', 'refraction' ),
				'end' => esc_html__( 'Their own height, at the bottom', 'refraction' ),
			],
			'selectors' => [ $list => 'align-items: {{VALUE}};' ],
		] );

		$this->add_control( 'snap', [
			'label' => esc_html__( 'Stop at each item', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'In the scrolling row: a swipe stops with an item lined up at the start.', 'refraction' ),
			'selectors_dictionary' => [ '' => 'none', 'yes' => 'x mandatory' ],
			'selectors' => [ $list => '--rf-dc-snap: {{VALUE}};' ],
		] );

		$this->add_responsive_control( 'edge', [
			'label' => esc_html__( 'Room at the row\'s ends', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
			'description' => esc_html__( 'In the scrolling row: space before the first item and after the last, so they do not touch the screen\'s edge.', 'refraction' ),
			'selectors' => [ $list => '--rf-dc-edge: {{SIZE}}{{UNIT}};' ],
		] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- output

	protected function render() {
		?>
		<div class="rf-dc">
			<?php foreach ( $this->get_children() as $child ) {
				$child->print_element();
			} ?>
		</div>
		<?php
	}

	protected function content_template() {
		?>
		<div class="rf-dc"></div>
		<?php
	}
}
