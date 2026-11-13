<?php
namespace Refraction\Modules\PanelCategories;

use Refraction\Controls_Manager;
use Refraction\Controls_Stack;
use Refraction\Core\Base\Module as BaseModule;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Panel Categories (0.88.0): every long section of the panel gets small category headings (Text, Colors, Box, Motion...)
 * like the Phone Showcase's Style tab, and the editor shows a section's categories as tabs once it is long
 * (groupSection() in regions/panel/pages/editor.js).
 *
 * The headings are added here, by control id, once an element's controls are registered
 * (`refraction/element/after_register_controls`), so widget files and saved settings stay as they are. A heading takes the
 * condition of the setting it stands before (it hides with it), unless one is given. Sections whose settings were in
 * a mixed order (Nav Menu, Nested Carousel arrows, Timed Slides) were reordered in their own files instead.
 *
 * Audit: `node scripts/audit-widget-panels.mjs --port N --all` lists the long sections without categories.
 */
class Module extends BaseModule {

	const PREFIX = 'rfcat_';

	public function get_name() {
		return 'panel-categories';
	}

	public function __construct() {
		parent::__construct();

		add_action( 'refraction/element/after_register_controls', [ $this, 'add_categories' ] );
	}

	/**
	 * The categories: "element/section" (or "* /section" for every element, or "*" for any section) => [ id of the
	 * first setting of the category => label ] or [ id => [ label, condition ] ].
	 *
	 * @return array
	 */
	public static function map(): array {
		$text = esc_html__( 'Text', 'refraction' );
		$colors = esc_html__( 'Colors', 'refraction' );
		$layout = esc_html__( 'Layout', 'refraction' );
		$motion = esc_html__( 'Motion', 'refraction' );
		$place = esc_html__( 'Place', 'refraction' );
		$box = esc_html__( 'Box', 'refraction' );
		$image = esc_html__( 'Image', 'refraction' );
		$button = esc_html__( 'Button', 'refraction' );
		$show = esc_html__( 'Show', 'refraction' );

		return [
			// Shared blocks.
			'*/section_rf_dual_style' => [
				'rf_dual_fill' => $text,
				'rf_dual_mark' => esc_html__( 'Mark Behind', 'refraction' ),
				'rf_dual_draw' => esc_html__( 'Drawing', 'refraction' ),
			],
			'*' => [
				'box_description_display' => esc_html__( 'Long Text', 'refraction' ),
				'box_description_full_tooltip' => esc_html__( 'Tooltip', 'refraction' ),
			],
			'*/section_rf_stack' => [
				'rf_stack' => esc_html__( 'Cards', 'refraction' ),
				'rf_stack_autoplay' => $motion,
				'rf_stack_glow' => esc_html__( 'Look', 'refraction' ),
			],
			'*/section_query' => [
				'query_post_type' => esc_html__( 'Source', 'refraction' ),
				'query_include_term_ids' => esc_html__( 'Include', 'refraction' ),
				'query_exclude_ids' => esc_html__( 'Exclude', 'refraction' ),
				'query_orderby' => esc_html__( 'Order', 'refraction' ),
			],
			'*/section_style_card' => [
				'card_bg_background' => $box,
				'accent' => $colors,
			],

			// Container.
			'container/section_rf_fs' => [
				'rf_fs_shapes' => esc_html__( 'Shapes', 'refraction' ),
				'rf_fs_direction' => $motion,
				'rf_fs_opacity' => $colors,
				'rf_fs_layer' => $place,
			],
			'container/section_rf_ft' => [
				'rf_ft_words' => esc_html__( 'Words', 'refraction' ),
				'rf_ft_effect' => $motion,
				'rf_ft_outline' => esc_html__( 'Look', 'refraction' ),
				'rf_ft_layer' => $place,
			],

			// Heading.
			'heading/section_rf_pill' => [
				'rf_pill_bg' => esc_html__( 'Pill', 'refraction' ),
				'rf_pill_badge_bg' => esc_html__( 'Badge', 'refraction' ),
				'rf_pill_typography_typography' => $text,
			],

			// Phone Showcase (Content).
			'refraction-phone-showcase/section_steps' => [
				'steps' => esc_html__( 'Steps', 'refraction' ),
				'label' => esc_html__( 'Text Above', 'refraction' ),
				'button_text' => esc_html__( 'First Button', 'refraction' ),
				'button2_text' => esc_html__( 'Second Button', 'refraction' ),
			],
			'refraction-phone-showcase/section_device' => [
				'device' => esc_html__( 'Phone', 'refraction' ),
				'frame_top' => [ esc_html__( 'Screen In The Frame', 'refraction' ), [ 'device' => 'custom' ] ],
				'status_bar' => esc_html__( 'Screen', 'refraction' ),
				'tap' => $motion,
			],

			// Carousels and sliders.
			'refraction-nested-carousel/section_options' => [
				'slides_to_show' => esc_html__( 'Slides', 'refraction' ),
				'effect' => $motion,
				'autoplay' => esc_html__( 'Autoplay', 'refraction' ),
				'arrows' => esc_html__( 'Navigation', 'refraction' ),
				'title_nav' => esc_html__( 'Slide Titles', 'refraction' ),
				'lazy_slides' => esc_html__( 'Speed', 'refraction' ),
			],
			'refraction-slides/section_options' => [
				'layout' => $layout,
				'navigation' => esc_html__( 'Navigation', 'refraction' ),
				'autoplay' => esc_html__( 'Autoplay', 'refraction' ),
			],
			'refraction-timed-slides/section_cards' => [
				'show_cards' => esc_html__( 'Next Cards', 'refraction' ),
				'card_width' => [ esc_html__( 'Card Look', 'refraction' ), [ 'show_cards' => 'yes' ] ],
				'show_arrows' => esc_html__( 'Navigation', 'refraction' ),
			],
			'image-carousel/section_image_carousel' => [
				'carousel_name' => esc_html__( 'Images', 'refraction' ),
				'slides_to_show' => esc_html__( 'Slides', 'refraction' ),
				'navigation' => esc_html__( 'Navigation', 'refraction' ),
				'link_to' => esc_html__( 'Link And Caption', 'refraction' ),
			],

			// Boxes with text.
			'icon-box/section_icon' => [
				'selected_icon' => esc_html__( 'Icon', 'refraction' ),
				'title_text' => $text,
			],
			'image-box/section_image' => [
				'image' => $image,
				'title_text' => $text,
			],
			'refraction-call-to-action/section_main' => [
				'skin' => $layout,
				'title' => $text,
				'btn_text' => $button,
			],
			'testimonial/section_testimonial' => [
				'testimonial_content' => $text,
				'testimonial_image' => $image,
				'testimonial_name' => esc_html__( 'Person', 'refraction' ),
				'testimonial_image_position' => $layout,
			],
			'alert/section_alert' => [
				'alert_type' => esc_html__( 'Message', 'refraction' ),
				'show_dismiss' => esc_html__( 'Dismiss', 'refraction' ),
			],
			'text-editor/section_editor' => [
				'drop_cap' => $layout,
			],
			'theme-author-box/section_content' => [
				'source' => esc_html__( 'Author', 'refraction' ),
				'show_avatar' => $show,
				'layout' => $layout,
			],

			// Posts.
			'posts/section_layout' => self::posts_layout(),
			'archive-posts/section_layout' => self::posts_layout(),

			// Dashboards.
			'refraction-stat-card/section_stat' => [
				'icon' => esc_html__( 'Stat', 'refraction' ),
				'prefix' => esc_html__( 'Number Format', 'refraction' ),
				'change' => esc_html__( 'Change', 'refraction' ),
				'spark' => esc_html__( 'Sparkline', 'refraction' ),
				'tone' => esc_html__( 'Look', 'refraction' ),
			],
			'refraction-chart/section_chart' => [
				'type' => esc_html__( 'Chart', 'refraction' ),
				'prefix' => esc_html__( 'Numbers', 'refraction' ),
				'animate' => $motion,
			],
			'refraction-chart/section_style_chart' => [
				'axis_color' => esc_html__( 'Axes And Grid', 'refraction' ),
				'bar_radius' => esc_html__( 'Bars, Lines And Rings', 'refraction' ),
				'values_color' => esc_html__( 'Values And Total', 'refraction' ),
				'legend_color' => esc_html__( 'Legend And Tooltip', 'refraction' ),
			],
			'refraction-data-table/section_style_table' => [
				'head_color' => esc_html__( 'Heading Row', 'refraction' ),
				'cell_color' => esc_html__( 'Cells', 'refraction' ),
				'badge_radius' => esc_html__( 'Badges, Bars And Pictures', 'refraction' ),
				'link_color' => esc_html__( 'Links, Search And Pages', 'refraction' ),
			],

			// Forms and events.
			'refraction-login/section_login' => [
				'user_label' => esc_html__( 'Fields', 'refraction' ),
				'button_text' => $button,
				'remember_me' => esc_html__( 'Links', 'refraction' ),
				'redirect_url' => esc_html__( 'After Login', 'refraction' ),
				'show_logged_in' => esc_html__( 'Logged In', 'refraction' ),
			],
			'rfb-form-canvas/section_style_canvas' => [
				'width' => esc_html__( 'Size', 'refraction' ),
				'background_background' => $box,
			],
			'refraction-countdown/section_timer' => [
				'countdown_type' => esc_html__( 'Timer', 'refraction' ),
				'view' => esc_html__( 'Units And Labels', 'refraction' ),
			],
			'refraction-event-calendar/section_calendar' => [
				'default_view' => esc_html__( 'Views', 'refraction' ),
				'event_types' => esc_html__( 'Events', 'refraction' ),
				'week_start' => esc_html__( 'Month Grid', 'refraction' ),
				'show_search' => esc_html__( 'Search', 'refraction' ),
				'preview' => esc_html__( 'Preview Card', 'refraction' ),
			],
			'refraction-event-details/section_details' => [
				'event' => esc_html__( 'Event', 'refraction' ),
				'show_date' => $show,
				'show_tickets' => esc_html__( 'Buttons', 'refraction' ),
				'layout' => $layout,
			],
			'refraction-events-list/section_list' => [
				'source' => esc_html__( 'Events', 'refraction' ),
				'layout' => $layout,
				'show_image' => $show,
				'button' => $text,
			],

			// Media and 3D.
			'build-scene/section_tools' => [
				'show_tools' => esc_html__( 'Buttons On The Scene', 'refraction' ),
				'grab' => esc_html__( 'Turning', 'refraction' ),
				'spread' => esc_html__( 'Parts View', 'refraction' ),
			],
			'scroll-sequence/section_media' => [
				'source' => esc_html__( 'Frames Or Images', 'refraction' ),
				'video' => esc_html__( 'Video', 'refraction' ),
				'label' => esc_html__( 'Accessibility', 'refraction' ),
			],
			'social-icons/section_social_style' => [
				'icon_color' => $colors,
				'icon_size' => esc_html__( 'Size And Space', 'refraction' ),
				'image_border_border' => $box,
			],
			'video/section_video' => [
				'video_type' => esc_html__( 'Video', 'refraction' ),
			],
			'audio/section_audio' => [
				'link' => esc_html__( 'Track', 'refraction' ),
			],
		];
	}

