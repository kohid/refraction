<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Progress_Tracker extends Pro_Widget {

	public function get_name() {
		return 'refraction-progress-tracker';
	}

	public function get_title() {
		return esc_html__( 'Progress Tracker', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-progress-tracker';
	}

	public function get_keywords() {
		return [ 'progress', 'scroll', 'reading', 'tracker', 'bar', 'indicator' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-progress-tracker' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_tracker', esc_html__( 'Progress Tracker', 'refraction' ) );

		$this->add_control(
			'tracker_type',
			[
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'horizontal',
				'options' => [
					'horizontal' => esc_html__( 'Horizontal bar', 'refraction' ),
					'circular' => esc_html__( 'Circular', 'refraction' ),
				],
				'render_type' => 'template',
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'relative_to',
			[
				'label' => esc_html__( 'Track Progress Of', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'page',
				'options' => [
					'page' => esc_html__( 'The whole page', 'refraction' ),
					'content' => esc_html__( 'The post content', 'refraction' ),
					'selector' => esc_html__( 'A CSS selector', 'refraction' ),
				],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'target_selector',
			[
				'label' => esc_html__( 'CSS Selector', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => '#article, .entry-content',
				'label_block' => true,
				'condition' => [ 'relative_to' => 'selector' ],
				'frontend_available' => true,
				'description' => esc_html__( 'Progress goes from 0% when the element reaches the top of the screen to 100% when its end reaches the bottom. If nothing matches, the whole page is used.', 'refraction' ),
			]
		);

		$this->add_control(
			'show_percentage',
			[
				'label' => esc_html__( 'Show Percentage', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'render_type' => 'template',
			]
		);

		$this->add_control(
			'tracker_label',
			[
				'label' => esc_html__( 'Accessible Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Reading progress', 'refraction' ),
			]
		);

		$this->add_control(
			'position',
			[
				'label' => esc_html__( 'Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'inline',
				'options' => [
					'inline' => esc_html__( 'In the page flow', 'refraction' ),
					'fixed-top' => esc_html__( 'Fixed to the top of the screen', 'refraction' ),
					'fixed-bottom' => esc_html__( 'Fixed to the bottom of the screen', 'refraction' ),
				],
				'condition' => [ 'tracker_type' => 'horizontal' ],
				'render_type' => 'template',
			]
		);

		$this->add_control(
			'direction',
			[
				'label' => esc_html__( 'Fills From', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'start',
				'options' => [
					'start' => esc_html__( 'Start (left in LTR)', 'refraction' ),
					'end' => esc_html__( 'End (right in LTR)', 'refraction' ),
				],
				'condition' => [ 'tracker_type' => 'horizontal' ],
				'prefix_class' => 'refraction-progress-tracker--from-',
			]
		);

		$this->end_section();

		$this->style_section( 'style_bar', esc_html__( 'Bar', 'refraction' ), [ 'tracker_type' => 'horizontal' ] );

		$this->add_responsive_control(
			'bar_height',
			[
				'label' => esc_html__( 'Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 1, 'max' => 60 ] ],
				'default' => [ 'size' => 8, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-progress-tracker__track' => 'height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'bar_track_color',
			[
				'label' => esc_html__( 'Track Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-progress-tracker' => '--refraction-pt-track: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'bar_fill_color',
			[
				'label' => esc_html__( 'Progress Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-progress-tracker' => '--refraction-pt-fill: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'bar_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-progress-tracker__track, {{WRAPPER}} .refraction-progress-tracker__fill' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->end_section();

		$this->style_section( 'style_ring', esc_html__( 'Ring', 'refraction' ), [ 'tracker_type' => 'circular' ] );

		$this->add_responsive_control(
			'ring_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 40, 'max' => 300 ] ],
				'default' => [ 'size' => 96, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-progress-tracker__ring' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'ring_thickness',
			[
				'label' => esc_html__( 'Thickness', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 1, 'max' => 30 ] ],
				'default' => [ 'size' => 8, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-progress-tracker__ring circle' => 'stroke-width: {{SIZE}};' ],
			]
		);

		$this->add_control(
			'ring_track_color',
			[
				'label' => esc_html__( 'Track Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-progress-tracker' => '--refraction-pt-track: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'ring_fill_color',
			[
				'label' => esc_html__( 'Progress Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-progress-tracker' => '--refraction-pt-fill: {{VALUE}};' ],
			]
		);

		$this->end_section();

		$this->style_section( 'style_percent', esc_html__( 'Percentage', 'refraction' ), [ 'show_percentage' => 'yes' ] );
		$this->text_style( 'percent', '{{WRAPPER}} .refraction-progress-tracker__percent' );
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$circular = 'circular' === $settings['tracker_type'];
		$position = $circular ? 'inline' : $settings['position'];
		$label = '' !== trim( (string) $settings['tracker_label'] ) ? $settings['tracker_label'] : __( 'Reading progress', 'refraction' );
		$show_percent = 'yes' === $settings['show_percentage'];

		$this->add_render_attribute( 'tracker', [
			'class' => [ 'refraction-progress-tracker', 'refraction-progress-tracker--' . ( $circular ? 'circular' : 'horizontal' ), 'refraction-progress-tracker--' . sanitize_html_class( $position ) ],
			'role' => 'progressbar',
			'aria-label' => $label,
			'aria-valuemin' => '0',
			'aria-valuemax' => '100',
			'aria-valuenow' => '0',
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'tracker' ); ?>>
			<?php if ( $circular ) : ?>
				<svg class="refraction-progress-tracker__ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
					<circle class="refraction-progress-tracker__ring-track" cx="50" cy="50" r="44" pathLength="100"></circle>
					<circle class="refraction-progress-tracker__ring-fill" cx="50" cy="50" r="44" pathLength="100"></circle>
				</svg>
				<?php if ( $show_percent ) : ?>
					<span class="refraction-progress-tracker__percent" aria-hidden="true">0%</span>
				<?php endif; ?>
			<?php else : ?>
				<div class="refraction-progress-tracker__track"><div class="refraction-progress-tracker__fill"></div></div>
				<?php if ( $show_percent ) : ?>
					<span class="refraction-progress-tracker__percent" aria-hidden="true">0%</span>
				<?php endif; ?>
			<?php endif; ?>
		</div>
		<?php
	}
}
