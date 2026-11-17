<?php
namespace Refraction\Modules\ShowcaseWheel\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\OrganicFx\Classes\Pure_Organic;
use Refraction\Modules\OrganicFx\Classes\Shapes_Repository;
use Refraction\Modules\OrganicFx\Module as OrganicFx;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Modules\ProWidgets\Classes\Motion_Easings;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Showcase Wheel (0.113.0): a product slider after a reference the owner chose (a "Landing page | Carousel design
 * animation" pin) and the owner's sketch.
 *
 * Each slide is a container under the widget: its main container (background, overlay, border: the container's own
 * settings) holding a Content container on the left or the right. The slide's picture sits on the other side, with an
 * optional arc or blob behind it. Moving on, the pictures swing along a large wheel, the old one out and the new one in,
 * while the slides cross-fade. Thumbnails pick a slide; the current one stands on an optional shape with its label.
 *
 * Markup: .rf-sw > .rf-sw__slots > .rf-sw__slot (one per slide: its container, then .rf-sw__visual with the
 * decoration and the picture), then .rf-sw__nav (thumbnails, arrows). Script: assets/js/frontend/handlers.
 */
class Showcase_Wheel extends Widget_Nested_Base {

	public function get_name() {
		return 'refraction-showcase-wheel';
	}

	public function get_title() {
		return esc_html__( 'Showcase Wheel', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-slider-push';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'showcase', 'product', 'slider', 'carousel', 'wheel', 'thumbnails', 'hero', 'nested', 'container' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-showcase-wheel' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function get_html_wrapper_class() {
		return 'refraction-widget-showcase-wheel';
	}

	// ---------------------------------------------------------------- the slides

	private static function widget( string $type, array $settings ): array {
		return [ 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => [] ];
	}

	/** A slide: its main container (a soft background to change) holding the Content container with an example. */
	private function slide_container( int $index ): array {
		$names = [ 1 => __( 'Saloon', 'refraction' ), 2 => __( 'Estate', 'refraction' ), 3 => __( 'People carrier', 'refraction' ) ];
		$tints = [ 1 => '#F2F4F7', 2 => '#F4F2EE', 3 => '#EEF3F1' ];
		$name = $names[ $index ] ?? sprintf( /* translators: %d: Slide index. */ __( 'Slide %d', 'refraction' ), $index );

		return [
			'elType' => 'container',
			'settings' => [
				/* translators: %d: Slide index. */
				'_title' => sprintf( __( 'Slide #%d', 'refraction' ), $index ),
				'content_width' => 'full',
				'flex_direction' => 'row',
				'flex_align_items' => 'center',
				'min_height' => [ 'unit' => 'px', 'size' => 460 ],
				'padding' => [ 'unit' => 'px', 'top' => '40', 'right' => '40', 'bottom' => '110', 'left' => '40', 'isLinked' => false ],
				'background_background' => 'classic',
				'background_color' => $tints[ $index ] ?? '#F2F4F7',
			],
			'elements' => [
				[
					'elType' => 'container',
					'isInner' => true,
					'settings' => [
						'_title' => __( 'Content', 'refraction' ),
						'content_width' => 'full',
						'width' => [ 'unit' => '%', 'size' => 46 ],
						'width_mobile' => [ 'unit' => '%', 'size' => 100 ],
						'flex_gap' => [ 'unit' => 'px', 'size' => 16, 'column' => '16', 'row' => '16', 'isLinked' => true ],
						'flex_align_items' => 'flex-start',
					],
					'elements' => [
						self::widget( 'heading', [ 'title' => $name, 'header_size' => 'h2', 'typography_typography' => 'custom', 'typography_font_size' => [ 'unit' => 'px', 'size' => 44 ], 'typography_font_weight' => '700' ] ),
						self::widget( 'text-editor', [ 'editor' => '<p>' . esc_html__( 'Describe this slide here: what it is and why it suits. Its picture, thumbnail and label are set in the slide list.', 'refraction' ) . '</p>' ] ),
						self::widget( 'button', [ 'text' => __( 'Book now', 'refraction' ), 'size' => 'sm' ] ),
					],
				],
			],
		];
	}

	protected function get_default_children_elements() {
		return [ $this->slide_container( 1 ), $this->slide_container( 2 ), $this->slide_container( 3 ) ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'slide_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Slide index. */
		return esc_html__( 'Slide #%d', 'refraction' );
	}

	// One slot per slide: its container goes into the slot of the same place.
	protected function get_default_children_container_placeholder_selector() {
		return '.rf-sw__slot';
	}

	/** A slide added in the editor gets its Content container like the first ones. */
	protected function new_items_like_defaults(): bool {
		return true;
	}

	// ---------------------------------------------------------------- controls

	/** The uploaded shapes (My Shapes) as visual choices, as in Deco Blob. */
	private static function my_shape_choices(): array {
		$out = [];

		foreach ( ( new Shapes_Repository() )->all() as $id => $shape ) {
			$out[ $id ] = [ 'title' => esc_html( $shape['name'] ), 'image' => OrganicFx::thumb( $shape['d'], $shape['vb'], $shape['rule'] ) ];
		}

		return $out;
	}

	/**
	 * A slide's shape: path data, viewBox and fill rule (uploaded, else built-in, else 0.113.0's numbered blobs).
	 * @param array $slide
	 */
	private static function blob_data( array $slide ): array {
		if ( 'mine' === ( $slide['sw_blob_source'] ?? '' ) ) {
			$mine = ( new Shapes_Repository() )->all();
			$id = (string) ( $slide['sw_blob_mine'] ?? '' );

			if ( isset( $mine[ $id ] ) ) {
				return [ 'd' => $mine[ $id ]['d'], 'vb' => $mine[ $id ]['vb'], 'rule' => $mine[ $id ]['rule'] ];
			}
		}

		$id = (string) ( $slide['sw_blob_pick'] ?? '' );

		if ( ! isset( Pure_Organic::SHAPES[ $id ] ) ) {
			$old = (string) ( $slide['blob_shape'] ?? '' );
			$id = in_array( $old, [ '1', '2', '3', '4' ], true ) ? 'blob-' . $old : 'blob-1';
		}

		return [ 'd' => Pure_Organic::path( $id ), 'vb' => '0 0 100 100', 'rule' => 'nonzero' ];
	}

	/** How many floating images a slide can have. */
	const FLOATS = 5;

	/** Where each floating image starts (x, y in % of the picture's space), so new ones do not cover each other. */
	const FLOAT_PLACES = [ 1 => [ 14, 22 ], 2 => [ 86, 14 ], 3 => [ 12, 80 ], 4 => [ 88, 84 ], 5 => [ 52, 4 ] ];

	/**
	 * A slide's floating images (0.119.0): up to five small pictures or icons around the slide's picture, each with its
	 * Content (what, where, how it moves) and Style tabs, like Phone Showcase's floating cards but only a picture or an
	 * icon. They turn with the picture on the wheel. In the editor they can be dragged into place.
	 *
	 * @param Repeater $repeater The slide list's fields.
	 */
	private static function floating_controls( Repeater $repeater ): void {
		$repeater->add_control( 'float_count', [
			'label' => esc_html__( 'Floating images', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '0',
			'options' => [ '0' => esc_html__( 'None', 'refraction' ), '1' => '1', '2' => '2', '3' => '3', '4' => '4', '5' => '5' ],
			'description' => esc_html__( 'Small pictures or icons around the picture, such as the ingredients around a dish. They turn with the picture.', 'refraction' ),
			'separator' => 'before',
		] );

		for ( $n = 1; $n <= self::FLOATS; $n++ ) {
			$p = 'fl' . $n . '_';
			$on = [ 'float_count' => array_map( 'strval', range( $n, self::FLOATS ) ) ];
			$el = '{{WRAPPER}} {{CURRENT_ITEM}} .rf-sw__float--' . $n;
			[ $x, $y ] = self::FLOAT_PLACES[ $n ];

			$repeater->add_control( $p . 'heading', [
				/* translators: %d: Floating image number. */
				'label' => sprintf( esc_html__( 'Floating image %d', 'refraction' ), $n ),
				'type' => Controls_Manager::HEADING,
				'separator' => 'before',
				'condition' => $on,
			] );

			$repeater->start_controls_tabs( $p . 'tabs', [ 'condition' => $on ] );
			$repeater->start_controls_tab( $p . 'tab_content', [ 'label' => esc_html__( 'Content', 'refraction' ), 'condition' => $on ] );

			$repeater->add_control( $p . 'type', [
				'label' => esc_html__( 'Show', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'image' => [ 'title' => esc_html__( 'Picture', 'refraction' ), 'icon' => 'rficon-image' ],
					'icon' => [ 'title' => esc_html__( 'Icon', 'refraction' ), 'icon' => 'rficon-star' ],
				],
				'default' => 'image',
				'toggle' => false,
				'condition' => $on,
			] );

			$repeater->add_control( $p . 'image', [
				'label' => esc_html__( 'Picture', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'description' => esc_html__( 'A cut-out (PNG or SVG with a see-through background) looks best.', 'refraction' ),
				'condition' => $on + [ $p . 'type!' => 'icon' ],
			] );

			$repeater->add_control( $p . 'icon', [
				'label' => esc_html__( 'Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'default' => [ 'value' => 'fas fa-star', 'library' => 'fa-solid' ],
				'condition' => $on + [ $p . 'type' => 'icon' ],
			] );

			$repeater->add_responsive_control( $p . 'x', [
				'label' => esc_html__( 'Across (%)', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%' ],
				'range' => [ '%' => [ 'min' => -50, 'max' => 150 ] ],
				'default' => [ 'unit' => '%', 'size' => $x ],
				'selectors' => [ $el => '--rf-sw-fx: {{SIZE}}%;' ],
				'condition' => $on,
			] );

			$repeater->add_responsive_control( $p . 'y', [
				'label' => esc_html__( 'Down (%)', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%' ],
				'range' => [ '%' => [ 'min' => -50, 'max' => 150 ] ],
				'default' => [ 'unit' => '%', 'size' => $y ],
				'selectors' => [ $el => '--rf-sw-fy: {{SIZE}}%;' ],
				'description' => esc_html__( 'Of the picture\'s space, from its top left. Tip: in the editor, drag it into place (for the screen size shown).', 'refraction' ),
				'condition' => $on,
			] );

			$repeater->add_control( $p . 'motion', [
				'label' => esc_html__( 'Animation', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'bob',
				'options' => [
					'' => esc_html__( 'None', 'refraction' ),
					'bob' => esc_html__( 'Float up and down', 'refraction' ),
					'sway' => esc_html__( 'Sway', 'refraction' ),
					'spin' => esc_html__( 'Turn slowly', 'refraction' ),
					'pulse' => esc_html__( 'Pulse', 'refraction' ),
				],
				'condition' => $on,
			] );

			$repeater->add_control( $p . 'speed', [
				'label' => esc_html__( 'Duration (s)', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 1, 'max' => 30, 'step' => 0.5 ] ],
				'selectors' => [ $el => '--rf-sw-ft: {{SIZE}}s;' ],
				'condition' => $on + [ $p . 'motion!' => '' ],
			] );

			$repeater->end_controls_tab();
			$repeater->start_controls_tab( $p . 'tab_style', [ 'label' => esc_html__( 'Style', 'refraction' ), 'condition' => $on ] );

			$repeater->add_responsive_control( $p . 'size', [
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'range' => [ 'px' => [ 'min' => 12, 'max' => 400 ], '%' => [ 'min' => 2, 'max' => 80 ] ],
				'selectors' => [ $el => '--rf-sw-fs: {{SIZE}}{{UNIT}};' ],
				'condition' => $on,
			] );

			$repeater->add_control( $p . 'rotate', [
				'label' => esc_html__( 'Turn (deg)', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => -180, 'max' => 180 ] ],
				'selectors' => [ $el => '--rf-sw-fr: {{SIZE}}deg;' ],
				'condition' => $on,
			] );

			$repeater->add_control( $p . 'layer', [
				'label' => esc_html__( 'Layer', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'front' => [ 'title' => esc_html__( 'In front of the picture', 'refraction' ), 'icon' => 'rficon-v-align-top' ],
					'back' => [ 'title' => esc_html__( 'Behind the picture', 'refraction' ), 'icon' => 'rficon-v-align-bottom' ],
				],
				'default' => 'front',
				'toggle' => false,
				'condition' => $on,
			] );

			$repeater->add_control( $p . 'opacity', [
				'label' => esc_html__( 'Opacity', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 1, 'step' => 0.05 ] ],
				'selectors' => [ $el => 'opacity: {{SIZE}};' ],
				'condition' => $on,
			] );

			$repeater->add_control( $p . 'shadow', [
				'label' => esc_html__( 'Shadow', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'condition' => $on,
			] );

			$repeater->add_control( $p . 'color', [
				'label' => esc_html__( 'Icon color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $el => 'color: {{VALUE}}; fill: {{VALUE}};' ],
				'condition' => $on + [ $p . 'type' => 'icon' ],
			] );

			$repeater->end_controls_tab();
			$repeater->end_controls_tabs();
		}
	}

	/**
	 * A slide's floating images, for one layer (in front of or behind the picture).
	 *
	 * @param array  $slide The slide's item in the Slides list.
	 * @param string $layer 'front' or 'back'.
	 */
	private static function floats( array $slide, string $layer ): string {
		$count = max( 0, min( self::FLOATS, (int) ( $slide['float_count'] ?? 0 ) ) );
		$out = '';

		for ( $n = 1; $n <= $count; $n++ ) {
			$p = 'fl' . $n . '_';

			if ( ( 'back' === ( $slide[ $p . 'layer' ] ?? 'front' ) ? 'back' : 'front' ) !== $layer ) {
				continue;
			}

			$inner = '';

			if ( 'icon' === ( $slide[ $p . 'type' ] ?? 'image' ) ) {
				$inner = (string) Icons_Manager::try_get_icon_html( (array) ( $slide[ $p . 'icon' ] ?? [] ), [ 'aria-hidden' => 'true' ] );
			} elseif ( ! empty( $slide[ $p . 'image' ]['url'] ) ) {
				$inner = '<img src="' . esc_url( $slide[ $p . 'image' ]['url'] ) . '" alt="" loading="lazy" decoding="async" draggable="false">';
			}

			if ( '' === $inner ) {
				continue;
			}

			$motion = (string) ( $slide[ $p . 'motion' ] ?? 'bob' );
			$classes = [ 'rf-sw__float', 'rf-sw__float--' . $n ];
			$classes[] = in_array( $motion, [ 'bob', 'sway', 'spin', 'pulse' ], true ) ? 'rf-sw__float--' . $motion : 'rf-sw__float--still';

			if ( 'yes' === ( $slide[ $p . 'shadow' ] ?? 'yes' ) ) {
				$classes[] = 'has-shadow';
			}

			$out .= '<span class="' . esc_attr( implode( ' ', $classes ) ) . '" data-float="' . $n . '" style="--rf-sw-fd:' . esc_attr( (string) ( $n * -0.7 ) ) . 's"><span class="rf-sw__float-in">' . $inner . '</span></span>';
		}

		return $out;
	}

	private static function choose( array $labels_icons ): array {
		$options = [];

		foreach ( $labels_icons as $value => [ $label, $icon ] ) {
			$options[ $value ] = [ 'title' => $label, 'icon' => $icon ];
		}

		return $options;
	}

	protected function register_controls() {
		$placeholder = [ 'url' => Utils::get_placeholder_image_src() ];

		// ------------------------------------------------ Content: slides
		$this->start_controls_section( 'section_slides', [ 'label' => esc_html__( 'Slides', 'refraction' ) ] );

		$repeater = new Repeater();

		$repeater->add_control( 'slide_title', [
			'label' => esc_html__( 'Label', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Slide', 'refraction' ),
			'label_block' => true,
			'description' => esc_html__( 'Under its thumbnail, and for screen readers. The slide itself is the container under this widget: its background is that container\'s, its text the Content container\'s.', 'refraction' ),
		] );

		$repeater->add_control( 'badge', [
			'label' => esc_html__( 'Badge', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( '£45', 'refraction' ),
			'description' => esc_html__( 'A small tag under the label, such as a price. Empty: none.', 'refraction' ),
		] );

		$repeater->add_control( 'image', [
			'label' => esc_html__( 'Picture', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'default' => $placeholder,
			'separator' => 'before',
		] );

		$repeater->add_control( 'image_alt', [
			'label' => esc_html__( 'Picture description', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'description' => esc_html__( 'For screen readers. Empty: the picture\'s own alt text.', 'refraction' ),
		] );

		$repeater->add_control( 'thumb', [
			'label' => esc_html__( 'Thumbnail', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'description' => esc_html__( 'Empty: the picture.', 'refraction' ),
		] );

		// Where this slide's picture sits (0.119.0): moved from its place, per screen size; in the editor the picture can
		// be dragged (showcase-wheel.js writes these for the screen size shown).
		$item = '{{WRAPPER}} {{CURRENT_ITEM}}';
		$repeater->add_responsive_control( 'pic_x', [
			'label' => esc_html__( 'Move the picture across', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'default' => [ 'unit' => '%', 'size' => '' ],
			'size_units' => [ '%', 'px' ],
			'range' => [ '%' => [ 'min' => -100, 'max' => 100 ], 'px' => [ 'min' => -600, 'max' => 600 ] ],
			'selectors' => [ $item => '--rf-sw-pic-x: {{SIZE}}{{UNIT}};' ],
			'separator' => 'before',
		] );

		$repeater->add_responsive_control( 'pic_y', [
			'label' => esc_html__( 'Move the picture up or down', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'default' => [ 'unit' => '%', 'size' => '' ],
			'size_units' => [ '%', 'px' ],
			'range' => [ '%' => [ 'min' => -100, 'max' => 100 ], 'px' => [ 'min' => -600, 'max' => 600 ] ],
			'selectors' => [ $item => '--rf-sw-pic-y: {{SIZE}}{{UNIT}};' ],
			'description' => esc_html__( 'Tip: in the editor, drag the picture to place it (for the screen size shown).', 'refraction' ),
		] );

		$repeater->add_control( 'side', [
			'label' => esc_html__( 'Content on the', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => self::choose( [
				'left' => [ esc_html__( 'Left (picture on the right)', 'refraction' ), 'rficon-h-align-left' ],
				'right' => [ esc_html__( 'Right (picture on the left)', 'refraction' ), 'rficon-h-align-right' ],
			] ),
			'default' => 'left',
			'toggle' => false,
			'separator' => 'before',
		] );

		$repeater->add_control( 'deco', [
			'label' => esc_html__( 'Behind the picture', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Nothing', 'refraction' ),
				'corner' => esc_html__( 'An arc in a corner (a quarter circle)', 'refraction' ),
				'blob' => esc_html__( 'A shape (Deco Blob shapes)', 'refraction' ),
				'arc' => esc_html__( 'A ring behind the picture', 'refraction' ),
			],
		] );

		// What is behind the picture: its Content (which, where, how it moves) and its Style (0.119.0).
		$on_deco = [ 'deco!' => '' ];
		$repeater->start_controls_tabs( 'deco_tabs', [ 'condition' => $on_deco ] );
		$repeater->start_controls_tab( 'deco_tab_content', [ 'label' => esc_html__( 'Content', 'refraction' ), 'condition' => $on_deco ] );

		$repeater->add_control( 'arc_corner', [
			'label' => esc_html__( 'Corner', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'auto',
			'options' => [
				'auto' => esc_html__( 'Top, on the picture\'s side', 'refraction' ),
				'top-left' => esc_html__( 'Top left', 'refraction' ),
				'top-right' => esc_html__( 'Top right', 'refraction' ),
				'bottom-left' => esc_html__( 'Bottom left', 'refraction' ),
				'bottom-right' => esc_html__( 'Bottom right', 'refraction' ),
			],
			'condition' => [ 'deco' => 'corner' ],
		] );

		// The shape: the Deco Blob and Shape Mask shapes, built in or uploaded (Refraction > My Shapes).
		$on_blob = [ 'deco' => 'blob' ];
		$repeater->add_control( 'sw_blob_source', [
			'label' => esc_html__( 'Shape', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [ 'builtin' => [ 'title' => esc_html__( 'Built-in', 'refraction' ) ], 'mine' => [ 'title' => esc_html__( 'Uploaded', 'refraction' ) ] ],
			'default' => 'builtin',
			'toggle' => false,
			'label_block' => true,
			'classes' => 'rf-shape-tabs',
			'condition' => $on_blob,
		] );

		$repeater->add_control( 'sw_blob_pick', [
			'label' => esc_html__( 'Built-in shapes', 'refraction' ),
			'type' => Controls_Manager::VISUAL_CHOICE,
			'label_block' => true,
			'columns' => 4,
			'toggle' => false,
			'options' => OrganicFx::builtin_choices(),
			'default' => 'blob-1',
			'condition' => $on_blob + [ 'sw_blob_source!' => 'mine' ],
		] );

		$repeater->add_control( 'sw_blob_mine_upload', [
			'type' => Controls_Manager::BUTTON,
			'label' => esc_html__( 'Your shapes', 'refraction' ),
			'text' => esc_html__( 'Upload or manage', 'refraction' ),
			'event' => 'refraction:organicLibrary:sw_blob_mine',
			'description' => esc_html__( 'The same shapes as Deco Blob and Shape Mask. Add an SVG (a file or pasted code), rename or delete your shapes.', 'refraction' ),
			'condition' => $on_blob + [ 'sw_blob_source' => 'mine' ],
		] );

		$repeater->add_control( 'sw_blob_mine', [
			'label' => esc_html__( 'Uploaded shapes', 'refraction' ),
			'type' => Controls_Manager::VISUAL_CHOICE,
			'label_block' => true,
			'columns' => 4,
			'toggle' => false,
			'options' => self::my_shape_choices(),
			'condition' => $on_blob + [ 'sw_blob_source' => 'mine' ],
		] );

		// 0.113.0's own four blobs (1 to 4): the first four built-in blobs.
		$repeater->add_control( 'blob_shape', [
			'type' => Controls_Manager::HIDDEN,
			'default' => '',
		] );

		$repeater->add_control( 'deco_motion', [
			'label' => esc_html__( 'Animation', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'None', 'refraction' ),
				'float' => esc_html__( 'Float gently', 'refraction' ),
				'breathe' => esc_html__( 'Breathe (grow and shrink)', 'refraction' ),
				'spin' => esc_html__( 'Turn slowly', 'refraction' ),
				'wobble' => esc_html__( 'Wobble', 'refraction' ),
			],
			'separator' => 'before',
			'condition' => $on_deco,
		] );

		$repeater->add_control( 'deco_speed', [
			'label' => esc_html__( 'Duration (s)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 40, 'step' => 0.5 ] ],
			'selectors' => [ $item => '--rf-sw-deco-t: {{SIZE}}s;' ],
			'condition' => $on_deco + [ 'deco_motion!' => '' ],
		] );

		$repeater->end_controls_tab();
		$repeater->start_controls_tab( 'deco_tab_style', [ 'label' => esc_html__( 'Style', 'refraction' ), 'condition' => $on_deco ] );

		$repeater->add_control( 'deco_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#FFFFFFB3',
			'selectors' => [ $item => '--rf-sw-deco-color: {{VALUE}};' ],
			'condition' => $on_deco,
		] );

		$repeater->add_control( 'deco_opacity', [
			'label' => esc_html__( 'Opacity', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 1, 'step' => 0.05 ] ],
			'selectors' => [ $item . ' .rf-sw__deco, ' . $item . ' .rf-sw__corner' => 'opacity: {{SIZE}};' ],
			'condition' => $on_deco,
		] );

		$repeater->add_responsive_control( 'deco_scale', [
			'label' => esc_html__( 'Size (%)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%' ],
			'range' => [ '%' => [ 'min' => 20, 'max' => 250 ] ],
			'description' => esc_html__( 'Of the size set in Style > Picture (or Arc in a corner). Empty: 100%.', 'refraction' ),
			'selectors' => [ $item => '--rf-sw-deco-k: calc({{SIZE}} / 100);' ],
			'condition' => $on_deco,
		] );

		$repeater->add_responsive_control( 'deco_x', [
			'label' => esc_html__( 'Move across', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => -400, 'max' => 400 ], '%' => [ 'min' => -100, 'max' => 100 ] ],
			'selectors' => [ $item => '--rf-sw-deco-x: {{SIZE}}{{UNIT}};' ],
			'condition' => $on_deco,
		] );

		$repeater->add_responsive_control( 'deco_y', [
			'label' => esc_html__( 'Move up or down', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => -400, 'max' => 400 ], '%' => [ 'min' => -100, 'max' => 100 ] ],
			'selectors' => [ $item => '--rf-sw-deco-y: {{SIZE}}{{UNIT}};' ],
			'condition' => $on_deco,
		] );

		$repeater->add_control( 'deco_rotate', [
			'label' => esc_html__( 'Turn (deg)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -180, 'max' => 180 ] ],
			'selectors' => [ $item => '--rf-sw-deco-r: {{SIZE}}deg;' ],
			'condition' => $on_deco + [ 'deco' => [ 'blob', 'corner' ] ],
		] );

		$repeater->end_controls_tab();
		$repeater->end_controls_tabs();

		self::floating_controls( $repeater );

		$this->add_control( 'slides', [
			'label' => esc_html__( 'Slides', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $repeater->get_controls(),
			'default' => [
				[ 'slide_title' => esc_html__( 'Saloon', 'refraction' ), 'deco' => 'corner' ],
				[ 'slide_title' => esc_html__( 'Estate', 'refraction' ), 'deco' => 'blob' ],
				[ 'slide_title' => esc_html__( 'People carrier', 'refraction' ), 'deco' => 'blob', 'sw_blob_pick' => 'blob-3' ],
			],
			'title_field' => '{{{ slide_title }}}',
			'button_text' => esc_html__( 'Add Slide', 'refraction' ),
		] );

		$this->add_control( 'wheel_label', [
			'label' => esc_html__( 'Accessible name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'Showcase', 'refraction' ),
			'separator' => 'before',
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Content: thumbnails
		$this->start_controls_section( 'section_nav', [ 'label' => esc_html__( 'Thumbnails', 'refraction' ) ] );

		$this->add_control( 'show_thumbs', [
			'label' => esc_html__( 'Show thumbnails', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_responsive_control( 'nav_position', [
			'label' => esc_html__( 'Position', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => self::choose( [
				'left' => [ esc_html__( 'Left', 'refraction' ), 'rficon-h-align-left' ],
				'center' => [ esc_html__( 'Middle', 'refraction' ), 'rficon-h-align-center' ],
				'right' => [ esc_html__( 'Right', 'refraction' ), 'rficon-h-align-right' ],
			] ),
			'default' => 'left',
			'toggle' => false,
			'selectors_dictionary' => [ 'left' => 'flex-start', 'center' => 'center', 'right' => 'flex-end' ],
			'selectors' => [ '{{WRAPPER}} .rf-sw__nav' => 'justify-content: {{VALUE}};' ],
		] );

		$this->add_control( 'thumb_shape', [
			'label' => esc_html__( 'Shape behind the current one', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'rounded',
			'options' => [
				'none' => esc_html__( 'None', 'refraction' ),
				'circle' => esc_html__( 'Circle', 'refraction' ),
				'rounded' => esc_html__( 'Rounded rectangle', 'refraction' ),
				'square' => esc_html__( 'Rectangle', 'refraction' ),
			],
			'prefix_class' => 'rf-sw-shape-',
			'render_type' => 'ui',
		] );

		$this->add_control( 'labels', [
			'label' => esc_html__( 'Labels', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'current',
			'options' => [
				'current' => esc_html__( 'Under the current one', 'refraction' ),
				'all' => esc_html__( 'Under every thumbnail', 'refraction' ),
				'none' => esc_html__( 'None', 'refraction' ),
			],
			'prefix_class' => 'rf-sw-labels-',
			'render_type' => 'ui',
		] );

		$this->add_control( 'arrows', [
			'label' => esc_html__( 'Arrows', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'next',
			'options' => [
				'next' => esc_html__( 'Next only, after the thumbnails', 'refraction' ),
				'both' => esc_html__( 'Previous and next', 'refraction' ),
				'none' => esc_html__( 'None', 'refraction' ),
			],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Content: motion
		$this->start_controls_section( 'section_motion', [ 'label' => esc_html__( 'Motion', 'refraction' ) ] );

		$js = [ 'frontend_available' => true, 'render_type' => 'none' ];

		$this->add_control( 'transition', $js + [
			'label' => esc_html__( 'Transition', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'wheel',
			'options' => [
				'wheel' => esc_html__( 'Wheel: the pictures swing along an arc', 'refraction' ),
				'slide' => esc_html__( 'Slide: the pictures slide across', 'refraction' ),
				'fade' => esc_html__( 'Fade', 'refraction' ),
			],
		] );

		$this->add_control( 'swing', $js + [
			'label' => esc_html__( 'The new picture comes from', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'top',
			'options' => [
				'top' => esc_html__( 'Above (the old one leaves below)', 'refraction' ),
				'bottom' => esc_html__( 'Below (the old one leaves above)', 'refraction' ),
			],
			'condition' => [ 'transition' => 'wheel' ],
		] );

		$this->add_control( 'duration', $js + [
			'label' => esc_html__( 'Slide change duration (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 100,
			'max' => 3000,
			'step' => 50,
			'default' => 800,
		] );

		$this->add_control( 'easing', $js + [
			'label' => esc_html__( 'Slide change easing', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'smooth',
			'options' => Motion_Easings::options(),
		] );


		$this->add_control( 'idle_spin', [
			'label' => esc_html__( 'Turn the picture slowly', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'For round pictures, such as a plate seen from above.', 'refraction' ),
			'prefix_class' => 'rf-sw-spin-',
			'render_type' => 'ui',
		] );

		$this->add_control( 'autoplay', $js + [
			'label' => esc_html__( 'Play by itself', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'separator' => 'before',
			'description' => esc_html__( 'Not in Edit Mode, where it follows the slide you pick.', 'refraction' ),
		] );

		$this->add_control( 'interval', $js + [
			'label' => esc_html__( 'Each slide stays (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1000,
			'max' => 20000,
			'step' => 100,
			'default' => 4000,
			'condition' => [ 'autoplay' => 'yes' ],
		] );

		$this->add_control( 'pause_on_hover', $js + [
			'label' => esc_html__( 'Wait while the pointer is on it', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'condition' => [ 'autoplay' => 'yes' ],
		] );
		// The slide's content coming in (0.116.0): the widgets of its Content container, together or one after another.
		$this->add_control( 'content_heading', [
			'label' => esc_html__( 'The content coming in', 'refraction' ),
			'type' => Controls_Manager::HEADING,
			'separator' => 'before',
		] );

		$this->add_control( 'content_motion', $js + [
			'label' => esc_html__( 'Animation', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'fade-up',
			'options' => [
				'none' => esc_html__( 'None (it fades with its slide)', 'refraction' ),
				'fade-up' => esc_html__( 'Rise', 'refraction' ),
				'fade-down' => esc_html__( 'Drop in', 'refraction' ),
				'slide' => esc_html__( 'Slide in (the way the slides move)', 'refraction' ),
				'zoom' => esc_html__( 'Grow in', 'refraction' ),
				'blur' => esc_html__( 'Come into focus (blur)', 'refraction' ),
				'mask' => esc_html__( 'Wipe up', 'refraction' ),
				'tilt' => esc_html__( 'Swing in (turning, like the wheel)', 'refraction' ),
			],
		] );

		$on = [ 'content_motion!' => 'none' ];

		$this->add_control( 'content_stagger', $js + [
			'label' => esc_html__( 'One after another', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Each widget in the slide\'s Content container comes in after the one before it. Off: the content comes in as one.', 'refraction' ),
			'condition' => $on,
		] );

		$this->add_control( 'content_gap', $js + [
			'label' => esc_html__( 'Time between them (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 1000,
			'step' => 10,
			'default' => 90,
			'condition' => $on + [ 'content_stagger' => 'yes' ],
		] );

		$this->add_control( 'content_delay', $js + [
			'label' => esc_html__( 'Starts after (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 3000,
			'step' => 10,
			'default' => 200,
			'description' => esc_html__( 'From the start of the slide change.', 'refraction' ),
			'condition' => $on,
		] );

		$this->add_control( 'content_duration', $js + [
			'label' => esc_html__( 'Content duration (ms)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 100,
			'max' => 3000,
			'step' => 50,
			'default' => 700,
			'condition' => $on,
		] );

		$this->add_control( 'content_distance', $js + [
			'label' => esc_html__( 'Content distance (px)', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 0,
			'max' => 300,
			'default' => 40,
			'condition' => $on + [ 'content_motion' => [ 'fade-up', 'fade-down', 'slide', 'tilt' ] ],
		] );

		$this->add_control( 'content_easing', $js + [
			'label' => esc_html__( 'Content easing', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'glide',
			'options' => Motion_Easings::options(),
			'condition' => $on,
		] );


		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls() {
		// ------------------------------------------------ Style: the box
		$this->start_controls_section( 'section_style_box', [
			'label' => esc_html__( 'Box', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_control( 'box_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Each slide\'s background, overlay and border are its own container\'s: select the slide (or Slide #1... in the Navigator) and use its Style tab.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );

		$this->add_responsive_control( 'box_radius', [
			'label' => esc_html__( 'Border Radius', 'refraction' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%', 'em' ],
			'default' => [ 'unit' => 'px', 'top' => '24', 'right' => '24', 'bottom' => '24', 'left' => '24', 'isLinked' => true ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'box_border',
			'selector' => '{{WRAPPER}} .rf-sw',
		] );

		$this->add_group_control( Group_Control_Box_Shadow::get_type(), [
			'name' => 'box_shadow',
			'selector' => '{{WRAPPER}} .rf-sw',
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Style: the picture and what is behind it
		$this->start_controls_section( 'section_style_picture', [
			'label' => esc_html__( 'Picture', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_responsive_control( 'picture_width', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%' ],
			'range' => [ '%' => [ 'min' => 20, 'max' => 70 ] ],
			'default' => [ 'unit' => '%', 'size' => 46 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-picture-w: {{SIZE}}%;' ],
		] );

		$this->add_responsive_control( 'picture_height', [
			'label' => esc_html__( 'Height at most', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh' ],
			'range' => [ 'px' => [ 'min' => 80, 'max' => 900 ], 'vh' => [ 'min' => 10, 'max' => 90 ] ],
			'default' => [ 'unit' => 'px', 'size' => 380 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-picture-max: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'picture_offset', [
			'label' => esc_html__( 'Distance from the edge', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%', 'px' ],
			'range' => [ '%' => [ 'min' => -20, 'max' => 40 ], 'px' => [ 'min' => -200, 'max' => 300 ] ],
			'default' => [ 'unit' => '%', 'size' => 4 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-picture-edge: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'picture_shadow', [
			'label' => esc_html__( 'Shadow under the picture', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'prefix_class' => 'rf-sw-shadow-',
			'render_type' => 'ui',
		] );

		$this->add_responsive_control( 'phone_picture', [
			'label' => esc_html__( 'Height on phones', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 80, 'max' => 500 ] ],
			'default' => [ 'unit' => 'px', 'size' => 230 ],
			'description' => esc_html__( 'On phones the picture sits at the top of the slide and the slide\'s content starts under it.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-phone-picture: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'deco_size', [
			'label' => esc_html__( 'Shape / arc size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%' ],
			'range' => [ '%' => [ 'min' => 40, 'max' => 200 ] ],
			'default' => [ 'unit' => '%', 'size' => 110 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-deco: {{SIZE}};' ],
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'arc_width', [
			'label' => esc_html__( 'Arc thickness', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 4, 'max' => 160 ] ],
			'default' => [ 'unit' => 'px', 'size' => 70 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-arc: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Style: the arc in a corner (a quarter circle)
		$this->start_controls_section( 'section_style_corner', [
			'label' => esc_html__( 'Arc in a corner', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_control( 'corner_note', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'For the slides whose "Behind the picture" is an arc in a corner; each slide sets its color and corner.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );

		$this->add_responsive_control( 'corner_size', [
			'label' => esc_html__( 'Size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 40, 'max' => 900 ] ],
			'default' => [ 'unit' => 'px', 'size' => 260 ],
			'description' => esc_html__( 'The circle\'s radius.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-corner: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'corner_width', [
			'label' => esc_html__( 'Thickness', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 2, 'max' => 400 ] ],
			'default' => [ 'unit' => 'px', 'size' => 46 ],
			'description' => esc_html__( 'As thick as the size: a filled quarter circle.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-corner-w: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'corner_distance', [
			'label' => esc_html__( 'Distance from the corner', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => -200, 'max' => 200 ] ],
			'description' => esc_html__( 'Moves the circle\'s centre out of the corner (more than zero) or into the slide (less).', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-corner-d: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();

		// ------------------------------------------------ Style: thumbnails
		$this->start_controls_section( 'section_style_nav', [
			'label' => esc_html__( 'Thumbnails', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_responsive_control( 'thumb_size', [
			'label' => esc_html__( 'Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 24, 'max' => 240 ] ],
			'default' => [ 'unit' => 'px', 'size' => 64 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-thumb: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'thumb_height', [
			'label' => esc_html__( 'Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 16, 'max' => 240 ] ],
			'description' => esc_html__( 'Empty: the same as the width. Wide pictures such as cars look best wider than tall.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-thumb-h: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'thumb_gap', [
			'label' => esc_html__( 'Space between', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
			'default' => [ 'unit' => 'px', 'size' => 18 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-thumb-gap: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'nav_offset', [
			'label' => esc_html__( 'Distance from the edges', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 120 ] ],
			'default' => [ 'unit' => 'px', 'size' => 32 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-nav-inset: {{SIZE}}px;' ],
		] );

		$this->add_responsive_control( 'label_gap', [
			'label' => esc_html__( 'Space between picture and label', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'unit' => 'px', 'size' => 4 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-label-gap: {{SIZE}}px;' ],
		] );

		$this->add_control( 'shape_color', [
			'label' => esc_html__( 'Shape color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#FFFFFFD9',
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-shape: {{VALUE}};' ],
			'separator' => 'before',
		] );

		$this->add_control( 'shape_radius', [
			'label' => esc_html__( 'Shape corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'unit' => 'px', 'size' => 16 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-shape-radius: {{SIZE}}px;' ],
			'condition' => [ 'thumb_shape' => 'rounded' ],
		] );

		$no_shape = [ 'thumb_shape!' => 'none' ];

		$this->add_responsive_control( 'shape_width', [
			'label' => esc_html__( 'Shape width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 16, 'max' => 300 ] ],
			'description' => esc_html__( 'Empty: around the thumbnail and its label (circle: around its picture).', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-shape-w: {{SIZE}}px;' ],
			'condition' => $no_shape,
		] );

		$this->add_responsive_control( 'shape_height', [
			'label' => esc_html__( 'Shape height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 16, 'max' => 300 ] ],
			'description' => esc_html__( 'Empty: the same way as the width (a circle stays round when only the width is set).', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-shape-h: {{SIZE}}px;' ],
			'condition' => $no_shape,
		] );

		$this->add_responsive_control( 'shape_x', [
			'label' => esc_html__( 'Shape position: across', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => -100, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-shape-x: {{SIZE}}px;' ],
			'condition' => $no_shape,
		] );

		$this->add_responsive_control( 'shape_y', [
			'label' => esc_html__( 'Shape position: up and down', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => -100, 'max' => 100 ] ],
			'description' => esc_html__( 'Moves the shape from its centre; below zero: to the left / up.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-shape-y: {{SIZE}}px;' ],
			'condition' => $no_shape,
		] );

		$this->add_control( 'thumb_lift', [
			'label' => esc_html__( 'The current one rises by', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px' ],
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'default' => [ 'unit' => 'px', 'size' => 10 ],
			'selectors' => [ '{{WRAPPER}} .rf-sw' => '--rf-sw-lift: {{SIZE}}px;' ],
		] );

		$this->add_control( 'label_color', [
			'label' => esc_html__( 'Label color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sw__label' => 'color: {{VALUE}};' ],
			'separator' => 'before',
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'label_typography',
			'selector' => '{{WRAPPER}} .rf-sw__label',
		] );

		$this->add_control( 'badge_color', [
			'label' => esc_html__( 'Badge text', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sw__badge' => 'color: {{VALUE}};' ],
		] );

		$this->add_control( 'badge_bg', [
			'label' => esc_html__( 'Badge background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sw__badge' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'arrow_color', [
			'label' => esc_html__( 'Arrow color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sw__arrow' => 'color: {{VALUE}};' ],
			'separator' => 'before',
		] );

		$this->add_control( 'arrow_bg', [
			'label' => esc_html__( 'Arrow background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-sw__arrow' => 'background-color: {{VALUE}};' ],
		] );

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------- output

	/** A slide's picture and thumbnail addresses. */
	private static function picture( array $slide ): array {
		$image = (string) ( $slide['image']['url'] ?? '' );
		$thumb = (string) ( $slide['thumb']['url'] ?? '' );
		$alt = trim( (string) ( $slide['image_alt'] ?? '' ) );

		if ( '' === $alt && ! empty( $slide['image']['id'] ) ) {
			$alt = (string) get_post_meta( (int) $slide['image']['id'], '_wp_attachment_image_alt', true );
		}

		return [ 'image' => $image, 'thumb' => '' !== $thumb ? $thumb : $image, 'alt' => $alt ];
	}

	/** What sits behind a slide's picture: an arc, a shape, or nothing (the arc in a corner is drawn on the slide). Its
	 * color, size, place and turn come from the slide's Style tab (CSS on the slide, by its list item). */
	private static function deco( array $slide ): string {
		$deco = (string) ( $slide['deco'] ?? '' );

		if ( 'arc' === $deco ) {
			return '<span class="rf-sw__deco rf-sw__deco--arc" aria-hidden="true"></span>';
		}

		if ( 'blob' === $deco ) {
			$shape = self::blob_data( $slide );

			return '<span class="rf-sw__deco rf-sw__deco--blob" aria-hidden="true"><svg viewBox="' . esc_attr( $shape['vb'] ) . '" preserveAspectRatio="none"><path fill-rule="' . esc_attr( $shape['rule'] ) . '" d="' . esc_attr( $shape['d'] ) . '"/></svg></span>';
		}

		return '';
	}

	/** The slide's own classes: its list item (for its own CSS), its side, how its decoration moves. */
	private static function slot_classes( array $slide, string $side, int $index ): string {
		$motion = (string) ( $slide['deco_motion'] ?? '' );
		$classes = [ 'rf-sw__slot', 'rf-sw__slot--' . $side ];

		if ( ! empty( $slide['_id'] ) ) {
			$classes[] = 'refraction-repeater-item-' . $slide['_id'];
		}

		if ( in_array( $motion, [ 'float', 'breathe', 'spin', 'wobble' ], true ) ) {
			$classes[] = 'rf-sw-deco-' . $motion;
		}

		if ( 0 === $index ) {
			$classes[] = 'is-active';
		}

		return implode( ' ', $classes );
	}

	/** An arc in a corner of the slide: a quarter of a circle (ring) around that corner; at the top on the picture's side unless set. */
	private static function corner( array $slide, string $side ): string {
		if ( 'corner' !== ( $slide['deco'] ?? '' ) ) {
			return '';
		}

		$corner = (string) ( $slide['arc_corner'] ?? 'auto' );
		$corner = in_array( $corner, [ 'top-left', 'top-right', 'bottom-left', 'bottom-right' ], true ) ? $corner : ( 'left' === $side ? 'top-right' : 'top-left' );

		return '<span class="rf-sw__corner rf-sw__corner--' . $corner . '" aria-hidden="true"><span class="rf-sw__corner-ring"></span></span>';
	}

	private static function arrow( string $which ): string {
		$d = 'next' === $which ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6';

		return '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' . $d . '"/></svg>';
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$slides = array_values( (array) ( $settings['slides'] ?? [] ) );
		$children = $this->get_children();
		$label = '' !== trim( (string) ( $settings['wheel_label'] ?? '' ) ) ? $settings['wheel_label'] : __( 'Showcase', 'refraction' );
		$total = count( $children );

		$this->add_render_attribute( 'root', [
			'class' => array_filter( [ 'rf-sw', $this->has_nav( $settings, count( $this->get_children() ) ) ? 'has-nav' : '' ] ),
			'role' => 'region',
			'aria-roledescription' => 'carousel',
			'aria-label' => $label,
			'tabindex' => '0',
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'root' ); ?>>
			<div class="rf-sw__slots">
				<?php foreach ( $children as $index => $child ) :
					$slide = $slides[ $index ] ?? [];
					$pic = self::picture( $slide );
					$side = 'right' === ( $slide['side'] ?? 'left' ) ? 'right' : 'left';
					?>
					<div class="<?php echo esc_attr( self::slot_classes( $slide, $side, $index ) ); ?>" role="group" aria-roledescription="slide" aria-label="<?php echo esc_attr( sprintf( '%d / %d%s', $index + 1, $total, '' !== trim( (string) ( $slide['slide_title'] ?? '' ) ) ? ' - ' . wp_strip_all_tags( $slide['slide_title'] ) : '' ) ); ?>"<?php echo 0 === $index ? '' : ' aria-hidden="true"'; ?>>
						<?php $child->print_element(); ?>
						<?php echo self::corner( $slide, $side ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?>
						<div class="rf-sw__visual" aria-hidden="<?php echo '' === $pic['alt'] ? 'true' : 'false'; ?>">
							<?php echo self::deco( $slide ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?>
							<?php
							$back = self::floats( $slide, 'back' );
							$front = self::floats( $slide, 'front' );
							if ( '' !== $pic['image'] || '' !== $back . $front ) :
								?>
								<span class="rf-sw__picture"><?php echo $back; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?><?php if ( '' !== $pic['image'] ) : ?><img class="rf-sw__img" src="<?php echo esc_url( $pic['image'] ); ?>" alt="<?php echo esc_attr( $pic['alt'] ); ?>" loading="<?php echo 0 === $index ? 'eager' : 'lazy'; ?>" decoding="async" draggable="false"><?php endif; ?><?php echo $front; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?></span>
							<?php endif; ?>
						</div>
					</div>
				<?php endforeach; ?>
			</div>
			<?php $this->render_nav( $settings, $slides, $total ); ?>
		</div>
		<?php
	}

	private function has_nav( array $settings, int $total ): bool {
		return $total > 1 && ( 'yes' === ( $settings['show_thumbs'] ?? 'yes' ) || 'none' !== ( $settings['arrows'] ?? 'next' ) );
	}

	private function render_nav( array $settings, array $slides, int $total ) {
		$thumbs = 'yes' === ( $settings['show_thumbs'] ?? 'yes' ) && $total > 1;
		$arrows = (string) ( $settings['arrows'] ?? 'next' );

		if ( ! $this->has_nav( $settings, $total ) ) {
			return;
		}
		?>
		<div class="rf-sw__nav">
			<?php if ( 'both' === $arrows ) : ?>
				<button type="button" class="rf-sw__arrow rf-sw__prev" aria-label="<?php esc_attr_e( 'Previous slide', 'refraction' ); ?>"><?php echo self::arrow( 'prev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?></button>
			<?php endif; ?>
			<?php if ( $thumbs ) : ?>
				<div class="rf-sw__thumbs" role="tablist" aria-label="<?php esc_attr_e( 'Slides', 'refraction' ); ?>">
					<?php for ( $i = 0; $i < $total; $i++ ) :
						$slide = $slides[ $i ] ?? [];
						$pic = self::picture( $slide );
						$title = (string) ( $slide['slide_title'] ?? '' );
						$badge = trim( (string) ( $slide['badge'] ?? '' ) );
						?>
						<button type="button" class="rf-sw__thumb<?php echo 0 === $i ? ' is-active' : ''; ?>" role="tab" aria-selected="<?php echo 0 === $i ? 'true' : 'false'; ?>" data-index="<?php echo esc_attr( (string) $i ); ?>" aria-label="<?php echo esc_attr( '' !== $title ? $title : sprintf( /* translators: %d: Slide number. */ __( 'Slide %d', 'refraction' ), $i + 1 ) ); ?>">
							<span class="rf-sw__thumb-img"><?php if ( '' !== $pic['thumb'] ) : ?><img src="<?php echo esc_url( $pic['thumb'] ); ?>" alt="" loading="lazy" decoding="async"><?php endif; ?></span>
							<?php if ( '' !== $title ) : ?><span class="rf-sw__label"><?php echo esc_html( $title ); ?></span><?php endif; ?>
							<?php if ( '' !== $badge ) : ?><span class="rf-sw__badge"><?php echo esc_html( $badge ); ?></span><?php endif; ?>
						</button>
					<?php endfor; ?>
				</div>
			<?php endif; ?>
			<?php if ( 'none' !== $arrows ) : ?>
				<button type="button" class="rf-sw__arrow rf-sw__next" aria-label="<?php esc_attr_e( 'Next slide', 'refraction' ); ?>"><?php echo self::arrow( 'next' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?></button>
			<?php endif; ?>
		</div>
		<?php
	}

	protected function content_template() {
		$builtin = wp_json_encode( Pure_Organic::paths() );
		?>
		<#
		const slides = settings.slides || [];
		const total = slides.length;
		const builtin = <?php echo $builtin; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static paths. ?>;
		const mine = ( window.refractionOrganicEditor && window.refractionOrganicEditor.shapes ) || {};
		const shape = ( slide ) => {
			if ( 'mine' === slide.sw_blob_source && mine[ slide.sw_blob_mine ] ) {
				return mine[ slide.sw_blob_mine ];
			}
			let id = builtin[ slide.sw_blob_pick ] ? slide.sw_blob_pick : '';
			if ( ! id ) {
				id = [ '1', '2', '3', '4' ].includes( slide.blob_shape ) ? 'blob-' + slide.blob_shape : 'blob-1';
			}
			return { d: builtin[ id ], vb: '0 0 100 100', rule: 'nonzero' };
		};
		const corner = ( slide ) => {
			if ( 'corner' !== slide.deco ) {
				return '';
			}
			const at = [ 'top-left', 'top-right', 'bottom-left', 'bottom-right' ].includes( slide.arc_corner ) ? slide.arc_corner : ( 'right' === slide.side ? 'top-left' : 'top-right' );
			return '<span class="rf-sw__corner rf-sw__corner--' + at + '" aria-hidden="true"><span class="rf-sw__corner-ring"></span></span>';
		};
		const pic = ( slide ) => {
			const image = slide.image && slide.image.url ? slide.image.url : '';
			const thumb = slide.thumb && slide.thumb.url ? slide.thumb.url : image;
			return { image, thumb };
		};
		const deco = ( slide ) => {
			const style = '';
			if ( 'arc' === slide.deco ) {
				return '<span class="rf-sw__deco rf-sw__deco--arc"' + style + ' aria-hidden="true"></span>';
			}
			if ( 'blob' === slide.deco ) {
				const sh = shape( slide );
				return '<span class="rf-sw__deco rf-sw__deco--blob"' + style + ' aria-hidden="true"><svg viewBox="' + _.escape( sh.vb ) + '" preserveAspectRatio="none"><path fill-rule="' + _.escape( sh.rule || 'nonzero' ) + '" d="' + _.escape( sh.d ) + '"/></svg></span>';
			}
			return '';
		};
		const floats = ( slide, layer ) => {
			let out = '';
			const count = Math.max( 0, Math.min( 5, parseInt( slide.float_count, 10 ) || 0 ) );
			for ( let n = 1; n <= count; n++ ) {
				const p = 'fl' + n + '_';
				if ( ( 'back' === slide[ p + 'layer' ] ? 'back' : 'front' ) !== layer ) {
					continue;
				}
				let inner = '';
				if ( 'icon' === slide[ p + 'type' ] ) {
					const icon = refraction.helpers.renderIcon( view, slide[ p + 'icon' ], { 'aria-hidden': true }, 'i', 'object' );
					inner = icon && icon.rendered ? icon.value : '';
				} else if ( slide[ p + 'image' ] && slide[ p + 'image' ].url ) {
					inner = '<img src="' + _.escape( slide[ p + 'image' ].url ) + '" alt="" draggable="false">';
				}
				if ( ! inner ) {
					continue;
				}
				const motion = [ 'bob', 'sway', 'spin', 'pulse' ].includes( slide[ p + 'motion' ] ) ? slide[ p + 'motion' ] : 'still';
				const shadow = 'yes' === slide[ p + 'shadow' ] ? ' has-shadow' : '';
				out += '<span class="rf-sw__float rf-sw__float--' + n + ' rf-sw__float--' + motion + shadow + '" data-float="' + n + '" style="--rf-sw-fd:' + ( n * -0.7 ) + 's"><span class="rf-sw__float-in">' + inner + '</span></span>';
			}
			return out;
		};
		const slotClass = ( slide, index ) => {
			const motion = [ 'float', 'breathe', 'spin', 'wobble' ].includes( slide.deco_motion ) ? ' rf-sw-deco-' + slide.deco_motion : '';
			return 'rf-sw__slot rf-sw__slot--' + ( 'right' === slide.side ? 'right' : 'left' ) + ' refraction-repeater-item-' + slide._id + motion + ( 0 === index ? ' is-active' : '' );
		};
		const arrows = settings.arrows || 'next';
		const thumbs = 'yes' === settings.show_thumbs && total > 1;
		#>
		<div class="rf-sw {{ thumbs || ( 'none' !== arrows && total > 1 ) ? 'has-nav' : '' }}" role="region" aria-roledescription="carousel" aria-label="{{ settings.wheel_label }}" tabindex="0">
			<div class="rf-sw__slots">
				<# _.each( slides, ( slide, index ) => { const p = pic( slide ); #>
					<div class="{{ slotClass( slide, index ) }}" role="group" aria-roledescription="slide" aria-label="{{ index + 1 }} / {{ total }}">
						{{{ corner( slide ) }}}
						<div class="rf-sw__visual" aria-hidden="true">
							{{{ deco( slide ) }}}
							<# const back = floats( slide, 'back' ), front = floats( slide, 'front' ); if ( p.image || back || front ) { #><span class="rf-sw__picture">{{{ back }}}<# if ( p.image ) { #><img class="rf-sw__img" src="{{ p.image }}" alt="" draggable="false"><# } #>{{{ front }}}</span><# } #>
						</div>
					</div>
				<# } ); #>
			</div>
			<# if ( thumbs || ( 'none' !== arrows && total > 1 ) ) { #>
				<div class="rf-sw__nav">
					<# if ( 'both' === arrows ) { #><button type="button" class="rf-sw__arrow rf-sw__prev" aria-label="<?php esc_attr_e( 'Previous slide', 'refraction' ); ?>"><?php echo self::arrow( 'prev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?></button><# } #>
					<# if ( thumbs ) { #>
						<div class="rf-sw__thumbs" role="tablist">
							<# _.each( slides, ( slide, i ) => { const p = pic( slide ); #>
								<button type="button" class="rf-sw__thumb{{ 0 === i ? ' is-active' : '' }}" role="tab" data-index="{{ i }}" aria-label="{{ slide.slide_title }}">
									<span class="rf-sw__thumb-img"><# if ( p.thumb ) { #><img src="{{ p.thumb }}" alt=""><# } #></span>
									<# if ( slide.slide_title ) { #><span class="rf-sw__label">{{ slide.slide_title }}</span><# } #>
									<# if ( slide.badge ) { #><span class="rf-sw__badge">{{ slide.badge }}</span><# } #>
								</button>
							<# } ); #>
						</div>
					<# } #>
					<# if ( 'none' !== arrows ) { #><button type="button" class="rf-sw__arrow rf-sw__next" aria-label="<?php esc_attr_e( 'Next slide', 'refraction' ); ?>"><?php echo self::arrow( 'next' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?></button><# } #>
				</div>
			<# } #>
		</div>
		<?php
	}
}
