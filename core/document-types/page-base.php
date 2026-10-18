<?php
namespace Refraction\Core\DocumentTypes;

use Refraction\Controls_Manager;
use Refraction\Core\Base\Document;
use Refraction\Group_Control_Background;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

abstract class PageBase extends Document {

	/**
	 * Get Properties
	 *
	 * Return the document configuration properties.
	 *
	 * @since 2.0.8
	 * @access public
	 * @static
	 *
	 * @return array
	 */
	public static function get_properties() {
		$properties = parent::get_properties();

		$properties['admin_tab_group'] = '';
		$properties['support_wp_page_templates'] = true;

		return $properties;
	}

	/**
	 * @since 2.0.0
	 * @access public
	 */
	public function get_css_wrapper_selector() {
		return 'body.refraction-page-' . $this->get_main_id();
	}

	/**
	 * @since 3.1.0
	 * @access protected
	 */
	protected function register_controls() {
		parent::register_controls();

		static::register_hide_title_control( $this );

		static::register_post_fields_control( $this );

		static::register_style_controls( $this );
	}

	/**
	 * @since 2.0.0
	 * @access public
	 * @static
	 * @param Document $document
	 */
	public static function register_hide_title_control( $document ) {
		$document->start_injection( [
			'of' => 'post_status',
			'fallback' => [
				'of' => 'post_title',
			],
		] );

		$document->add_control(
			'hide_title',
			[
				'label' => esc_html__( 'Hide Title', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'description' => sprintf(
					/* translators: 1: Link open tag, 2: Link close tag. */
					esc_html__( 'Set a different selector for the title in the %1$sLayout panel%2$s.', 'refraction' ),
					'<a href="javascript: $e.run( \'panel/global/open\' ).then( () => $e.route( \'panel/global/settings-layout\' ) )">',
					'</a>'
				),
				'separator' => 'before',
				'selectors' => [
					':root' => '--page-title-display: none',
				],
			]
		);

		$document->end_injection();
	}

	/**
	 * @since 2.0.0
	 * @access public
	 * @static
	 * @param Document $document
	 */
	public static function register_style_controls( $document ) {
		$document->start_controls_section(
			'section_page_style',
			[
				'label' => esc_html__( 'Body Style', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$document->add_responsive_control(
			'margin',
			[
				'label' => esc_html__( 'Margin', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}}' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$document->add_responsive_control(
			'padding',
			[
				'label' => esc_html__( 'Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', '%', 'em', 'rem', 'vw', 'custom' ],
				'selectors' => [
					'{{WRAPPER}}' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}}',
				],
			]
		);

		$document->add_group_control(
			Group_Control_Background::get_type(),
			[
				'name'  => 'background',
				'separator' => 'before',
				'fields_options' => [
					'image' => [
						// Currently isn't supported.
						'dynamic' => [
							'active' => false,
						],
					],
				],
			]
		);

		$document->end_controls_section();

	}

	public static function get_labels(): array {
		$plural_label   = static::get_plural_title();
		$singular_label = static::get_title();

		$labels = [
			'name' => $plural_label, // Already translated.
			'singular_name' => $singular_label, // Already translated.
			'all_items' => sprintf(
				/* translators: 1: Plural label. */
				__( 'All %s', 'refraction' ),
				$plural_label
			),
			'add_new' => esc_html__( 'Add New', 'refraction' ),
			'add_new_item' => sprintf(
				/* translators: %s: Singular label. */
				__( 'Add New %s', 'refraction' ),
				$singular_label
			),
			'edit_item' => sprintf(
				/* translators: %s: Singular label. */
				__( 'Edit %s', 'refraction' ),
				$singular_label
			),
			'new_item' => sprintf(
				/* translators: %s: Singular label. */
				__( 'New %s', 'refraction' ),
				$singular_label
			),
			'view_item' => sprintf(
				/* translators: %s: Singular label. */
				__( 'View %s', 'refraction' ),
				$singular_label
			),
			'search_items' => sprintf(
				/* translators: %s: Plural label. */
				__( 'Search %s', 'refraction' ),
				$plural_label
			),
			'not_found' => sprintf(
				/* translators: %s: Plural label. */
				__( 'No %s found.', 'refraction' ),
				strtolower( $plural_label )
			),
			'not_found_in_trash' => sprintf(
				/* translators: %s: Plural label. */
				__( 'No %s found in Trash.', 'refraction' ),
				strtolower( $plural_label )
			),
			'parent_item_colon' => '',
			'menu_name' => $plural_label,
		];

		return $labels;
	}

	/**
	 * @since 2.0.0
	 * @access public
	 * @static
	 * @param Document $document
	 */
	public static function register_post_fields_control( $document ) {
		$document->start_injection( [
			'of' => 'post_status',
			'fallback' => [
				'of' => 'post_title',
			],
		] );

		if ( post_type_supports( $document->post->post_type, 'excerpt' ) ) {
			$document->add_control(
				'post_excerpt',
				[
					'label' => esc_html__( 'Excerpt', 'refraction' ),
					'type' => Controls_Manager::TEXTAREA,
					'default' => $document->post->post_excerpt,
					'separator' => 'before',
					'ai' => [
						'type' => 'excerpt',
					],
				]
			);
		}

		if ( current_theme_supports( 'post-thumbnails' ) && post_type_supports( $document->post->post_type, 'thumbnail' ) ) {
			$document->add_control(
				'post_featured_image',
				[
					'label' => esc_html__( 'Featured Image', 'refraction' ),
					'type' => Controls_Manager::MEDIA,
					'default' => [
						'id' => get_post_thumbnail_id(),
						'url' => (string) get_the_post_thumbnail_url( $document->post->ID ),
					],
					'separator' => 'before',
				]
			);
		}

		if ( is_post_type_hierarchical( $document->post->post_type ) ) {
			$document->add_control(
				'menu_order',
				[
					'label' => esc_html__( 'Order', 'refraction' ),
					'type' => Controls_Manager::NUMBER,
					'default' => $document->post->menu_order,
					'separator' => 'before',
				]
			);
		}

		if ( post_type_supports( $document->post->post_type, 'comments' ) ) {
			$document->add_control(
				'comment_status',
				[
					'label' => esc_html__( 'Allow Comments', 'refraction' ),
					'type' => Controls_Manager::SWITCHER,
					'return_value' => 'open',
					'default' => $document->post->comment_status,
					'separator' => 'before',
				]
			);
		}

		$document->end_injection();
	}

	/**
	 * @since 2.0.0
	 * @access public
	 *
	 * @param array $data
	 *
	 * @throws \Exception If the post ID is not set.
	 */
	public function __construct( array $data = [] ) {
		if ( $data ) {
			$template = get_post_meta( $data['post_id'], '_wp_page_template', true );

			if ( empty( $template ) ) {
				$template = 'default';
			}

			$data['settings']['template'] = $template;
		}

		parent::__construct( $data );
	}
}
