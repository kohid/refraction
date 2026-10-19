<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Post Info: author, date, time, comments, terms or your own text, as an inline or vertical list.
 */
class Post_Info extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-post-info';
	}

	public function get_title() {
		return esc_html__( 'Post Info', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-post-info';
	}

	public function get_keywords() {
		return [ 'post', 'info', 'meta', 'author', 'date', 'time', 'comments', 'terms', 'categories' ];
	}

	protected function is_template_only(): bool {
		return true;
	}

	private function get_taxonomy_options(): array {
		$options = [];

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			if ( 'post_format' !== $taxonomy->name ) {
				$options[ $taxonomy->name ] = $taxonomy->labels->name;
			}
		}

		return $options;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Post Info', 'refraction' ),
			]
		);

		$repeater = new Repeater();

		$repeater->add_control(
			'type',
			[
				'label' => esc_html__( 'Type', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'author' => esc_html__( 'Author', 'refraction' ),
					'date' => esc_html__( 'Date', 'refraction' ),
					'time' => esc_html__( 'Time', 'refraction' ),
					'comments' => esc_html__( 'Comments', 'refraction' ),
					'terms' => esc_html__( 'Terms', 'refraction' ),
					'custom' => esc_html__( 'Custom', 'refraction' ),
				],
				'default' => 'author',
			]
		);

		$repeater->add_control(
			'date_format',
			[
				'label' => esc_html__( 'Date Format', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'default' => esc_html__( 'Site default', 'refraction' ),
					'F j, Y' => gmdate( 'F j, Y' ),
					'Y-m-d' => gmdate( 'Y-m-d' ),
					'm/d/Y' => gmdate( 'm/d/Y' ),
					'd/m/Y' => gmdate( 'd/m/Y' ),
					'custom' => esc_html__( 'Custom', 'refraction' ),
				],
				'default' => 'default',
				'condition' => [ 'type' => 'date' ],
			]
		);

		$repeater->add_control(
			'time_format',
			[
				'label' => esc_html__( 'Time Format', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'default' => esc_html__( 'Site default', 'refraction' ),
					'g:i a' => gmdate( 'g:i a' ),
					'g:i A' => gmdate( 'g:i A' ),
					'H:i' => gmdate( 'H:i' ),
					'custom' => esc_html__( 'Custom', 'refraction' ),
				],
				'default' => 'default',
				'condition' => [ 'type' => 'time' ],
			]
		);

		$repeater->add_control(
			'custom_format',
			[
				'label' => esc_html__( 'Custom Format', 'refraction' ),
				'description' => esc_html__( 'A PHP date format, for example j M Y.', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '',
				'condition' => [
					'type' => [ 'date', 'time' ],
				],
			]
		);

		$repeater->add_control(
			'taxonomy',
			[
				'label' => esc_html__( 'Taxonomy', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->get_taxonomy_options(),
				'default' => 'category',
				'condition' => [ 'type' => 'terms' ],
			]
		);

		$repeater->add_control(
			'show_avatar',
			[
				'label' => esc_html__( 'Avatar', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
				'condition' => [ 'type' => 'author' ],
			]
		);

		$repeater->add_control(
			'custom_text',
			[
				'label' => esc_html__( 'Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '',
				'condition' => [ 'type' => 'custom' ],
			]
		);

		$repeater->add_control(
			'custom_url',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'condition' => [ 'type' => 'custom' ],
			]
		);

		$repeater->add_control(
			'link',
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'condition' => [ 'type' => [ 'author', 'date', 'comments', 'terms' ] ],
			]
		);

		$repeater->add_control(
			'prefix',
			[
				'label' => esc_html__( 'Text before', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => '',
			]
		);

		$repeater->add_control(
			'selected_icon',
			[
				'label' => esc_html__( 'Icon', 'refraction' ),
				'type' => Controls_Manager::ICONS,
				'skin' => 'inline',
				'label_block' => false,
			]
		);

		$this->add_control(
			'items',
			[
				'label' => esc_html__( 'Items', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[ 'type' => 'author' ],
					[ 'type' => 'date' ],
					[ 'type' => 'terms' ],
					[ 'type' => 'comments' ],
				],
				'title_field' => '{{{ type }}}',
			]
		);

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'inline' => esc_html__( 'Inline', 'refraction' ),
					'list' => esc_html__( 'Vertical list', 'refraction' ),
				],
				'default' => 'inline',
				'prefix_class' => 'refraction-theme-info--',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			[
				'label' => esc_html__( 'List', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'space_between',
			[
				'label' => esc_html__( 'Space Between', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'custom' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-info' => 'gap: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'flex-start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'flex-end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-info' => 'justify-content: {{VALUE}}; align-items: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'divider',
			[
				'label' => esc_html__( 'Divider', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
				'prefix_class' => 'refraction-theme-info--divider-',
				'return_value' => 'yes',
			]
		);

		$this->add_control(
			'divider_color',
			[
				'label' => esc_html__( 'Divider Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-info__item + .refraction-theme-info__item::before' => 'border-color: {{VALUE}};',
				],
				'condition' => [ 'divider' => 'yes' ],
			]
		);

		$this->add_control(
			'text_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-info__item, {{WRAPPER}} .refraction-theme-info__item a' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'link_hover_color',
			[
				'label' => esc_html__( 'Link Hover Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-info__item a:hover' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'typography',
				'selector' => '{{WRAPPER}} .refraction-theme-info__item',
			]
		);

		$this->add_control(
			'icon_color',
			[
				'label' => esc_html__( 'Icon Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-info__icon' => 'color: {{VALUE}}; fill: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'icon_size',
			[
				'label' => esc_html__( 'Icon Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'custom' ],
				'range' => [ 'px' => [ 'min' => 6, 'max' => 60 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-info__icon' => 'font-size: {{SIZE}}{{UNIT}};',
					'{{WRAPPER}} .refraction-theme-info__icon svg' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();
	}

	/** Date or time format for an item: the site default or a chosen / custom PHP format. */
	private function resolve_format( array $item, string $key, string $site_option ): string {
		$choice = $item[ $key ] ?? 'default';

		if ( 'custom' === $choice ) {
			return '' !== trim( (string) ( $item['custom_format'] ?? '' ) ) ? (string) $item['custom_format'] : (string) get_option( $site_option );
		}

		return 'default' === $choice ? (string) get_option( $site_option ) : (string) $choice;
	}

	/** Safe HTML of one item, or an empty string when it has nothing to show. */
	private function render_item( array $item, \WP_Post $post ): string {
		$link = 'yes' === ( $item['link'] ?? 'yes' );

		switch ( $item['type'] ?? '' ) {
			case 'author':
				$name = (string) get_the_author_meta( 'display_name', (int) $post->post_author );

				if ( '' === $name ) {
					return '';
				}

				$html = esc_html( $name );

				if ( 'yes' === ( $item['show_avatar'] ?? '' ) ) {
					$html = get_avatar( (int) $post->post_author, 24, '', '', [ 'class' => 'refraction-theme-info__avatar' ] ) . $html;
				}

				return $link ? '<a href="' . esc_url( get_author_posts_url( (int) $post->post_author ) ) . '">' . $html . '</a>' : $html;

			case 'date':
				$text = get_the_date( $this->resolve_format( $item, 'date_format', 'date_format' ), $post );

				return $link ? '<a href="' . esc_url( get_day_link( (int) get_the_date( 'Y', $post ), (int) get_the_date( 'n', $post ), (int) get_the_date( 'j', $post ) ) ) . '">' . esc_html( $text ) . '</a>' : esc_html( $text );

			case 'time':
				return esc_html( get_the_time( $this->resolve_format( $item, 'time_format', 'time_format' ), $post ) );

			case 'comments':
				$count = (int) get_comments_number( $post );
				/* translators: %s: number of comments. */
				$text = 0 === $count ? __( 'No comments', 'refraction' ) : sprintf( _n( '%s comment', '%s comments', $count, 'refraction' ), number_format_i18n( $count ) );

				return $link ? '<a href="' . esc_url( get_comments_link( $post ) ) . '">' . esc_html( $text ) . '</a>' : esc_html( $text );

			case 'terms':
				$taxonomy = (string) ( $item['taxonomy'] ?? 'category' );
				$terms = taxonomy_exists( $taxonomy ) ? get_the_terms( $post, $taxonomy ) : [];

				if ( ! $terms || is_wp_error( $terms ) ) {
					return '';
				}

				$parts = [];

				foreach ( $terms as $term ) {
					$parts[] = $link ? '<a href="' . esc_url( (string) get_term_link( $term ) ) . '">' . esc_html( $term->name ) . '</a>' : esc_html( $term->name );
				}

				return implode( ', ', $parts );

			case 'custom':
				$text = (string) ( $item['custom_text'] ?? '' );

				if ( '' === $text ) {
					return '';
				}

				$url = (string) ( $item['custom_url']['url'] ?? '' );

				return $url ? '<a href="' . esc_url( $url ) . '">' . esc_html( $text ) . '</a>' : esc_html( $text );
		}

		return '';
	}

	protected function render() {
		$post = get_post();
		$items = (array) $this->get_settings_for_display( 'items' );

		if ( ! $post || ! $items ) {
			$this->print_editor_hint( __( 'There is no post to show information about.', 'refraction' ) );

			return;
		}

		$rows = [];

		foreach ( $items as $item ) {
			$html = $this->render_item( (array) $item, $post );

			if ( '' === $html ) {
				continue;
			}

			$icon = '';

			if ( ! empty( $item['selected_icon']['value'] ) ) {
				ob_start();
				Icons_Manager::render_icon( $item['selected_icon'], [ 'aria-hidden' => 'true' ] );
				$icon = '<span class="refraction-theme-info__icon">' . ob_get_clean() . '</span>';
			}

			$prefix = '' !== (string) ( $item['prefix'] ?? '' ) ? '<span class="refraction-theme-info__prefix">' . esc_html( $item['prefix'] ) . '</span> ' : '';

			$rows[] = '<li class="refraction-theme-info__item refraction-theme-info__item--' . esc_attr( (string) $item['type'] ) . '">' . $icon . $prefix . '<span class="refraction-theme-info__text">' . $html . '</span></li>';
		}

		if ( ! $rows ) {
			$this->print_editor_hint( __( 'None of the chosen items has anything to show for this post.', 'refraction' ) );

			return;
		}

		// Every part was escaped where it was built; the icon markup comes from the Icons manager.
		echo '<ul class="refraction-theme-info">' . implode( '', $rows ) . '</ul>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
