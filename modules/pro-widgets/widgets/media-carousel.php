<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Image_Size;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ProWidgets\Base\Carousel_Kit;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Video_Url;
use Refraction\Plugin;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Images and videos in a carousel (several per view, coverflow, fade) or as a slideshow with a thumbnail strip.
 * Images and videos open in the site's lightbox; videos load only after the visitor clicks.
 */
class Media_Carousel extends Pro_Widget {

	use Carousel_Kit;

	public function get_name() {
		return 'refraction-media-carousel';
	}

	public function get_title() {
		return esc_html__( 'Media Carousel', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-media-carousel';
	}

	public function get_keywords() {
		return [ 'media', 'carousel', 'slider', 'slideshow', 'image', 'video', 'thumbnails', 'coverflow' ];
	}

	public function get_style_depends(): array {
		return [ 'e-swiper', 'widget-pro-carousel', 'widget-media-carousel' ];
	}

	public function get_script_depends(): array {
		return [ 'swiper' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_media', esc_html__( 'Media', 'refraction' ) );

		$this->add_control(
			'mode',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'carousel',
				'options' => [
					'carousel' => esc_html__( 'Carousel', 'refraction' ),
					'slideshow' => esc_html__( 'Slideshow with thumbnails', 'refraction' ),
				],
			]
		);

		$repeater = new Repeater();

		$repeater->add_control(
			'type',
			[
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'image',
				'options' => [
					'image' => esc_html__( 'Image', 'refraction' ),
					'video' => esc_html__( 'Video', 'refraction' ),
				],
			]
		);

		$repeater->add_control(
			'image',
			[
				'label' => esc_html__( 'Image (or video poster)', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'default' => [ 'url' => Utils::get_placeholder_image_src() ],
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'video_link',
			[
				'label' => esc_html__( 'Video Link', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => 'https://www.youtube.com/watch?v=...',
				'description' => esc_html__( 'YouTube, Vimeo or a link to an MP4/WebM file.', 'refraction' ),
				'label_block' => true,
				'condition' => [ 'type' => 'video' ],
			]
		);

		$repeater->add_control(
			'caption',
			[
				'label' => esc_html__( 'Caption', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'slides',
			[
				'label' => esc_html__( 'Slides', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[ 'type' => 'image', 'image' => [ 'url' => Utils::get_placeholder_image_src() ] ],
					[ 'type' => 'image', 'image' => [ 'url' => Utils::get_placeholder_image_src() ] ],
					[ 'type' => 'image', 'image' => [ 'url' => Utils::get_placeholder_image_src() ] ],
				],
				'title_field' => '{{{ type }}}: {{{ caption || image.url.split( "/" ).pop() }}}',
			]
		);

		$this->add_group_control(
			Group_Control_Image_Size::get_type(),
			[
				'name' => 'slide_image',
				'default' => 'large',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'open_lightbox',
			[
				'label' => esc_html__( 'Lightbox', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'yes',
				'options' => [
					'yes' => esc_html__( 'Yes', 'refraction' ),
					'no' => esc_html__( 'No', 'refraction' ),
				],
				'description' => esc_html__( 'Images and videos open in the lightbox from Site Settings.', 'refraction' ),
			]
		);

		$this->add_control(
			'show_caption',
			[
				'label' => esc_html__( 'Show Captions', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
				'return_value' => 'yes',
			]
		);

		$this->end_section();

		$this->carousel_options_section( [
			'default_per_view' => 3,
			'effects' => [
				'slide' => esc_html__( 'Slide', 'refraction' ),
				'coverflow' => esc_html__( 'Coverflow', 'refraction' ),
				'fade' => esc_html__( 'Fade (one slide)', 'refraction' ),
			],
		] );

		$this->style_section( 'section_slide_style', esc_html__( 'Slides', 'refraction' ) );

		$this->add_responsive_control(
			'aspect_ratio',
			[
				'label' => esc_html__( 'Aspect Ratio', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '4 / 3',
				'options' => [
					'auto' => esc_html__( 'Original', 'refraction' ),
					'1 / 1' => '1:1',
					'4 / 3' => '4:3',
					'3 / 2' => '3:2',
					'16 / 9' => '16:9',
					'21 / 9' => '21:9',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-mc__media' => 'aspect-ratio: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'image_fit',
			[
				'label' => esc_html__( 'Image Fit', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'cover',
				'options' => [
					'cover' => esc_html__( 'Cover', 'refraction' ),
					'contain' => esc_html__( 'Contain', 'refraction' ),
				],
				'selectors' => [ '{{WRAPPER}} .refraction-mc__media img' => 'object-fit: {{VALUE}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'slide_border',
				'selector' => '{{WRAPPER}} .refraction-mc__media',
			]
		);

		$this->add_responsive_control(
			'slide_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'range' => [ 'px' => [ 'max' => 60 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-mc__media' => 'border-radius: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'play_color',
			[
				'label' => esc_html__( 'Play Icon Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-mc__play' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'play_bg',
			[
				'label' => esc_html__( 'Play Icon Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-mc__play' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'caption_color',
			[
				'label' => esc_html__( 'Caption Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-mc__caption' => 'color: {{VALUE}};' ],
				'condition' => [ 'show_caption' => 'yes' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'caption_typography',
				'selector' => '{{WRAPPER}} .refraction-mc__caption',
				'condition' => [ 'show_caption' => 'yes' ],
			]
		);

		$this->end_section();

		$this->style_section( 'section_thumbs_style', esc_html__( 'Thumbnails', 'refraction' ), [ 'mode' => 'slideshow' ] );

		$this->add_responsive_control(
			'thumb_width',
			[
				'label' => esc_html__( 'Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 40, 'max' => 240 ] ],
				'default' => [ 'size' => 88, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-pc-thumb' => 'width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_control(
			'thumb_active_color',
			[
				'label' => esc_html__( 'Active Border Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-pc-thumb.swiper-slide-thumb-active' => 'border-color: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'thumb_gap',
			[
				'label' => esc_html__( 'Space Above', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 60 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-pc-thumbs' => 'margin-top: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->end_section();

		$this->carousel_nav_style_section();
	}

	/**
	 * `<img>` for a slide: the attachment at the chosen size, or the plain URL.
	 */
	private function slide_image_html( array $settings, array $slide, string $size_key = 'slide_image' ): string {
		$image = $slide['image'] ?? [];

		if ( empty( $image['url'] ) && empty( $image['id'] ) ) {
			return '';
		}

		$html = Group_Control_Image_Size::get_attachment_image_html(
			[
				'image' => $image,
				$size_key . '_size' => $settings[ $size_key . '_size' ] ?? 'large',
				$size_key . '_custom_dimension' => $settings[ $size_key . '_custom_dimension' ] ?? '',
			],
			$size_key,
			'image'
		);

		return (string) $html;
	}

	private function video_lightbox_json( array $video, string $link ): string {
		$base = [
			'type' => 'video',
			'modalOptions' => [
				'id' => 'refraction-lightbox-' . $this->get_id(),
				'videoAspectRatio' => '169',
			],
		];

		if ( 'hosted' === $video['provider'] ) {
			$base['videoType'] = 'hosted';
			$base['url'] = $link;
			$base['videoParams'] = [ 'controls' => '', 'playsinline' => '' ];
		} else {
			$base['videoType'] = $video['provider'];
			$base['url'] = Video_Url::embed_src( $video, [ 'autoplay' => false ] );
			$base['autoplay'] = 'yes';
		}

		return (string) wp_json_encode( $base );
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$slides = array_values( array_filter( $settings['slides'] ?? [], function ( $slide ) {
			return ! empty( $slide['image']['url'] ) || ! empty( $slide['image']['id'] );
		} ) );

		if ( empty( $slides ) ) {
			$this->render_editor_hint( esc_html__( 'Add at least one slide with an image.', 'refraction' ) );
			return;
		}

		$total = count( $slides );
		$slideshow = 'slideshow' === $settings['mode'] && $total > 1;
		$lightbox = 'yes' === ( $settings['open_lightbox'] ?? 'yes' );
		$captions = 'yes' === ( $settings['show_caption'] ?? '' );
		$is_edit = Plugin::$instance->editor->is_edit_mode();

		$this->add_carousel_attributes( $settings, __( 'Media', 'refraction' ), 'refraction-mc' . ( $slideshow ? ' refraction-mc--slideshow' : '' ) );
		$this->add_render_attribute( 'wrapper', 'class', 'refraction-pc-wrapper' );
		?>
		<div <?php $this->print_render_attribute_string( 'wrapper' ); ?>>
			<div <?php $this->print_render_attribute_string( 'carousel' ); ?>>
				<div class="refraction-pc__track swiper-wrapper">
					<?php foreach ( $slides as $index => $slide ) : ?>
						<?php
						$key = 'slide_' . $index;
						$this->add_slide_attributes( $key, $index, $total );
						$image_html = $this->slide_image_html( $settings, $slide );
						$video = 'video' === $slide['type'] ? Video_Url::parse( (string) ( $slide['video_link'] ?? '' ) ) : null;
						$caption = (string) ( $slide['caption'] ?? '' );
						$alt_label = '' !== $caption ? $caption : __( 'Media', 'refraction' );
						?>
						<figure <?php $this->print_render_attribute_string( $key ); ?>>
							<?php
							$media_open = '<div class="refraction-mc__media">';
							$media_close = '</div>';

							if ( $video && $lightbox ) {
								$link_key = 'link_' . $index;
								$this->add_render_attribute( $link_key, [
									'class' => array_filter( [ 'refraction-mc__media', 'refraction-mc__media--video', $is_edit ? 'refraction-clickable' : '' ] ),
									'href' => 'hosted' === $video['provider'] ? $video['url'] : $slide['video_link'],
									'data-refraction-open-lightbox' => 'yes',
									'data-refraction-lightbox' => $this->video_lightbox_json( $video, $video['url'] ?? '' ),
									/* translators: %s: video caption */
									'aria-label' => sprintf( __( 'Play video: %s', 'refraction' ), $alt_label ),
								] );
								$media_open = '<a ' . $this->get_render_attribute_string( $link_key ) . '>';
								$media_close = '</a>';
							} elseif ( $video ) {
								$link_key = 'link_' . $index;
								$this->add_render_attribute( $link_key, [
									'class' => 'refraction-mc__media refraction-mc__media--video',
									'href' => 'hosted' === $video['provider'] ? $video['url'] : $slide['video_link'],
									'target' => '_blank',
									'rel' => 'noopener',
									/* translators: %s: video caption */
									'aria-label' => sprintf( __( 'Play video: %s', 'refraction' ), $alt_label ),
								] );
								$media_open = '<a ' . $this->get_render_attribute_string( $link_key ) . '>';
								$media_close = '</a>';
							} elseif ( $lightbox && ! empty( $slide['image']['url'] ) ) {
								$link_key = 'link_' . $index;
								$this->add_render_attribute( $link_key, [
									'class' => array_filter( [ 'refraction-mc__media', $is_edit ? 'refraction-clickable' : '' ] ),
									'href' => $slide['image']['url'],
									'aria-label' => sprintf( /* translators: %s: image caption */ __( 'Open image: %s', 'refraction' ), $alt_label ),
								], null, true );
								$this->add_lightbox_data_attributes( $link_key, $slide['image']['id'] ?? null, 'yes', $this->get_id(), true );
								if ( '' !== $caption ) {
									$this->add_render_attribute( $link_key, 'data-refraction-lightbox-title', $caption, true );
								}
								$media_open = '<a ' . $this->get_render_attribute_string( $link_key ) . '>';
								$media_close = '</a>';
							}

							echo $media_open; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped render attributes above.
							echo $image_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- attachment image markup from core.
							if ( $video ) {
								echo '<span class="refraction-mc__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>';
							}
							echo $media_close; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static tag.
							?>
							<?php if ( $captions && '' !== $caption ) : ?>
								<figcaption class="refraction-mc__caption"><?php echo esc_html( $caption ); ?></figcaption>
							<?php endif; ?>
						</figure>
					<?php endforeach; ?>
				</div>
				<?php $this->render_carousel_nav( $settings, $total ); ?>
			</div>
			<?php if ( $slideshow ) : ?>
				<div class="refraction-pc-thumbs swiper" aria-label="<?php esc_attr_e( 'Thumbnails', 'refraction' ); ?>">
					<div class="swiper-wrapper">
						<?php foreach ( $slides as $index => $slide ) : ?>
							<button type="button" class="refraction-pc-thumb swiper-slide" aria-label="<?php echo esc_attr( sprintf( /* translators: %d: slide number */ __( 'Show slide %d', 'refraction' ), $index + 1 ) ); ?>">
								<?php echo $this->slide_image_html( $settings, $slide, 'slide_image' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- attachment image markup from core. ?>
							</button>
						<?php endforeach; ?>
					</div>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}
}
