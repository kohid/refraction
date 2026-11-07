<?php
namespace Refraction\Modules\Interactions\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\ProWidgets\Module as ProWidgets;
use Refraction\Repeater;
use Refraction\Utils;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Marquee: a band of words, icons and images that runs on and on (one row, or two going opposite ways), slowing or
 * speeding with the scroll, tilted, with faded edges. marquee.js repeats the items until the band is full and sets the
 * distance and time of the loop; without it (or with reduced motion) the items simply sit in a row that wraps.
 */
class Marquee extends Widget_Base {

	public function get_name() {
		return 'refraction-marquee';
	}

	public function get_title() {
		return esc_html__( 'Marquee', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-animation-text';
	}

	public function get_categories() {
		return [ ProWidgets::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'marquee', 'ticker', 'scrolling text', 'logos', 'band', 'ribbon', 'loop', 'infinite' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-marquee' ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-interactions' ];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_items', [ 'label' => esc_html__( 'Items', 'refraction' ) ] );

		$items = new Repeater();

		$items->add_control( 'type', [
			'label' => esc_html__( 'Show', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'text',
			'options' => [
				'text' => esc_html__( 'Text', 'refraction' ),
				'icon' => esc_html__( 'Icon', 'refraction' ),
				'image' => esc_html__( 'Image (a logo, a photo)', 'refraction' ),
			],
		] );

		$items->add_control( 'text', [
			'label' => esc_html__( 'Text', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'dynamic' => [ 'active' => true ],
			'default' => esc_html__( 'Airport transfers', 'refraction' ),
			'label_block' => true,
			'condition' => [ 'type' => 'text' ],
		] );

		$items->add_control( 'icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'default' => [ 'value' => 'fas fa-star', 'library' => 'fa-solid' ],
			'condition' => [ 'type' => 'icon' ],
		] );

		$items->add_control( 'image', [
			'label' => esc_html__( 'Image', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'dynamic' => [ 'active' => true ],
			'condition' => [ 'type' => 'image' ],
		] );

		$items->add_control( 'label', [
			'label' => esc_html__( 'Name (read by screen readers)', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'condition' => [ 'type!' => 'text' ],
		] );

		$items->add_control( 'link', [
			'label' => esc_html__( 'Link', 'refraction' ),
			'type' => Controls_Manager::URL,
			'dynamic' => [ 'active' => true ],
		] );

		$items->add_control( 'outline', [
			'label' => esc_html__( 'Outlined', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Only the outline of the letters, for a rhythm of solid and hollow words.', 'refraction' ),
			'condition' => [ 'type' => 'text' ],
		] );

		$this->add_control( 'items', [
			'label' => esc_html__( 'Items', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $items->get_controls(),
			'default' => [
				[ 'type' => 'text', 'text' => esc_html__( 'Airport transfers', 'refraction' ) ],
				[ 'type' => 'text', 'text' => esc_html__( 'Highland tours', 'refraction' ), 'outline' => 'yes' ],
				[ 'type' => 'text', 'text' => esc_html__( 'Corporate travel', 'refraction' ) ],
				[ 'type' => 'text', 'text' => esc_html__( 'Open every day', 'refraction' ), 'outline' => 'yes' ],
			],
			'title_field' => '{{{ "text" === type ? text : ( label || type ) }}}',
		] );

		$this->add_control( 'separator', [
			'label' => esc_html__( 'Between Items', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'icon',
			'options' => [
				'none' => esc_html__( 'Nothing', 'refraction' ),
				'icon' => esc_html__( 'An icon', 'refraction' ),
				'text' => esc_html__( 'A character or word', 'refraction' ),
			],
			'separator' => 'before',
		] );

		$this->add_control( 'separator_icon', [
			'label' => esc_html__( 'Icon', 'refraction' ),
			'type' => Controls_Manager::ICONS,
			'default' => [ 'value' => 'fas fa-asterisk', 'library' => 'fa-solid' ],
			'skin' => 'inline',
			'label_block' => false,
			'condition' => [ 'separator' => 'icon' ],
		] );

		$this->add_control( 'separator_text', [
			'label' => esc_html__( 'Character or Word', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '/',
			'condition' => [ 'separator' => 'text' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_motion', [ 'label' => esc_html__( 'Motion', 'refraction' ) ] );

		$this->add_control( 'direction', [
			'label' => esc_html__( 'Runs Towards', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'default' => 'left',
			'toggle' => false,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-arrow-left' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-arrow-right' ],
			],
		] );

		$this->add_control( 'speed', [
			'label' => esc_html__( 'Speed', 'refraction' ) . ' (px/s)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 5, 'max' => 400, 'step' => 5 ] ],
			'default' => [ 'size' => 60 ],
		] );

		$this->add_control( 'rows', [
			'label' => esc_html__( 'Rows', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '1',
			'options' => [
				'1' => esc_html__( 'One', 'refraction' ),
				'2' => esc_html__( 'Two, running opposite ways', 'refraction' ),
			],
		] );

		$this->add_control( 'scroll', [
			'label' => esc_html__( 'With The Scroll', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'boost',
			'options' => [
				'' => esc_html__( 'Nothing (steady)', 'refraction' ),
				'boost' => esc_html__( 'Speeds up while the page scrolls', 'refraction' ),
				'follow' => esc_html__( 'Speeds up and turns with the scroll direction', 'refraction' ),
			],
			'description' => esc_html__( 'The band answers the visitor\'s scrolling, then eases back to its own pace.', 'refraction' ),
		] );

		$this->add_control( 'pause', [
			'label' => esc_html__( 'Pause On Hover', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'description' => esc_html__( 'Also stops while a link in it has the keyboard focus.', 'refraction' ),
		] );

		$this->add_responsive_control( 'tilt', [
			'label' => esc_html__( 'Tilt', 'refraction' ) . ' (deg)',
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => -12, 'max' => 12, 'step' => 0.5 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee' => '--rf-mq-tilt: {{SIZE}}deg; --rf-mq-bleed: 6%;' ],
			'description' => esc_html__( 'Turns the band into a slanted ribbon across the section.', 'refraction' ),
			'separator' => 'before',
		] );

		$this->add_control( 'fade', [
			'label' => esc_html__( 'Fade The Edges', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
			'prefix_class' => 'rf-marquee-fade-',
		] );

		$this->add_responsive_control( 'fade_size', [
			'label' => esc_html__( 'Fade Width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%', 'px' ],
			'range' => [ '%' => [ 'min' => 0, 'max' => 40 ], 'px' => [ 'min' => 0, 'max' => 300 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee' => '--rf-mq-fade: {{SIZE}}{{UNIT}};' ],
			'condition' => [ 'fade' => 'yes' ],
		] );

		$this->end_controls_section();

		// ---------------------------------------------------------------- style
		$this->start_controls_section( 'section_style_band', [
			'label' => esc_html__( 'Band', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_control( 'band_bg', [
			'label' => esc_html__( 'Background Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-marquee__row' => 'background-color: {{VALUE}};' ],
		] );

		$this->add_control( 'band_bg_2', [
			'label' => esc_html__( 'Second Row Background', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-marquee__row + .rf-marquee__row' => 'background-color: {{VALUE}};' ],
			'condition' => [ 'rows' => '2' ],
		] );

		$this->add_responsive_control( 'band_padding', [
			'label' => esc_html__( 'Padding (top and bottom)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em' ],
			'range' => [ 'px' => [ 'max' => 120 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee__row' => 'padding-block: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'gap', [
			'label' => esc_html__( 'Space Between Items', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em' ],
			'range' => [ 'px' => [ 'max' => 200 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee' => '--rf-mq-gap: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_responsive_control( 'rows_gap', [
			'label' => esc_html__( 'Space Between Rows', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'max' => 80 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee' => 'row-gap: {{SIZE}}{{UNIT}};' ],
			'condition' => [ 'rows' => '2' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_text', [
			'label' => esc_html__( 'Text', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_group_control( Group_Control_Typography::get_type(), [
			'name' => 'text_typography',
			'selector' => '{{WRAPPER}} .rf-marquee__item',
		] );

		$this->add_control( 'text_color', [
			'label' => esc_html__( 'Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-marquee' => '--rf-mq-color: {{VALUE}};' ],
		] );

		$this->add_control( 'text_hover_color', [
			'label' => esc_html__( 'Hover Color (links)', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} a.rf-marquee__item:hover, {{WRAPPER}} a.rf-marquee__item:focus-visible' => 'color: {{VALUE}}; --rf-mq-color: {{VALUE}};' ],
		] );

		$this->add_control( 'outline_width', [
			'label' => esc_html__( 'Outline Width (outlined words)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.5, 'max' => 4, 'step' => 0.5 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee' => '--rf-mq-stroke: {{SIZE}}px;' ],
		] );

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_media', [
			'label' => esc_html__( 'Icons and Images', 'refraction' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_responsive_control( 'icon_size', [
			'label' => esc_html__( 'Icon Size', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em' ],
			'range' => [ 'px' => [ 'min' => 8, 'max' => 160 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee__icon' => 'font-size: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'separator_color', [
			'label' => esc_html__( 'Separator Color', 'refraction' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [ '{{WRAPPER}} .rf-marquee__sep' => 'color: {{VALUE}}; fill: {{VALUE}};' ],
		] );

		$this->add_control( 'separator_spin', [
			'label' => esc_html__( 'Turn The Separator', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'The separator slowly turns as the band runs.', 'refraction' ),
			'prefix_class' => 'rf-marquee-spin-',
		] );

		$this->add_responsive_control( 'image_height', [
			'label' => esc_html__( 'Image Height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'em' ],
			'range' => [ 'px' => [ 'min' => 12, 'max' => 400 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee__img' => 'height: {{SIZE}}{{UNIT}};' ],
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'image_radius', [
			'label' => esc_html__( 'Image Corners', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf-marquee__img' => 'border-radius: {{SIZE}}{{UNIT}};' ],
		] );

		$this->add_control( 'image_gray', [
			'label' => esc_html__( 'Gray Until Hovered', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Logos in one quiet tone; each takes its colors back under the pointer.', 'refraction' ),
			'prefix_class' => 'rf-marquee-gray-',
		] );

		$this->end_controls_section();
	}

	/** The motion settings for marquee.js, clamped. */
	private function config( array $s ): array {
		return [
			'speed' => max( 5, min( 400, (float) ( $s['speed']['size'] ?? 60 ) ) ),
			'dir' => 'right' === ( $s['direction'] ?? '' ) ? 'right' : 'left',
			'scroll' => in_array( $s['scroll'] ?? '', [ 'boost', 'follow' ], true ) ? $s['scroll'] : '',
			'pause' => 'yes' === ( $s['pause'] ?? '' ),
		];
	}

	private function item_html( array $item, int $index ): string {
		$type = in_array( $item['type'] ?? '', [ 'icon', 'image' ], true ) ? $item['type'] : 'text';
		$label = trim( (string) ( $item['label'] ?? '' ) );
		$inner = '';

		if ( 'text' === $type ) {
			$text = trim( (string) ( $item['text'] ?? '' ) );

			if ( '' === $text ) {
				return '';
			}

			$inner = '<span class="rf-marquee__text">' . esc_html( $text ) . '</span>';
		} elseif ( 'icon' === $type ) {
			if ( empty( $item['icon']['value'] ) ) {
				return '';
			}

			$inner = '<span class="rf-marquee__icon" aria-hidden="true">' . Icons_Manager::try_get_icon_html( $item['icon'], [ 'aria-hidden' => 'true' ] ) . '</span>';
		} else {
			$url = $item['image']['url'] ?? '';

			if ( '' === $url ) {
				return '';
			}

			$inner = '<img class="rf-marquee__img" src="' . esc_url( $url ) . '" alt="' . esc_attr( $label ) . '" loading="lazy" decoding="async" />';
			$label = '';
		}

		$classes = 'rf-marquee__item rf-marquee__item--' . $type . ( 'yes' === ( $item['outline'] ?? '' ) && 'text' === $type ? ' rf-marquee__item--outline' : '' );
		$key = 'mq_item_' . $index;

		$this->add_render_attribute( $key, 'class', $classes );

		if ( ! empty( $item['link']['url'] ) ) {
			$this->add_link_attributes( $key, $item['link'] );

			if ( '' !== $label ) {
				$this->add_render_attribute( $key, 'aria-label', $label );
			}

			return '<a ' . $this->get_render_attribute_string( $key ) . '>' . $inner . '</a>';
		}

		if ( 'icon' === $type && '' !== $label ) {
			$inner .= '<span class="rf-marquee__sr">' . esc_html( $label ) . '</span>';
		}

		return '<span ' . $this->get_render_attribute_string( $key ) . '>' . $inner . '</span>';
	}

	private function separator_html( array $s ): string {
		$type = $s['separator'] ?? 'icon';

		if ( 'icon' === $type && ! empty( $s['separator_icon']['value'] ) ) {
			return '<span class="rf-marquee__sep" aria-hidden="true">' . Icons_Manager::try_get_icon_html( $s['separator_icon'], [ 'aria-hidden' => 'true' ] ) . '</span>';
		}

		if ( 'text' === $type && '' !== trim( (string) ( $s['separator_text'] ?? '' ) ) ) {
			return '<span class="rf-marquee__sep rf-marquee__sep--text" aria-hidden="true">' . esc_html( $s['separator_text'] ) . '</span>';
		}

		return '';
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$sep = $this->separator_html( $s );
		$parts = [];

		foreach ( array_values( (array) ( $s['items'] ?? [] ) ) as $i => $item ) {
			$html = $this->item_html( (array) $item, $i );

			if ( '' !== $html ) {
				$parts[] = $html . $sep;
			}
		}

		if ( ! $parts ) {
			return;
		}

		$config = $this->config( $s );
		$group = '<div class="rf-marquee__group">' . implode( '', $parts ) . '</div>';
		$rows = '2' === (string) ( $s['rows'] ?? '1' ) ? [ $config['dir'], 'left' === $config['dir'] ? 'right' : 'left' ] : [ $config['dir'] ];

		echo '<div class="rf-marquee' . ( $config['pause'] ? ' rf-marquee--pause' : '' ) . '" data-rf-marquee="' . esc_attr( wp_json_encode( $config ) ) . '">';

		foreach ( $rows as $n => $dir ) {
			// The second row repeats the first for the eye only: screen readers get the items once.
			printf(
				'<div class="rf-marquee__row" data-dir="%1$s"%2$s><div class="rf-marquee__track">%3$s</div></div>',
				esc_attr( $dir ),
				$n ? ' aria-hidden="true" inert' : '',
				$group // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts.
			);
		}

		echo '</div>';
	}

	public function render_plain_content() {
		$s = $this->get_settings_for_display();
		$words = [];

		foreach ( (array) ( $s['items'] ?? [] ) as $item ) {
			$words[] = 'text' === ( $item['type'] ?? 'text' ) ? (string) ( $item['text'] ?? '' ) : (string) ( $item['label'] ?? '' );
		}

		echo esc_html( implode( ' · ', array_filter( array_map( 'trim', $words ) ) ) );
	}
}
