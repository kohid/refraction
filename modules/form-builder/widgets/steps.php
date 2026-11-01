<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\FormBuilder\Base\Field_Settings;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\NestedElements\Base\Widget_Nested_Base;
use Refraction\Modules\NestedElements\Controls\Control_Nested_Repeater;
use Refraction\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A multi-step form: each step is a container you fill with fields. On the site one step shows at a time with Back /
 * Next and the progress chosen in the form settings; each step is checked before the next one opens.
 */
class Steps extends Widget_Nested_Base {

	use Field_Settings;

	public function get_name() {
		return Editor_Forms::STEPS;
	}

	public function get_title() {
		return esc_html__( 'Steps', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-navigation-horizontal';
	}

	public function get_keywords() {
		return [ 'form', 'steps', 'wizard', 'multi-step', 'page' ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	protected function step_container( int $index ): array {
		/* translators: %d: Step number. */
		return [ 'elType' => 'container', 'settings' => [ '_title' => sprintf( __( 'Step %d', 'refraction' ), $index ), 'content_width' => 'full' ] ];
	}

	protected function get_default_children_elements() {
		return [ $this->step_container( 1 ), $this->step_container( 2 ) ];
	}

	protected function get_default_repeater_title_setting_key() {
		return 'step_title';
	}

	protected function get_default_children_title() {
		/* translators: %d: Step number. */
		return esc_html__( 'Step %d', 'refraction' );
	}

	protected function get_default_children_placeholder_selector() {
		return '.rfb-steps-editor';
	}

	protected function get_default_children_container_placeholder_selector() {
		return '.rfb-step-slot';
	}

	/** Each step box goes into its own slot, under the step's title, like the items of the editor's accordion. */
	protected function get_initial_config(): array {
		return array_merge( parent::get_initial_config(), [
			'support_improved_repeaters' => true,
			'target_container' => [ '.rfb-steps-editor' ],
			'node' => 'div',
			'is_interlaced' => true,
		] );
	}

	protected function content_template_single_repeater_item() {
		?>
		<div class="rfb-step-slot">
			<div class="rfb-step-head rfb-t-step"><span class="rfb-step-number">{{{ view.collection.length + 1 }}}</span><h3 class="rfb-step-title">{{{ data.step_title }}}</h3></div>
		</div>
		<?php
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_steps', [ 'label' => esc_html__( 'Steps', 'refraction' ) ] );
		$step = new Repeater();
		$step->add_control( 'step_title', [ 'label' => esc_html__( 'Step title', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Step', 'refraction' ), 'label_block' => true ] );
		$step->add_control( 'step_description', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true ] );
		$this->add_control( 'steps', [
			'label' => esc_html__( 'Steps', 'refraction' ),
			'type' => Control_Nested_Repeater::CONTROL_TYPE,
			'fields' => $step->get_controls(),
			'default' => [ [ 'step_title' => esc_html__( 'Your details', 'refraction' ) ], [ 'step_title' => esc_html__( 'Your booking', 'refraction' ) ] ],
			'title_field' => '{{{ step_title }}}',
			'button_text' => esc_html__( 'Add step', 'refraction' ),
		] );
		$this->add_control( 'steps_hint', [
			'type' => Controls_Manager::RAW_HTML,
			'raw' => esc_html__( 'Drop the fields of each step into its box. Back and Next texts and the progress display are in the form settings (the cog). Put the Submit button in the last step.', 'refraction' ),
			'content_classes' => 'refraction-descriptor',
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_style_steps', [ 'label' => esc_html__( 'Step titles', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'step_title_color', [ 'label' => esc_html__( 'Title color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-step-title' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'step_title_typography', 'selector' => '{{WRAPPER}} .rfb-step-title' ] );
		$this->add_responsive_control( 'step_gap', [ 'label' => esc_html__( 'Space under the title', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ], 'selectors' => [ '{{WRAPPER}} .rfb-step-head' => 'margin-bottom: {{SIZE}}{{UNIT}};' ] ] );
		$this->end_controls_section();
	}

	protected function render() {
		$steps = array_values( (array) $this->get_settings_for_display( 'steps' ) );

		echo '<div class="rfb-steps" data-rfb-steps>';

		foreach ( $steps as $i => $step ) {
			$title = (string) ( $step['step_title'] ?? '' );
			$description = (string) ( $step['step_description'] ?? '' );
			echo '<section class="rfb-step" data-rfb-step data-rfb-title="' . esc_attr( $title ) . '"><div class="rfb-step-head rfb-t-step"><h3 class="rfb-step-title">' . esc_html( $title ) . '</h3>' . ( '' !== $description ? '<p class="rfb-description">' . esc_html( $description ) . '</p>' : '' ) . '</div>';
			$this->print_child( $i );
			echo '</section>';
		}

		echo '</div>';
	}

	protected function content_template() {
		?>
		<div class="rfb-steps rfb-steps-editor">
			<# _.each( settings.steps, function( step, index ) { #>
			<div class="rfb-step-slot">
				<div class="rfb-step-head rfb-t-step"><span class="rfb-step-number">{{{ index + 1 }}}</span><h3 class="rfb-step-title">{{{ step.step_title }}}</h3></div>
			</div>
			<# } ); #>
		</div>
		<?php
	}
}
