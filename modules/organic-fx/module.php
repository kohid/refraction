<?php
namespace Refraction\Modules\OrganicFx;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Group_Control_Typography;
use Refraction\Modules\EditorOne\Classes\Menu_Data_Provider;
use Refraction\Modules\OrganicFx\AdminMenuItems\Editor_One_My_Shapes_Menu;
use Refraction\Modules\OrganicFx\Classes\Admin_Page;
use Refraction\Modules\OrganicFx\Classes\Pure_Organic;
use Refraction\Modules\OrganicFx\Classes\Pure_Shape_Store;
use Refraction\Modules\OrganicFx\Classes\Shapes_Repository;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Organic FX (0.68.0; ideas from the owner's Framify plugin, written for Refraction):
 * - Shape Mask: a container or an image cut to a shape (blobs, wavy edges, arch, pill, leaf, scallop...). Static CSS:
 *   the shape class sets --rf-shape, a mask image made by scripts/build-organic-shapes.php.
 * - Deco Blob: a shape behind (or over) a container or an image: solid, outlined or grainy, offset, turned and gently
 *   moving.
 * - Grain: a film grain over a container, its amount, size, pattern and blend.
 * - Floating Shapes: small shapes drifting through a container, behind or over the content.
 * - Floating Text: decorative words appearing one at a time in calm, free spots of a container.
 * - My Shapes (Refraction > My Shapes): uploaded SVG shapes, offered next to the built-in ones in every shape list.
 * The layers are built by assets/js/organic-fx.js from the element's settings (on the site from data-settings, in the
 * editor from its model), so every change shows at once in the editor.
 */
class Module extends BaseModule {

	const SCRIPT = 'refraction-organic-fx';

	/** The little shapes of Floating Shapes. */
	const SMALL_SHAPES = [
		'circle' => 'Circle',
		'ring' => 'Ring',
		'triangle' => 'Triangle',
		'square' => 'Square',
		'plus' => 'Plus',
		'cross' => 'Cross',
		'squiggle' => 'Squiggle',
		'star' => 'Star',
		'hexagon' => 'Hexagon',
		'half' => 'Half circle',
		'blob' => 'Blob',
		'heart' => 'Heart',
	];

	private ?Shapes_Repository $repository = null;

	private ?Admin_Page $admin_page = null;

	private bool $inline_added = false;

	public function get_name() {
		return 'organic-fx';
	}

	public static function capability(): string {
		return (string) apply_filters( 'refraction/organic-fx/capability', 'manage_options' );
	}

	public function get_repository(): Shapes_Repository {
		if ( ! $this->repository ) {
			$this->repository = new Shapes_Repository();
		}

		return $this->repository;
	}

	public function get_admin_page(): Admin_Page {
		if ( ! $this->admin_page ) {
			$this->admin_page = new Admin_Page( $this->get_repository() );
		}

		return $this->admin_page;
	}

