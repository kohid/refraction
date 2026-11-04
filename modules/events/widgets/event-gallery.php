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

		$this->add_group_control( Group_Control_Image_Size::get_type(), [ 'name' => 'thumbnail', 'default' => 'medium_large' ] );

		$this->add_responsive_control( 'columns', [
			'label' => esc_html__( 'Columns', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '3',
			'tablet_default' => '3',
			'mobile_default' => '2',
			'options' => array_combine( range( 1, 6 ), range( 1, 6 ) ),
			'selectors' => [ '{{WRAPPER}} .rfe-gallery' => '--rfe-cols: {{VALUE}};' ],
		] );

		$this->add_control( 'ratio', [
			'label' => esc_html__( 'Shape', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '1/1',
			'options' => [ 'auto' => esc_html__( 'As the pictures are', 'refraction' ), '1/1' => '1/1', '4/3' => '4/3', '3/4' => '3/4', '16/9' => '16/9' ],
			'selectors_dictionary' => [ 'auto' => 'auto', '1/1' => '1 / 1', '4/3' => '4 / 3', '3/4' => '3 / 4', '16/9' => '16 / 9' ],
			'selectors' => [ '{{WRAPPER}} .rfe-gallery' => '--rfe-ratio: {{VALUE}};' ],
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
			'selectors' => [ '{{WRAPPER}} .rfe-gallery' => '--rfe-gap: {{SIZE}}px;' ],
		] );
		$this->add_control( 'radius', [
			'label' => esc_html__( 'Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'selectors' => [ '{{WRAPPER}} .rfe-gallery' => '--rfe-radius: {{SIZE}}px;' ],
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
		echo '<div class="rfe-gallery">';

		foreach ( $ids as $id ) {
			$link = 'link-' . $id;
			$this->add_render_attribute( $link, [ 'class' => 'rfe-gallery__item', 'href' => (string) wp_get_attachment_url( $id ) ], null, true );
			$this->add_lightbox_data_attributes( $link, $id, (string) ( $s['open_lightbox'] ?? 'yes' ), $this->get_id(), true );
			echo '<a ' . $this->get_render_attribute_string( $link ) . '>' . wp_get_attachment_image( $id, 'custom' === $size ? 'large' : $size, false, [ 'class' => 'rfe-gallery__img', 'loading' => 'lazy' ] ) . '</a>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by WordPress.
		}

		echo '</div>';
	}
}
