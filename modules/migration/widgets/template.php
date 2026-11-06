<?php
namespace Refraction\Modules\Migration\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\Migration\Module;
use Refraction\TemplateLibrary\Source_Local;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Template: shows a saved template (a section, container or page). Edit the template and every place showing it changes. */
class Template extends Widget_Base {

	public function get_name() {
		return 'refraction-template';
	}

	public function get_title() {
		return esc_html__( 'Template', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-document-file';
	}

	public function get_categories() {
		return [ 'general' ];
	}

	public function get_keywords() {
		return [ 'template', 'saved', 'section', 'reuse', 'global', 'library' ];
	}

	protected function register_controls() {
		$this->start_controls_section( 'section_template', [ 'label' => esc_html__( 'Template', 'refraction' ) ] );

		$this->add_control( 'template_id', [
			'label' => esc_html__( 'Choose a template', 'refraction' ),
			'type' => Controls_Manager::SELECT2,
			'label_block' => true,
			'options' => self::templates(),
			'description' => esc_html__( 'Saved templates are under Refraction > Templates. Editing the template changes it everywhere it is shown.', 'refraction' ),
		] );

		$this->end_controls_section();
	}

	/** Saved templates that can sit inside a page (not headers, footers, popups or the site settings). */
	private static function templates(): array {
		$out = [];
		$skip = [ 'kit', 'header', 'footer', 'single', 'archive', 'search-results', 'error-404', 'popup', 'loop-item' ];

		foreach ( get_posts( [ 'post_type' => Source_Local::CPT, 'post_status' => [ 'publish', 'draft', 'private' ], 'numberposts' => 300, 'orderby' => 'title', 'order' => 'ASC' ] ) as $post ) {
			if ( ! in_array( (string) get_post_meta( $post->ID, '_refraction_template_type', true ), $skip, true ) ) {
				$out[ (string) $post->ID ] = $post->post_title ?: '#' . $post->ID;
			}
		}

		return $out;
	}

	protected function render() {
		$id = absint( $this->get_settings_for_display( 'template_id' ) );
		$html = $id ? Module::template( $id ) : '';

		if ( '' === $html && \Refraction\Plugin::$instance->editor->is_edit_mode() ) {
			echo '<div class="rf-ed rf-ed-hint">' . esc_html__( 'Template: choose a saved template to show here.', 'refraction' ) . '</div>';

			return;
		}

		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Builder output.
	}
}
