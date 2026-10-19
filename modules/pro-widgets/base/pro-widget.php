<?php
namespace Refraction\Modules\ProWidgets\Base;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Background;
use Refraction\Group_Control_Border;
use Refraction\Group_Control_Box_Shadow;
use Refraction\Group_Control_Typography;
use Refraction\Modules\ProWidgets\Module;
use Refraction\Utils;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Shared plumbing for the widgets in the "Advanced" category: category, wrapper, and small helpers that
 * keep every widget's controls consistent (style sections, text/box/button styling, button output).
 */
abstract class Pro_Widget extends Widget_Base {

	public function get_categories() {
		return [ Module::CATEGORY ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function is_dynamic_content(): bool {
		return false;
	}

	/* -------------------------------------------------------------- sections */

	protected function content_section( string $id, string $label, array $condition = [] ): void {
		$args = [
			'label' => $label,
			'tab' => Controls_Manager::TAB_CONTENT,
		];
		if ( $condition ) {
			$args['condition'] = $condition;
		}
		$this->start_controls_section( $id, $args );
	}

	protected function style_section( string $id, string $label, array $condition = [] ): void {
		$args = [
			'label' => $label,
			'tab' => Controls_Manager::TAB_STYLE,
		];
		if ( $condition ) {
			$args['condition'] = $condition;
		}
		$this->start_controls_section( $id, $args );
	}

	protected function end_section(): void {
		$this->end_controls_section();
	}

	/* ------------------------------------------------------- style helpers */

	/**
	 * Color + typography for one text element.
	 */
	protected function text_style( string $prefix, string $selector, array $condition = [] ): void {
		$this->add_control(
			$prefix . '_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ $selector => 'color: {{VALUE}};' ],
				'condition' => $condition,
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => $prefix . '_typography',
				'selector' => $selector,
				'condition' => $condition,
			]
		);
	}

	/**
	 * Background, border, radius, padding and shadow for a box.
	 */
	protected function box_style( string $prefix, string $selector, array $condition = [] ): void {
		$this->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name' => $prefix . '_background',
				'types' => [ 'classic', 'gradient' ],
				'selector' => $selector,
				'condition' => $condition,
			]
		);

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => $prefix . '_border',
				'selector' => $selector,
				'condition' => $condition,
			]
		);

		$this->add_responsive_control(
			$prefix . '_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem' ],
				'selectors' => [ $selector => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'condition' => $condition,
			]
		);

		$this->add_responsive_control(
			$prefix . '_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem' ],
				'selectors' => [ $selector => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'condition' => $condition,
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => $prefix . '_shadow',
				'selector' => $selector,
				'condition' => $condition,
			]
		);
	}

	protected function align_control( string $name, string $selector, array $condition = [], string $label = '' ): void {
		$this->add_responsive_control(
			$name,
			[
				'label' => $label ? $label : esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'left' => [
						'title' => esc_html__( 'Left', 'refraction' ),
						'icon' => 'rficon-text-align-left',
					],
					'center' => [
						'title' => esc_html__( 'Center', 'refraction' ),
						'icon' => 'rficon-text-align-center',
					],
					'right' => [
						'title' => esc_html__( 'Right', 'refraction' ),
						'icon' => 'rficon-text-align-right',
					],
				],
				'selectors' => [ $selector => 'text-align: {{VALUE}};' ],
				'condition' => $condition,
			]
		);
	}

	protected function space_control( string $name, string $label, string $selector, string $property = 'margin-bottom', array $condition = [], array $range_max = [ 'px' => [ 'max' => 100 ] ] ): void {
		$this->add_responsive_control(
			$name,
			[
				'label' => $label,
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em', 'rem' ],
				'range' => $range_max,
				'selectors' => [ $selector => $property . ': {{SIZE}}{{UNIT}};' ],
				'condition' => $condition,
			]
		);
	}

	/* --------------------------------------------------------------- buttons */

	/**
	 * Content controls of a button: text + link.
	 */
	protected function button_content_controls( string $prefix, string $default_text, array $condition = [] ): void {
		$this->add_control(
			$prefix . '_text',
			[
				'label' => esc_html__( 'Button Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => $default_text,
				'dynamic' => [ 'active' => true ],
				'label_block' => true,
				'condition' => $condition,
			]
		);

		$this->add_control(
			$prefix . '_link',
			[
				'label' => esc_html__( 'Button Link', 'refraction' ),
				'type' => Controls_Manager::URL,
				'dynamic' => [ 'active' => true ],
				'placeholder' => esc_html__( 'https://your-link.com', 'refraction' ),
				'default' => [ 'url' => '#' ],
				'condition' => $condition,
			]
		);
	}

	/**
	 * Style controls of a button: typography, normal/hover colors, border, radius, padding, shadow.
	 */
	protected function button_style_controls( string $prefix, string $selector, array $condition = [] ): void {
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => $prefix . '_typography',
				'selector' => $selector,
				'condition' => $condition,
			]
		);

		$this->start_controls_tabs( $prefix . '_tabs', [ 'condition' => $condition ] );

		foreach ( [
			'normal' => [ esc_html__( 'Normal', 'refraction' ), '' ],
			'hover' => [ esc_html__( 'Hover', 'refraction' ), ':hover, ' . $selector . ':focus' ],
		] as $state => $info ) {
			$this->start_controls_tab( $prefix . '_tab_' . $state, [ 'label' => $info[0] ] );

			$this->add_control(
				$prefix . '_text_color_' . $state,
				[
					'label' => esc_html__( 'Text Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $selector . $info[1] => 'color: {{VALUE}};' ],
				]
			);

			$this->add_group_control(
				Group_Control_Background::get_type(),
				[
					'name' => $prefix . '_bg_' . $state,
					'types' => [ 'classic', 'gradient' ],
					'exclude' => [ 'image' ],
					'selector' => $selector . $info[1],
				]
			);

			$this->add_control(
				$prefix . '_border_color_' . $state,
				[
					'label' => esc_html__( 'Border Color', 'refraction' ),
					'type' => Controls_Manager::COLOR,
					'selectors' => [ $selector . $info[1] => 'border-color: {{VALUE}};' ],
				]
			);

			$this->end_controls_tab();
		}

		$this->end_controls_tabs();

		$this->add_group_control(
			Group_Control_Border::get_type(),
			[
				'name' => $prefix . '_border',
				'selector' => $selector,
				'condition' => $condition,
			]
		);

		$this->add_responsive_control(
			$prefix . '_radius',
			[
				'label' => esc_html__( 'Border Radius', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem' ],
				'selectors' => [ $selector => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'condition' => $condition,
			]
		);

		$this->add_responsive_control(
			$prefix . '_padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem' ],
				'selectors' => [ $selector => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
				'condition' => $condition,
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name' => $prefix . '_shadow',
				'selector' => $selector,
				'condition' => $condition,
			]
		);
	}

	/**
	 * Print a button (an `a`, or a `span` when there is no link). Text is escaped.
	 */
	protected function render_button( array $settings, string $prefix, string $extra_class = '' ): void {
		$text = $settings[ $prefix . '_text' ] ?? '';

		if ( Utils::is_empty( $text ) ) {
			return;
		}

		$key = $prefix . '_button';
		$link = $settings[ $prefix . '_link' ] ?? [];

		$this->add_render_attribute( $key, 'class', [ 'refraction-pro-button', $extra_class ] );

		if ( ! empty( $link['url'] ) ) {
			$this->add_link_attributes( $key, $link );
			$tag = 'a';
		} else {
			$tag = 'span';
		}

		?>
		<<?php Utils::print_validated_html_tag( $tag ); ?> <?php $this->print_render_attribute_string( $key ); ?>>
			<?php echo esc_html( $text ); ?>
		</<?php Utils::print_validated_html_tag( $tag ); ?>>
		<?php
	}

	/**
	 * Heading tag options.
	 */
	protected function heading_tag_options(): array {
		return [
			'h1' => 'H1',
			'h2' => 'H2',
			'h3' => 'H3',
			'h4' => 'H4',
			'h5' => 'H5',
			'h6' => 'H6',
			'div' => 'div',
			'span' => 'span',
			'p' => 'p',
		];
	}

	/**
	 * Hint shown only inside the editor (never on the front end).
	 */
	protected function render_editor_hint( string $message ): void {
		if ( ! \Refraction\Plugin::$instance->editor->is_edit_mode() ) {
			return;
		}

		echo '<div class="refraction-pro-hint">' . esc_html( $message ) . '</div>';
	}
}
