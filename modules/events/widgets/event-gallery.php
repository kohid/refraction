<?php
namespace Refraction\Modules\Events\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Image_Size;
use Refraction\Modules\Events\Classes\Event_Data;
use Refraction\Modules\Events\Module;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Event Gallery: the event's gallery (from its event form's Image gallery field, or its page settings) as a grid that
 * opens in the lightbox. On an event page or its Single template it shows that event; elsewhere the event you pick.
 */
class Event_Gallery extends Widget_Base {

	public function get_name() {
		return 'refraction-event-gallery';
	}

	public function get_title() {
		return esc_html__( 'Event Gallery', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-gallery-grid';
	}

	public function get_categories() {
		return [ Module::WIDGET_CATEGORY ];
	}

	public function get_keywords() {
		return [ 'event', 'gallery', 'images', 'photos', 'lightbox' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-events' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_gallery', [ 'label' => esc_html__( 'Gallery', 'refraction' ) ] );

		$this->add_control( 'event', [
			'label' => esc_html__( 'Event', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => Event_Details::event_options(),
			'label_block' => true,
		] );

		$this->add_control( 'layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'grid',
			'options' => [
				'grid' => esc_html__( 'Grid', 'refraction' ),
				'showcase' => esc_html__( 'Main picture with thumbnails', 'refraction' ),
			],
			'render_type' => 'template',
		] );

		$this->add_group_control( Group_Control_Image_Size::get_type(), [ 'name' => 'thumbnail', 'default' => 'medium_large' ] );

		$this->add_responsive_control( 'columns', [
			'label' => esc_html__( 'Columns', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '3',
			'tablet_default' => '3',
			'mobile_default' => '2',
			'options' => array_combine( range( 1, 6 ), range( 1, 6 ) ),
			'selectors' => [ '{{WRAPPER}} .rfe-gallery' => '--rfe-cols: {{VALUE}};' ],
			'condition' => [ 'layout' => 'grid' ],
		] );

		$this->add_responsive_control( 'thumb_size', [
			'label' => esc_html__( 'Thumbnail size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 32, 'max' => 160 ] ],
			'default' => [ 'unit' => 'px', 'size' => 64 ],
			'selectors' => [ '{{WRAPPER}} .rfe-showcase' => '--rfe-thumb: {{SIZE}}px;' ],
			'condition' => [ 'layout' => 'showcase' ],
		] );

		$this->add_responsive_control( 'thumbs_align', [
			'label' => esc_html__( 'Thumbnails', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
				'flex-end' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
			],
			'default' => 'center',
			'selectors' => [ '{{WRAPPER}} .rfe-showcase__thumbs' => 'justify-content: {{VALUE}};' ],
			'condition' => [ 'layout' => 'showcase' ],
		] );

		$this->add_control( 'active_color', [
			'label' => esc_html__( 'Chosen thumbnail border', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'default' => '#2B6344',
			'selectors' => [ '{{WRAPPER}} .rfe-showcase' => '--rfe-active: {{VALUE}};' ],
			'condition' => [ 'layout' => 'showcase' ],
		] );

		$this->add_control( 'ratio', [
			'label' => esc_html__( 'Shape', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '1/1',
			'options' => [ 'auto' => esc_html__( 'As the pictures are', 'refraction' ), '1/1' => '1/1', '4/3' => '4/3', '3/4' => '3/4', '2/3' => '2/3', '16/9' => '16/9' ],
			'selectors_dictionary' => [ 'auto' => 'auto', '1/1' => '1 / 1', '4/3' => '4 / 3', '3/4' => '3 / 4', '2/3' => '2 / 3', '16/9' => '16 / 9' ],
			'selectors' => [ '{{WRAPPER}} .rfe-gallery, {{WRAPPER}} .rfe-showcase' => '--rfe-ratio: {{VALUE}};' ],
			'description' => esc_html__( 'Main picture with thumbnails: the main picture\'s shape.', 'refraction' ),
		] );

		$this->add_control( 'open_lightbox', [
			'label' => esc_html__( 'Open in the lightbox', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'yes',
			'options' => [ 'yes' => esc_html__( 'Yes', 'refraction' ), 'no' => esc_html__( 'No', 'refraction' ) ],
		] );

		$this->add_control( 'limit', [
			'label' => esc_html__( 'Most pictures', 'refraction' ),
			'type' => Controls_Manager::NUMBER,
			'min' => 1,
			'max' => 50,
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style', [ 'label' => esc_html__( 'Pictures', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Gap', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
			'selectors' => [ '{{WRAPPER}} .rfe-gallery, {{WRAPPER}} .rfe-showcase' => '--rfe-gap: {{SIZE}}px;' ],
		] );
		$this->add_control( 'radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rfe-gallery, {{WRAPPER}} .rfe-showcase' => '--rfe-radius: {{SIZE}}px;' ],
		] );
		$this->add_control( 'hover_zoom', [
			'label' => esc_html__( 'Zoom on hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'prefix_class' => 'rfe-gallery-zoom-',
		] );
		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$event = (int) ( $s['event'] ?? 0 ) ?: Event_Details::current_event();
		$ids = $event ? Event_Data::gallery( $event ) : [];
		$limit = (int) ( $s['limit'] ?? 0 );
		$ids = $limit > 0 ? array_slice( $ids, 0, $limit ) : $ids;

		if ( ! $ids ) {
			if ( Plugin::$instance->editor->is_edit_mode() || Plugin::$instance->preview->is_preview_mode() ) {
				echo '<div class="rf-ed rf-ed-hint">' . esc_html__( 'Event Gallery: shows the event\'s gallery (its event form\'s Image gallery field, or Gallery in its page settings).', 'refraction' ) . '</div>';
			}

			return;
		}

		$size = (string) ( $s['thumbnail_size'] ?? 'medium_large' );
		$size = 'custom' === $size ? 'large' : $size;

		if ( 'showcase' === ( $s['layout'] ?? 'grid' ) ) {
			$this->render_showcase( $ids, $size, (string) ( $s['open_lightbox'] ?? 'yes' ) );

			return;
		}

		echo '<div class="rfe-gallery">';

		foreach ( $ids as $id ) {
			$link = 'link-' . $id;
			$this->add_render_attribute( $link, [ 'class' => 'rfe-gallery__item', 'href' => (string) wp_get_attachment_url( $id ) ], null, true );
			$this->add_lightbox_data_attributes( $link, $id, (string) ( $s['open_lightbox'] ?? 'yes' ), $this->get_id(), true );
			echo '<a ' . $this->get_render_attribute_string( $link ) . '>' . wp_get_attachment_image( $id, $size, false, [ 'class' => 'rfe-gallery__img', 'loading' => 'lazy' ] ) . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by WordPress.
		}

		echo '</div>';
	}

	/**
	 * One big picture with the thumbnails under it; a thumbnail shows its picture there (script:
	 * assets/js/frontend/handlers/event-gallery.js). The big picture opens the lightbox, with every picture in it.
	 */
	private function render_showcase( array $ids, string $size, string $lightbox ): void {
		$first = $ids[0];
		$this->add_render_attribute( 'main', [ 'class' => 'rfe-showcase__main', 'href' => (string) wp_get_attachment_url( $first ) ] );
		$this->add_lightbox_data_attributes( 'main', $first, $lightbox, $this->get_id() . '-main', true );
		?>
		<div class="rfe-showcase">
			<a <?php $this->print_render_attribute_string( 'main' ); ?>><?php echo wp_get_attachment_image( $first, $size, false, [ 'class' => 'rfe-showcase__img' ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by WordPress. ?></a>
			<?php if ( count( $ids ) > 1 ) : ?>
				<div class="rfe-showcase__thumbs" role="list">
					<?php foreach ( $ids as $i => $id ) :
						$full = wp_get_attachment_image_src( $id, $size );
						?>
						<button type="button" role="listitem" class="rfe-showcase__thumb<?php echo 0 === $i ? ' is-active' : ''; ?>" aria-pressed="<?php echo 0 === $i ? 'true' : 'false'; ?>" data-src="<?php echo esc_url( $full ? $full[0] : '' ); ?>" data-srcset="<?php echo esc_attr( (string) wp_get_attachment_image_srcset( $id, $size ) ); ?>" data-href="<?php echo esc_url( (string) wp_get_attachment_url( $id ) ); ?>" data-id="<?php echo esc_attr( (string) $id ); ?>" aria-label="<?php /* translators: %d: picture number. */ echo esc_attr( sprintf( __( 'Show picture %d', 'refraction' ), $i + 1 ) ); ?>">
							<?php echo wp_get_attachment_image( $id, 'thumbnail', false, [ 'alt' => '' ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by WordPress. ?>
						</button>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}
}
