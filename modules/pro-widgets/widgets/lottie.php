<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Lottie_Json;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A Lottie animation from a JSON file in the media library or a web address. The player is bundled with the
 * plugin (no CDN) and loaded only when the animation is about to scroll into view.
 */
class Lottie extends Pro_Widget {

	public function get_name() {
		return 'refraction-lottie';
	}

	public function get_title() {
		return esc_html__( 'Lottie', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-lottie';
	}

	public function get_keywords() {
		return [ 'lottie', 'animation', 'json', 'motion', 'bodymovin', 'vector' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-lottie' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_lottie', esc_html__( 'Animation', 'refraction' ) );

		$this->add_control(
			'source',
			[
				'label' => esc_html__( 'Source', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'media',
				'options' => [
					'media' => esc_html__( 'Media Library (JSON file)', 'refraction' ),
					'url' => esc_html__( 'External URL', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'json',
			[
				'label' => esc_html__( 'JSON File', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
				'media_types' => [ 'application/json' ],
				'ai' => [ 'active' => false ],
				'dynamic' => [ 'active' => true ],
				'condition' => [ 'source' => 'media' ],
			]
		);

		$this->add_control(
			'url',
			[
				'label' => esc_html__( 'JSON URL', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => 'https://example.com/animation.json',
				'description' => esc_html__( 'The visitor’s browser loads this address when the animation comes into view, so the other site must allow it (CORS).', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
				'condition' => [ 'source' => 'url' ],
			]
		);

		$this->add_control(
			'label',
			[
				'label' => esc_html__( 'Accessible Description', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'description' => esc_html__( 'Leave empty to hide a decorative animation from screen readers.', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->end_section();

		$this->content_section( 'section_lottie_playback', esc_html__( 'Playback', 'refraction' ) );

		$this->add_control(
			'trigger',
			[
				'label' => esc_html__( 'Play', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'viewport',
				'options' => [
					'autoplay' => esc_html__( 'As soon as it loads', 'refraction' ),
					'viewport' => esc_html__( 'While it is in view', 'refraction' ),
					'hover' => esc_html__( 'On hover', 'refraction' ),
					'click' => esc_html__( 'On click', 'refraction' ),
					'scroll' => esc_html__( 'With the scroll position', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'loop',
			[
				'label' => esc_html__( 'Loop', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'condition' => [ 'trigger!' => 'scroll' ],
			]
		);

		$this->add_control(
			'speed',
			[
				'label' => esc_html__( 'Speed', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 1,
				'min' => 0.1,
				'max' => 5,
				'step' => 0.1,
				'condition' => [ 'trigger!' => 'scroll' ],
			]
		);

		$this->add_control(
			'reverse',
			[
				'label' => esc_html__( 'Play Backwards', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'condition' => [ 'trigger!' => 'scroll' ],
			]
		);

		$this->add_control(
			'hover_leave',
			[
				'label' => esc_html__( 'When the Pointer Leaves', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'pause',
				'options' => [
					'pause' => esc_html__( 'Pause', 'refraction' ),
					'stop' => esc_html__( 'Go back to the start', 'refraction' ),
					'continue' => esc_html__( 'Keep playing', 'refraction' ),
				],
				'condition' => [ 'trigger' => 'hover' ],
			]
		);

		$this->end_section();

		$this->style_section( 'section_lottie_style', esc_html__( 'Animation', 'refraction' ) );

		$this->add_responsive_control(
			'width',
			[
				'label' => esc_html__( 'Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', '%', 'vw' ],
				'range' => [ 'px' => [ 'min' => 20, 'max' => 1200 ], '%' => [ 'min' => 5, 'max' => 100 ] ],
				'default' => [ 'size' => 100, 'unit' => '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-lottie' => 'width: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->add_responsive_control(
			'align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'0 auto 0 0' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
					'0 auto' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
					'0 0 0 auto' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				],
				'default' => '0 auto',
				'selectors' => [ '{{WRAPPER}} .refraction-lottie' => 'margin: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'opacity',
			[
				'label' => esc_html__( 'Opacity', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0.1, 'max' => 1, 'step' => 0.05 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-lottie' => 'opacity: {{SIZE}};' ],
			]
		);

		$this->end_section();
	}

	private function get_source_url( array $settings ): string {
		$url = 'url' === $settings['source'] ? (string) ( $settings['url'] ?? '' ) : (string) ( $settings['json']['url'] ?? '' );
		$url = trim( $url );

		return Lottie_Json::is_safe_url( $url ) ? esc_url_raw( $url ) : '';
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$src = $this->get_source_url( $settings );

		if ( '' === $src ) {
			$this->render_editor_hint( esc_html__( 'Choose a Lottie JSON file or enter its address.', 'refraction' ) );
			return;
		}

		$label = trim( (string) ( $settings['label'] ?? '' ) );
		$attributes = [
			'class' => 'refraction-lottie',
			'data-src' => $src,
			'data-lib' => REFRACTION_ASSETS_URL . 'lib/lottie/lottie.min.js?ver=' . REFRACTION_VERSION,
			'data-trigger' => $settings['trigger'],
			'data-loop' => 'yes' === $settings['loop'] && 'scroll' !== $settings['trigger'] ? 'yes' : 'no',
			'data-speed' => (string) max( 0.1, min( 5, (float) $settings['speed'] ) ),
			'data-reverse' => 'yes' === $settings['reverse'] ? 'yes' : 'no',
			'data-hover-leave' => $settings['hover_leave'],
		];

		if ( '' !== $label ) {
			$attributes['role'] = 'img';
			$attributes['aria-label'] = $label;
		} else {
			$attributes['aria-hidden'] = 'true';
		}

		if ( 'click' === $settings['trigger'] ) {
			$attributes['tabindex'] = '0';
			$attributes['role'] = 'button';
			$attributes['aria-pressed'] = 'false';
			$attributes['aria-label'] = '' !== $label ? $label : __( 'Play animation', 'refraction' );
			unset( $attributes['aria-hidden'] );
		}

		$this->add_render_attribute( 'lottie', $attributes );
		?>
		<div <?php $this->print_render_attribute_string( 'lottie' ); ?>></div>
		<?php
	}
}
