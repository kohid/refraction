<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Image_Size;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Plugin;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * One or several galleries in a grid, masonry or justified layout, with filter buttons between the galleries,
 * lazy-loaded images and the site's lightbox. The layouts are pure CSS.
 */
class Gallery extends Pro_Widget {

	public function get_name() {
		return 'refraction-gallery';
	}

	public function get_title() {
		return esc_html__( 'Gallery', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-gallery-grid';
	}

	public function get_keywords() {
		return [ 'gallery', 'images', 'photos', 'masonry', 'grid', 'justified', 'filter', 'portfolio', 'lightbox' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-gallery' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_galleries', esc_html__( 'Galleries', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'title',
			[
				'label' => esc_html__( 'Gallery Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Gallery', 'refraction' ),
				'label_block' => true,
				'description' => esc_html__( 'Shown on the filter button.', 'refraction' ),
			]
		);

		$repeater->add_control(
			'images',
			[
				'label' => esc_html__( 'Images', 'refraction' ),
				'type' => Controls_Manager::GALLERY,
				'default' => [],
			]
		);

		$this->add_control(
			'galleries',
			[
				'label' => esc_html__( 'Galleries', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [ [ 'title' => esc_html__( 'All photos', 'refraction' ), 'images' => [] ] ],
				'title_field' => '{{{ title }}}',
			]
		);

		$this->add_control(
			'show_filters',
			[
				'label' => esc_html__( 'Filter Buttons', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'description' => esc_html__( 'Shown when there is more than one gallery.', 'refraction' ),
				'separator' => 'before',
			]
		);

		$this->add_control(
			'all_label',
			[
				'label' => esc_html__( '"All" Button Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'All', 'refraction' ),
				'description' => esc_html__( 'Leave empty to hide the "All" button.', 'refraction' ),
				'condition' => [ 'show_filters' => 'yes' ],
			]
		);

		$this->end_section();

		$this->content_section( 'section_layout', esc_html__( 'Layout', 'refraction' ) );

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'grid',
				'options' => [
					'grid' => esc_html__( 'Grid', 'refraction' ),
					'masonry' => esc_html__( 'Masonry', 'refraction' ),
					'justified' => esc_html__( 'Justified rows', 'refraction' ),
				],
				'prefix_class' => 'refraction-gallery-layout-',
			]
		);

		$this->add_responsive_control(
			'columns',
			[
				'label' => esc_html__( 'Columns', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '3',
				'tablet_default' => '2',
				'mobile_default' => '2',
				'options' => [ '1' => '1', '2' => '2', '3' => '3', '4' => '4', '5' => '5', '6' => '6' ],
				'selectors' => [ '{{WRAPPER}} .refraction-gallery' => '--refraction-gal-cols: {{VALUE}};' ],
				'condition' => [ 'layout!' => 'justified' ],
			]
		);

		$this->add_responsive_control(
			'row_height',
			[
				'label' => esc_html__( 'Row Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 80, 'max' => 500 ] ],
				'default' => [ 'size' => 220, 'unit' => 'px' ],
				'tablet_default' => [ 'size' => 180, 'unit' => 'px' ],
				'mobile_default' => [ 'size' => 120, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-gallery' => '--refraction-gal-row: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'layout' => 'justified' ],
			]
		);

		$this->add_responsive_control(
			'aspect_ratio',
			[
				'label' => esc_html__( 'Image Ratio', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '1 / 1',
				'options' => [ '1 / 1' => '1:1', '4 / 3' => '4:3', '3 / 2' => '3:2', '16 / 9' => '16:9', '3 / 4' => '3:4' ],
				'selectors' => [ '{{WRAPPER}} .refraction-gallery__item img' => 'aspect-ratio: {{VALUE}}; object-fit: cover;' ],
				'condition' => [ 'layout' => 'grid' ],
			]
		);

		$this->add_responsive_control(
			'gap',
			[
				'label' => esc_html__( 'Gap', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 60 ] ],
				'default' => [ 'size' => 10, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-gallery' => '--refraction-gal-gap: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Image_Size::get_type(),
			[
				'name' => 'gal_image',
				'default' => 'large',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'caption',
			[
				'label' => esc_html__( 'Caption', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'none',
				'options' => [
					'none' => esc_html__( 'None', 'refraction' ),
					'below' => esc_html__( 'Below the image', 'refraction' ),
					'overlay' => esc_html__( 'On the image (on hover)', 'refraction' ),
				],
				'description' => esc_html__( 'Uses the caption saved with each image in the media library.', 'refraction' ),
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
			]
		);

		$this->add_control(
			'hover_zoom',
			[
				'label' => esc_html__( 'Zoom on Hover', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
			]
		);

		$this->end_section();

		$this->style_section( 'section_gal_filters', esc_html__( 'Filter Buttons', 'refraction' ), [ 'show_filters' => 'yes' ] );
		$this->align_control( 'filters_align', '{{WRAPPER}} .refraction-gallery__filters', [], esc_html__( 'Alignment', 'refraction' ) );
		$this->button_style_controls( 'gal_filter', '{{WRAPPER}} .refraction-gallery__filter' );
		$this->add_control(
			'gal_filter_active_bg',
			[
				'label' => esc_html__( 'Active Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-gallery__filter[aria-pressed="true"]' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->add_control(
			'gal_filter_active_color',
			[
				'label' => esc_html__( 'Active Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-gallery__filter[aria-pressed="true"]' => 'color: {{VALUE}};' ],
			]
		);
		$this->space_control( 'gal_filter_space', esc_html__( 'Space Below', 'refraction' ), '{{WRAPPER}} .refraction-gallery__filters', 'margin-bottom' );
		$this->end_section();

		$this->style_section( 'section_gal_images', esc_html__( 'Images', 'refraction' ) );
		$this->add_responsive_control(
			'gal_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%' ],
				'range' => [ 'px' => [ 'max' => 50 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-gallery__link' => 'border-radius: {{SIZE}}{{UNIT}};' ],
			]
		);
		$this->add_control(
			'gal_caption_color',
			[
				'label' => esc_html__( 'Caption Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-gallery__caption' => 'color: {{VALUE}};' ],
				'condition' => [ 'caption!' => 'none' ],
			]
		);
		$this->add_control(
			'gal_overlay_color',
			[
				'label' => esc_html__( 'Overlay Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-gallery--caption-overlay .refraction-gallery__caption' => 'background-color: {{VALUE}};' ],
				'condition' => [ 'caption' => 'overlay' ],
			]
		);
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$groups = [];

		foreach ( $settings['galleries'] ?? [] as $index => $gallery ) {
			$images = array_values( array_filter( $gallery['images'] ?? [], function ( $image ) {
				return ! empty( $image['id'] ) || ! empty( $image['url'] );
			} ) );

			if ( $images ) {
				$groups[] = [ 'slug' => 'g' . ( $index + 1 ), 'title' => (string) $gallery['title'], 'images' => $images ];
			}
		}

		if ( empty( $groups ) ) {
			$this->render_editor_hint( esc_html__( 'Add images to a gallery.', 'refraction' ) );
			return;
		}

		$lightbox = 'yes' === $settings['open_lightbox'];
		$caption_mode = $settings['caption'];
		$show_filters = 'yes' === $settings['show_filters'] && count( $groups ) > 1;
		$is_edit = Plugin::$instance->editor->is_edit_mode();

		$this->add_render_attribute( 'gallery', [
			'class' => array_filter( [
				'refraction-gallery',
				'refraction-gallery--' . $settings['layout'],
				'none' !== $caption_mode ? 'refraction-gallery--caption-' . $caption_mode : '',
				'yes' === $settings['hover_zoom'] ? 'refraction-gallery--zoom' : '',
			] ),
			'data-lightbox-group' => $this->get_id(),
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'gallery' ); ?>>
			<?php if ( $show_filters ) : ?>
				<div class="refraction-gallery__filters" role="group" aria-label="<?php esc_attr_e( 'Filter the gallery', 'refraction' ); ?>">
					<?php if ( ! Utils::is_empty( $settings['all_label'] ) ) : ?>
						<button type="button" class="refraction-gallery__filter" data-filter="*" aria-pressed="true"><?php echo esc_html( $settings['all_label'] ); ?></button>
					<?php endif; ?>
					<?php foreach ( $groups as $position => $group ) : ?>
						<button type="button" class="refraction-gallery__filter" data-filter="<?php echo esc_attr( $group['slug'] ); ?>" aria-pressed="<?php echo ( empty( $settings['all_label'] ) && 0 === $position ) ? 'true' : 'false'; ?>"><?php echo esc_html( $group['title'] ); ?></button>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
			<ul class="refraction-gallery__items">
				<?php foreach ( $groups as $position => $group ) : ?>
					<?php foreach ( $group['images'] as $n => $image ) : ?>
						<?php
						$id = (int) ( $image['id'] ?? 0 );
						$meta = $id ? wp_get_attachment_metadata( $id ) : [];
						$ratio = ( ! empty( $meta['width'] ) && ! empty( $meta['height'] ) ) ? round( $meta['width'] / $meta['height'], 4 ) : 1.5;
						$html = (string) Group_Control_Image_Size::get_attachment_image_html( $settings + [ 'image' => $image ], 'gal_image', 'image' );
						if ( false === strpos( $html, ' loading=' ) ) {
							$html = (string) preg_replace( '/<img\s/', '<img loading="lazy" ', $html, 1 );
						}
						$caption = $id ? wp_get_attachment_caption( $id ) : '';
						$hidden_by_default = ! $show_filters ? false : ( empty( $settings['all_label'] ) && $position > 0 );
						$item_key = 'item_' . $position . '_' . $n;
						$link_key = 'link_' . $position . '_' . $n;
						$this->add_render_attribute( $item_key, [
							'class' => 'refraction-gallery__item',
							'data-group' => $group['slug'],
							'style' => '--refraction-gal-ratio:' . $ratio,
						] );
						if ( $hidden_by_default ) {
							$this->add_render_attribute( $item_key, 'hidden', 'hidden' );
						}
						$this->add_render_attribute( $link_key, 'class', array_filter( [ 'refraction-gallery__link', $is_edit ? 'refraction-clickable' : '' ] ) );
						if ( $lightbox && ! empty( $image['url'] ) ) {
							$this->add_render_attribute( $link_key, 'href', $image['url'] );
							$this->add_lightbox_data_attributes( $link_key, $id ?: null, 'yes', $this->get_id(), true );
							if ( $caption ) {
								$this->add_render_attribute( $link_key, 'data-refraction-lightbox-title', $caption, true );
							}
						}
						$tag = $lightbox && ! empty( $image['url'] ) ? 'a' : 'span';
						?>
						<li <?php $this->print_render_attribute_string( $item_key ); ?>>
							<<?php Utils::print_validated_html_tag( $tag ); ?> <?php $this->print_render_attribute_string( $link_key ); ?>>
								<?php echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- attachment image markup from core. ?>
								<?php if ( 'none' !== $caption_mode && $caption ) : ?>
									<span class="refraction-gallery__caption"><?php echo esc_html( $caption ); ?></span>
								<?php endif; ?>
							</<?php Utils::print_validated_html_tag( $tag ); ?>>
						</li>
					<?php endforeach; ?>
				<?php endforeach; ?>
			</ul>
			<?php if ( $show_filters ) : ?>
				<span class="refraction-gallery__status refraction-visually-hidden" role="status" aria-live="polite"></span>
			<?php endif; ?>
		</div>
		<?php
	}
}
