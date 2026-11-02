<?php
namespace Refraction\Modules\BuildScene\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\BuildScene\Classes\Glb_File;
use Refraction\Modules\BuildScene\Module;
use Refraction\Plugin;
use Refraction\Repeater;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * 3D Build Scene: a 3D model whose parts fly in stage by stage while the visitor scrolls through the section. The
 * scene stays pinned while it builds; captions follow the stages. Works with any .glb model (parts are its meshes,
 * matched to stages by name) or the built-in sample house.
 */
class Build_Scene extends Widget_Base {

	public function get_name() {
		return 'build-scene';
	}

	public function get_title() {
		return esc_html__( '3D Build Scene', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-slider-3d';
	}

	public function get_categories() {
		return [ 'refraction-advanced' ];
	}

	public function get_keywords() {
		return [ '3d', 'model', 'glb', 'gltf', 'scroll', 'build', 'assemble', 'construction', 'three' ];
	}

	public function get_script_depends(): array {
		return [ Module::SCRIPT ];
	}

	public function get_style_depends(): array {
		return [ Module::SCRIPT ];
	}

	public function has_widget_inner_wrapper(): bool {
		return false;
	}

	/** The stages of the sample house, matched to its part names. */
	private function sample_stages(): array {
		$stage = static function ( string $title, string $text, string $parts ): array {
			return [ 'stage_title' => $title, 'stage_text' => $text, 'stage_parts' => $parts ];
		};

		return [
			$stage( esc_html__( 'Groundwork', 'refraction' ), esc_html__( 'The site is levelled and the concrete slab is poured.', 'refraction' ), 'foundation*' ),
			$stage( esc_html__( 'Structure', 'refraction' ), esc_html__( 'Steel posts, beams and rafters set the shape of the house.', 'refraction' ), 'frame*' ),
			$stage( esc_html__( 'Stone and walls', 'refraction' ), esc_html__( 'The chimney and piers go up in natural stone, then the walls close the house.', 'refraction' ), 'stone*, wall*' ),
			$stage( esc_html__( 'Roof', 'refraction' ), esc_html__( 'Slate roof and the terrace canopy keep the weather out.', 'refraction' ), 'roof*' ),
			$stage( esc_html__( 'Glass and timber', 'refraction' ), esc_html__( 'Full-height glazing and vertical timber cladding finish the facade.', 'refraction' ), 'glass*, cladding*' ),
			$stage( esc_html__( 'Terrace', 'refraction' ), esc_html__( 'The terrace is laid and the house is ready to live in.', 'refraction' ), 'terrace*, furniture*' ),
		];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_model', [ 'label' => esc_html__( 'Model', 'refraction' ) ] );
		$this->add_control( 'model_source', [
			'label' => esc_html__( 'Model', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'sample',
			'options' => [ 'sample' => esc_html__( 'Sample house', 'refraction' ), 'media' => esc_html__( 'Upload a .glb file', 'refraction' ) ],
		] );
		$this->add_control( 'model', [
			'label' => esc_html__( '3D model (.glb)', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'media_types' => [ Glb_File::MIME ],
			'condition' => [ 'model_source' => 'media' ],
			'description' => esc_html__( 'Export a .glb from Blender, SketchUp or any 3D tool. Each mesh is one part; name the meshes to group them into stages (for example roof-left, roof-right).', 'refraction' ),
		] );
		$this->add_control( 'label', [
			'label' => esc_html__( 'Description for screen readers', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => esc_html__( 'A 3D model that builds up as you scroll', 'refraction' ),
			'label_block' => true,
		] );
		$this->add_control( 'poster', [
			'label' => esc_html__( 'Still image', 'refraction' ),
			'type' => Controls_Manager::MEDIA,
			'description' => esc_html__( 'Shown when the browser can not show 3D, and on phones when you choose so below.', 'refraction' ),
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_animation', [ 'label' => esc_html__( 'Animation', 'refraction' ) ] );
		$this->add_control( 'motion', [
			'label' => esc_html__( 'Animation', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'build',
			'options' => [
				'build' => esc_html__( 'Build in stages', 'refraction' ),
				'turntable' => esc_html__( 'Turntable (turns with the scroll)', 'refraction' ),
				'drive' => esc_html__( 'Drive in (cars: rolls in, wheels turn)', 'refraction' ),
				'clip' => esc_html__( 'Play the model\'s own animation (characters)', 'refraction' ),
				'float' => esc_html__( 'Float (hovers and turns slowly)', 'refraction' ),
			],
			'description' => esc_html__( 'Every animation follows the scroll through the section; the stages below still give the captions and the progress line.', 'refraction' ),
		] );
		$this->add_control( 'turns', [
			'label' => esc_html__( 'Turns over the scroll', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.25, 'max' => 3, 'step' => 0.25 ] ],
			'default' => [ 'size' => 1 ],
			'condition' => [ 'motion' => 'turntable' ],
		] );
		$this->add_control( 'wheels', [
			'label' => esc_html__( 'Wheel parts', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'default' => '*wheel*, *tire*, *tyre*',
			'label_block' => true,
			'description' => esc_html__( 'Part names, separated by commas; * matches anything. These spin as the model rolls in.', 'refraction' ),
			'condition' => [ 'motion' => 'drive' ],
		] );
		$this->add_control( 'drive_from', [
			'label' => esc_html__( 'Comes from', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'left',
			'options' => [ 'left' => esc_html__( 'One side', 'refraction' ), 'right' => esc_html__( 'The other side', 'refraction' ) ],
			'condition' => [ 'motion' => 'drive' ],
		] );
		$this->add_control( 'clip', [
			'label' => esc_html__( 'Animation name', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => 'Walk',
			'description' => esc_html__( 'As named in the .glb file. Empty: the first animation in the file.', 'refraction' ),
			'condition' => [ 'motion' => 'clip' ],
		] );
		$this->add_control( 'clip_play', [
			'label' => esc_html__( 'Plays', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'loop',
			'options' => [ 'loop' => esc_html__( 'On its own, in a loop', 'refraction' ), 'scroll' => esc_html__( 'With the scroll', 'refraction' ) ],
			'condition' => [ 'motion' => 'clip' ],
		] );
		$this->add_control( 'clip_speed', [
			'label' => esc_html__( 'Speed', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.25, 'max' => 3, 'step' => 0.05 ] ],
			'default' => [ 'size' => 1 ],
			'condition' => [ 'motion' => 'clip', 'clip_play' => 'loop' ],
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_build', [ 'label' => esc_html__( 'Build', 'refraction' ) ] );
		$stages = new Repeater();
		$stages->add_control( 'stage_title', [ 'label' => esc_html__( 'Title', 'refraction' ), 'type' => Controls_Manager::TEXT, 'label_block' => true ] );
		$stages->add_control( 'stage_text', [ 'label' => esc_html__( 'Text', 'refraction' ), 'type' => Controls_Manager::TEXTAREA, 'rows' => 3 ] );
		$stages->add_control( 'stage_parts', [
			'label' => esc_html__( 'Parts', 'refraction' ),
			'type' => Controls_Manager::TEXT,
			'label_block' => true,
			'placeholder' => 'roof*, chimney',
			'description' => esc_html__( 'Part names, separated by commas; * matches anything. A part counts when its name or a parent\'s name matches.', 'refraction' ),
		] );
		$this->add_control( 'fill_stages', [
			'type' => Controls_Manager::BUTTON,
			'text' => esc_html__( 'Fill stages from the model', 'refraction' ),
			'event' => 'refraction:build-scene:fill',
			'description' => esc_html__( 'Reads the uploaded .glb: one stage per named group, or per material when the parts have generic names. Replaces the stages below.', 'refraction' ),
			'condition' => [ 'model_source' => 'media' ],
		] );
		$this->add_control( 'stages', [
			'label' => esc_html__( 'Stages', 'refraction' ),
			'type' => Controls_Manager::REPEATER,
			'fields' => $stages->get_controls(),
			'default' => $this->sample_stages(),
			'title_field' => '{{{ stage_title }}}',
			'description' => esc_html__( 'Parts that match no stage join the last one. With no stages, or when no part matches, the parts come one by one in the order below.', 'refraction' ),
		] );
		$this->add_control( 'order', [
			'label' => esc_html__( 'Order inside a stage', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'bottom',
			'options' => [ 'bottom' => esc_html__( 'Bottom to top', 'refraction' ), 'name' => esc_html__( 'By part name', 'refraction' ), 'file' => esc_html__( 'As in the file', 'refraction' ) ],
			'condition' => [ 'motion' => 'build' ],
		] );
		$this->add_control( 'from', [
			'label' => esc_html__( 'Parts come', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'drop',
			'options' => [ 'drop' => esc_html__( 'From above', 'refraction' ), 'sides' => esc_html__( 'From the sides', 'refraction' ), 'explode' => esc_html__( 'From all around', 'refraction' ) ],
			'condition' => [ 'motion' => 'build' ],
		] );
		$this->add_control( 'distance', [
			'label' => esc_html__( 'Distance', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0.1, 'max' => 2, 'step' => 0.05 ] ],
			'default' => [ 'size' => 0.6 ],
			'description' => esc_html__( 'How far a part starts from its place, compared to the size of the model.', 'refraction' ),
			'condition' => [ 'motion' => 'build' ],
		] );
		$this->add_control( 'overlap', [
			'label' => esc_html__( 'Overlap', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'default' => [ 'size' => 70 ],
			'description' => esc_html__( '0: parts of a stage come one after another. 100: all at once.', 'refraction' ),
			'condition' => [ 'motion' => 'build' ],
		] );
		$this->add_control( 'easing', [
			'label' => esc_html__( 'Movement', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'out',
			'options' => [ 'out' => esc_html__( 'Slows down at the end', 'refraction' ), 'inout' => esc_html__( 'Smooth', 'refraction' ), 'back' => esc_html__( 'Settles with a small bounce', 'refraction' ), 'linear' => esc_html__( 'Even', 'refraction' ) ],
			'condition' => [ 'motion' => 'build' ],
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_scroll', [ 'label' => esc_html__( 'Scroll', 'refraction' ) ] );
		$this->add_responsive_control( 'length', [
			'label' => esc_html__( 'Scroll length (screens)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 1, 'max' => 10, 'step' => 0.5 ] ],
			'default' => [ 'size' => 3 ],
			'description' => esc_html__( 'How much scrolling it takes to build the model. The scene stays pinned meanwhile.', 'refraction' ),
			'selectors' => [ '{{WRAPPER}} .rf3d' => '--rf3d-length: {{SIZE}};' ],
		] );
		$this->add_control( 'hold', [
			'label' => esc_html__( 'Pause on the finished model', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
			'default' => [ 'size' => 12 ],
			'description' => esc_html__( 'Part of the scroll (in %) spent on the finished model before the page moves on.', 'refraction' ),
		] );
		$this->add_control( 'preview', [
			'label' => esc_html__( 'Preview in the editor', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
			'description' => esc_html__( 'Drag to see the build at that point (%). Only in the editor; empty follows the scroll.', 'refraction' ),
			'separator' => 'before',
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_camera', [ 'label' => esc_html__( 'Camera and light', 'refraction' ) ] );
		$angle = static function ( string $label, int $default ): array {
			return [ 'label' => $label, 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => -180, 'max' => 180 ] ], 'default' => [ 'size' => $default ] ];
		};
		$this->add_control( 'angle_start', $angle( esc_html__( 'Angle at the start (degrees)', 'refraction' ), -40 ) );
		$this->add_control( 'angle_end', $angle( esc_html__( 'Angle at the end (degrees)', 'refraction' ), 20 ) );
		$this->add_control( 'elevation', [ 'label' => esc_html__( 'Height of the view (degrees)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 80 ] ], 'default' => [ 'size' => 18 ] ] );
		$this->add_control( 'zoom', [ 'label' => esc_html__( 'Zoom', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.5, 'max' => 2, 'step' => 0.05 ] ], 'default' => [ 'size' => 1 ] ] );
		$this->add_control( 'drag', [ 'label' => esc_html__( 'Drag to turn the finished model', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'light', [
			'label' => esc_html__( 'Light', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'daylight',
			'separator' => 'before',
			'options' => [ 'daylight' => esc_html__( 'Daylight', 'refraction' ), 'studio' => esc_html__( 'Studio', 'refraction' ), 'dusk' => esc_html__( 'Dusk', 'refraction' ) ],
		] );
		$this->add_control( 'shadows', [ 'label' => esc_html__( 'Shadows', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'mobile_poster', [ 'label' => esc_html__( 'Show the still image on phones instead', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'description' => esc_html__( 'Lighter for slow phones. Needs a still image.', 'refraction' ) ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_tools', [ 'label' => esc_html__( 'Visitor controls', 'refraction' ) ] );
		$this->add_control( 'show_tools', [ 'label' => esc_html__( 'Show view buttons on the scene', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'description' => esc_html__( 'Visitors can switch views; in Parts and Aerial they drag to turn the model in any direction.', 'refraction' ) ] );
		$tools = [
			'tool_parts' => esc_html__( 'Parts (exploded view)', 'refraction' ),
			'tool_aerial' => esc_html__( 'Aerial view', 'refraction' ),
			'tool_rotate' => esc_html__( 'Auto-rotate button', 'refraction' ),
			'tool_light' => esc_html__( 'Day / Dusk button', 'refraction' ),
		];

		foreach ( $tools as $key => $label ) {
			$this->add_control( $key, [ 'label' => $label, 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'condition' => [ 'show_tools' => 'yes' ] ] );
		}

		$this->add_control( 'tools_position', [
			'label' => esc_html__( 'Buttons position', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'top-right',
			'options' => [ 'top-right' => esc_html__( 'Top right', 'refraction' ), 'top-left' => esc_html__( 'Top left', 'refraction' ), 'bottom-right' => esc_html__( 'Bottom right', 'refraction' ), 'bottom-left' => esc_html__( 'Bottom left', 'refraction' ) ],
			'condition' => [ 'show_tools' => 'yes' ],
		] );
		$this->add_control( 'grab', [ 'label' => esc_html__( 'Grab to rotate', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before', 'description' => esc_html__( 'Visitors can turn the model at any time by dragging it (also up and down with a mouse); it keeps turning a little after they let go.', 'refraction' ) ] );
		$this->add_control( 'follow', [
			'label' => esc_html__( 'Follow the cursor', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => '',
			'options' => [
				'' => esc_html__( 'Off', 'refraction' ),
				'turn' => esc_html__( 'The model turns toward the cursor', 'refraction' ),
				'head' => esc_html__( 'The head looks at the cursor (characters)', 'refraction' ),
			],
			'description' => esc_html__( 'Head: the first part or bone named like a head; without one the whole model turns.', 'refraction' ),
		] );
		$this->add_control( 'follow_strength', [
			'label' => esc_html__( 'How far it turns (degrees)', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [ 'px' => [ 'min' => 2, 'max' => 45 ] ],
			'default' => [ 'size' => 15 ],
			'condition' => [ 'follow!' => '' ],
		] );
		$this->add_control( 'auto_rotate', [ 'label' => esc_html__( 'Rotate on its own', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'separator' => 'before', 'description' => esc_html__( 'Starts turning slowly once the model is built. Visitors can stop it with the button.', 'refraction' ) ] );
		$this->add_control( 'rotate_speed', [ 'label' => esc_html__( 'Rotation speed (degrees per second)', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 2, 'max' => 60 ] ], 'default' => [ 'size' => 12 ] ] );
		$this->add_control( 'spread', [ 'label' => esc_html__( 'Parts view spread', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0.1, 'max' => 2, 'step' => 0.05 ] ], 'default' => [ 'size' => 0.8 ], 'description' => esc_html__( 'How far the parts move apart, compared to the size of the model.', 'refraction' ) ] );
		$this->end_controls_section();

		$this->register_style_controls();
	}

	private function register_style_controls(): void {
		$this->start_controls_section( 'section_scene_style', [ 'label' => esc_html__( 'Scene', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'background', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf3d-stage' => 'background-color: {{VALUE}};' ] ] );
		$this->add_responsive_control( 'scene_width', [
			'label' => esc_html__( 'Scene width', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ '%', 'px', 'vw' ],
			'range' => [ '%' => [ 'min' => 20, 'max' => 100 ], 'px' => [ 'min' => 240, 'max' => 2400 ], 'vw' => [ 'min' => 20, 'max' => 100 ] ],
			'selectors' => [ '{{WRAPPER}} .rf3d' => 'width: {{SIZE}}{{UNIT}}; max-width: 100%;' ],
		] );
		$this->add_responsive_control( 'scene_align', [
			'label' => esc_html__( 'Scene alignment', 'refraction' ),
			'type' => Controls_Manager::CHOOSE,
			'options' => [
				'left' => [ 'title' => esc_html__( 'Left', 'refraction' ), 'icon' => 'rficon-h-align-left' ],
				'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-h-align-center' ],
				'right' => [ 'title' => esc_html__( 'Right', 'refraction' ), 'icon' => 'rficon-h-align-right' ],
			],
			'selectors_dictionary' => [ 'left' => 'margin-left: 0; margin-right: auto;', 'center' => 'margin-left: auto; margin-right: auto;', 'right' => 'margin-left: auto; margin-right: 0;' ],
			'selectors' => [ '{{WRAPPER}} .rf3d' => '{{VALUE}}' ],
		] );
		$this->add_responsive_control( 'height', [
			'label' => esc_html__( 'Scene height', 'refraction' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'vh', 'px' ],
			'range' => [ 'vh' => [ 'min' => 40, 'max' => 100 ], 'px' => [ 'min' => 300, 'max' => 1200 ] ],
			'default' => [ 'unit' => 'vh', 'size' => 100 ],
			'selectors' => [ '{{WRAPPER}} .rf3d' => '--rf3d-height: {{SIZE}}{{UNIT}};' ],
		] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_caption_style', [ 'label' => esc_html__( 'Captions', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'caption_position', [
			'label' => esc_html__( 'Position', 'refraction' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'left',
			'options' => [ 'left' => esc_html__( 'Left', 'refraction' ), 'right' => esc_html__( 'Right', 'refraction' ), 'bottom' => esc_html__( 'Bottom', 'refraction' ), 'none' => esc_html__( 'Hidden', 'refraction' ) ],
		] );
		$cap = '{{WRAPPER}} .rf3d-cap';
		$this->add_control( 'caption_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $cap => 'background-color: {{VALUE}};' ] ] );
		$this->add_responsive_control( 'caption_width', [ 'label' => esc_html__( 'Width', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'size_units' => [ 'px', '%' ], 'range' => [ 'px' => [ 'min' => 160, 'max' => 700 ] ], 'selectors' => [ $cap => 'width: {{SIZE}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'caption_padding', [ 'label' => esc_html__( 'Padding', 'refraction' ), 'type' => Controls_Manager::DIMENSIONS, 'size_units' => [ 'px', 'em' ], 'selectors' => [ $cap => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ] ] );
		$this->add_responsive_control( 'caption_radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ], 'selectors' => [ $cap => 'border-radius: {{SIZE}}px;' ] ] );
		$this->add_control( 'title_color', [ 'label' => esc_html__( 'Title color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => [ '{{WRAPPER}} .rf3d-cap-title' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'title_typography', 'selector' => '{{WRAPPER}} .rf3d-cap-title' ] );
		$this->add_control( 'text_color', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => [ '{{WRAPPER}} .rf3d-cap-text' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'text_typography', 'selector' => '{{WRAPPER}} .rf3d-cap-text' ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_progress_style', [ 'label' => esc_html__( 'Progress', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_control( 'show_progress', [ 'label' => esc_html__( 'Show the stages as a progress line', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'progress_color', [ 'label' => esc_html__( 'Color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf3d' => '--rf3d-progress: {{VALUE}};' ] ] );
		$this->add_control( 'progress_done', [ 'label' => esc_html__( 'Done color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf3d' => '--rf3d-progress-done: {{VALUE}};' ] ] );
		$this->add_control( 'progress_label_color', [ 'label' => esc_html__( 'Stage name color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'separator' => 'before', 'selectors' => [ '{{WRAPPER}} .rf3d-progress li span' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'progress_label_active', [ 'label' => esc_html__( 'Stage name color (built and current)', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf3d-progress li.is-done span, {{WRAPPER}} .rf3d-progress li.is-active span' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'progress_typography', 'selector' => '{{WRAPPER}} .rf3d-progress li span' ] );
		$this->add_control( 'progress_dim', [ 'label' => esc_html__( 'Dim stages not built yet', 'refraction' ), 'type' => Controls_Manager::SWITCHER, 'default' => 'yes', 'selectors' => [ '{{WRAPPER}} .rf3d-progress li' => '--rf3d-dim: 0.55;' ], 'selectors_dictionary' => [ '' => '--rf3d-dim: 1;' ] ] );
		$this->end_controls_section();

		$this->start_controls_section( 'section_tools_style', [ 'label' => esc_html__( 'Visitor controls', 'refraction' ), 'tab' => Controls_Manager::TAB_STYLE, 'condition' => [ 'show_tools' => 'yes' ] ] );
		$btn = '{{WRAPPER}} .rf3d-tools button';
		$this->add_control( 'tools_bg', [ 'label' => esc_html__( 'Background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .rf3d-tools' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'tools_color', [ 'label' => esc_html__( 'Text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $btn => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'tools_active_bg', [ 'label' => esc_html__( 'Selected background', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $btn . '[aria-pressed="true"]' => 'background-color: {{VALUE}};' ] ] );
		$this->add_control( 'tools_active_color', [ 'label' => esc_html__( 'Selected text color', 'refraction' ), 'type' => Controls_Manager::COLOR, 'selectors' => [ $btn . '[aria-pressed="true"]' => 'color: {{VALUE}};' ] ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'tools_typography', 'selector' => $btn ] );
		$this->add_responsive_control( 'tools_radius', [ 'label' => esc_html__( 'Border radius', 'refraction' ), 'type' => Controls_Manager::SLIDER, 'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ], 'selectors' => [ '{{WRAPPER}} .rf3d-tools' => 'border-radius: {{SIZE}}px;', $btn => 'border-radius: calc({{SIZE}}px - 3px);' ] ] );
		$this->end_controls_section();
	}

	/** A slider value as a number within limits, or the default. */
	private static function number( $value, float $min, float $max, float $default ): float {
		$size = is_array( $value ) ? ( $value['size'] ?? null ) : $value;

		return is_numeric( $size ) ? max( $min, min( $max, (float) $size ) ) : $default;
	}

	/** What the script needs, cleaned: only whitelisted words and numbers within range, and a model URL of a .glb/.gltf. */
	public function scene_config(): array {
		$s = $this->get_settings_for_display();
		$pick = static function ( $value, array $allowed, string $default ): string {
			return in_array( $value, $allowed, true ) ? $value : $default;
		};
		$model = '';

		if ( 'media' === ( $s['model_source'] ?? '' ) ) {
			$url = (string) ( $s['model']['url'] ?? '' );
			$model = Glb_File::is_model_url( $url ) ? esc_url_raw( $url ) : '';
		}

		$stages = [];

		foreach ( (array) ( $s['stages'] ?? [] ) as $stage ) {
			$parts = array_values( array_filter( array_map( 'trim', explode( ',', (string) ( $stage['stage_parts'] ?? '' ) ) ), 'strlen' ) );
			$stages[] = [ 'parts' => array_slice( $parts, 0, 30 ) ];
		}

		$editor = Plugin::$instance->editor && Plugin::$instance->editor->is_edit_mode();
		$preview = $s['preview']['size'] ?? '';

		return [
			'source' => 'media' === ( $s['model_source'] ?? '' ) ? 'media' : 'sample',
			'model' => $model,
			'stages' => $stages,
			'order' => $pick( $s['order'] ?? '', [ 'bottom', 'name', 'file' ], 'bottom' ),
			'from' => $pick( $s['from'] ?? '', [ 'drop', 'sides', 'explode' ], 'drop' ),
			'distance' => self::number( $s['distance'] ?? null, 0.1, 2, 0.6 ),
			'overlap' => self::number( $s['overlap'] ?? null, 0, 100, 70 ) / 100,
			'easing' => $pick( $s['easing'] ?? '', [ 'out', 'inout', 'back', 'linear' ], 'out' ),
			'hold' => self::number( $s['hold'] ?? null, 0, 40, 12 ) / 100,
			'angleStart' => self::number( $s['angle_start'] ?? null, -180, 180, -40 ),
			'angleEnd' => self::number( $s['angle_end'] ?? null, -180, 180, 20 ),
			'elevation' => self::number( $s['elevation'] ?? null, 0, 80, 18 ),
			'zoom' => self::number( $s['zoom'] ?? null, 0.5, 2, 1 ),
			'drag' => 'yes' === ( $s['drag'] ?? '' ),
			'light' => $pick( $s['light'] ?? '', [ 'daylight', 'studio', 'dusk' ], 'daylight' ),
			'shadows' => 'yes' === ( $s['shadows'] ?? '' ),
			'mobilePoster' => 'yes' === ( $s['mobile_poster'] ?? '' ) && ! empty( $s['poster']['url'] ),
			'tools' => 'yes' === ( $s['show_tools'] ?? '' ),
			'autoRotate' => 'yes' === ( $s['auto_rotate'] ?? '' ),
			'rotateSpeed' => self::number( $s['rotate_speed'] ?? null, 2, 60, 12 ),
			'spread' => self::number( $s['spread'] ?? null, 0.1, 2, 0.8 ),
			'motion' => $pick( $s['motion'] ?? '', [ 'build', 'turntable', 'drive', 'clip', 'float' ], 'build' ),
			'turns' => self::number( $s['turns'] ?? null, 0.25, 3, 1 ),
			'wheels' => implode( ',', array_slice( array_filter( array_map( 'trim', explode( ',', sanitize_text_field( (string) ( $s['wheels'] ?? '' ) ) ) ), 'strlen' ), 0, 12 ) ),
			'driveFrom' => $pick( $s['drive_from'] ?? '', [ 'left', 'right' ], 'left' ),
			'clip' => mb_substr( sanitize_text_field( (string) ( $s['clip'] ?? '' ) ), 0, 80 ),
			'clipPlay' => $pick( $s['clip_play'] ?? '', [ 'loop', 'scroll' ], 'loop' ),
			'clipSpeed' => self::number( $s['clip_speed'] ?? null, 0.25, 3, 1 ),
			'grab' => 'yes' === ( $s['grab'] ?? '' ),
			'follow' => $pick( $s['follow'] ?? '', [ '', 'turn', 'head' ], '' ),
			'followStrength' => self::number( $s['follow_strength'] ?? null, 2, 45, 15 ),
			'preview' => $editor && is_numeric( $preview ) ? max( 0, min( 100, (float) $preview ) ) / 100 : null,
			'editor' => $editor,
		];
	}

	/** The view buttons for visitors: Build, Parts, Aerial, Auto-rotate and Day / Dusk. */
	private function render_tools( array $s, array $config ): void {
		if ( ! $config['tools'] ) {
			return;
		}

		$views = [ 'build' => esc_html__( 'Build', 'refraction' ) ];

		if ( 'yes' === ( $s['tool_parts'] ?? '' ) ) {
			$views['parts'] = esc_html__( 'Parts', 'refraction' );
		}

		if ( 'yes' === ( $s['tool_aerial'] ?? '' ) ) {
			$views['aerial'] = esc_html__( 'Aerial', 'refraction' );
		}

		$position = in_array( $s['tools_position'] ?? '', [ 'top-right', 'top-left', 'bottom-right', 'bottom-left' ], true ) ? $s['tools_position'] : 'top-right';
		echo '<div class="rf3d-tools rf3d-tools--' . esc_attr( $position ) . '" role="toolbar" aria-label="' . esc_attr__( '3D view', 'refraction' ) . '">';

		if ( count( $views ) > 1 ) {
			foreach ( $views as $view => $label ) {
				echo '<button type="button" data-rf3d-view="' . esc_attr( $view ) . '" aria-pressed="' . ( 'build' === $view ? 'true' : 'false' ) . '">' . esc_html( $label ) . '</button>';
			}
		}

		if ( 'yes' === ( $s['tool_rotate'] ?? '' ) ) {
			echo '<span class="rf3d-tools-sep" aria-hidden="true"></span>';
			echo '<button type="button" data-rf3d-toggle="rotate" aria-pressed="' . ( $config['autoRotate'] ? 'true' : 'false' ) . '">' . esc_html__( 'Auto-rotate', 'refraction' ) . '</button>';
		}

		if ( 'yes' === ( $s['tool_light'] ?? '' ) ) {
			$dusk = 'dusk' === $config['light'];
			echo '<span class="rf3d-tools-sep" aria-hidden="true"></span>';
			echo '<button type="button" data-rf3d-light="day" aria-pressed="' . ( $dusk ? 'false' : 'true' ) . '">' . esc_html__( 'Day', 'refraction' ) . '</button>';
			echo '<button type="button" data-rf3d-light="dusk" aria-pressed="' . ( $dusk ? 'true' : 'false' ) . '">' . esc_html__( 'Dusk', 'refraction' ) . '</button>';
		}

		echo '</div>';
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$config = $this->scene_config();
		$stages = (array) ( $s['stages'] ?? [] );
		$position = in_array( $s['caption_position'] ?? '', [ 'left', 'right', 'bottom', 'none' ], true ) ? $s['caption_position'] : 'left';
		$poster = (string) ( $s['poster']['url'] ?? '' );
		$titled = array_filter( $stages, static function ( $stage ) {
			return '' !== trim( (string) ( $stage['stage_title'] ?? '' ) ) || '' !== trim( (string) ( $stage['stage_text'] ?? '' ) );
		} );

		echo '<div class="rf3d rf3d-cap-' . esc_attr( $position ) . '" data-rf3d="' . esc_attr( (string) wp_json_encode( $config ) ) . '">';
		echo '<div class="rf3d-stage">';
		echo '<canvas class="rf3d-canvas" role="img" aria-label="' . esc_attr( (string) ( $s['label'] ?? '' ) ) . '"></canvas>';

		if ( '' !== $poster ) {
			echo '<img class="rf3d-poster" src="' . esc_url( $poster ) . '" alt="' . esc_attr( (string) ( $s['label'] ?? '' ) ) . '" loading="lazy" hidden>';
		}

		if ( $titled && 'none' !== $position ) {
			echo '<div class="rf3d-caps">';

			foreach ( $stages as $i => $stage ) {
				echo '<div class="rf3d-cap' . ( 0 === $i ? ' is-active' : '' ) . '" data-rf3d-cap="' . (int) $i . '">';
				echo '' !== trim( (string) ( $stage['stage_title'] ?? '' ) ) ? '<h3 class="rf3d-cap-title">' . esc_html( $stage['stage_title'] ) . '</h3>' : '';
				echo '' !== trim( (string) ( $stage['stage_text'] ?? '' ) ) ? '<p class="rf3d-cap-text">' . esc_html( $stage['stage_text'] ) . '</p>' : '';
				echo '</div>';
			}

			echo '</div>';
		}

		if ( 'yes' === ( $s['show_progress'] ?? '' ) && count( $stages ) > 1 ) {
			// Each stage name is a button: in Build it scrolls to that stage, in Parts and Aerial it picks those parts out.
			echo '<nav class="rf3d-progress-nav" aria-label="' . esc_attr__( 'Build stages', 'refraction' ) . '"><ol class="rf3d-progress">';

			foreach ( $stages as $i => $stage ) {
				echo '<li data-rf3d-step="' . (int) $i . '"><button type="button" data-rf3d-go="' . (int) $i . '"><span>' . esc_html( (string) ( $stage['stage_title'] ?? '' ) ) . '</span></button></li>';
			}

			echo '</ol></nav>';
		}

		$this->render_tools( $s, $config );
		echo '<p class="rf3d-status" role="status"></p>';
		echo '</div></div>';
	}
}