	public function register_menu( Menu_Data_Provider $menu_data_provider ): void {
		$menu_data_provider->register_menu( new Editor_One_My_Shapes_Menu() );
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/editor-one/menu/register', [ $this, 'register_menu' ] );

		if ( is_admin() ) {
			$this->get_admin_page();
		}

		add_action( 'refraction/element/container/section_shape_divider/after_section_end', [ $this, 'container_controls' ] );
		add_action( 'refraction/element/image/section_style_image/after_section_end', [ $this, 'image_controls' ] );
		add_action( 'refraction/frontend/after_register_scripts', [ $this, 'register_assets' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_assets' ] );
		add_action( 'refraction/frontend/after_enqueue_scripts', [ $this, 'enqueue' ] );
		add_action( 'refraction/preview/enqueue_scripts', [ $this, 'enqueue' ] );
		add_action( 'refraction/editor/after_enqueue_styles', [ $this, 'editor_styles' ] );
	}

	public function register_assets() {
		if ( wp_script_is( self::SCRIPT, 'registered' ) ) {
			return;
		}

		$min = Utils::is_script_debug() ? '' : '.min';
		wp_register_style( self::SCRIPT, REFRACTION_ASSETS_URL . 'css/modules/organic-fx/frontend' . $min . '.css', [], REFRACTION_VERSION );
		wp_register_script( self::SCRIPT, REFRACTION_ASSETS_URL . 'js/organic-fx' . $min . '.js', [], REFRACTION_VERSION, true );
	}

	/** The styles are small and the masks must show without a script, so they load on every page; the script too (it does nothing without an effect). */
	public function enqueue() {
		$this->register_assets();
		wp_enqueue_style( self::SCRIPT );
		wp_enqueue_script( self::SCRIPT );

		$mine = $this->get_repository()->all();

		if ( $mine && ! $this->inline_added ) {
			$this->inline_added = true;
			wp_add_inline_style( self::SCRIPT, Pure_Shape_Store::css( $mine ) );
			$paths = array_map( static fn( $s ) => [ 'd' => $s['d'], 'vb' => $s['vb'], 'rule' => $s['rule'] ], $mine );
			wp_add_inline_script( self::SCRIPT, 'window.refractionMyShapes=' . wp_json_encode( $paths ) . ';', 'before' );
		}
	}

	/** The Built-in / Uploaded switch as text tabs, and roomier shape tiles. */
	public function editor_styles() {
		$css = '.rf-shape-tabs .refraction-choices{display:flex}.rf-shape-tabs .refraction-choices label{flex:1;width:auto;padding:6px 8px;font-size:12px;line-height:1.4}'
			. '.rf-shape-tabs .refraction-choices label i{display:none}.rf-shape-tabs .refraction-choices label .refraction-screen-only{position:static;width:auto;height:auto;clip:auto;margin:0;overflow:visible}'
			. '.refraction-control-rf_mask .refraction-visual-choice-label img,.refraction-control-rf_mask_mine .refraction-visual-choice-label img,.refraction-control-rf_blob_shape .refraction-visual-choice-label img,.refraction-control-rf_blob_mine .refraction-visual-choice-label img{padding:6px;aspect-ratio:1;object-fit:contain}';
		wp_register_style( 'refraction-organic-fx-editor', false, [], REFRACTION_VERSION );
		wp_enqueue_style( 'refraction-organic-fx-editor' );
		wp_add_inline_style( 'refraction-organic-fx-editor', $css );
	}

	/** My Shapes as select options, labelled so they stand apart from the built-in shapes. */
	private function my_options(): array {
		$out = [];

		foreach ( $this->get_repository()->all() as $id => $shape ) {
			/* translators: %s: name of an uploaded shape. */
			$out[ $id ] = sprintf( esc_html__( 'My shape: %s', 'refraction' ), $shape['name'] );
		}

		return $out;
	}

	private function shape_options( string $none = '' ): array {
		return ( '' !== $none ? [ '' => $none ] : [] ) + array_map( 'esc_html__', array_map( 'strval', Pure_Organic::SHAPES ) ) + $this->my_options();
	}

	/** Container > Style: Shape Mask, Deco Blob, Grain, Floating Shapes, Floating Text. */
	public function container_controls( $element ) {
		$this->mask_section( $element, false );
		$this->blob_section( $element );
		$this->grain_section( $element );
		$this->floating_shapes_section( $element );
		$this->floating_text_section( $element );
	}

	/** Image > Style: Shape Mask and Deco Blob for the picture. */
	public function image_controls( $element ) {
		$this->mask_section( $element, true );
		$this->blob_section( $element );
	}

	/** A grey thumbnail of a shape for the visual pickers. */
	private static function thumb( string $d, string $vb = '0 0 100 100', string $rule = 'nonzero' ): string {
		$svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' . $vb . '" preserveAspectRatio="xMidYMid meet"><path fill="#A4AFB7" fill-rule="' . $rule . '" d="' . $d . '"/></svg>';

		return 'data:image/svg+xml,' . rawurlencode( $svg );
	}

	/** Built-in shapes as visual choices. */
	private static function builtin_choices(): array {
		$out = [];

		foreach ( Pure_Organic::paths() as $id => $d ) {
			$out[ $id ] = [ 'title' => esc_html__( Pure_Organic::SHAPES[ $id ], 'refraction' ), 'image' => self::thumb( $d ) ]; // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText -- fixed list of shape names.
		}

		return $out;
	}

	/** My Shapes as visual choices. */
	private function mine_choices(): array {
		$out = [];

		foreach ( $this->get_repository()->all() as $id => $shape ) {
			$out[ $id ] = [ 'title' => esc_html( $shape['name'] ), 'image' => self::thumb( $shape['d'], $shape['vb'], $shape['rule'] ) ];
		}

		return $out;
	}

	/**
	 * Built-in / Uploaded tabs and the two shape pickers. Both pickers keep the prefix class (only the active one is
	 * applied), so a saved page keeps its mask with no script. Returns the condition set "a shape is chosen".
	 */
	private function shape_picker( $element, string $source, string $builtin, string $mine, string $prefix_class, bool $toggle, array $extra = [] ): array {
		$element->add_control( $source, [
			'label' => esc_html__( 'Shape', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [ 'builtin' => [ 'title' => esc_html__( 'Built-in', 'refraction' ) ], 'mine' => [ 'title' => esc_html__( 'Uploaded', 'refraction' ) ] ],
			'default' => 'builtin',
			'toggle' => false,
			'label_block' => true,
			'classes' => 'rf-shape-tabs',
			'frontend_available' => true,
			'render_type' => 'template',
		] + $extra );

		$picker = [ 'type' => Controls_Manager::VISUAL_CHOICE, 'label_block' => true, 'columns' => 4, 'toggle' => $toggle, 'frontend_available' => true, 'render_type' => 'template' ];

		if ( '' !== $prefix_class ) {
			$picker['prefix_class'] = $prefix_class;
		}

		$element->add_control( $builtin, [
			'label' => esc_html__( 'Built-in shapes', 'refraction' ),
			'options' => self::builtin_choices(),
			'description' => $toggle ? esc_html__( 'Click the chosen shape again for none.', 'refraction' ) : '',
			'condition' => array_merge( $extra['condition'] ?? [], [ $source . '!' => 'mine' ] ),
		] + $picker );

		$mine_choices = $this->mine_choices();
		$element->add_control( $mine, [
			'label' => esc_html__( 'Uploaded shapes', 'refraction' ),
			'options' => $mine_choices,
			'description' => sprintf(
				/* translators: %s: link to Refraction > My Shapes. */
				esc_html__( 'Your shapes from %s.', 'refraction' ),
				'<a href="' . esc_url( admin_url( 'admin.php?page=' . Admin_Page::SLUG ) ) . '" target="_blank">' . esc_html__( 'Refraction > My Shapes', 'refraction' ) . '</a>'
			) . ( $mine_choices ? '' : ' ' . esc_html__( 'None uploaded yet.', 'refraction' ) ),
			'condition' => array_merge( $extra['condition'] ?? [], [ $source => 'mine' ] ),
		] + $picker );

		return [
			'relation' => 'or',
			'terms' => [
				[ 'terms' => [ [ 'name' => $source, 'operator' => '!==', 'value' => 'mine' ], [ 'name' => $builtin, 'operator' => '!==', 'value' => '' ] ] ],
				[ 'terms' => [ [ 'name' => $source, 'operator' => '===', 'value' => 'mine' ], [ 'name' => $mine, 'operator' => '!==', 'value' => '' ] ] ],
			],
		];
	}

	/** Responsive Horizontal / Vertical position, written as 0 / 0.5 / 1 into custom properties. */
	private static function position_controls( $element, string $p, string $target, array $show ): void {
		$element->add_responsive_control( $p . 'ax', [
			'label' => esc_html__( 'Horizontal Position', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'selectors_dictionary' => [ 'left' => '0', 'center' => '0.5', 'right' => '1' ],
			'selectors' => [ $target => '--' . str_replace( '_', '-', $p ) . 'ax: {{VALUE}};' ],
		] + $show );
		$element->add_responsive_control( $p . 'ay', [
			'label' => esc_html__( 'Vertical Position', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'top' => [ 'title' => esc_html__( 'Top', 'refraction' ), 'icon' => 'rficon-v-align-top' ],
				'middle' => [ 'title' => esc_html__( 'Middle', 'refraction' ), 'icon' => 'rficon-v-align-middle' ],
				'bottom' => [ 'title' => esc_html__( 'Bottom', 'refraction' ), 'icon' => 'rficon-v-align-bottom' ],
			],
			'selectors_dictionary' => [ 'top' => '0', 'middle' => '0.5', 'bottom' => '1' ],
			'selectors' => [ $target => '--' . str_replace( '_', '-', $p ) . 'ay: {{VALUE}};' ],
		] + $show );
	}

	private static function edge_control( $element, string $id, string $prefix_class, array $show, string $help ): void {
		$element->add_control( $id, [
			'label' => esc_html__( 'Flat Edge', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [ '' => esc_html__( 'None', 'refraction' ), 'left' => esc_html__( 'Left', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ), 'top' => esc_html__( 'Top', 'refraction' ), 'bottom' => esc_html__( 'Bottom', 'refraction' ) ],
			'description' => $help,
			'frontend_available' => true,
			'render_type' => 'template',
		] + ( '' !== $prefix_class ? [ 'prefix_class' => $prefix_class ] : [] ) + $show );
	}

	private static function flip_controls( $element, string $p, array $show, array $css = [] ): void {
		foreach ( [ 'h' => esc_html__( 'Flip Horizontal', 'refraction' ), 'v' => esc_html__( 'Flip Vertical', 'refraction' ) ] as $axis => $label ) {
			$args = [ 'label' => $label, 'type' => Controls_Manager::SWITCHER ] + $show;

			if ( isset( $css[ $axis ] ) ) {
				$args['selectors'] = $css[ $axis ];
			} else {
				$args += [ 'frontend_available' => true, 'render_type' => 'template' ];
			}

			$element->add_control( $p . 'flip_' . $axis, $args );
		}
	}

	private function mask_section( $element, bool $image ): void {
		$element->start_controls_section( 'section_rf_mask', [ 'label' => esc_html__( 'Shape Mask', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		if ( ! $image ) {
			$element->add_control( 'rf_mask_mode', [
				'label' => esc_html__( 'Mode', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'clip',
				'options' => [ 'clip' => esc_html__( 'Clip whole container', 'refraction' ), 'bg' => esc_html__( 'Clip background only', 'refraction' ) ],
				'description' => esc_html__( 'Clip background only cuts just the background to the shape; the content, border and shadow stay whole. For a shape behind the content use Deco Blob below.', 'refraction' ),
				'prefix_class' => 'rf-mask-mode-',
				'frontend_available' => true,
				'render_type' => 'template',
			] );
		}

		$shaped = $this->shape_picker( $element, 'rf_mask_source', 'rf_mask', 'rf_mask_mine', 'rf-mask--', true );
		$show = [ 'conditions' => $shaped ];
		$bg = [ 'conditions' => [ 'relation' => 'and', 'terms' => [ $shaped, [ 'name' => 'rf_mask_mode', 'operator' => '===', 'value' => 'bg' ] ] ] ];

		if ( ! $image ) {
			$fill = '{{WRAPPER}} > .rf-ofx-fill';
			$element->add_control( 'rf_mask_bg_color', [ 'label' => esc_html__( 'Background Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $fill => 'background-color: {{VALUE}} !important;' ], 'separator' => 'before' ] + $bg );
			$element->add_control( 'rf_mask_overlay', [ 'label' => esc_html__( 'Overlay Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $fill => '--rf-ov: {{VALUE}};' ], 'description' => esc_html__( 'Tints the clipped area, over the background and under the grain.', 'refraction' ) ] + $bg );
			$element->add_control( 'rf_mask_overlay_opacity', [ 'label' => esc_html__( 'Overlay Opacity', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 1, 'step' => 0.05 ] ], 'default' => [ 'size' => 1 ], 'selectors' => [ $fill => '--rf-ov-o: {{SIZE}};' ] ] + $bg );
		}

		$element->add_control( 'rf_mask_fit', [
			'label' => esc_html__( 'Fit', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'stretch',
			'options' => [ 'stretch' => esc_html__( 'Stretch to the box', 'refraction' ), 'keep' => esc_html__( 'Keep the shape\'s proportions', 'refraction' ) ],
			'prefix_class' => 'rf-mask-fit-',
			'frontend_available' => true,
			'render_type' => 'template',
			'separator' => 'before',
		] + $show );

		self::edge_control( $element, 'rf_mask_edge', '', $show, esc_html__( 'Lets the shape run past this side, so the element\'s edge cuts it straight and it sits flush with the page edge. Wavy-edge shapes already have straight sides.', 'refraction' ) );
		self::flip_controls( $element, 'rf_mask_', $show );

		$element->add_control( 'rf_mask_hover', [
			'label' => $image ? esc_html__( 'Zoom The Picture On Hover', 'refraction' ) : esc_html__( 'Zoom The Inside On Hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'prefix_class' => 'rf-mask-zoom-',
		] + $show );

		// Placement: numbers in custom properties, turned into the mask's size and position by the script.
		$element->add_control( 'rf_mask_placement', [ 'label' => esc_html__( 'Placement', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] + $show );
		self::position_controls( $element, 'rf_mask_', '{{WRAPPER}}', $show );

		foreach ( [
			'w' => [ esc_html__( 'Width (%)', 'refraction' ), 10, 200, 100 ],
			'h' => [ esc_html__( 'Height (%)', 'refraction' ), 10, 200, 100 ],
			'ox' => [ esc_html__( 'Offset X (%)', 'refraction' ), -100, 100, 0 ],
			'oy' => [ esc_html__( 'Offset Y (%)', 'refraction' ), -100, 100, 0 ],
		] as $key => [ $label, $min, $max, $default ] ) {
			$element->add_responsive_control( 'rf_mask_' . $key, [
				'label' => $label,
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => $min, 'max' => $max ] ],
				'default' => [ 'size' => $default ],
				'selectors' => [ '{{WRAPPER}}' => '--rf-mask-' . $key . ': {{SIZE}};' ],
			] + $show );
		}

		$element->add_control( 'rf_mask_motion_heading', [ 'label' => esc_html__( 'Motion', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] + $show );
		$element->add_control( 'rf_mask_trigger', [
			'label' => esc_html__( 'Trigger', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [ '' => esc_html__( 'None (static)', 'refraction' ), 'loop' => esc_html__( 'Continuous gentle loop', 'refraction' ), 'hover' => esc_html__( 'On hover', 'refraction' ), 'inview' => esc_html__( 'Once, when scrolled into view', 'refraction' ) ],
			'description' => esc_html__( 'The shape breathes and sways a little. Visitors who ask for less motion see it still.', 'refraction' ),
			'frontend_available' => true,
			'render_type' => 'template',
		] + $show );
		$element->add_control( 'rf_mask_duration', [
			'label' => esc_html__( 'Duration (ms)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 400, 'max' => 10000, 'step' => 100 ] ],
			'default' => [ 'size' => 5000 ],
			'frontend_available' => true,
			'render_type' => 'template',
			'conditions' => [ 'relation' => 'and', 'terms' => [ $shaped, [ 'name' => 'rf_mask_trigger', 'operator' => '!==', 'value' => '' ] ] ],
		] );

		$element->end_controls_section();
	}

	private function blob_section( $element ): void {
		$layer = '{{WRAPPER}} > .rf-ofx-blob, {{WRAPPER}} > .refraction-widget-container > .rf-ofx-blob, {{WRAPPER}} > .e-con-inner > .rf-ofx-blob, {{WRAPPER}} > .rf-ofx-bclip > .rf-ofx-blob';
		$on = [ 'rf_blob' => 'yes' ];
		$show = [ 'condition' => $on ];
		$container = 'container' === $element->get_name();

		$element->start_controls_section( 'section_rf_blob', [ 'label' => esc_html__( 'Deco Blob', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );

		$element->add_control( 'rf_blob', [ 'label' => esc_html__( 'Deco Blob', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'A shape behind the element, like a splash of colour under a photo.', 'refraction' ), 'frontend_available' => true, 'render_type' => 'template' ] );
		$this->shape_picker( $element, 'rf_blob_source', 'rf_blob_shape', 'rf_blob_mine', '', false, $show );
		$element->add_control( 'rf_blob_style', [
			'label' => esc_html__( 'Style', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'solid',
			'options' => [ 'solid' => esc_html__( 'Solid', 'refraction' ), 'outline' => esc_html__( 'Outline', 'refraction' ), 'both' => esc_html__( 'Solid with an offset outline', 'refraction' ) ],
			'frontend_available' => true,
			'render_type' => 'template',
			'condition' => $on,
			'separator' => 'before',
		] );
		$element->add_control( 'rf_blob_color', [ 'label' => esc_html__( 'Colour', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#F6C94A', 'selectors' => [ $layer => '--rf-blob-c: {{VALUE}};' ], 'condition' => array_merge( $on, [ 'rf_blob_style!' => 'outline' ] ) ] );
		$element->add_control( 'rf_blob_line', [ 'label' => esc_html__( 'Outline Colour', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#1E1E1E', 'selectors' => [ $layer => '--rf-blob-line: {{VALUE}};' ], 'condition' => array_merge( $on, [ 'rf_blob_style!' => 'solid' ] ) ] );
		$element->add_control( 'rf_blob_line_width', [ 'label' => esc_html__( 'Outline Width', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.5, 'max' => 10, 'step' => 0.5 ] ], 'default' => [ 'unit' => 'px', 'size' => 2 ], 'selectors' => [ $layer => '--rf-blob-lw: {{SIZE}}px;' ], 'condition' => array_merge( $on, [ 'rf_blob_style!' => 'solid' ] ) ] );
		$element->add_control( 'rf_blob_line_shape', [ 'label' => esc_html__( 'Outline Shape', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'blob-2', 'options' => $this->shape_options(), 'description' => esc_html__( 'A different shape reads hand-drawn.', 'refraction' ), 'frontend_available' => true, 'render_type' => 'template', 'condition' => array_merge( $on, [ 'rf_blob_style' => 'both' ] ) ] );
		$element->add_control( 'rf_blob_grain', [ 'label' => esc_html__( 'Grain On The Blob', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'frontend_available' => true, 'render_type' => 'template', 'condition' => array_merge( $on, [ 'rf_blob_style!' => 'outline' ] ) ] );

		if ( $container ) {
			self::edge_control( $element, 'rf_blob_edge', 'rf-blob-edge-', $show, esc_html__( 'Puts the blob against this side and cuts it straight there, flush with the container edge.', 'refraction' ) );
		}

		self::flip_controls( $element, 'rf_blob_', $show, [ 'h' => [ $layer => '--rf-blob-fx: -1;' ], 'v' => [ $layer => '--rf-blob-fy: -1;' ] ] );

		$element->add_control( 'rf_blob_placement', [ 'label' => esc_html__( 'Placement', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] + $show );
		self::position_controls( $element, 'rf_blob_', $layer, $show );
		$element->add_responsive_control( 'rf_blob_size', [ 'label' => esc_html__( 'Width (%)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ '%' ], 'range' => [ '%' => [ 'min' => 10, 'max' => 200 ] ], 'default' => [ 'unit' => '%', 'size' => 100 ], 'selectors' => [ $layer => '--rf-blob-s: {{SIZE}};' ] ] + $show );
		$element->add_responsive_control( 'rf_blob_h', [ 'label' => esc_html__( 'Height (%)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ '%' ], 'range' => [ '%' => [ 'min' => 10, 'max' => 200 ] ], 'description' => esc_html__( 'Empty: the same as the width.', 'refraction' ), 'selectors' => [ $layer => '--rf-blob-hh: {{SIZE}};' ] ] + $show );
		$element->add_responsive_control( 'rf_blob_x', [ 'label' => esc_html__( 'Offset X (%)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ '%' ], 'range' => [ '%' => [ 'min' => -60, 'max' => 60 ] ], 'default' => [ 'unit' => '%', 'size' => 8 ], 'selectors' => [ $layer => '--rf-blob-x: {{SIZE}}%;' ] ] + $show );
		$element->add_responsive_control( 'rf_blob_y', [ 'label' => esc_html__( 'Offset Y (%)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ '%' ], 'range' => [ '%' => [ 'min' => -60, 'max' => 60 ] ], 'default' => [ 'unit' => '%', 'size' => 6 ], 'selectors' => [ $layer => '--rf-blob-y: {{SIZE}}%;' ] ] + $show );
		$element->add_control( 'rf_blob_rotate', [ 'label' => esc_html__( 'Turn (deg)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => -180, 'max' => 180 ] ], 'selectors' => [ $layer => '--rf-blob-r: {{SIZE}}deg;' ] ] + $show );
		$element->add_control( 'rf_blob_place', [ 'label' => esc_html__( 'Place', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'behind', 'options' => [ 'behind' => esc_html__( 'Behind the content', 'refraction' ), 'over' => esc_html__( 'Over the content (clicks pass through)', 'refraction' ) ], 'prefix_class' => 'rf-blob-' ] + $show );

		$element->add_control( 'rf_blob_motion_heading', [ 'label' => esc_html__( 'Motion', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] + $show );
		$element->add_control( 'rf_blob_motion', [
			'label' => esc_html__( 'Motion', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'float',
			'options' => [ '' => esc_html__( 'None', 'refraction' ), 'float' => esc_html__( 'Float gently', 'refraction' ), 'breathe' => esc_html__( 'Breathe (grow and shrink)', 'refraction' ), 'spin' => esc_html__( 'Turn slowly', 'refraction' ), 'wobble' => esc_html__( 'Wobble', 'refraction' ) ],
			'prefix_class' => 'rf-blob-motion-',
		] + $show );
		$element->add_control( 'rf_blob_trigger', [
			'label' => esc_html__( 'Trigger', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'loop',
			'options' => [ 'loop' => esc_html__( 'Continuous gentle loop', 'refraction' ), 'hover' => esc_html__( 'On hover', 'refraction' ), 'inview' => esc_html__( 'Once, when scrolled into view', 'refraction' ) ],
			'prefix_class' => 'rf-blob-trigger-',
			'frontend_available' => true,
			'render_type' => 'template',
			'condition' => array_merge( $on, [ 'rf_blob_motion!' => '' ] ),
		] );
		$element->add_control( 'rf_blob_speed', [ 'label' => esc_html__( 'Duration (s)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.5, 'max' => 40, 'step' => 0.5 ] ], 'default' => [ 'size' => 9 ], 'selectors' => [ $layer => '--rf-blob-t: {{SIZE}}s;' ], 'condition' => array_merge( $on, [ 'rf_blob_motion!' => '' ] ) ] );
		$element->add_control( 'rf_blob_opacity', [ 'label' => esc_html__( 'Opacity', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 1, 'step' => 0.05 ] ], 'selectors' => [ $layer => 'opacity: {{SIZE}};' ], 'condition' => $on, 'separator' => 'before' ] );

		$element->end_controls_section();
	}

	private function grain_section( $element ): void {
		$layer = '{{WRAPPER}} > .rf-ofx-grain, {{WRAPPER}} > .e-con-inner > .rf-ofx-grain';
		$on = [ 'rf_grain' => 'yes' ];

		$element->start_controls_section( 'section_rf_grain', [ 'label' => esc_html__( 'Grain', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$element->add_control( 'rf_grain', [ 'label' => esc_html__( 'Film Grain', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'A fine speckle over the background, like printed paper or film.', 'refraction' ), 'frontend_available' => true, 'render_type' => 'template' ] );
		$element->add_control( 'rf_grain_amount', [ 'label' => esc_html__( 'Amount', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.02, 'max' => 1, 'step' => 0.01 ] ], 'default' => [ 'size' => 0.25 ], 'selectors' => [ $layer => 'opacity: {{SIZE}};' ], 'condition' => $on ] );
		$element->add_control( 'rf_grain_size', [ 'label' => esc_html__( 'Grain Size', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'fine', 'options' => [ 'fine' => esc_html__( 'Fine', 'refraction' ), 'medium' => esc_html__( 'Medium', 'refraction' ), 'coarse' => esc_html__( 'Coarse', 'refraction' ) ], 'frontend_available' => true, 'render_type' => 'template', 'condition' => $on ] );
		$element->add_control( 'rf_grain_pattern', [ 'label' => esc_html__( 'Pattern', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 999, 'default' => 0, 'description' => esc_html__( '0: every element its own speckle. Any other number fixes the pattern.', 'refraction' ), 'frontend_available' => true, 'render_type' => 'template', 'condition' => $on ] );
		$element->add_control( 'rf_grain_blend', [ 'label' => esc_html__( 'Blend', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'multiply', 'options' => [ 'multiply' => esc_html__( 'Darken (multiply)', 'refraction' ), 'overlay' => esc_html__( 'Overlay', 'refraction' ), 'soft-light' => esc_html__( 'Soft light', 'refraction' ), 'screen' => esc_html__( 'Lighten (screen)', 'refraction' ), 'normal' => esc_html__( 'Normal', 'refraction' ) ], 'selectors' => [ $layer => 'mix-blend-mode: {{VALUE}};' ], 'condition' => $on ] );
		$element->add_control( 'rf_grain_over', [ 'label' => esc_html__( 'Also Over The Content', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'prefix_class' => 'rf-grain-over-', 'condition' => $on ] );
		$element->end_controls_section();
	}

	/** Shared: where a layer sits and which part of the element it uses. */
	private static function layer_controls( $element, string $p, array $on ): void {
		$element->add_control( $p . 'layer', [ 'label' => esc_html__( 'Layer', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'behind', 'options' => [ 'behind' => esc_html__( 'Behind the content', 'refraction' ), 'over' => esc_html__( 'Over the content (clicks pass through)', 'refraction' ) ], 'frontend_available' => true, 'render_type' => 'template', 'condition' => $on ] );
		$element->add_control( $p . 'area', [ 'label' => esc_html__( 'Area', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'full', 'options' => [ 'full' => esc_html__( 'All of it', 'refraction' ), 'left' => esc_html__( 'A band on the left', 'refraction' ), 'right' => esc_html__( 'A band on the right', 'refraction' ), 'edges' => esc_html__( 'Both sides, clear of the middle', 'refraction' ) ], 'frontend_available' => true, 'render_type' => 'template', 'condition' => $on ] );
		$element->add_control( $p . 'band', [ 'label' => esc_html__( 'Band Width (%)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 10, 'max' => 50 ] ], 'default' => [ 'size' => 30 ], 'frontend_available' => true, 'render_type' => 'template', 'condition' => array_merge( $on, [ $p . 'area!' => 'full' ] ) ] );
	}

	/** Shared: up to four colours that the script picks from. */
	private static function palette_controls( $element, string $p, array $on, array $defaults ): void {
		foreach ( [ 1, 2, 3, 4 ] as $i ) {
			$element->add_control( $p . 'color_' . $i, [
				/* translators: %d: Colour number. */
				'label' => sprintf( esc_html__( 'Colour %d', 'refraction' ), $i ),
				'type' => Controls_Manager::COLOR,
				'default' => $defaults[ $i - 1 ] ?? '',
				// The script reads the value, which a global colour link would hide.
				'global' => [ 'active' => false ],
				'frontend_available' => true,
				'render_type' => 'template',
				'condition' => $on,
				'separator' => 1 === $i ? 'before' : 'none',
			] );
		}
	}

	private function floating_shapes_section( $element ): void {
		$p = 'rf_fs_';
		$on = [ 'rf_fs' => 'yes' ];
		$live = [ 'frontend_available' => true, 'render_type' => 'template', 'condition' => $on ];

		$element->start_controls_section( 'section_rf_fs', [ 'label' => esc_html__( 'Floating Shapes', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$element->add_control( 'rf_fs', [ 'label' => esc_html__( 'Floating Shapes', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'Small shapes drifting slowly through the container.', 'refraction' ), 'frontend_available' => true, 'render_type' => 'template' ] );
		$element->add_control( $p . 'shapes', [ 'label' => esc_html__( 'Shapes', 'refraction' ), 'type' => Controls_Manager::SELECT2, 'multiple' => true, 'label_block' => true, 'options' => array_map( 'esc_html__', self::SMALL_SHAPES ) + $this->my_options(), 'default' => [ 'circle', 'ring', 'triangle', 'plus', 'squiggle', 'star' ] ] + $live );
		$element->add_control( $p . 'style', [ 'label' => esc_html__( 'Style', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'mix', 'options' => [ 'mix' => esc_html__( 'Solid and outline, mixed', 'refraction' ), 'solid' => esc_html__( 'Solid', 'refraction' ), 'outline' => esc_html__( 'Outline', 'refraction' ) ] ] + $live );
		$element->add_control( $p . 'count', [ 'label' => esc_html__( 'How Many', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 60, 'default' => 14 ] + $live );
		$element->add_control( $p . 'count_mobile', [ 'label' => esc_html__( 'How Many On Phones', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 60, 'default' => 8 ] + $live );
		$element->add_control( $p . 'size', [ 'label' => esc_html__( 'Size (px, smallest to largest)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 6, 'max' => 120 ] ], 'default' => [ 'size' => 34 ] ] + $live );
		$element->add_control( $p . 'direction', [ 'label' => esc_html__( 'Drift', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'up', 'options' => [ 'up' => esc_html__( 'Up', 'refraction' ), 'down' => esc_html__( 'Down', 'refraction' ), 'left' => esc_html__( 'To the left', 'refraction' ), 'right' => esc_html__( 'To the right', 'refraction' ), 'random' => esc_html__( 'Each its own way', 'refraction' ), 'stay' => esc_html__( 'Stay in place (bob gently)', 'refraction' ) ] ] + $live );
		$element->add_control( $p . 'speed', [ 'label' => esc_html__( 'Seconds Per Pass', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 4, 'max' => 80, 'step' => 1 ] ], 'default' => [ 'size' => 22 ] ] + $live );
		$element->add_control( $p . 'spin', [ 'label' => esc_html__( 'Turn As They Go', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] + $live );
		$element->add_control( $p . 'opacity', [ 'label' => esc_html__( 'Opacity', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.05, 'max' => 1, 'step' => 0.05 ] ], 'default' => [ 'size' => 0.7 ] ] + $live );
		self::palette_controls( $element, $p, $on, [ '#F69216', '#263238', '#2EC4B6', '' ] );
		self::layer_controls( $element, $p, $on );
		$element->end_controls_section();
	}

	private function floating_text_section( $element ): void {
		$p = 'rf_ft_';
		$on = [ 'rf_ft' => 'yes' ];
		$live = [ 'frontend_available' => true, 'render_type' => 'template', 'condition' => $on ];

		$element->start_controls_section( 'section_rf_ft', [ 'label' => esc_html__( 'Floating Text', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$element->add_control( 'rf_ft', [ 'label' => esc_html__( 'Floating Text', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'Decorative words that appear one at a time in quiet spots, hold, and leave.', 'refraction' ), 'frontend_available' => true, 'render_type' => 'template' ] );
		$element->add_control( $p . 'words', [ 'label' => esc_html__( 'Words', 'refraction' ), 'type' => Controls_Manager::TEXTAREA, 'rows' => 6, 'default' => "Calm\nCraft\nDetail\nFlow\nTogether", 'description' => esc_html__( 'One word or short line per line. A line never shows twice at once.', 'refraction' ) ] + $live );
		$element->add_control( $p . 'count', [ 'label' => esc_html__( 'At Once', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 1, 'max' => 10, 'default' => 4 ] + $live );
		$element->add_control( $p . 'count_mobile', [ 'label' => esc_html__( 'At Once On Phones', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 10, 'default' => 2 ] + $live );
		$element->add_control( $p . 'effect', [ 'label' => esc_html__( 'How They Come And Go', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'rise', 'options' => [ 'fade' => esc_html__( 'Fade', 'refraction' ), 'rise' => esc_html__( 'Rise from behind a line', 'refraction' ), 'blur' => esc_html__( 'Sharpen from a blur', 'refraction' ), 'letters' => esc_html__( 'Letter by letter', 'refraction' ), 'type' => esc_html__( 'Typewriter', 'refraction' ), 'drift' => esc_html__( 'Fade and drift', 'refraction' ) ] ] + $live );
		$element->add_control( $p . 'hold', [ 'label' => esc_html__( 'Hold (s)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.5, 'max' => 10, 'step' => 0.5 ] ], 'default' => [ 'size' => 2.5 ] ] + $live );
		$element->add_control( $p . 'tilt', [ 'label' => esc_html__( 'Tilt', 'refraction' ), 'type' => Controls_Manager::SELECT, 'default' => 'none', 'options' => [ 'none' => esc_html__( 'None', 'refraction' ), 'slight' => esc_html__( 'Slight, either way', 'refraction' ), 'vertical' => esc_html__( 'Some vertical', 'refraction' ) ] ] + $live );
		$element->add_control( $p . 'outline', [ 'label' => esc_html__( 'Outlined Letters', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] + $live );
		$element->add_control( $p . 'opacity', [ 'label' => esc_html__( 'Opacity', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.05, 'max' => 1, 'step' => 0.05 ] ], 'default' => [ 'size' => 0.35 ] ] + $live );
		self::palette_controls( $element, $p, $on, [ '#1E1E1E', '', '', '' ] );
		$element->add_group_control( Group_Control_Typography::get_type(), [ 'name' => $p . 'typography', 'selector' => '{{WRAPPER}} > .rf-ofx-text .rf-ofx-word, {{WRAPPER}} > .e-con-inner > .rf-ofx-text .rf-ofx-word', 'condition' => $on ] );
		self::layer_controls( $element, $p, $on );
		$element->end_controls_section();
	}
}
