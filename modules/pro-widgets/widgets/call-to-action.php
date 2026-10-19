<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Call_To_Action extends Pro_Widget {

	public function get_name() {
		return 'refraction-call-to-action';
	}

	public function get_title() {
		return esc_html__( 'Call to Action', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-call-to-action';
	}

	public function get_keywords() {
		return [ 'cta', 'call to action', 'banner', 'button', 'promo' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-call-to-action' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_main', esc_html__( 'Content', 'refraction' ) );

		$this->add_control(
			'skin',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'classic',
				'options' => [
					'classic' => esc_html__( 'Classic (image beside text)', 'refraction' ),
					'cover' => esc_html__( 'Cover (text over image)', 'refraction' ),
				],
				'prefix_class' => 'refraction-cta--skin-',
			]
		);

		$this->add_control(
			'image',
			[
				'label' => esc_html__( 'Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'dynamic' => [ 'active' => true ],
				'condition' => [ 'skin' => 'classic' ],
			]
		);

		$this->add_control(
			'image_position',
			[
				'label' => esc_html__( 'Image Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'left',
				'options' => [
					'left' => esc_html__( 'Left', 'refraction' ),
					'right' => esc_html__( 'Right', 'refraction' ),
					'above' => esc_html__( 'Above', 'refraction' ),
				],
				'condition' => [ 'skin' => 'classic', 'image[url]!' => '' ],
			]
		);

		$this->add_control(
			'bg_image',
			[
				'label' => esc_html__( 'Background Image', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'dynamic' => [ 'active' => true ],
				'condition' => [ 'skin' => 'cover' ],
			]
		);

		$this->add_control(
			'title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'This is the heading', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
				'separator' => 'before',
			]
		);

		$this->add_control(
			'description',
			[
				'label' => esc_html__( 'Description', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'Click edit button to change this text. Lorem ipsum dolor sit amet.', 'refraction' ),
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'title_tag',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->heading_tag_options(),
				'default' => 'h2',
			]
		);

		$this->button_content_controls( 'btn', esc_html__( 'Click Here', 'refraction' ) );

		$this->add_control(
			'link_click',
			[
				'label' => esc_html__( 'Apply Link On', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'button',
				'options' => [
					'button' => esc_html__( 'Button Only', 'refraction' ),
					'box' => esc_html__( 'Whole Box', 'refraction' ),
				],
				'description' => esc_html__( 'Whole Box makes the entire area clickable while the button stays the one real link.', 'refraction' ),
			]
		);

		$this->end_section();

		$this->content_section( 'section_ribbon', esc_html__( 'Ribbon', 'refraction' ) );

		$this->add_control(
			'show_ribbon',
			[
				'label' => esc_html__( 'Show', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'ribbon_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Sale', 'refraction' ),
				'condition' => [ 'show_ribbon' => 'yes' ],
			]
		);

		$this->add_control(
			'ribbon_position',
			[
				'label' => esc_html__( 'Position', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'right',
				'options' => [ 'left' => esc_html__( 'Left', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ) ],
				'prefix_class' => 'refraction-cta--ribbon-',
				'condition' => [ 'show_ribbon' => 'yes' ],
			]
		);

		$this->end_section();

		/* ---------------------------------------------------------------- style */
		$this->style_section( 'style_box', esc_html__( 'Box', 'refraction' ) );

		$this->add_responsive_control(
			'min_height',
			[
				'label' => esc_html__( 'Minimum Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'vh', 'em' ],
				'range' => [ 'px' => [ 'min' => 100, 'max' => 1000 ], 'vh' => [ 'min' => 10, 'max' => 100 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-cta' => 'min-height: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'content_valign',
			[
				'label' => esc_html__( 'Vertical Align', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'center',
				'options' => [ 'flex-start' => esc_html__( 'Top', 'refraction' ), 'center' => esc_html__( 'Middle', 'refraction' ), 'flex-end' => esc_html__( 'Bottom', 'refraction' ) ],
				'selectors' => [ '{{WRAPPER}} .refraction-cta__content' => 'justify-content: {{VALUE}};' ],
			]
		);

		$this->align_control( 'content_align', '{{WRAPPER}} .refraction-cta__content', [] );
		$this->box_style( 'box', '{{WRAPPER}} .refraction-cta' );

		$this->add_control(
			'overlay_color',
			[
				'label' => esc_html__( 'Overlay Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => 'rgba(0,0,0,0.4)',
				'selectors' => [ '{{WRAPPER}} .refraction-cta__overlay' => 'background-color: {{VALUE}};' ],
				'condition' => [ 'skin' => 'cover' ],
			]
		);

		$this->add_control(
			'hover_animation',
			[
				'label' => esc_html__( 'Image Hover Effect', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'zoom-in',
				'options' => [ 'none' => esc_html__( 'None', 'refraction' ), 'zoom-in' => esc_html__( 'Zoom In', 'refraction' ), 'zoom-out' => esc_html__( 'Zoom Out', 'refraction' ) ],
				'prefix_class' => 'refraction-cta--hover-',
			]
		);

		$this->end_section();

		$this->style_section( 'style_image', esc_html__( 'Image', 'refraction' ), [ 'skin' => 'classic', 'image[url]!' => '' ] );

		$this->add_responsive_control(
			'image_width',
			[
				'label' => esc_html__( 'Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%', 'px' ],
				'range' => [ '%' => [ 'min' => 10, 'max' => 80 ], 'px' => [ 'min' => 80, 'max' => 800 ] ],
				'default' => [ 'size' => 40, 'unit' => '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-cta__image' => 'flex-basis: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->end_section();

		$this->style_section( 'style_title', esc_html__( 'Title', 'refraction' ) );
		$this->text_style( 'title', '{{WRAPPER}} .refraction-cta__title' );
		$this->space_control( 'title_space', esc_html__( 'Spacing', 'refraction' ), '{{WRAPPER}} .refraction-cta__title' );
		$this->end_section();

		$this->style_section( 'style_description', esc_html__( 'Description', 'refraction' ) );
		$this->text_style( 'description', '{{WRAPPER}} .refraction-cta__description' );
		$this->space_control( 'description_space', esc_html__( 'Spacing', 'refraction' ), '{{WRAPPER}} .refraction-cta__description' );
		$this->end_section();

		$this->style_section( 'style_button', esc_html__( 'Button', 'refraction' ) );
		$this->button_style_controls( 'button', '{{WRAPPER}} .refraction-cta .refraction-pro-button' );
		$this->end_section();

		$this->style_section( 'style_ribbon', esc_html__( 'Ribbon', 'refraction' ), [ 'show_ribbon' => 'yes' ] );
		$this->add_control(
			'ribbon_bg',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-cta__ribbon-inner' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->add_control(
			'ribbon_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-cta__ribbon-inner' => 'color: {{VALUE}};' ],
			]
		);
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[ 'name' => 'ribbon_typography', 'selector' => '{{WRAPPER}} .refraction-cta__ribbon-inner' ]
		);
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$tag = Utils::validate_html_tag( $settings['title_tag'] ?? 'h2' );
		$is_cover = 'cover' === $settings['skin'];
		$image_url = ! $is_cover && ! empty( $settings['image']['url'] ) ? $settings['image']['url'] : '';
		$bg_url = $is_cover && ! empty( $settings['bg_image']['url'] ) ? $settings['bg_image']['url'] : '';

		$classes = [ 'refraction-cta' ];
		if ( $image_url ) {
			$classes[] = 'refraction-cta--image-' . sanitize_html_class( $settings['image_position'] ?: 'left' );
		}
		if ( 'box' === $settings['link_click'] && ! empty( $settings['btn_link']['url'] ) ) {
			$classes[] = 'refraction-cta--box-link';
		}
		$this->add_render_attribute( 'cta', 'class', $classes );
		?>
		<div <?php $this->print_render_attribute_string( 'cta' ); ?>>
			<?php if ( $is_cover ) : ?>
				<div class="refraction-cta__bg"<?php echo $bg_url ? ' style="background-image:url(' . esc_url( $bg_url ) . ')"' : ''; ?>></div>
				<div class="refraction-cta__overlay"></div>
			<?php endif; ?>
			<?php if ( $image_url ) : ?>
				<div class="refraction-cta__image"><img src="<?php echo esc_url( $image_url ); ?>" alt="" loading="lazy" /></div>
			<?php endif; ?>
			<div class="refraction-cta__content">
				<?php if ( ! Utils::is_empty( $settings['title'] ) ) : ?>
					<<?php Utils::print_validated_html_tag( $tag ); ?> class="refraction-cta__title"><?php echo esc_html( $settings['title'] ); ?></<?php Utils::print_validated_html_tag( $tag ); ?>>
				<?php endif; ?>
				<?php if ( ! Utils::is_empty( $settings['description'] ) ) : ?>
					<div class="refraction-cta__description"><?php echo wp_kses_post( nl2br( esc_html( $settings['description'] ) ) ); ?></div>
				<?php endif; ?>
				<?php $this->render_button( $settings, 'btn' ); ?>
			</div>
			<?php if ( 'yes' === $settings['show_ribbon'] && ! Utils::is_empty( $settings['ribbon_title'] ) ) : ?>
				<div class="refraction-cta__ribbon"><div class="refraction-cta__ribbon-inner"><?php echo esc_html( $settings['ribbon_title'] ); ?></div></div>
			<?php endif; ?>
		</div>
		<?php
	}
}
