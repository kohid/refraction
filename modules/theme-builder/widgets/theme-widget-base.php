<?php
namespace Refraction\Modules\ThemeBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Text_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ThemeBuilder\Documents\Theme_Document;
use Refraction\Plugin;
use Refraction\Utils;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Base class of the Theme Elements widgets: widgets that show data of the site or of the page being viewed.
 *
 * They are dynamic (never cached), never baked into the post content, and the ones that only make sense
 * inside a Theme Builder template are hidden from the editor panel everywhere else.
 */
abstract class Theme_Widget_Base extends Widget_Base {

	const CATEGORY = 'theme-elements';
	const STYLE_HANDLE = 'refraction-theme-elements';

	/** Whether the widget is offered in the editor panel only while editing a Theme Builder template. */
	protected function is_template_only(): bool {
		return false;
	}

	public function get_categories() {
		return [ self::CATEGORY ];
	}

	public function get_style_depends(): array {
		return [ self::STYLE_HANDLE ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	/** Dynamic data must not be written into the saved post content. */
	public function render_plain_content() {
	}

	public function show_in_panel() {
		if ( ! $this->is_template_only() ) {
			return true;
		}

		$post_id = (int) Plugin::$instance->editor->get_post_id();

		return $post_id && Plugin::$instance->documents->get( $post_id ) instanceof Theme_Document;
	}

	/** The HTML tag control. Values are validated again in tag(). */
	protected function add_html_tag_control( string $default = 'h2', string $name = 'html_tag' ): void {
		$this->add_control(
			$name,
			[
				'label' => esc_html__( 'HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => [
					'h1' => 'H1',
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
					'h5' => 'H5',
					'h6' => 'H6',
					'div' => 'div',
					'span' => 'span',
					'p' => 'p',
				],
				'default' => $default,
			]
		);
	}

	protected function tag( string $name = 'html_tag', string $default = 'div' ): string {
		$tag = (string) $this->get_settings( $name );

		return Utils::validate_html_tag( '' !== $tag ? $tag : $default );
	}

	protected function add_link_choice_control( string $name = 'link_to', bool $with_custom = true ): void {
		$options = [
			'none' => esc_html__( 'None', 'refraction' ),
			'home' => esc_html__( 'Home URL', 'refraction' ),
		];

		if ( $with_custom ) {
			$options['custom'] = esc_html__( 'Custom URL', 'refraction' );
		}

		$this->add_control(
			$name,
			[
				'label' => esc_html__( 'Link', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $options,
				'default' => 'home',
			]
		);

		if ( $with_custom ) {
			$this->add_control(
				$name . '_custom',
				[
					'label' => esc_html__( 'Link', 'refraction' ),
					'type' => Controls_Manager::URL,
					'placeholder' => esc_html__( 'https://your-link.com', 'refraction' ),
					'condition' => [ $name => 'custom' ],
				]
			);
		}
	}

	/** Open an anchor for the link choice made with add_link_choice_control(); returns the closing markup. */
	protected function open_choice_link( string $name = 'link_to', string $key = 'choice_link' ): string {
		$settings = $this->get_settings();
		$choice = $settings[ $name ] ?? 'none';

		if ( 'home' === $choice ) {
			$this->add_render_attribute( $key, 'href', esc_url( home_url( '/' ) ) );
			$this->add_render_attribute( $key, 'rel', 'home' );
		} elseif ( 'custom' === $choice && ! empty( $settings[ $name . '_custom' ]['url'] ) ) {
			$this->add_link_attributes( $key, $settings[ $name . '_custom' ] );
		} else {
			return '';
		}

		echo '<a ' . $this->get_render_attribute_string( $key ) . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Attributes are escaped by the render attribute API.

		return '</a>';
	}

	/**
	 * Alignment, typography, colour and shadow for the text a widget prints.
	 *
	 * @param string $selector CSS selector of the text, with {{WRAPPER}}.
	 */
	protected function add_text_style_section( string $section_id, string $label, string $selector, string $link_selector = '' ): void {
		$this->start_controls_section(
			$section_id,
			[
				'label' => $label,
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			$section_id . '_align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'start' => [
						'title' => esc_html__( 'Start', 'refraction' ),
						'icon' => 'rficon-text-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'rficon-text-align-center',
					],
					'end' => [
						'title' => esc_html__( 'End', 'refraction' ),
						'icon' => 'rficon-text-align-right',
					],
				],
				'classes' => 'refraction-control-start-end',
				'selectors_dictionary' => [
					'left' => is_rtl() ? 'end' : 'start',
					'right' => is_rtl() ? 'start' : 'end',
				],
				'selectors' => [
					'{{WRAPPER}}' => 'text-align: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => $section_id . '_typography',
				'selector' => $selector,
			]
		);

		$this->add_control(
			$section_id . '_color',
			[
				'label' => esc_html__( 'Text Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					$selector => 'color: {{VALUE}};',
					$selector . ' a' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			$section_id . '_hover_color',
			[
				'label' => esc_html__( 'Link Hover Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					( $link_selector ? $link_selector : $selector . ' a' ) . ':hover' => 'color: {{VALUE}};',
					( $link_selector ? $link_selector : $selector . ' a' ) . ':focus' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Text_Shadow::get_type(),
			[
				'name' => $section_id . '_shadow',
				'selector' => $selector,
			]
		);

		$this->end_controls_section();
	}

	/** Message shown in the editor when a widget has nothing to print; nothing on the live site. */
	protected function print_editor_hint( string $message ): void {
		if ( Plugin::$instance->editor->is_edit_mode() ) {
			echo '<div class="refraction-theme-elements__hint">' . esc_html( $message ) . '</div>';
		}
	}
}
