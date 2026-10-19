<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Post Navigation: links to the previous and next post.
 */
class Post_Navigation extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-post-navigation';
	}

	public function get_title() {
		return esc_html__( 'Post Navigation', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-post-navigation';
	}

	public function get_keywords() {
		return [ 'post', 'navigation', 'previous', 'next', 'pagination' ];
	}

	protected function is_template_only(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Post Navigation', 'refraction' ),
			]
		);

		$this->add_control(
			'show_label',
			[
				'label' => esc_html__( 'Label', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->add_control(
			'prev_label',
			[
				'label' => esc_html__( 'Previous Label', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Previous', 'refraction' ),
				'condition' => [ 'show_label' => 'yes' ],
			]
		);

		$this->add_control(
			'next_label',
			[
				'label' => esc_html__( 'Next Label', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Next', 'refraction' ),
				'condition' => [ 'show_label' => 'yes' ],
			]
		);

		$this->add_control(
			'show_arrow',
			[
				'label' => esc_html__( 'Arrows', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->add_control(
			'show_title',
			[
				'label' => esc_html__( 'Post Title', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->add_control(
			'in_same_term',
			[
				'label' => esc_html__( 'Same term only', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
			]
		);

		$taxonomies = [];

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			if ( 'post_format' !== $taxonomy->name ) {
				$taxonomies[ $taxonomy->name ] = $taxonomy->labels->name;
			}
		}

		$this->add_control(
			'taxonomy',
			[
				'label' => esc_html__( 'Taxonomy', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $taxonomies,
				'default' => 'category',
				'condition' => [ 'in_same_term' => 'yes' ],
			]
		);

		$this->end_controls_section();

		$this->add_text_style_section( 'section_style', esc_html__( 'Links', 'refraction' ), '{{WRAPPER}} .refraction-theme-nav__title', '{{WRAPPER}} .refraction-theme-nav a' );

		$this->start_controls_section(
			'section_style_label',
			[
				'label' => esc_html__( 'Label', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'label_color',
			[
				'label' => esc_html__( 'Label Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-nav__label, {{WRAPPER}} .refraction-theme-nav__arrow' => 'color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_section();
	}

	private function render_link( ?\WP_Post $adjacent, bool $previous ): void {
		$settings = $this->get_settings();
		$side = $previous ? 'prev' : 'next';

		echo '<div class="refraction-theme-nav__item refraction-theme-nav__item--' . esc_attr( $side ) . '">';

		if ( $adjacent ) {
			$arrow = $previous ? ( is_rtl() ? '→' : '←' ) : ( is_rtl() ? '←' : '→' );

			echo '<a href="' . esc_url( (string) get_permalink( $adjacent ) ) . '" rel="' . esc_attr( $side ) . '">';

			if ( 'yes' === $settings['show_arrow'] ) {
				echo '<span class="refraction-theme-nav__arrow" aria-hidden="true">' . esc_html( $arrow ) . '</span>';
			}

			echo '<span class="refraction-theme-nav__text">';

			if ( 'yes' === $settings['show_label'] ) {
				echo '<span class="refraction-theme-nav__label">' . esc_html( $previous ? $settings['prev_label'] : $settings['next_label'] ) . '</span>';
			}

			if ( 'yes' === $settings['show_title'] ) {
				echo '<span class="refraction-theme-nav__title">' . esc_html( get_the_title( $adjacent ) ) . '</span>';
			}

			echo '</span></a>';
		}

		echo '</div>';
	}

	protected function render() {
		$post = get_post();

		if ( ! $post ) {
			$this->print_editor_hint( __( 'There is no post to navigate from.', 'refraction' ) );

			return;
		}

		$settings = $this->get_settings();
		$same_term = 'yes' === $settings['in_same_term'];
		$taxonomy = $same_term && taxonomy_exists( (string) $settings['taxonomy'] ) ? (string) $settings['taxonomy'] : 'category';
		$previous = get_adjacent_post( $same_term, '', true, $taxonomy );
		$next = get_adjacent_post( $same_term, '', false, $taxonomy );

		if ( ! $previous && ! $next ) {
			$this->print_editor_hint( __( 'This post has no previous or next post.', 'refraction' ) );

			return;
		}

		echo '<nav class="refraction-theme-nav" aria-label="' . esc_attr__( 'Post navigation', 'refraction' ) . '">';
		$this->render_link( $previous instanceof \WP_Post ? $previous : null, true );
		$this->render_link( $next instanceof \WP_Post ? $next : null, false );
		echo '</nav>';
	}
}
