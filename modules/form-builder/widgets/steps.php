<?php
namespace Refraction\Modules\FormBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Icons_Manager;
use Refraction\Modules\FormBuilder\Base\Field_Settings;
use Refraction\Modules\FormBuilder\Classes\Editor_Forms;
use Refraction\Modules\FormBuilder\Classes\Form_Buttons;
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

	/**
	 * Back or Next of this widget, wherever the script puts it: by the class `rfb-from-<widget id>` it adds, repeated so
	 * the Style tab wins over the form's own button look and the theme's.
	 */
	private static function button( string $which ): string {
		return '.rfb-btn.rfb-' . $which . '.rfb-' . $which . '.rfb-from-{{ID}}.rfb-from-{{ID}}.rfb-from-{{ID}}';
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_steps', [ 'label' => esc_html__( 'Steps', 'refraction' ) ] );
		$step = new Repeater();
		$step->add_control( 'step_title', [ 'label' => esc_html__( 'Step title', 'refraction' ), 'type' => Controls_Manager::TEXT, 'default' => esc_html__( 'Step', 'refraction' ), 'label_block' => true ] );
		$step->add_control( 'step_description', [ 'label' => esc_html__( 'Description', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true ] );
		$step->add_control( 'step_icon', [ 'label' => esc_html__( 'Icon', 'refraction' ), 'type' => Controls_Manager::ICONS, 'skin' => 'inline', 'label_block' => false, 'exclude_inline_options' => [ 'svg' ], 'description' => esc_html__( 'Shown by the Accordion layout.', 'refraction' ) ] );
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

		// How the steps are laid out and how the progress shows (0.98.0).
		$this->start_controls_section( 'section_step_layout', [ 'label' => esc_html__( 'Layout and progress', 'refraction' ) ] );
		$this->add_control( 'step_layout', [
			'label' => esc_html__( 'Layout', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'top',
			'options' => [
				'top' => esc_html__( 'Progress on top', 'refraction' ),
				'sidebar' => esc_html__( 'Steps in a sidebar', 'refraction' ),
				'accordion' => esc_html__( 'Accordion: one section per step', 'refraction' ),
			],
			'description' => esc_html__( 'Sidebar: the list of steps beside the form (a row on phones). Accordion: each step a section with its status; the current one is open.', 'refraction' ),
		] );
		$this->add_control( 'step_progress', [
			'label' => esc_html__( 'Progress', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'As in the form settings', 'refraction' ),
				'connected' => esc_html__( 'Circles joined by a line, with ticks', 'refraction' ),
				'steps' => esc_html__( 'Numbered steps', 'refraction' ),
				'bar_percent' => esc_html__( 'Bar with the percentage under it', 'refraction' ),
				'slider' => esc_html__( 'Bar with a knob and a percentage bubble', 'refraction' ),
				'segments' => esc_html__( 'Segments', 'refraction' ),
				'ring' => esc_html__( 'Ring: 2 of 5, with the step and the next one', 'refraction' ),
				'dots' => esc_html__( 'Ring of dots with the percentage', 'refraction' ),
				'chevrons' => esc_html__( 'Arrows', 'refraction' ),
				'bar_label' => esc_html__( 'Bar with the percentage and the step name', 'refraction' ),
				'bar' => esc_html__( 'Plain bar', 'refraction' ),
				'none' => esc_html__( 'None', 'refraction' ),
			],
			'condition' => [ 'step_layout!' => 'accordion' ],
		] );
		$this->add_control( 'step_counter', [
			'label' => esc_html__( 'Show "Step 1/6" above each step', 'refraction' ),
			'type' => Controls_Manager::SWITCHER,
			'condition' => [ 'step_layout!' => 'accordion' ],
		] );
		$this->add_control( 'side_heading', [
			'label' => esc_html__( 'Sidebar heading', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
			'placeholder' => esc_html__( 'Set up your booking', 'refraction' ),
			'condition' => [ 'step_layout' => 'sidebar' ],
		] );
		$this->end_controls_section();

		// Back and Next: icons and hover animations (0.97.0), then the rest of the Button widget's settings (0.99.0). The
		// script builds them, wherever the form puts them: the Style tab reaches them by a class naming this widget.
		$this->start_controls_section( 'section_step_buttons', [ 'label' => esc_html__( 'Back and Next buttons', 'refraction' ) ] );
		$this->add_responsive_control( 'nav_align', [
			'label' => esc_html__( 'Position', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'flex-start' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'flex-end' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
				'space-between' => [ 'title' => esc_html__( 'Space between', 'refraction' ), 'icon' => 'rficon-h-align-stretch' ],
			],
			'description' => esc_html__( 'Where Back and Next sit in their row, when they have a row of their own.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rfb-step-nav' => 'display: flex; flex-wrap: wrap; justify-content: {{VALUE}};' ],
		] );

		foreach ( [ 'back' => [ esc_html__( 'Back', 'refraction' ), 'left' ], 'next' => [ esc_html__( 'Next', 'refraction' ), 'right' ] ] as $which => $spec ) {
			$this->add_control( $which . '_heading_text', [ 'label' => $spec[0], 'type' => Controls_Manager::HEADING, 'separator' => 'before', 'classes' => 'rf-panel-category' ] );
			$this->add_control( $which . '_text', [
				'label' => esc_html__( 'Text', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => $spec[0],
				'description' => esc_html__( 'Empty: the text in the form settings (the cog).', 'refraction' ),
			] );
			Form_Buttons::controls( $this, $which, self::button( $which ), [ 'position' => $spec[1] ] );
		}

		$this->end_controls_section();

		$this->start_controls_section( 'section_style_steps', [ 'label' => esc_html__( 'Step titles', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'step_title_color', [ 'label' => esc_html__( 'Title color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rfb-step-title' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'step_title_typography', 'selector' => '{{WRAPPER}} .rfb-step-title' ] );
		$this->add_responsive_control( 'step_gap', [ 'label' => esc_html__( 'Space under the title', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 60 ] ], 'selectors' => [ '{{WRAPPER}} .rfb-step-head' => 'margin-bottom: {{SIZE}}{{UNIT}};' ] ] );
		$this->end_controls_section();

		// Progress, sidebar and accordion colors (0.98.0), as variables the script's markup reads.
		$this->start_controls_section( 'section_style_progress', [ 'label' => esc_html__( 'Progress, sidebar and accordion', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$var = static fn( string $name ): array => [ '{{WRAPPER}}' => $name . ': {{VALUE}};' ];
		$this->add_control( 'pg_active', [ 'label' => esc_html__( 'Done and current color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-pg-active' ) ] );
		$this->add_control( 'pg_track', [ 'label' => esc_html__( 'Still to do color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-pg-track' ) ] );
		$this->add_control( 'pg_text', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-pg-text' ) ] );
		$this->add_control( 'side_bg', [ 'label' => esc_html__( 'Sidebar background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => $var( '--rfb-side-bg' ), 'condition' => [ 'step_layout' => 'sidebar' ] ] );
		$this->add_responsive_control( 'side_width', [
			'label' => esc_html__( 'Sidebar width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', '%' ],
			'range' => [ 'px' => [ 'min' => 160, 'max' => 480 ], '%' => [ 'min' => 15, 'max' => 50 ] ],
			'selectors' => [ '{{WRAPPER}}' => '--rfb-side-w: {{SIZE}}{{UNIT}};' ],
			'condition' => [ 'step_layout' => 'sidebar' ],
		] );
		$this->add_control( 'acc_done', [ 'label' => esc_html__( 'Completed color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => $var( '--rfb-acc-done' ), 'condition' => [ 'step_layout' => 'accordion' ] ] );
		$this->add_control( 'acc_now', [ 'label' => esc_html__( 'In progress color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => $var( '--rfb-acc-now' ), 'condition' => [ 'step_layout' => 'accordion' ] ] );
		$this->end_controls_section();

		// The Button widget's Style tab for Back and for Next (0.99.0).
		$this->start_controls_section( 'section_style_back', [ 'label' => esc_html__( 'Back button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		Form_Buttons::style_controls( $this, 'back', self::button( 'back' ) );
		$this->end_controls_section();
		$this->start_controls_section( 'section_style_next', [ 'label' => esc_html__( 'Next button', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		Form_Buttons::style_controls( $this, 'next', self::button( 'next' ) );
		$this->end_controls_section();
	}

	protected function render() {
		$steps = array_values( (array) $this->get_settings_for_display( 'steps' ) );

		// The script builds Back and Next: it takes their icons, places and animations from here.
		$settings = $this->get_settings_for_display();
		$buttons = '';

		foreach ( [ 'back', 'next' ] as $which ) {
			$buttons .= ' data-rfb-' . $which . '-icon="' . esc_attr( Form_Buttons::icon( $settings, $which ) ) . '"';
			$buttons .= ' data-rfb-' . $which . '-place="' . esc_attr( 'right' === ( $settings[ $which . '_icon_position' ] ?? ( 'next' === $which ? 'right' : 'left' ) ) ? 'right' : 'left' ) . '"';
			$buttons .= ' data-rfb-' . $which . '-class="' . esc_attr( trim( 'rfb-from-' . $this->get_id() . Form_Buttons::classes( $settings, $which ) ) ) . '"';
			$text = trim( (string) ( $settings[ $which . '_text' ] ?? '' ) );
			$buttons .= '' !== $text ? ' data-rfb-' . $which . '-text="' . esc_attr( $text ) . '"' : '';
			$id = sanitize_html_class( (string) ( $settings[ $which . '_css_id' ] ?? '' ) );
			$buttons .= '' !== $id ? ' data-rfb-' . $which . '-id="' . esc_attr( $id ) . '"' : '';
		}

		// Layout and progress (0.98.0), read by the script.
		$layout = in_array( $settings['step_layout'] ?? 'top', [ 'top', 'sidebar', 'accordion' ], true ) ? $settings['step_layout'] : 'top';
		$buttons .= ' data-rfb-layout="' . esc_attr( $layout ) . '"';
		$buttons .= '' !== (string) ( $settings['step_progress'] ?? '' ) ? ' data-rfb-progress-style="' . esc_attr( sanitize_key( $settings['step_progress'] ) ) . '"' : '';
		$buttons .= 'yes' === ( $settings['step_counter'] ?? '' ) ? ' data-rfb-counter' : '';
		$buttons .= '' !== trim( (string) ( $settings['side_heading'] ?? '' ) ) ? ' data-rfb-side-heading="' . esc_attr( $settings['side_heading'] ) . '"' : '';

		echo '<div class="rfb-steps rfb-layout-' . esc_attr( $layout ) . '" data-rfb-steps' . $buttons . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped above.

		foreach ( $steps as $i => $step ) {
			$title = (string) ( $step['step_title'] ?? '' );
			$description = (string) ( $step['step_description'] ?? '' );
			$icon = ! empty( $step['step_icon']['value'] ) ? (string) Icons_Manager::try_get_icon_html( $step['step_icon'], [ 'aria-hidden' => 'true' ] ) : '';
			echo '<section class="rfb-step" data-rfb-step data-rfb-title="' . esc_attr( $title ) . '" data-rfb-description="' . esc_attr( $description ) . '" data-rfb-icon="' . esc_attr( $icon ) . '"><div class="rfb-step-head rfb-t-step"><h3 class="rfb-step-title">' . esc_html( $title ) . '</h3>' . ( '' !== $description ? '<p class="rfb-description">' . esc_html( $description ) . '</p>' : '' ) . '</div>';
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
