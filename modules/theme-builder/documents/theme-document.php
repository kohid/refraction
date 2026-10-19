<?php
namespace Refraction\Modules\ThemeBuilder\Documents;

use Refraction\Controls_Manager;
use Refraction\Modules\Library\Documents\Library_Document;
use Refraction\Modules\ThemeBuilder\Classes\Preview_Context;
use Refraction\Modules\ThemeBuilder\Classes\Preview_Target;
use Refraction\Plugin;
use Refraction\TemplateLibrary\Source_Local;
use Refraction\Modules\ThemeBuilder\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * A saved template that fills a Theme Builder location (header or footer).
 */
abstract class Theme_Document extends Library_Document {

	const CONDITIONS_SETTING = 'refraction_display_conditions';

	/** The location this document fills: `header` or `footer`. */
	abstract public function get_location(): string;

	public static function get_properties() {
		$properties = parent::get_properties();

		$properties['support_kit'] = true;
		$properties['show_in_finder'] = true;
		$properties['location'] = static::get_type();

		return $properties;
	}

	public function get_name() {
		return static::get_type();
	}

	protected function register_controls() {
		parent::register_controls();

		$this->start_controls_section(
			'refraction_display_conditions_section',
			[
				'label' => esc_html__( 'Display Conditions', 'refraction' ),
				'tab' => Controls_Manager::TAB_SETTINGS,
			]
		);

		$this->add_control(
			self::CONDITIONS_SETTING,
			[
				'type' => 'refraction_conditions',
				'label_block' => true,
				'show_label' => false,
				'default' => [],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'refraction_preview_settings_section',
			[
				'label' => esc_html__( 'Preview Settings', 'refraction' ),
				'tab' => Controls_Manager::TAB_SETTINGS,
			]
		);

		$this->add_control(
			Preview_Target::SETTING,
			[
				'type' => 'refraction_preview_target',
				'label_block' => true,
				'show_label' => false,
				'default' => [],
				'location' => $this->get_location(),
				'default_source' => Preview_Target::default_source( $this->get_location() ),
				'sources' => $this->get_preview_sources(),
			]
		);

		$this->end_controls_section();
	}

	/**
	 * The editor page renders every widget once on the server so the preview starts filled in: do it against the
	 * Preview Settings target, like the render requests that follow.
	 */
	public function get_elements_raw_data( $data = null, $with_html_content = false ) {
		if ( ! $with_html_content || ! Plugin::$instance->editor->is_edit_mode() ) {
			return parent::get_elements_raw_data( $data, $with_html_content );
		}

		return Preview_Context::run_with( $this, fn() => parent::get_elements_raw_data( $data, $with_html_content ) );
	}

	/**
	 * What this template can be previewed as: the options of the Preview Settings dropdown.
	 *
	 * @return array<int, array{value: string, label: string}>
	 */
	public function get_preview_sources(): array {
		$kinds = Preview_Target::allowed_kinds( $this->get_location() );
		$sources = [];

		if ( in_array( 'post', $kinds, true ) ) {
			foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $type ) {
				if ( ! in_array( $type->name, [ 'attachment', Source_Local::CPT, 'e-floating-buttons' ], true ) ) {
					$sources[] = [ 'value' => 'post:' . $type->name, 'label' => $type->labels->singular_name ];
				}
			}
		}

		if ( in_array( 'blog', $kinds, true ) ) {
			$sources[] = [ 'value' => 'blog', 'label' => esc_html__( 'Blog posts', 'refraction' ) ];
		}

		if ( in_array( 'term', $kinds, true ) ) {
			foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
				if ( 'post_format' !== $taxonomy->name ) {
					/* translators: %s: taxonomy name, for example "Category". */
					$sources[] = [ 'value' => 'term:' . $taxonomy->name, 'label' => sprintf( esc_html__( '%s archive', 'refraction' ), $taxonomy->labels->singular_name ) ];
				}
			}
		}

		if ( in_array( 'postype', $kinds, true ) ) {
			foreach ( get_post_types( [ 'public' => true ], 'objects' ) as $type ) {
				if ( $type->has_archive && 'attachment' !== $type->name ) {
					/* translators: %s: post type name, for example "Books". */
					$sources[] = [ 'value' => 'postype:' . $type->name, 'label' => sprintf( esc_html__( '%s archive', 'refraction' ), $type->labels->name ) ];
				}
			}
		}

		$fixed = [
			[ 'author', esc_html__( 'Author archive', 'refraction' ) ],
			[ 'date', esc_html__( 'Date archive', 'refraction' ) ],
			[ 'search', esc_html__( 'Search results', 'refraction' ) ],
			[ '404', esc_html__( 'Error 404 page', 'refraction' ) ],
		];

		foreach ( $fixed as [ $kind, $label ] ) {
			if ( in_array( $kind, $kinds, true ) ) {
				$sources[] = [ 'value' => $kind, 'label' => $label ];
			}
		}

		return $sources;
	}

	/** Print the saved rules as readable text (used by the admin list). */
	public function get_conditions_text(): array {
		$module = Module::instance();

		return $module->get_conditions_manager()->describe( $module->get_store()->get_rules( $this->get_main_id() ) );
	}
}
