<?php
namespace Elementor\Modules\Blender\Widgets;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Border;
use Elementor\Modules\Blender\Module;
use Elementor\Modules\Blender\Rest\Publish_Controller;
use Elementor\Plugin;
use Elementor\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * 3D Model widget.
 *
 * Shows a glTF 2.0 model (for example a scene exported or published from Blender) with the
 * bundled <model-viewer> web component: orbit, zoom, auto-rotate, animations and AR.
 */
class Model_3D extends Widget_Base {

	const TONE_MAPPINGS = [ 'neutral', 'agx', 'aces', 'reinhard', 'cineon', 'linear' ];

	const LOADING_MODES = [ 'auto', 'lazy', 'eager' ];

	public function get_name() {
		return 'model-3d';
	}

	public function get_title() {
		return esc_html__( '3D Model', 'elementor' );
	}

	public function get_icon() {
		return 'eicon-slider-3d';
	}

	public function get_categories() {
		return [ 'basic' ];
	}

	public function get_keywords() {
		return [ '3d', 'model', 'blender', 'gltf', 'glb', 'ar', 'viewer' ];
	}

	public function get_script_depends(): array {
		return [ Module::SCRIPT_HANDLE ];
	}

	public function has_widget_inner_wrapper(): bool {
		return ! Plugin::$instance->experiments->is_feature_active( 'e_optimized_markup' );
	}

	protected function register_controls() {
		$this->register_model_controls();
		$this->register_interaction_controls();
		$this->register_animation_controls();
		$this->register_viewer_style_controls();
	}

