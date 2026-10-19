<?php
namespace Refraction\Modules\LoopBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Posts: a grid of posts in the Classic, Cards or Full content skin.
 */
class Posts extends Base_Loop_Widget {

	/** @var int Depth guard so a post never prints itself as "full content". */
	private static int $content_depth = 0;

	public function get_name() {
		return 'posts';
	}

	public function get_title() {
		return esc_html__( 'Posts', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-post-list';
	}

	public function get_keywords() {
		return [ 'posts', 'cpt', 'item', 'loop', 'query', 'cards', 'blog' ];
	}

	public function is_filterable(): bool {
		return true;
	}

	protected function get_layout_class(): string {
		return 'refraction-loop--posts';
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'skin',
			[
				'label' => esc_html__( 'Skin', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'classic',
				'options' => [
					'classic' => esc_html__( 'Classic', 'refraction' ),
					'cards' => esc_html__( 'Cards', 'refraction' ),
					'full_content' => esc_html__( 'Full content', 'refraction' ),
				],
				'prefix_class' => 'refraction-posts--skin-',
			]
		);

		$this->register_columns_controls( 3 );

		$this->add_control(
			'show_image',
			[
				'label' => esc_html__( 'Featured image', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'separator' => 'before',
				'condition' => [ 'skin!' => 'full_content' ],
			]
		);

		$this->add_control(
			'image_size',
			[
				'label' => esc_html__( 'Image size', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'medium_large',
				'options' => $this->get_image_size_options(),
				'condition' => [ 'skin!' => 'full_content', 'show_image' => 'yes' ],
			]
		);

		$this->add_responsive_control(
			'image_ratio',
			[
				'label' => esc_html__( 'Image ratio', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '16 / 9',
				'options' => [
					'auto' => esc_html__( 'Original', 'refraction' ),
					'16 / 9' => '16:9',
					'3 / 2' => '3:2',
					'4 / 3' => '4:3',
					'1 / 1' => '1:1',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-post__image img' => 'aspect-ratio: {{VALUE}}; object-fit: cover; width: 100%;',
				],
				'condition' => [ 'skin!' => 'full_content', 'show_image' => 'yes' ],
			]
		);

		$this->add_control(
			'show_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->add_control(
			'title_tag',
			[
				'label' => esc_html__( 'Title HTML tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'h3',
				'options' => [ 'h1' => 'H1', 'h2' => 'H2', 'h3' => 'H3', 'h4' => 'H4', 'h5' => 'H5', 'h6' => 'H6', 'div' => 'div', 'p' => 'p' ],
				'condition' => [ 'show_title' => 'yes' ],
			]
		);

		$this->add_control(
			'meta_items',
			[
				'label' => esc_html__( 'Meta', 'refraction' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'label_block' => true,
				'default' => [ 'author', 'date' ],
				'options' => [
					'author' => esc_html__( 'Author', 'refraction' ),
					'date' => esc_html__( 'Date', 'refraction' ),
					'comments' => esc_html__( 'Comments', 'refraction' ),
					'terms' => esc_html__( 'Categories', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'meta_separator',
			[
				'label' => esc_html__( 'Meta separator', 'refraction' ),
				'default' => '·',
				'condition' => [ 'meta_items!' => [] ],
			]
		);

		$this->add_control(
			'show_excerpt',
			[
				'label' => esc_html__( 'Excerpt', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'condition' => [ 'skin!' => 'full_content' ],
			]
		);

		$this->add_control(
			'excerpt_length',
			[
				'label' => esc_html__( 'Excerpt length (words)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 25,
				'min' => 1,
				'max' => 200,
				'condition' => [ 'skin!' => 'full_content', 'show_excerpt' => 'yes' ],
			]
		);

		$this->add_control(
			'show_read_more',
			[
				'label' => esc_html__( 'Read more', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'condition' => [ 'skin!' => 'full_content' ],
			]
		);

		$this->add_control(
			'read_more_text',
			[
				'label' => esc_html__( 'Read more text', 'refraction' ),
				'default' => esc_html__( 'Read more &raquo;', 'refraction' ),
				'condition' => [ 'skin!' => 'full_content', 'show_read_more' => 'yes' ],
			]
		);

		$this->end_controls_section();

		$this->register_query_controls();
		$this->register_pagination_controls();
		$this->register_style_controls();
		$this->register_pagination_style_controls();
	}

	protected function register_style_controls(): void {
		$this->start_controls_section(
			'section_style_box',
			[
				'label' => esc_html__( 'Item', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'text_align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				],
				'selectors' => [ '{{WRAPPER}} .refraction-post' => 'text-align: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'item_background',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-post' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'item_padding',
			[
				'label' => esc_html__( 'Content padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-post__body' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => 'item_border',
				'selector' => '{{WRAPPER}} .refraction-post',
			]
		);

		$this->add_responsive_control(
			'item_radius',
			[
				'label' => esc_html__( 'Border radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%' ],
				'selectors' => [ '{{WRAPPER}} .refraction-post' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}; overflow: hidden;' ],
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => 'item_shadow',
				'selector' => '{{WRAPPER}} .refraction-post',
			]
		);

		$this->end_controls_section();

		$sections = [
			'title' => [ esc_html__( 'Title', 'refraction' ), '{{WRAPPER}} .refraction-post__title, {{WRAPPER}} .refraction-post__title a', 'show_title' ],
			'meta' => [ esc_html__( 'Meta', 'refraction' ), '{{WRAPPER}} .refraction-post__meta, {{WRAPPER}} .refraction-post__meta a', '' ],
			'excerpt' => [ esc_html__( 'Excerpt', 'refraction' ), '{{WRAPPER}} .refraction-post__excerpt', 'show_excerpt' ],
			'read_more' => [ esc_html__( 'Read more', 'refraction' ), '{{WRAPPER}} .refraction-post__read-more', 'show_read_more' ],
		];

		foreach ( $sections as $key => [ $label, $selector, $condition ] ) {
			$args = [
				'label' => $label,
				'tab' => Controls_Manager::TAB_STYLE,
			];

			if ( $condition ) {
				$args['condition'] = [ $condition => 'yes' ];
			}

			$this->start_controls_section( 'section_style_' . $key, $args );

			$this->add_control(
				$key . '_color',
				[
					'label' => esc_html__( 'Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $selector => 'color: {{VALUE}};' ],
				]
			);

			$this->add_group_control(
				Group_Control_Typography::get_type(),
				[
					'name' => $key . '_typography',
					'selector' => $selector,
				]
			);

			$this->add_responsive_control(
				$key . '_spacing',
				[
					'label' => esc_html__( 'Space below', 'refraction' ),
					'type' => Controls_Manager::SLIDER,
					'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ],
					'selectors' => [ str_replace( ', {{WRAPPER}} .refraction-post__title a', '', explode( ',', $selector )[0] ) => 'margin-bottom: {{SIZE}}{{UNIT}};' ],
				]
			);

			$this->end_controls_section();
		}
	}

	protected function render_item( \WP_Post $post, array $settings, int $index, array $opts ): string {
		return (string) $this->with_post( $post, fn() => $this->build_item( $post, $settings ) );
	}

	private function build_item( \WP_Post $post, array $settings ): string {
		$skin = (string) ( $settings['skin'] ?? 'classic' );
		$link = get_permalink( $post );
		$html = '<article class="' . esc_attr( implode( ' ', get_post_class( [ 'refraction-post', 'refraction-post--' . $skin ], $post ) ) ) . '">';

		if ( 'full_content' === $skin ) {
			$html .= '<div class="refraction-post__body">' . $this->build_title( $post, $settings, $link ) . $this->build_meta( $post, $settings );

			if ( self::$content_depth < 2 ) {
				++self::$content_depth;
				$html .= '<div class="refraction-post__content">' . apply_filters( 'the_content', $post->post_content ) . '</div>'; // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals
				--self::$content_depth;
			}

			return $html . '</div></article>';
		}

		if ( 'yes' === ( $settings['show_image'] ?? '' ) ) {
			$image = $this->get_thumbnail_html( $post, (string) ( $settings['image_size'] ?? 'medium_large' ) );

			if ( '' !== $image ) {
				$html .= '<a class="refraction-post__image" href="' . esc_url( $link ) . '" tabindex="-1" aria-hidden="true">' . $image . '</a>';
			}
		}

		$html .= '<div class="refraction-post__body">' . $this->build_title( $post, $settings, $link ) . $this->build_meta( $post, $settings );

		if ( 'yes' === ( $settings['show_excerpt'] ?? '' ) ) {
			$excerpt = '' !== trim( $post->post_excerpt ) ? $post->post_excerpt : $post->post_content;
			$excerpt = wp_trim_words( strip_shortcodes( wp_strip_all_tags( $excerpt ) ), max( 1, (int) ( $settings['excerpt_length'] ?? 25 ) ), '&hellip;' );

			if ( '' !== $excerpt ) {
				$html .= '<div class="refraction-post__excerpt">' . wp_kses_post( $excerpt ) . '</div>';
			}
		}

		if ( 'yes' === ( $settings['show_read_more'] ?? '' ) ) {
			$html .= '<a class="refraction-post__read-more" href="' . esc_url( $link ) . '">' . wp_kses_post( (string) ( $settings['read_more_text'] ?? '' ) ) . '<span class="screen-reader-text"> ' . esc_html( get_the_title( $post ) ) . '</span></a>';
		}

		return $html . '</div></article>';
	}

	private function build_title( \WP_Post $post, array $settings, string $link ): string {
		if ( 'yes' !== ( $settings['show_title'] ?? 'yes' ) ) {
			return '';
		}

		$tag = in_array( $settings['title_tag'] ?? 'h3', [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p' ], true ) ? $settings['title_tag'] : 'h3';

		return '<' . $tag . ' class="refraction-post__title"><a href="' . esc_url( $link ) . '">' . wp_kses_post( get_the_title( $post ) ) . '</a></' . $tag . '>';
	}

	private function build_meta( \WP_Post $post, array $settings ): string {
		$parts = [];

		foreach ( (array) ( $settings['meta_items'] ?? [] ) as $item ) {
			switch ( $item ) {
				case 'author':
					$parts[] = '<span class="refraction-post__meta-author">' . esc_html( get_the_author_meta( 'display_name', (int) $post->post_author ) ) . '</span>';
					break;
				case 'date':
					$parts[] = '<time class="refraction-post__meta-date" datetime="' . esc_attr( get_the_date( 'c', $post ) ) . '">' . esc_html( get_the_date( '', $post ) ) . '</time>';
					break;
				case 'comments':
					/* translators: %s: number of comments. */
					$parts[] = '<span class="refraction-post__meta-comments">' . esc_html( sprintf( _n( '%s comment', '%s comments', (int) get_comments_number( $post ), 'refraction' ), number_format_i18n( (int) get_comments_number( $post ) ) ) ) . '</span>';
					break;
				case 'terms':
					$terms = get_the_terms( $post, 'category' );

					if ( is_array( $terms ) && $terms ) {
						$parts[] = '<span class="refraction-post__meta-terms">' . esc_html( implode( ', ', wp_list_pluck( $terms, 'name' ) ) ) . '</span>';
					}
					break;
			}
		}

		if ( ! $parts ) {
			return '';
		}

		$separator = '<span class="refraction-post__meta-sep" aria-hidden="true">' . esc_html( (string) ( $settings['meta_separator'] ?? '' ) ) . '</span>';

		return '<div class="refraction-post__meta">' . implode( $separator, $parts ) . '</div>';
	}
}