	private static function posts_layout(): array {
		return [
			'skin' => esc_html__( 'Grid', 'refraction' ),
			'show_image' => esc_html__( 'Image', 'refraction' ),
			'show_title' => esc_html__( 'Title', 'refraction' ),
			'meta_items' => esc_html__( 'Meta', 'refraction' ),
			'show_excerpt' => esc_html__( 'Excerpt', 'refraction' ),
			'show_read_more' => esc_html__( 'Read More', 'refraction' ),
		];
	}

	/**
	 * Adds the element's category headings before their first settings.
	 *
	 * @param Controls_Stack $element The element whose controls were just registered.
	 */
	public function add_categories( $element ): void {
		if ( null !== $element->get_injection_point() ) {
			return;
		}

		$map = self::map();
		$name = $element->get_name();
		$controls = $element->get_controls();
		$first = [];

		foreach ( $controls as $id => $control ) {
			if ( ! empty( $control['section'] ) && ( $control['type'] ?? '' ) !== Controls_Manager::SECTION && ! isset( $first[ $control['section'] ] ) ) {
				$first[ $control['section'] ] = $id;
			}
		}

		foreach ( $map as $key => $categories ) {
			[ $element_name, $section ] = array_pad( explode( '/', $key, 2 ), 2, null );

			if ( '*' !== $element_name && $element_name !== $name ) {
				continue;
			}

			foreach ( $categories as $before => $category ) {
				$target = $controls[ $before ] ?? null;

				if ( ! $target || empty( $target['section'] ) || ( $section && $section !== $target['section'] ) || isset( $controls[ self::PREFIX . $before ] ) ) {
					continue;
				}

				[ $label, $condition ] = is_array( $category ) ? $category : [ $category, null ];
				$args = [
					'label' => $label,
					'type' => Controls_Manager::HEADING,
					'separator' => $first[ $target['section'] ] === $before ? 'none' : 'before',
					'classes' => 'rf-panel-category',
				];

				if ( null !== $condition ) {
					$args['condition'] = $condition;
				} else {
					foreach ( [ 'condition', 'conditions' ] as $rule ) {
						if ( ! empty( $target[ $rule ] ) ) {
							$args[ $rule ] = $target[ $rule ];
						}
					}
				}

				// A heading in the inner tab (Normal / Hover) of its setting stays in that tab.
				$element->start_injection( [ 'of' => $before, 'at' => 'before' ] );
				$element->add_control( self::PREFIX . $before, $args );
				$element->end_injection();
			}
		}
	}
}
