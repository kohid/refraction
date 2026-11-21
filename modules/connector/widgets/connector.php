<?php
namespace Refraction\Modules\Connector\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Connector (0.140.0): an arrow from one element to another. Put it in a container: by default it goes from that
 * container to the next one; either end can also be the container before, or any element by its CSS ID (Advanced >
 * CSS ID). It takes no room in the layout (Edit Mode shows a small chip to select it).
 *
 * The path (straight, elbow or curved), the sides it leaves and reaches (or found from where the two are), the gap,
 * the place along each side, the line's width and colour and the heads' size are set per screen size: they are CSS
 * custom properties on the widget that assets/js/frontend/handlers/connector.js reads when it draws, so a layout that
 * stacks on phones gets an arrow that turns with it. The line (solid, dashed, dotted), the heads at each end (arrow,
 * open, thin, dot, diamond, square, none) and the animation (flowing dashes, drawn when it comes into view, a dot
 * travelling along) are the widget's own.
 */
class Connector extends Pro_Widget {

	public function get_name() {
		return 'refraction-connector';
	}

	public function get_title() {
		// 0.142.0: "Connector" is now the steps widget (steps with an arrow from each to the next); this one links any
		// two elements.
		return esc_html__( 'Arrow Link', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-arrow-right';
	}

	public function get_keywords() {
		return [ 'arrow link', 'arrow', 'line', 'link', 'diagram', 'point', 'connect', 'path' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-connector' ];
	}

	/** The arrow is the same for everyone. */
	protected function is_dynamic_content(): bool {
		return false;
	}

	private static function ends(): array {
		return [
			'parent' => esc_html__( 'The container holding this widget', 'refraction' ),
			'next' => esc_html__( 'The container after it', 'refraction' ),
			'previous' => esc_html__( 'The container before it', 'refraction' ),
			'id' => esc_html__( 'An element by its CSS ID', 'refraction' ),
			'element' => esc_html__( 'An element picked on the page', 'refraction' ),
		];
	}

	/** A small picture for the visual pickers (an SVG as a data URI). */
	private static function picture( string $svg, int $w = 44, int $h = 30 ): string {
		return 'data:image/svg+xml,' . rawurlencode( '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' . $w . ' ' . $h . '">' . $svg . '</svg>' );
	}

	/** The sides as pictures: a box with the handle on that side (all four for "facing the other one"). */
	private static function side_choices(): array {
		$box = '<rect x="8" y="5" width="28" height="20" rx="4" fill="#fff" stroke="#9CA3AF" stroke-width="1.5"/>';
		$handle = static fn( $x, $y, $c = '#2563EB' ) => '<rect x="' . ( $x - 3.5 ) . '" y="' . ( $y - 3.5 ) . '" width="7" height="7" rx="2" fill="' . $c . '"/>';
		$at = [ 'top' => [ 22, 5 ], 'right' => [ 36, 15 ], 'bottom' => [ 22, 25 ], 'left' => [ 8, 15 ] ];
		$out = [ 'auto' => [ 'title' => esc_html__( 'Facing the other one', 'refraction' ), 'image' => self::picture( $box . implode( '', array_map( static fn( $p ) => $handle( $p[0], $p[1], '#93C5FD' ), $at ) ) ) ] ];

		foreach ( [ 'top' => esc_html__( 'Top', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ), 'bottom' => esc_html__( 'Bottom', 'refraction' ), 'left' => esc_html__( 'Left', 'refraction' ) ] as $side => $title ) {
			$out[ $side ] = [ 'title' => $title, 'image' => self::picture( $box . $handle( $at[ $side ][0], $at[ $side ][1] ) ) ];
		}

		return $out;
	}

	/** The end shapes as pictures: a line with the shape at its end (as connector.js draws them). */
	private static function head_choices(): array {
		$shapes = [
			'arrow' => '<path d="M0,0 L10,5 L0,10 Z" fill="#374151"/>',
			'open' => '<path d="M1,1 L9,5 L1,9" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
			'thin' => '<path d="M3,2 L9,5 L3,8" fill="none" stroke="#374151" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
			'circle' => '<circle cx="5" cy="5" r="3.5" fill="#374151"/>',
			'diamond' => '<path d="M1,5 L5,1 L9,5 L5,9 Z" fill="#374151"/>',
			'square' => '<path d="M2,2 H8 V8 H2 Z" fill="#374151"/>',
			'none' => '',
		];
		$out = [];

		foreach ( self::heads() as $key => $title ) {
			$out[ $key ] = [ 'title' => $title, 'image' => self::picture( '<path d="M4,10 H' . ( 'none' === $key ? 40 : 31 ) . '" stroke="#374151" stroke-width="2" stroke-linecap="round"/><g transform="translate(28 5)">' . $shapes[ $key ] . '</g>', 44, 20 ) ];
		}

		return $out;
	}


	private static function heads(): array {
		return [
			'arrow' => esc_html__( 'Arrow', 'refraction' ),
			'open' => esc_html__( 'Open arrow', 'refraction' ),
			'thin' => esc_html__( 'Thin arrow', 'refraction' ),
			'circle' => esc_html__( 'Dot', 'refraction' ),
			'diamond' => esc_html__( 'Diamond', 'refraction' ),
			'square' => esc_html__( 'Square', 'refraction' ),
			'none' => esc_html__( 'None', 'refraction' ),
		];
	}

	protected function register_controls() {
		$host = '{{WRAPPER}}';
		$js = [ 'frontend_available' => true, 'render_type' => 'none' ];

		// ------------------------------------------------ What it connects
		$this->content_section( 'section_connect', esc_html__( 'Connect', 'refraction' ) );

		foreach ( [ 'from' => [ esc_html__( 'From', 'refraction' ), 'parent' ], 'to' => [ esc_html__( 'To', 'refraction' ), 'next' ] ] as $end => [ $label, $default ] ) {
			$this->add_control( $end, $js + [
				'label' => $label,
				'type' => Controls_Manager::SELECT,
				'default' => $default,
				'options' => self::ends(),
				'separator' => 'to' === $end ? 'before' : 'none',
			] );
			$this->add_control( $end . '_id', $js + [
				'label' => esc_html__( 'CSS ID', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => 'step-2',
				'description' => esc_html__( 'The element\'s CSS ID (its Advanced tab), without #.', 'refraction' ),
				'condition' => [ $end => 'id' ],
			] );
			$this->add_control( $end . '_element', $js + [
				'type' => Controls_Manager::HIDDEN,
				'default' => '',
			] );
			$this->add_control( $end . '_pick', [
				'type' => Controls_Manager::BUTTON,
				'label' => 'from' === $end ? esc_html__( 'Start At', 'refraction' ) : esc_html__( 'Point To', 'refraction' ),
				'text' => esc_html__( 'Pick on the page', 'refraction' ),
				'event' => 'refraction:connectorPick:' . $end,
				'description' => esc_html__( 'Then click a container on the page (hold Alt for the exact widget under the pointer; Esc cancels). With a Connector selected, the two elements it joins are outlined.', 'refraction' ),
			] );
			$this->add_responsive_control( $end . '_side', [
				'label' => esc_html__( 'Side', 'refraction' ),
				'type' => Controls_Manager::VISUAL_CHOICE,
				'label_block' => true,
				'columns' => 5,
				'toggle' => false,
				'default' => 'auto',
				'options' => self::side_choices(),
				'description' => 'from' === $end ? esc_html__( 'Per screen size. "Facing the other one" turns with the layout (side by side: left or right; one under another: top or bottom).', 'refraction' ) : '',
				'selectors' => [ $host => '--rf-cn-' . $end . '-side: {{VALUE}};' ],
				// The script reads it: Edit Mode tells it when it changes.
				'frontend_available' => true,
			] );
			$this->add_responsive_control( $end . '_at', [
				'label' => esc_html__( 'Place Along The Side', 'refraction' ) . ' (%)',
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
				'default' => [ 'size' => 50 ],
				'description' => esc_html__( '0: the side\'s start (top or left), 50: its middle, 100: its end.', 'refraction' ),
				'selectors' => [ $host => '--rf-cn-' . $end . '-at: {{SIZE}};' ],
				'frontend_available' => true,
			] );
		}

		$this->add_control( 'swap', [
			'type' => Controls_Manager::BUTTON,
			'label' => esc_html__( 'Reverse The Arrow', 'refraction' ),
			'text' => esc_html__( 'Swap start and end', 'refraction' ),
			'event' => 'refraction:connectorSwap',
			'separator' => 'before',
		] );

		$this->end_section();

		// ------------------------------------------------ The path
		$this->content_section( 'section_path', esc_html__( 'Path', 'refraction' ) );

		$this->add_responsive_control( 'path', [
			'label' => esc_html__( 'Path', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'elbow',
			'options' => [
				'straight' => esc_html__( 'Straight', 'refraction' ),
				'elbow' => esc_html__( 'Elbow (right angles)', 'refraction' ),
				'curved' => esc_html__( 'Curved', 'refraction' ),
			],
			'selectors' => [ $host => '--rf-cn-path: {{VALUE}};' ],
			'frontend_available' => true,
		] );
		$this->add_responsive_control( 'radius', [
			'label' => esc_html__( 'Rounded Corners', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'default' => [ 'size' => 8 ],
			'selectors' => [ $host => '--rf-cn-radius: {{SIZE}};' ],
			'frontend_available' => true,
			'condition' => [ 'path' => 'elbow' ],
		] );
		$this->add_responsive_control( 'curve', [
			'label' => esc_html__( 'Curve', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'default' => [ 'size' => 40 ],
			'selectors' => [ $host => '--rf-cn-curve: {{SIZE}};' ],
			'frontend_available' => true,
			'condition' => [ 'path' => 'curved' ],
		] );
		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Gap At The Ends', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -40, 'max' => 60 ] ],
			'default' => [ 'size' => 4 ],
			'description' => esc_html__( 'Space between the line\'s ends and the two elements.', 'refraction' ),
			'selectors' => [ $host => '--rf-cn-gap: {{SIZE}};' ],
			'frontend_available' => true,
		] );
		$this->add_control( 'layer', [
			'label' => esc_html__( 'Layer', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '2',
			'options' => [ '2' => esc_html__( 'Over the page', 'refraction' ), '-1' => esc_html__( 'Behind the elements', 'refraction' ) ],
			'selectors' => [ $host => 'z-index: {{VALUE}};' ],
		] );

		$this->end_section();

		// ------------------------------------------------ The ends
		$this->content_section( 'section_heads', esc_html__( 'Arrow Ends', 'refraction' ) );

		$this->add_control( 'head_end', $js + [
			'label' => esc_html__( 'At The End', 'refraction' ),
			'type' => Controls_Manager::VISUAL_CHOICE,
			'label_block' => true,
			'columns' => 4,
			'toggle' => false,
			'default' => 'arrow',
			'options' => self::head_choices(),
		] );
		$this->add_control( 'head_start', $js + [
			'label' => esc_html__( 'At The Start', 'refraction' ),
			'type' => Controls_Manager::VISUAL_CHOICE,
			'label_block' => true,
			'columns' => 4,
			'toggle' => false,
			'default' => 'none',
			'options' => self::head_choices(),
		] );

		$this->end_section();

		// ------------------------------------------------ Animation
		$this->content_section( 'section_motion', esc_html__( 'Animation', 'refraction' ) );

		$this->add_control( 'animation', $js + [
			'label' => esc_html__( 'Animation', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'None', 'refraction' ),
				'flow' => esc_html__( 'Flowing dashes', 'refraction' ),
				'draw' => esc_html__( 'Draws itself when it comes into view', 'refraction' ),
				'pulse' => esc_html__( 'A dot travelling along', 'refraction' ),
			],
			'description' => esc_html__( 'Not played for visitors who ask for less motion.', 'refraction' ),
		] );
		$this->add_control( 'speed', [
			'label' => esc_html__( 'Duration', 'refraction' ) . ' (s)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.2, 'max' => 10, 'step' => 0.1 ] ],
			'default' => [ 'size' => 1.6 ],
			'selectors' => [ $host => '--rf-cn-speed: {{SIZE}}s;' ],
			'condition' => [ 'animation!' => '' ],
		] );

		$this->end_section();

		// ------------------------------------------------ Style
		$this->style_section( 'section_style_line', esc_html__( 'Line', 'refraction' ) );

		$this->add_control( 'color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#6B7280',
			'selectors' => [ $host => '--rf-cn-color: {{VALUE}};' ],
		] );
		$this->add_control( 'opacity', [
			'label' => esc_html__( 'Opacity', 'refraction' ) . ' (%)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 5, 'max' => 100 ] ],
			'default' => [ 'size' => 100 ],
			'selectors' => [ $host => '--rf-cn-opacity: calc({{SIZE}} / 100);' ],
		] );
		$this->add_responsive_control( 'width', [
			'label' => esc_html__( 'Width', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.5, 'max' => 12, 'step' => 0.5 ] ],
			'default' => [ 'size' => 2 ],
			'selectors' => [ $host => '--rf-cn-w: {{SIZE}};' ],
			'frontend_available' => true,
		] );
		$this->add_control( 'line_style', [
			'label' => esc_html__( 'Style', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'dotted',
			'options' => [ 'solid' => esc_html__( 'Solid', 'refraction' ), 'dashed' => esc_html__( 'Dashed', 'refraction' ), 'dotted' => esc_html__( 'Dotted', 'refraction' ) ],
			'selectors' => [ $host => '--rf-cn-style: {{VALUE}};' ],
			'frontend_available' => true,
		] );
		$this->add_responsive_control( 'head_size', [
			'label' => esc_html__( 'Ends Size', 'refraction' ) . ' (px)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 4, 'max' => 40 ] ],
			'default' => [ 'size' => 10 ],
			'selectors' => [ $host => '--rf-cn-head: {{SIZE}};' ],
			'frontend_available' => true,
		] );
		$this->add_control( 'dot_color', [
			'label' => esc_html__( 'Travelling Dot Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ $host => '--rf-cn-dot: {{VALUE}};' ],
			'condition' => [ 'animation' => 'pulse' ],
		] );

		$this->end_section();
	}

	protected function render() {
		// The arrow is drawn by connector.js; the chip only shows in Edit Mode, to select the widget.
		echo '<div class="rf-cn" aria-hidden="true"><span class="rf-cn__chip">' . esc_html__( 'Connector', 'refraction' ) . '</span></div>';
	}

	protected function content_template() {
		?>
		<div class="rf-cn" aria-hidden="true"><span class="rf-cn__chip"><?php echo esc_html__( 'Connector', 'refraction' ); ?></span></div>
		<?php
	}
}