	private function register_model_controls(): void {
		$this->start_controls_section( 'section_model', [
			'label' => esc_html__( '3D Model', 'elementor' ),
		] );

		$this->add_control( 'model', [
			'label' => esc_html__( 'Model', 'elementor' ),
			'type' => Controls_Manager::MEDIA,
			'media_types' => [ 'model' ],
			'description' => esc_html__( 'A glTF 2.0 file (.glb or .gltf). Publish one from Blender with the Refraction add-on, or upload it to the media library.', 'elementor' ),
			'dynamic' => [
				'active' => true,
			],
		] );

		$this->add_control( 'alt', [
			'label' => esc_html__( 'Alternative Text', 'elementor' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'Describe the model for screen readers', 'elementor' ),
			'label_block' => true,
			'dynamic' => [
				'active' => true,
			],
		] );

		$this->add_control( 'poster', [
			'label' => esc_html__( 'Poster', 'elementor' ),
			'type' => Controls_Manager::MEDIA,
			'media_types' => [ 'image' ],
			'description' => esc_html__( 'Shown while the model loads. Leave empty to use the poster rendered by Blender, if there is one.', 'elementor' ),
		] );

		$this->add_control( 'loading', [
			'label' => esc_html__( 'Loading', 'elementor' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'lazy',
			'options' => [
				'auto' => esc_html__( 'Auto', 'elementor' ),
				'lazy' => esc_html__( 'Lazy (when visible)', 'elementor' ),
				'eager' => esc_html__( 'Eager', 'elementor' ),
			],
		] );

		$this->end_controls_section();
	}

	private function register_interaction_controls(): void {
		$this->start_controls_section( 'section_interaction', [
			'label' => esc_html__( 'Interaction', 'elementor' ),
		] );

		$this->add_control( 'camera_controls', [
			'label' => esc_html__( 'Orbit Controls', 'elementor' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'disable_zoom', [
			'label' => esc_html__( 'Disable Zoom', 'elementor' ),
			'type' => Controls_Manager::SWITCHER,
			'condition' => [
				'camera_controls' => 'yes',
			],
		] );

		$this->add_control( 'auto_rotate', [
			'label' => esc_html__( 'Auto Rotate', 'elementor' ),
			'type' => Controls_Manager::SWITCHER,
			'default' => 'yes',
		] );

		$this->add_control( 'rotation_speed', [
			'label' => esc_html__( 'Rotation Speed', 'elementor' ) . ' (deg/s)',
			'type' => Controls_Manager::SLIDER,
			'range' => [
				'px' => [
					'min' => 1,
					'max' => 180,
				],
			],
			'default' => [
				'size' => 30,
			],
			'condition' => [
				'auto_rotate' => 'yes',
			],
		] );

		$this->add_control( 'camera_orbit', [
			'label' => esc_html__( 'Initial Camera Orbit', 'elementor' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => '0deg 75deg 105%',
			'description' => esc_html__( 'Horizontal angle, vertical angle and distance. Leave empty for the default view.', 'elementor' ),
		] );

		$this->add_control( 'ar', [
			'label' => esc_html__( 'View in AR', 'elementor' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Shows an AR button on supported phones (Android Scene Viewer and WebXR).', 'elementor' ),
		] );

		$this->end_controls_section();
	}

	private function register_animation_controls(): void {
		$this->start_controls_section( 'section_animation', [
			'label' => esc_html__( 'Animation', 'elementor' ),
		] );

		$this->add_control( 'autoplay', [
			'label' => esc_html__( 'Autoplay', 'elementor' ),
			'type' => Controls_Manager::SWITCHER,
			'description' => esc_html__( 'Plays the animations (Blender actions) stored in the model.', 'elementor' ),
		] );

		$this->add_control( 'animation_name', [
			'label' => esc_html__( 'Animation Name', 'elementor' ),
			'type' => Controls_Manager::TEXT,
			'placeholder' => esc_html__( 'First animation', 'elementor' ),
			'condition' => [
				'autoplay' => 'yes',
			],
		] );

		$this->end_controls_section();
	}

	private function register_viewer_style_controls(): void {
		$this->start_controls_section( 'section_style_viewer', [
			'label' => esc_html__( 'Viewer', 'elementor' ),
			'tab' => Controls_Manager::TAB_STYLE,
		] );

		$this->add_responsive_control( 'height', [
			'label' => esc_html__( 'Height', 'elementor' ),
			'type' => Controls_Manager::SLIDER,
			'size_units' => [ 'px', 'vh', 'em', 'rem', 'custom' ],
			'range' => [
				'px' => [
					'min' => 100,
					'max' => 1200,
				],
				'vh' => [
					'min' => 10,
					'max' => 100,
				],
			],
			'default' => [
				'unit' => 'px',
				'size' => 450,
			],
			'selectors' => [
				'{{WRAPPER}} .e-model-3d' => 'height: {{SIZE}}{{UNIT}};',
			],
		] );

		$this->add_control( 'background_color', [
			'label' => esc_html__( 'Background Color', 'elementor' ),
			'type' => Controls_Manager::COLOR,
			'selectors' => [
				'{{WRAPPER}} .e-model-3d' => 'background-color: {{VALUE}};',
			],
		] );

		$this->add_control( 'tone_mapping', [
			'label' => esc_html__( 'Tone Mapping', 'elementor' ),
			'type' => Controls_Manager::SELECT,
			'default' => 'agx',
			'options' => [
				'neutral' => esc_html__( 'Neutral', 'elementor' ),
				'agx' => esc_html__( 'AgX (Blender default)', 'elementor' ),
				'aces' => 'ACES',
				'reinhard' => 'Reinhard',
				'cineon' => 'Cineon',
				'linear' => esc_html__( 'Linear', 'elementor' ),
			],
		] );

		$this->add_control( 'exposure', [
			'label' => esc_html__( 'Exposure', 'elementor' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [
				'px' => [
					'min' => 0,
					'max' => 3,
					'step' => 0.05,
				],
			],
			'default' => [
				'size' => 1,
			],
		] );

		$this->add_control( 'shadow_intensity', [
			'label' => esc_html__( 'Shadow Intensity', 'elementor' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [
				'px' => [
					'min' => 0,
					'max' => 1,
					'step' => 0.05,
				],
			],
			'default' => [
				'size' => 0.6,
			],
		] );

		$this->add_control( 'shadow_softness', [
			'label' => esc_html__( 'Shadow Softness', 'elementor' ),
			'type' => Controls_Manager::SLIDER,
			'range' => [
				'px' => [
					'min' => 0,
					'max' => 1,
					'step' => 0.05,
				],
			],
			'default' => [
				'size' => 1,
			],
		] );

		$this->add_group_control( Group_Control_Border::get_type(), [
			'name' => 'viewer_border',
			'selector' => '{{WRAPPER}} .e-model-3d',
			'separator' => 'before',
		] );

		$this->add_responsive_control( 'viewer_border_radius', [
			'label' => esc_html__( 'Border Radius', 'elementor' ),
			'type' => Controls_Manager::DIMENSIONS,
			'size_units' => [ 'px', '%', 'em', 'rem', 'custom' ],
			'selectors' => [
				'{{WRAPPER}} .e-model-3d' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}; overflow: hidden;',
			],
		] );

		$this->end_controls_section();
	}

	/**
	 * The model URL, read from the attachment when there is one so that a model re-published
	 * from Blender (same attachment, new file) shows up without editing the page.
	 */
	private function get_model_url( array $settings ): string {
		$model = $settings['model'] ?? [];
		$id = (int) ( $model['id'] ?? 0 );

		if ( $id ) {
			$url = wp_get_attachment_url( $id );

			if ( $url ) {
				return $url;
			}
		}

		return (string) ( $model['url'] ?? '' );
	}

	private function get_poster_url( array $settings ): string {
		if ( ! empty( $settings['poster']['url'] ) ) {
			return (string) $settings['poster']['url'];
		}

		$model_id = (int) ( $settings['model']['id'] ?? 0 );
		$poster_id = $model_id ? Publish_Controller::get_poster_id( $model_id ) : 0;

		return $poster_id ? (string) wp_get_attachment_url( $poster_id ) : '';
	}

	private static function get_slider_size( array $settings, string $key, float $fallback ): float {
		$size = $settings[ $key ]['size'] ?? '';

		return is_numeric( $size ) ? (float) $size : $fallback;
	}

	/**
	 * Attributes for <model-viewer>. Kept in one place so tests can check them without a DOM.
	 */
	public function get_viewer_attributes( array $settings ): array {
		$attributes = [
			'class' => 'e-model-3d',
			'src' => $this->get_model_url( $settings ),
			'alt' => (string) ( $settings['alt'] ?? '' ),
			'loading' => in_array( $settings['loading'] ?? '', self::LOADING_MODES, true ) ? $settings['loading'] : 'lazy',
			'tone-mapping' => in_array( $settings['tone_mapping'] ?? '', self::TONE_MAPPINGS, true ) ? $settings['tone_mapping'] : 'neutral',
			'exposure' => (string) self::get_slider_size( $settings, 'exposure', 1 ),
			'shadow-intensity' => (string) self::get_slider_size( $settings, 'shadow_intensity', 0 ),
			'shadow-softness' => (string) self::get_slider_size( $settings, 'shadow_softness', 1 ),
			'interaction-prompt' => 'auto',
			'style' => 'display:block;width:100%;',
		];

		if ( '' === $attributes['alt'] ) {
			$attributes['alt'] = esc_html__( '3D model', 'elementor' );
		}

		$poster = $this->get_poster_url( $settings );

		if ( '' !== $poster ) {
			$attributes['poster'] = $poster;
		}

		if ( 'yes' === ( $settings['camera_controls'] ?? '' ) ) {
			$attributes['camera-controls'] = '';

			if ( 'yes' === ( $settings['disable_zoom'] ?? '' ) ) {
				$attributes['disable-zoom'] = '';
			}
		}

		if ( 'yes' === ( $settings['auto_rotate'] ?? '' ) ) {
			$attributes['auto-rotate'] = '';
			$attributes['rotation-per-second'] = self::get_slider_size( $settings, 'rotation_speed', 30 ) . 'deg';
		}

		$camera_orbit = trim( (string) ( $settings['camera_orbit'] ?? '' ) );

		if ( '' !== $camera_orbit ) {
			$attributes['camera-orbit'] = $camera_orbit;
		}

		if ( 'yes' === ( $settings['autoplay'] ?? '' ) ) {
			$attributes['autoplay'] = '';

			$animation_name = trim( (string) ( $settings['animation_name'] ?? '' ) );

			if ( '' !== $animation_name ) {
				$attributes['animation-name'] = $animation_name;
			}
		}

		if ( 'yes' === ( $settings['ar'] ?? '' ) ) {
			$attributes['ar'] = '';
			$attributes['ar-modes'] = 'webxr scene-viewer';
		}

		return $attributes;
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$attributes = $this->get_viewer_attributes( $settings );

		if ( '' === $attributes['src'] ) {
			if ( Plugin::$instance->editor->is_edit_mode() ) {
				$this->print_empty_state();
			}

			return;
		}

		$this->add_render_attribute( 'viewer', $attributes );
		?>
		<model-viewer <?php $this->print_render_attribute_string( 'viewer' ); ?>></model-viewer>
		<?php
	}

	private function print_empty_state(): void {
		?>
		<div class="elementor-alert elementor-alert-info" role="status">
			<?php echo esc_html__( 'Choose a 3D model (.glb or .gltf), or publish one from Blender with the Refraction add-on.', 'elementor' ); ?>
		</div>
		<?php
	}

	/**
	 * Live preview in the editor. Mirrors get_viewer_attributes(); the Blender poster fallback
	 * is only resolved on the server.
	 */
	protected function content_template() {
		?>
		<#
		const modelUrl = settings.model && settings.model.url ? settings.model.url : '';

		if ( ! modelUrl ) {
			#>
			<div class="elementor-alert elementor-alert-info" role="status">
				<?php echo esc_html__( 'Choose a 3D model (.glb or .gltf), or publish one from Blender with the Refraction add-on.', 'elementor' ); ?>
			</div>
			<#
			return;
		}

		const size = ( key, fallback ) => {
			const value = settings[ key ] ? settings[ key ].size : '';
			return ( '' === value || undefined === value || null === value ) ? fallback : value;
		};

		const toneMappings = <?php echo wp_json_encode( self::TONE_MAPPINGS ); ?>;
		const loadingModes = <?php echo wp_json_encode( self::LOADING_MODES ); ?>;
		const toneMapping = toneMappings.includes( settings.tone_mapping ) ? settings.tone_mapping : 'neutral';
		const loading = loadingModes.includes( settings.loading ) ? settings.loading : 'lazy';
		const alt = settings.alt || '<?php echo esc_js( __( '3D model', 'elementor' ) ); ?>';
		const poster = settings.poster && settings.poster.url ? settings.poster.url : '';
		const cameraOrbit = ( settings.camera_orbit || '' ).trim();
		const animationName = ( settings.animation_name || '' ).trim();
		#>
		<model-viewer
			class="e-model-3d"
			style="display:block;width:100%;"
			src="{{ modelUrl }}"
			alt="{{ alt }}"
			loading="{{ loading }}"
			tone-mapping="{{ toneMapping }}"
			exposure="{{ size( 'exposure', 1 ) }}"
			shadow-intensity="{{ size( 'shadow_intensity', 0 ) }}"
			shadow-softness="{{ size( 'shadow_softness', 1 ) }}"
			interaction-prompt="auto"
			<# if ( poster ) { #> poster="{{ poster }}" <# } #>
			<# if ( 'yes' === settings.camera_controls ) { #> camera-controls <# if ( 'yes' === settings.disable_zoom ) { #> disable-zoom <# } #> <# } #>
			<# if ( 'yes' === settings.auto_rotate ) { #> auto-rotate rotation-per-second="{{ size( 'rotation_speed', 30 ) }}deg" <# } #>
			<# if ( cameraOrbit ) { #> camera-orbit="{{ cameraOrbit }}" <# } #>
			<# if ( 'yes' === settings.autoplay ) { #> autoplay <# if ( animationName ) { #> animation-name="{{ animationName }}" <# } #> <# } #>
			<# if ( 'yes' === settings.ar ) { #> ar ar-modes="webxr scene-viewer" <# } #>
		></model-viewer>
		<?php
	}

	public function render_markdown(): string {
		$settings = $this->get_settings_for_display();
		$url = $this->get_model_url( $settings );

		if ( '' === $url ) {
			return '';
		}

		$alt = (string) ( $settings['alt'] ?? '' );
		$label = '' !== $alt ? $alt : esc_html__( '3D model', 'elementor' );

		return sprintf( '[%s](%s)', str_replace( [ '[', ']' ], '', $label ), esc_url_raw( $url ) );
	}
}
