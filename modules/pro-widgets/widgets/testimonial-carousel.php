<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Image_Size;
use Refraction\Modules\ProWidgets\Base\Carousel_Kit;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Quotes from customers in a carousel: text, name, role and a photo.
 */
class Testimonial_Carousel extends Pro_Widget {

	use Carousel_Kit;

	public function get_name() {
		return 'refraction-testimonial-carousel';
	}

	public function get_title() {
		return esc_html__( 'Testimonial Carousel', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-testimonial-carousel';
	}

	public function get_keywords() {
		return [ 'testimonial', 'carousel', 'quote', 'customer', 'review', 'slider' ];
	}

	public function get_style_depends(): array {
		return [ 'e-swiper', 'widget-pro-carousel', 'widget-testimonial-carousel' ];
	}

	public function get_script_depends(): array {
		return [ 'swiper' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_testimonials', esc_html__( 'Testimonials', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'content',
			[
				'label' => esc_html__( 'Quote', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'Tell your visitors what a happy customer said about you.', 'refraction' ),
				'rows' => 5,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'image',
			[
				'label' => esc_html__( 'Photo', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'name',
			[
				'label' => esc_html__( 'Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Jane Doe', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'job',
			[
				'label' => esc_html__( 'Title or Company', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Customer', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'link',
			[
				'label' => esc_html__( 'Name Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'testimonials',
			[
				'label' => esc_html__( 'Items', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[ 'name' => 'Jane Doe', 'job' => 'Designer' ],
					[ 'name' => 'John Roe', 'job' => 'Developer' ],
					[ 'name' => 'Ada Poe', 'job' => 'Writer' ],
				],
				'title_field' => '{{{ name }}}',
			]
		);

		$this->add_group_control(
			Group_Control_Image_Size::get_type(),
			[
				'name' => 'photo',
				'default' => 'thumbnail',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'below',
				'options' => [
					'below' => esc_html__( 'Photo below the quote', 'refraction' ),
					'above' => esc_html__( 'Photo above the quote', 'refraction' ),
					'aside' => esc_html__( 'Photo beside the quote', 'refraction' ),
				],
				'prefix_class' => 'refraction-tc-layout-',
			]
		);

		$this->add_control(
			'show_quote_mark',
			[
				'label' => esc_html__( 'Quote Mark', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$this->end_section();

		$this->carousel_options_section( [ 'default_per_view' => 1 ] );

		$this->style_section( 'section_tc_box', esc_html__( 'Slide', 'refraction' ) );
		$this->box_style( 'tc_box', '{{WRAPPER}} .refraction-tc', [] );
		$this->align_control( 'tc_align', '{{WRAPPER}} .refraction-tc__content, {{WRAPPER}} .refraction-tc__meta', [], esc_html__( 'Text Alignment', 'refraction' ) );
		$this->end_section();

		$this->style_section( 'section_tc_text', esc_html__( 'Text', 'refraction' ) );
		$this->text_style( 'tc_quote', '{{WRAPPER}} .refraction-tc__content' );
		$this->text_style( 'tc_name', '{{WRAPPER}} .refraction-tc__name, {{WRAPPER}} .refraction-tc__name a' );
		$this->text_style( 'tc_job', '{{WRAPPER}} .refraction-tc__job' );
		$this->add_control(
			'tc_mark_color',
			[
				'label' => esc_html__( 'Quote Mark Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-tc__mark' => 'color: {{VALUE}};' ],
				'condition' => [ 'show_quote_mark' => 'yes' ],
			]
		);
		$this->end_section();

		$this->style_section( 'section_tc_photo', esc_html__( 'Photo', 'refraction' ) );
		$this->add_responsive_control(
			'tc_photo_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 30, 'max' => 200 ] ],
				'default' => [ 'size' => 64, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-tc__image' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};' ],
			]
		);
		$this->add_responsive_control(
			'tc_photo_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'default' => [ 'size' => 50, 'unit' => '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-tc__image' => 'border-radius: {{SIZE}}{{UNIT}};' ],
			]
		);
		$this->end_section();

		$this->carousel_nav_style_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$items = array_values( array_filter( $settings['testimonials'] ?? [], function ( $item ) {
			return ! Utils::is_empty( $item['content'] ?? '' ) || ! Utils::is_empty( $item['name'] ?? '' );
		} ) );

		if ( empty( $items ) ) {
			$this->render_editor_hint( esc_html__( 'Add at least one testimonial.', 'refraction' ) );
			return;
		}

		$total = count( $items );
		$this->add_carousel_attributes( $settings, __( 'Testimonials', 'refraction' ), 'refraction-tc-carousel' );
		?>
		<div class="refraction-pc-wrapper">
			<div <?php $this->print_render_attribute_string( 'carousel' ); ?>>
				<div class="refraction-pc__track swiper-wrapper">
					<?php foreach ( $items as $index => $item ) : ?>
						<?php
						$key = 'slide_' . $index;
						$this->add_slide_attributes( $key, $index, $total, [ 'refraction-tc', 'refraction-repeater-item-' . $item['_id'] ] );
						$image = '';
						if ( ! empty( $item['image']['url'] ) ) {
							$image = Group_Control_Image_Size::get_attachment_image_html( $item + [ 'photo_size' => $settings['photo_size'] ?? 'thumbnail', 'photo_custom_dimension' => $settings['photo_custom_dimension'] ?? '' ], 'photo', 'image' );
						}
						$link_key = 'link_' . $index;
						if ( ! empty( $item['link']['url'] ) ) {
							$this->add_link_attributes( $link_key, $item['link'] );
						}
						?>
						<figure <?php $this->print_render_attribute_string( $key ); ?>>
							<?php if ( $image ) : ?>
								<div class="refraction-tc__image"><?php echo $image; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- attachment image markup from core. ?></div>
							<?php endif; ?>
							<div class="refraction-tc__body">
								<?php if ( 'yes' === $settings['show_quote_mark'] ) : ?>
									<span class="refraction-tc__mark" aria-hidden="true">&ldquo;</span>
								<?php endif; ?>
								<?php if ( ! Utils::is_empty( $item['content'] ) ) : ?>
									<blockquote class="refraction-tc__content"><?php echo wp_kses_post( nl2br( esc_html( $item['content'] ) ) ); ?></blockquote>
								<?php endif; ?>
								<figcaption class="refraction-tc__meta">
									<?php if ( ! Utils::is_empty( $item['name'] ) ) : ?>
										<cite class="refraction-tc__name">
											<?php if ( ! empty( $item['link']['url'] ) ) : ?>
												<a <?php $this->print_render_attribute_string( $link_key ); ?>><?php echo esc_html( $item['name'] ); ?></a>
											<?php else : ?>
												<?php echo esc_html( $item['name'] ); ?>
											<?php endif; ?>
										</cite>
									<?php endif; ?>
									<?php if ( ! Utils::is_empty( $item['job'] ) ) : ?>
										<span class="refraction-tc__job"><?php echo esc_html( $item['job'] ); ?></span>
									<?php endif; ?>
								</figcaption>
							</div>
						</figure>
					<?php endforeach; ?>
				</div>
				<?php $this->render_carousel_nav( $settings, $total ); ?>
			</div>
		</div>
		<?php
	}
}
