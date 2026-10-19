<?php
namespace Refraction\Modules\CustomCss;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Document;
use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\DocumentTypes\PageBase;
use Refraction\Core\Files\CSS\Post as Post_CSS;
use Refraction\Core\Kits\Documents\Kit;
use Refraction\Modules\CustomCss\Classes\Css_Sanitizer;
use Refraction\Modules\CustomCss\Classes\Kit_Tab;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Custom CSS for every element (Advanced tab), every page (Page Settings) and the whole site (Site Settings).
 *
 * The CSS is printed through the normal CSS file generation, so it is cached and minified with the document.
 * See docs/refraction/extras-a.md.
 */
class Module extends BaseModule {

	const CONTROL = 'custom_css';

	public function get_name() {
		return 'custom-css';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/element/after_section_end', [ $this, 'register_element_section' ], 10, 2 );
		add_action( 'refraction/documents/register_controls', [ $this, 'register_document_section' ] );
		add_action( 'refraction/element/parse_css', [ $this, 'add_element_css' ], 10, 2 );
		add_action( 'refraction/css-file/post/parse', [ $this, 'add_document_css' ] );
		add_filter( 'refraction/document/save/data', [ $this, 'sanitize_saved_data' ] );
		add_action( 'refraction/kit/register_tabs', [ $this, 'register_kit_tab' ] );
		add_action( 'refraction/editor/before_enqueue_scripts', [ $this, 'enqueue_editor_assets' ] );
	}

	/** Entity decoding for the one character the kses pass of limited users mangles, then the strict clean up. */
	public static function prepare( $css ): string {
		$css = is_string( $css ) ? $css : '';

		return Css_Sanitizer::sanitize( str_replace( '&gt;', '>', $css ) );
	}

	public function register_kit_tab( $kit ) {
		$kit->register_tab( 'settings-custom-css', Kit_Tab::class );
	}

	public function register_element_section( $element, $section_id ) {
		if ( '_section_responsive' !== $section_id || $element->get_controls( self::CONTROL ) ) {
			return;
		}

		$element->start_controls_section(
			'section_custom_css',
			[
				'label' => esc_html__( 'Custom CSS', 'refraction' ),
				'tab' => Controls_Manager::TAB_ADVANCED,
			]
		);

		$element->add_control(
			self::CONTROL,
			[
				'type' => Controls_Manager::CODE,
				'label' => esc_html__( 'Custom CSS', 'refraction' ),
				'language' => 'css',
				'render_type' => 'ui',
				'show_label' => false,
				'separator' => 'none',
				'refraction_css_scope' => 'element',
			]
		);

		$element->add_control(
			'custom_css_description',
			[
				'raw' => esc_html__( 'Use "selector" to target this element. Example: selector .refraction-heading-title { color: red; }', 'refraction' ),
				'type' => Controls_Manager::RAW_HTML,
				'content_classes' => 'refraction-descriptor',
			]
		);

		$element->end_controls_section();
	}

	public function register_document_section( $document ) {
		if ( $document instanceof Kit ) {
			return;
		}

		if ( ! $document instanceof PageBase ) {
			return;
		}

		$document->start_controls_section(
			'section_custom_css',
			[
				'label' => esc_html__( 'Custom CSS', 'refraction' ),
				'tab' => Controls_Manager::TAB_ADVANCED,
			]
		);

		$document->add_control(
			self::CONTROL,
			[
				'type' => Controls_Manager::CODE,
				'label' => esc_html__( 'Custom CSS', 'refraction' ),
				'language' => 'css',
				'render_type' => 'ui',
				'show_label' => false,
				'separator' => 'none',
				'refraction_css_scope' => 'page',
			]
		);

		$document->add_control(
			'custom_css_description',
			[
				'raw' => esc_html__( 'Use "selector" to target this page. This CSS only loads on this page.', 'refraction' ),
				'type' => Controls_Manager::RAW_HTML,
				'content_classes' => 'refraction-descriptor',
			]
		);

		$document->end_controls_section();
	}

	public function add_element_css( Post_CSS $post_css, $element ) {
		$css = $element->get_settings( self::CONTROL );

		if ( empty( $css ) || ! is_string( $css ) ) {
			return;
		}

		$css = Css_Sanitizer::scope( self::prepare( $css ), $post_css->get_element_unique_selector( $element ) );

		if ( '' !== $css ) {
			$post_css->get_stylesheet()->add_raw_css( $css );
		}
	}

	/** Pages and the Site Settings (kit) share the post CSS file, so one hook serves both. */
	public function add_document_css( $post_css ) {
		$document = Plugin::$instance->documents->get( $post_css->get_post_id() );

		if ( ! $document ) {
			return;
		}

		$css = $document->get_settings( self::CONTROL );

		if ( empty( $css ) || ! is_string( $css ) ) {
			return;
		}

		$selector = $document instanceof Kit
			? 'body.refraction-kit-' . $document->get_main_id()
			: $document->get_css_wrapper_selector();

		$css = Css_Sanitizer::scope( self::prepare( $css ), $selector );

		if ( '' !== $css ) {
			$post_css->get_stylesheet()->add_raw_css( $css );
		}
	}

	/** Users without `unfiltered_html` can not store risky CSS (page, site and element CSS). */
	public function sanitize_saved_data( $data ) {
		if ( current_user_can( 'unfiltered_html' ) || ! is_array( $data ) ) {
			return $data;
		}

		if ( isset( $data['settings'][ self::CONTROL ] ) ) {
			$data['settings'][ self::CONTROL ] = self::prepare( $data['settings'][ self::CONTROL ] );
		}

		if ( ! empty( $data['elements'] ) && is_array( $data['elements'] ) ) {
			$data['elements'] = $this->sanitize_elements( $data['elements'] );
		}

		return $data;
	}

	private function sanitize_elements( array $elements ): array {
		foreach ( $elements as $index => $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}

			if ( isset( $element['settings'][ self::CONTROL ] ) ) {
				$elements[ $index ]['settings'][ self::CONTROL ] = self::prepare( $element['settings'][ self::CONTROL ] );
			}

			if ( ! empty( $element['elements'] ) && is_array( $element['elements'] ) ) {
				$elements[ $index ]['elements'] = $this->sanitize_elements( $element['elements'] );
			}
		}

		return $elements;
	}

	public function enqueue_editor_assets() {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_enqueue_script( 'refraction-custom-css-editor', REFRACTION_ASSETS_URL . 'js/custom-css-editor' . $suffix . '.js', [ 'refraction-editor' ], REFRACTION_VERSION, true );
	}
}
