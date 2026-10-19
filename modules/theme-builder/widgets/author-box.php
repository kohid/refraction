<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Author Box: avatar, name, biography and a link to the author's posts.
 */
class Author_Box extends Theme_Widget_Base {

	public function get_name() {
		return 'theme-author-box';
	}

	public function get_title() {
		return esc_html__( 'Author Box', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-user-circle-o';
	}

	public function get_keywords() {
		return [ 'author', 'user', 'biography', 'avatar', 'profile' ];
	}

	protected function is_template_only(): bool {
		return true;
	}

	private function get_user_options(): array {
		$options = [];

		foreach ( get_users( [ 'number' => 50, 'fields' => [ 'ID', 'display_name' ], 'capability' => 'edit_posts' ] ) as $user ) {
			$options[ (string) $user->ID ] = $user->display_name;
		}

		return $options;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_content',
			[
				'label' => esc_html__( 'Author Box', 'refraction' ),
			]
		);

		$this->add_control(
			'source',
			[
				'label' => esc_html__( 'Author', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'current' => esc_html__( 'Author of the current post', 'refraction' ),
					'custom' => esc_html__( 'A chosen user', 'refraction' ),
				],
				'default' => 'current',
			]
		);

		$this->add_control(
			'user',
			[
				'label' => esc_html__( 'User', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->get_user_options(),
				'condition' => [ 'source' => 'custom' ],
			]
		);

		foreach ( [
			'show_avatar' => esc_html__( 'Avatar', 'refraction' ),
			'show_name' => esc_html__( 'Name', 'refraction' ),
			'show_biography' => esc_html__( 'Biography', 'refraction' ),
			'show_link' => esc_html__( 'Archive button', 'refraction' ),
		] as $key => $label ) {
			$this->add_control(
				$key,
				[
					'label' => $label,
					'type' => Controls_Manager::SWITCHER,
					'default' => 'yes',
				]
			);
		}

		$this->add_control(
			'link_text',
			[
				'label' => esc_html__( 'Button text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'All posts', 'refraction' ),
				'condition' => [ 'show_link' => 'yes' ],
			]
		);

		$this->add_control(
			'name_link',
			[
				'label' => esc_html__( 'Link name to archive', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
				'condition' => [ 'show_name' => 'yes' ],
			]
		);

		$this->add_control(
			'name_tag',
			[
				'label' => esc_html__( 'Name HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [ 'h2' => 'H2', 'h3' => 'H3', 'h4' => 'H4', 'h5' => 'H5', 'h6' => 'H6', 'div' => 'div', 'span' => 'span', 'p' => 'p' ],
				'default' => 'h4',
				'condition' => [ 'show_name' => 'yes' ],
			]
		);

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'start' => esc_html__( 'Avatar at the start', 'refraction' ),
					'end' => esc_html__( 'Avatar at the end', 'refraction' ),
					'top' => esc_html__( 'Avatar above', 'refraction' ),
				],
				'default' => 'start',
				'prefix_class' => 'refraction-theme-author--',
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_box',
			[
				'label' => esc_html__( 'Box', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'gap',
			[
				'label' => esc_html__( 'Space between', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'custom' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-author' => 'gap: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'box_background',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-author' => 'background-color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'box_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em', '%', 'custom' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-author' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'avatar_size',
			[
				'label' => esc_html__( 'Avatar Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'custom' ],
				'range' => [ 'px' => [ 'min' => 24, 'max' => 300 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-author__avatar img' => 'width: {{SIZE}}{{UNIT}}; height: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_control(
			'avatar_radius',
			[
				'label' => esc_html__( 'Avatar Border Radius', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ '%', 'px' ],
				'default' => [ 'unit' => '%', 'size' => 50 ],
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-author__avatar img' => 'border-radius: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style_text',
			[
				'label' => esc_html__( 'Text', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_control(
			'name_color',
			[
				'label' => esc_html__( 'Name Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-author__name, {{WRAPPER}} .refraction-theme-author__name a' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'name_typography',
				'selector' => '{{WRAPPER}} .refraction-theme-author__name',
			]
		);

		$this->add_control(
			'bio_color',
			[
				'label' => esc_html__( 'Biography Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-author__bio' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'bio_typography',
				'selector' => '{{WRAPPER}} .refraction-theme-author__bio',
			]
		);

		$this->add_control(
			'button_color',
			[
				'label' => esc_html__( 'Button Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-theme-author__link' => 'color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$post = get_post();
		$user_id = 'custom' === $settings['source'] ? (int) $settings['user'] : ( $post ? (int) $post->post_author : 0 );

		if ( ! $user_id ) {
			$user_id = is_author() ? (int) get_queried_object_id() : 0;
		}

		$user = $user_id ? get_userdata( $user_id ) : false;

		if ( ! $user ) {
			$this->print_editor_hint( __( 'There is no author to show.', 'refraction' ) );

			return;
		}

		$archive = get_author_posts_url( $user->ID );
		$tag = in_array( $settings['name_tag'], [ 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'p' ], true ) ? $settings['name_tag'] : 'h4';

		echo '<div class="refraction-theme-author">';

		if ( 'yes' === $settings['show_avatar'] ) {
			echo '<div class="refraction-theme-author__avatar">' . get_avatar( $user->ID, 160, '', $user->display_name ) . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Core avatar markup.
		}

		echo '<div class="refraction-theme-author__body">';

		if ( 'yes' === $settings['show_name'] ) {
			$name = esc_html( $user->display_name );
			$name = 'yes' === $settings['name_link'] ? '<a href="' . esc_url( $archive ) . '">' . $name . '</a>' : $name;

			printf( '<%1$s class="refraction-theme-author__name">%2$s</%1$s>', tag_escape( $tag ), $name ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.
		}

		$bio = (string) get_the_author_meta( 'description', $user->ID );

		if ( 'yes' === $settings['show_biography'] && '' !== trim( $bio ) ) {
			echo '<div class="refraction-theme-author__bio">' . wp_kses_post( wpautop( $bio ) ) . '</div>';
		}

		if ( 'yes' === $settings['show_link'] && '' !== trim( (string) $settings['link_text'] ) ) {
			echo '<a class="refraction-theme-author__link" href="' . esc_url( $archive ) . '">' . esc_html( $settings['link_text'] ) . '</a>';
		}

		echo '</div></div>';
	}
}
