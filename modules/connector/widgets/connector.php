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
		return esc_html__( 'Connector', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-arrow-right';
	}

	public function get_keywords() {
		return [ 'connector', 'arrow', 'line', 'link', 'flow', 'diagram', 'process', 'steps', 'path', 'point' ];
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
		];
	}

	private static function sides(): array {
		return [
			'auto' => esc_html__( 'Facing the other one', 'refraction' ),
			'right' => esc_html__( 'Right', 'refraction' ),
			'bottom' => esc_html__( 'Bottom', 'refraction' ),
			'left' => esc_html__( 'Left', 'refraction' ),
			'top' => esc_html__( 'Top', 'refraction' ),
		];
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
			$this->add_responsive_control( $end . '_side', [
				'label' => esc_html__( 'Side', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'auto',
				'options' => self::sides(),
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
			'type' => Controls_Manager::SELECT,
			'default' => 'arrow',
			'options' => self::heads(),
		] );
		$this->add_control( 'head_start', $js + [
			'label' => esc_html__( 'At The Start', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'none',
			'options' => self::heads(),
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
