<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Image_Size;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * An image with markers at chosen positions; each marker opens a tooltip (click, hover or always shown).
 */
class Hotspot extends Pro_Widget {

	public function get_name() {
		return 'refraction-hotspot';
	}

	public function get_title() {
		return esc_html__( 'Hotspot', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-hotspot';
	}

	public function get_keywords() {
		return [ 'hotspot', 'image', 'tooltip', 'marker', 'pin', 'annotation', 'map' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-hotspot' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_image', esc_html__( 'Image', 'refraction' ) );

		$this->add_control(
			'image',
			[
				'label' => esc_html__( 'Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'default' => [ 'url' => Utils::get_placeholder_image_src() ],
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_group_control(
			Group_Control_Image_Size::get_type(),
			[
				'name' => 'image',
				'default' => 'large',
			]
		);

		$this->add_control(
			'trigger',
			[
				'label' => esc_html__( 'Tooltip Trigger', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'click',
				'options' => [
					'click' => esc_html__( 'Click', 'refraction' ),
					'hover' => esc_html__( 'Hover and focus', 'refraction' ),
					'always' => esc_html__( 'Always visible', 'refraction' ),
				],
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'pulse',
			[
				'label' => esc_html__( 'Pulse Animation', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'description' => esc_html__( 'Turned off for visitors who prefer reduced motion.', 'refraction' ),
			]
		);

		$this->end_section();

		$this->content_section( 'section_hotspots', esc_html__( 'Hotspots', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'label',
			[
				'label' => esc_html__( 'Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Hotspot', 'refraction' ),
				'description' => esc_html__( 'Read by screen readers as the name of the marker.', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'marker_text',
			[
				'label' => esc_html__( 'Marker Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '+',
			]
		);

		$repeater->add_control(
			'tooltip',
			[
				'label' => esc_html__( 'Tooltip Text', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'Describe this part of the image.', 'refraction' ),
				'rows' => 4,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'link',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'link_text',
			[
				'label' => esc_html__( 'Link Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Learn more', 'refraction' ),
				'condition' => [ 'link[url]!' => '' ],
			]
		);

		$repeater->add_control(
			'side',
			[
				'label' => esc_html__( 'Tooltip Side', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'top',
				'options' => [
					'top' => esc_html__( 'Top', 'refraction' ),
					'bottom' => esc_html__( 'Bottom', 'refraction' ),
					'left' => esc_html__( 'Left', 'refraction' ),
					'right' => esc_html__( 'Right', 'refraction' ),
				],
			]
		);

		$repeater->add_responsive_control(
			'x',
			[
				'label' => esc_html__( 'Horizontal Position (%)', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%' ],
				'range' => [ '%' => [ 'min' => 0, 'max' => 100, 'step' => 0.5 ] ],
				'default' => [ 'size' => 50, 'unit' => '%' ],
				'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}' => 'left: {{SIZE}}%;' ],
			]
		);

		$repeater->add_responsive_control(
			'y',
			[
				'label' => esc_html__( 'Vertical Position (%)', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%' ],
				'range' => [ '%' => [ 'min' => 0, 'max' => 100, 'step' => 0.5 ] ],
				'default' => [ 'size' => 50, 'unit' => '%' ],
				'selectors' => [ '{{WRAPPER}} {{CURRENT_ITEM}}' => 'top: {{SIZE}}%;' ],
			]
		);

		$this->add_control(
			'hotspots',
			[
				'label' => esc_html__( 'Items', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[ 'label' => 'First point', 'marker_text' => '1', 'tooltip' => 'The first point of interest.', 'x' => [ 'size' => 30, 'unit' => '%' ], 'y' => [ 'size' => 40, 'unit' => '%' ] ],
					[ 'label' => 'Second point', 'marker_text' => '2', 'tooltip' => 'The second point of interest.', 'x' => [ 'size' => 65, 'unit' => '%' ], 'y' => [ 'size' => 60, 'unit' => '%' ] ],
				],
				'title_field' => '{{{ label }}}',
			]
		);

		$this->end_section();

		$this->style_section( 'section_marker_style', esc_html__( 'Marker', 'refraction' ) );

		$this->add_responsive_control(
			'marker_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 16, 'max' => 80 ] ],
				'default' => [ 'size' => 32, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-hotspot__marker' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'marker_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-hotspot__marker' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'marker_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#0f766e',
				'selectors' => [ '{{WRAPPER}} .refraction-hotspot' => '--refraction-hs-bg: {{VALUE}};' ],
			]
		);

		$this->end_section();

		$this->style_section( 'section_tooltip_style', esc_html__( 'Tooltip', 'refraction' ) );

		$this->add_responsive_control(
			'tooltip_width',
			[
				'label' => esc_html__( 'Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 100, 'max' => 400 ] ],
				'default' => [ 'size' => 220, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-hotspot__tip' => 'width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->text_style( 'tip_text', '{{WRAPPER}} .refraction-hotspot__tip' );
		$this->add_control(
			'tip_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-hotspot__tip' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->add_responsive_control(
			'tip_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ '{{WRAPPER}} .refraction-hotspot__tip' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$hotspots = $settings['hotspots'] ?? [];

		if ( empty( $settings['image']['url'] ) && empty( $settings['image']['id'] ) ) {
			$this->render_editor_hint( esc_html__( 'Choose an image.', 'refraction' ) );
			return;
		}

		$trigger = $settings['trigger'] ?? 'click';
		$this->add_render_attribute( 'wrapper', [
			'class' => array_filter( [ 'refraction-hotspot', 'refraction-hotspot--' . $trigger, 'yes' === $settings['pulse'] ? 'refraction-hotspot--pulse' : '' ] ),
			'data-trigger' => $trigger,
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'wrapper' ); ?>>
			<div class="refraction-hotspot__image"><?php Group_Control_Image_Size::print_attachment_image_html( $settings, 'image' ); ?></div>
			<?php foreach ( $hotspots as $index => $spot ) : ?>
				<?php
				$tip_id = 'refraction-hs-' . $this->get_id() . '-' . $index;
				$key = 'spot_' . $index;
				$side = in_array( $spot['side'], [ 'top', 'bottom', 'left', 'right' ], true ) ? $spot['side'] : 'top';
				$this->add_render_attribute( $key, 'class', [ 'refraction-hotspot__point', 'refraction-hotspot__point--' . $side, 'refraction-repeater-item-' . $spot['_id'] ], true );
				$link_key = 'spot_link_' . $index;
				if ( ! empty( $spot['link']['url'] ) ) {
					$this->add_link_attributes( $link_key, $spot['link'] );
				}
				?>
				<div <?php $this->print_render_attribute_string( $key ); ?>>
					<button type="button" class="refraction-hotspot__marker" aria-label="<?php echo esc_attr( $spot['label'] ); ?>" aria-expanded="<?php echo 'always' === $trigger ? 'true' : 'false'; ?>" aria-controls="<?php echo esc_attr( $tip_id ); ?>">
						<span class="refraction-hotspot__marker-text" aria-hidden="true"><?php echo esc_html( $spot['marker_text'] ); ?></span>
					</button>
					<div class="refraction-hotspot__tip" id="<?php echo esc_attr( $tip_id ); ?>" role="tooltip"<?php echo 'always' === $trigger ? '' : ' hidden'; ?>>
						<?php if ( ! Utils::is_empty( $spot['tooltip'] ) ) : ?>
							<div class="refraction-hotspot__tip-text"><?php echo wp_kses_post( nl2br( esc_html( $spot['tooltip'] ) ) ); ?></div>
						<?php endif; ?>
						<?php if ( ! empty( $spot['link']['url'] ) && ! Utils::is_empty( $spot['link_text'] ) ) : ?>
							<a class="refraction-hotspot__tip-link" <?php $this->print_render_attribute_string( $link_key ); ?>><?php echo esc_html( $spot['link_text'] ); ?></a>
						<?php endif; ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>
		<?php
	}
}
