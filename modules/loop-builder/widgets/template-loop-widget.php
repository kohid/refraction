<?php
namespace Refraction\Modules\LoopBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\LoopBuilder\Classes\Loop_Renderer;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Base of the widgets that print a Loop Item template for every post (Loop Grid, Loop Carousel).
 */
abstract class Template_Loop_Widget extends Base_Loop_Widget {

	/** The Template section: the Loop Item to print, with edit and create shortcuts. */
	protected function register_template_controls(): void {
		$this->start_controls_section(
			'section_template',
			[
				'label' => esc_html__( 'Template', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'template_id',
			[
				'label' => esc_html__( 'Loop Item template', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '',
				'options' => [ '' => esc_html__( 'Choose a template', 'refraction' ) ] + Loop_Renderer::get_template_options(),
				'label_block' => true,
			]
		);

		$this->add_control(
			'edit_template',
			[
				'type' => Controls_Manager::BUTTON,
				'text' => esc_html__( 'Edit the template', 'refraction' ),
				'event' => 'refraction:loop:edit-template',
				'condition' => [ 'template_id!' => '' ],
			]
		);

		$this->add_control(
			'create_template',
			[
				'type' => Controls_Manager::BUTTON,
				'text' => esc_html__( 'Create a template', 'refraction' ),
				'event' => 'refraction:loop:create-template',
				'description' => esc_html__( 'Creates an empty Loop Item and opens it in a new tab. Come back and pick it here.', 'refraction' ),
			]
		);

		$this->end_controls_section();
	}

	protected function render_item( \WP_Post $post, array $settings, int $index, array $opts ): string {
		$template_id = absint( $settings['template_id'] ?? 0 );

		if ( ! $template_id ) {
			return '';
		}

		return Loop_Renderer::render_item( $template_id, $post, ! empty( $opts['rest'] ) && ! empty( $opts['first'] ) );
	}

	/** In the editor an empty widget explains what to do; visitors see nothing. */
	protected function render_missing_template(): bool {
		if ( absint( $this->get_settings_for_display( 'template_id' ) ) ) {
			return false;
		}

		if ( Plugin::$instance->editor->is_edit_mode() ) {
			echo '<div class="refraction-loop-notice">' . esc_html__( 'Choose a Loop Item template in the Template section, or create one.', 'refraction' ) . '</div>';
		}

		return true;
	}
}
