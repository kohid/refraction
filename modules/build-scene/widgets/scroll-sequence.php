<?php
namespace Refraction\Modules\BuildScene\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\BuildScene\Module;
use Refraction\Plugin;
use Refraction\Repeater;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Scroll Sequence: a video or a numbered image sequence (a camera move through a room, a product turning) that plays
 * forward as the visitor scrolls and backwards when they scroll up, while the section stays pinned. Text overlays show
 * between chosen points. No 3D library: images are drawn on a canvas, a video is seeked.
 */
class Scroll_Sequence extends Widget_Base {

	public function get_name() {
		return 'scroll-sequence';
	}

	public function get_title() {
		return esc_html__( 'Scroll Sequence', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-video-playlist';
	}

	public function get_categories() {
		return [ 'refraction-advanced' ];
	}

	public function get_keywords() {
		return [ 'scroll', 'video', 'sequence', 'frames', 'scrub', 'cinematic', 'walkthrough', 'animation' ];
	}

	public function get_script_depends(): array {
		return [ Module::SEQUENCE ];
	}

	public function get_style_depends(): array {
		return [ Module::SCRIPT ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_media', [ 'label' => esc_html__( 'Media', 'refraction' ) ] );
		$this->add_control( 'source', [
			'label' => esc_html__( 'Play', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'images',
			'options' => [ 'images' => esc_html__( 'Image sequence (smoothest)', 'refraction' ), 'video' => esc_html__( 'Video', 'refraction' ) ],
		] );
		$this->add_control( 'frames', [
			'label' => esc_html__( 'Frames', 'refraction' ),
			'type' => Controls_Manager::GALLERY,
			'condition' => [ 'source' => 'images' ],
			'description' => esc_html__( 'Upload the frames (frame-001.jpg, frame-002.jpg...) and select them all. 60 to 150 frames of about 1600 px wide work well.', 'refraction' ),
		] );
		$this->add_control( 'frame_order', [
			'label' => esc_html__( 'Frame order', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'name',
			'options' => [ 'name' => esc_html__( 'By file name', 'refraction' ), 'picked' => esc_html__( 'As selected', 'refraction' ) ],
			'condition' => [ 'source' => 'images' ],
		] );
		$this->add_control( 'frame_size', [
			'label' => esc_html__( 'Frame size', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'full',
			'options' => [ 'full' => esc_html__( 'Original', 'refraction' ), 'large' => esc_html__( 'Large', 'refraction' ), 'medium_large' => esc_html__( 'Medium', 'refraction' ) ],
			'condition' => [ 'source' => 'images' ],
		] );
		$this->add_control( 'video', [
			'label' => esc_html__( 'Video', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'media_types' => [ 'video' ],
			'condition' => [ 'source' => 'video' ],
			'description' => esc_html__( 'MP4 or WebM without sound. For smooth scrubbing export it with a keyframe on every frame (ffmpeg: -g 1).', 'refraction' ),
		] );
		$this->add_control( 'fit', [
			'label' => esc_html__( 'Fit', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'cover',
			'options' => [ 'cover' => esc_html__( 'Fill the scene', 'refraction' ), 'contain' => esc_html__( 'Show it whole', 'refraction' ) ],
		] );
		$this->add_control( 'label', [ 'label' => esc_html__( 'Description for screen readers', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true ] );
		$this->add_control( 'poster', [
			'label' => esc_html__( 'Still image', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'description' => esc_html__( 'Shown with reduced motion, and on phones when you choose so. Empty: the first frame.', 'refraction' ),
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_overlays', [ 'label' => esc_html__( 'Text', 'refraction' ) ] );
		$overlays = new Repeater();
		$overlays->add_control( 'title', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true ] );
		$overlays->add_control( 'text', [ 'label' => esc_html__( 'Text', 'refraction' ), 'type' => Controls_Manager::TEXTAREA, 'rows' => 3 ] );
		$overlays->add_control( 'from', [ 'label' => esc_html__( 'Shows from (%)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 100, 'default' => 0 ] );
		$overlays->add_control( 'to', [ 'label' => esc_html__( 'Until (%)', 'refraction' ), 'type' => Controls_Manager::NUMBER, 'min' => 0, 'max' => 100, 'default' => 30 ] );
		$overlays->add_control( 'place', [
			'label' => esc_html__( 'Place', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'left',
			'options' => [ 'left' => esc_html__( 'Left', 'refraction' ), 'center' => esc_html__( 'Center', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ), 'bottom' => esc_html__( 'Bottom', 'refraction' ) ],
		] );
		$this->add_control( 'overlays', [
			'label' => esc_html__( 'Text over the sequence', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $overlays->get_controls(),
			'title_field' => '{{{ title }}} ({{{ from }}}–{{{ to }}}%)',
			'default' => [
				[ 'title' => esc_html__( 'The living space', 'refraction' ), 'text' => esc_html__( 'Where the day gathers.', 'refraction' ), 'from' => 0, 'to' => 30, 'place' => 'left' ],
				[ 'title' => esc_html__( 'Light first', 'refraction' ), 'text' => esc_html__( 'Every room is planned around the view.', 'refraction' ), 'from' => 40, 'to' => 70, 'place' => 'right' ],
			],
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_scroll', [ 'label' => esc_html__( 'Scroll', 'refraction' ) ] );
		$this->add_responsive_control( 'length', [
			'label' => esc_html__( 'Scroll length (screens)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 10, 'step' => 0.5 ] ],
			'default' => [ 'size' => 4 ],
			'selectors' => [ '{{WRAPPER}} .rfseq' => '--rf3d-length: {{SIZE}};' ],
		] );
		$this->add_control( 'hold', [
			'label' => esc_html__( 'Pause on the last frame', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'default' => [ 'size' => 8 ],
			'description' => esc_html__( 'Part of the scroll (in %) spent on the last frame.', 'refraction' ),
		] );
		$this->add_control( 'show_progress', [ 'label' => esc_html__( 'Show a progress line', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'mobile_poster', [ 'label' => esc_html__( 'Show the still image on phones instead', 'refraction' ), 'type' => Controls_Manager::SWITCHER ] );
		$this->add_control( 'preview', [
			'label' => esc_html__( 'Preview in the editor', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'description' => esc_html__( 'Drag to see that point (%). Only in the editor; empty follows the scroll.', 'refraction' ),
			'separator' => 'before',
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_scene_style', [ 'label' => esc_html__( 'Scene', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'background', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'default' => '#111111', 'selectors' => [ '{{WRAPPER}} .rf3d-stage' => 'background-color: {{VALUE}};' ] ] );
		$this->add_responsive_control( 'height', [
			'label' => esc_html__( 'Scene height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'vh', 'px' ],
			'range' => [ 'vh' => [ 'min' => 40, 'max' => 100 ], 'px' => [ 'min' => 300, 'max' => 1200 ] ],
			'default' => [ 'unit' => 'vh', 'size' => 100 ],
			'selectors' => [ '{{WRAPPER}} .rfseq' => '--rf3d-height: {{SIZE}}{{UNIT}};' ],
		] );
		$this->add_control( 'scrim', [
			'label' => esc_html__( 'Shade behind the text', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 90 ] ],
			'default' => [ 'size' => 45 ],
			'description' => esc_html__( 'Darkens the side of the picture the text is on, so it stays readable (%).', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rfseq' => '--rfseq-scrim: {{SIZE}}%;' ],
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_text_style', [ 'label' => esc_html__( 'Text', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'title_color', [ 'label' => esc_html__( 'Title color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfseq-title' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'title_typography', 'selector' => '{{WRAPPER}} .rfseq-title' ] );
		$this->add_control( 'text_color', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => [ '{{WRAPPER}} .rfseq-text' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'text_typography', 'selector' => '{{WRAPPER}} .rfseq-text' ] );
		$this->add_responsive_control( 'text_width', [ 'label' => esc_html__( 'Width', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', '%' ], 'range' => [ 'px' => [ 'min' => 200, 'max' => 900 ] ], 'selectors' => [ '{{WRAPPER}} .rfseq-overlay' => 'width: {{SIZE}}{{UNIT}};' ] ] );
		$this->end_controls_section();
	}

	/** The frame URLs in play order: by file name (natural order) or as picked. */
	private function frame_urls( array $s ): array {
		$size = in_array( $s['frame_size'] ?? '', [ 'full', 'large', 'medium_large' ], true ) ? $s['frame_size'] : 'full';
		$frames = [];

		foreach ( (array) ( $s['frames'] ?? [] ) as $frame ) {
			$id = (int) ( $frame['id'] ?? 0 );
			$src = $id ? wp_get_attachment_image_src( $id, $size ) : false;
			$url = $src ? (string) $src[0] : (string) ( $frame['url'] ?? '' );

			if ( '' !== $url ) {
				$frames[] = [ 'url' => $url, 'name' => $id ? basename( (string) get_attached_file( $id ) ) : basename( (string) wp_parse_url( $url, PHP_URL_PATH ) ) ];
			}
		}

		if ( 'picked' !== ( $s['frame_order'] ?? 'name' ) ) {
			usort( $frames, static function ( $a, $b ) {
				return strnatcasecmp( $a['name'], $b['name'] );
			} );
		}

		return array_values( array_map( 'esc_url_raw', array_column( array_slice( $frames, 0, 600 ), 'url' ) ) );
	}

	public function sequence_config(): array {
		$s = $this->get_settings_for_display();
		$editor = Plugin::$instance->editor && Plugin::$instance->editor->is_edit_mode();
		$preview = $s['preview']['size'] ?? '';
		$hold = $s['hold']['size'] ?? 8;
		$video = 'video' === ( $s['source'] ?? '' ) ? (string) ( $s['video']['url'] ?? '' ) : '';

		return [
			'source' => 'video' === ( $s['source'] ?? '' ) ? 'video' : 'images',
			'frames' => 'video' === ( $s['source'] ?? '' ) ? [] : $this->frame_urls( $s ),
			'video' => '' !== $video ? esc_url_raw( $video ) : '',
			'fit' => 'contain' === ( $s['fit'] ?? '' ) ? 'contain' : 'cover',
			'hold' => is_numeric( $hold ) ? max( 0, min( 40, (float) $hold ) ) / 100 : 0.08,
			'mobilePoster' => 'yes' === ( $s['mobile_poster'] ?? '' ),
			'preview' => $editor && is_numeric( $preview ) ? max( 0, min( 100, (float) $preview ) ) / 100 : null,
			'editor' => $editor,
		];
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$config = $this->sequence_config();
		$label = (string) ( $s['label'] ?? '' );
		$poster = (string) ( $s['poster']['url'] ?? '' );
		$poster = '' !== $poster ? $poster : (string) ( $config['frames'][0] ?? '' );

		echo '<div class="rf3d rfseq rfseq-fit-' . esc_attr( $config['fit'] ) . '" data-rfseq="' . esc_attr( (string) wp_json_encode( $config ) ) . '">';
		echo '<div class="rf3d-stage">';
		echo '<canvas class="rfseq-canvas" role="img" aria-label="' . esc_attr( $label ) . '"></canvas>';

		if ( 'video' === $config['source'] && '' !== $config['video'] ) {
			// The script loads the video itself (see sequence.js), so the browser does not start a second download.
			echo '<video class="rfseq-video" muted playsinline preload="none" aria-hidden="true" tabindex="-1"></video>';
		}

		if ( '' !== $poster ) {
			echo '<img class="rf3d-poster rfseq-poster" src="' . esc_url( $poster ) . '" alt="' . esc_attr( $label ) . '" hidden>';
		}

		echo '<div class="rfseq-overlays">';

		foreach ( (array) ( $s['overlays'] ?? [] ) as $i => $overlay ) {
			$from = is_numeric( $overlay['from'] ?? null ) ? max( 0, min( 100, (float) $overlay['from'] ) ) : 0;
			$to = is_numeric( $overlay['to'] ?? null ) ? max( $from, min( 100, (float) $overlay['to'] ) ) : 100;
			$place = in_array( $overlay['place'] ?? '', [ 'left', 'center', 'right', 'bottom' ], true ) ? $overlay['place'] : 'left';
			echo '<div class="rfseq-overlay rfseq-at-' . esc_attr( $place ) . '" data-place="' . esc_attr( $place ) . '" data-from="' . esc_attr( (string) ( $from / 100 ) ) . '" data-to="' . esc_attr( (string) ( $to / 100 ) ) . '">';
			echo '' !== trim( (string) ( $overlay['title'] ?? '' ) ) ? '<h2 class="rfseq-title">' . esc_html( $overlay['title'] ) . '</h2>' : '';
			echo '' !== trim( (string) ( $overlay['text'] ?? '' ) ) ? '<p class="rfseq-text">' . esc_html( $overlay['text'] ) . '</p>' : '';
			echo '</div>';
		}

		echo '</div>';

		if ( 'yes' === ( $s['show_progress'] ?? '' ) ) {
			echo '<div class="rfseq-bar" aria-hidden="true"><span></span></div>';
		}

		echo '<p class="rf3d-status" role="status"></p>';
		echo '</div></div>';
	}
}
