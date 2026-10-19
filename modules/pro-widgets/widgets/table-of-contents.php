<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Table of Contents. The list is built in the browser from the headings that are really on the page
 * (so it also covers headings from other widgets and from the theme).
 */
class Table_Of_Contents extends Pro_Widget {

	public function get_name() {
		return 'refraction-table-of-contents';
	}

	public function get_title() {
		return esc_html__( 'Table of Contents', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-table-of-contents';
	}

	public function get_keywords() {
		return [ 'toc', 'table of contents', 'headings', 'index', 'outline', 'anchor', 'navigation' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-table-of-contents' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_toc', esc_html__( 'Table of Contents', 'refraction' ) );

		$this->add_control(
			'toc_title',
			[
				'label' => esc_html__( 'Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Table of Contents', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'title_tag',
			[
				'label' => esc_html__( 'Title HTML Tag', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'options' => $this->heading_tag_options(),
				'default' => 'h4',
			]
		);

		$this->add_control(
			'headings',
			[
				'label' => esc_html__( 'Headings To List', 'refraction' ),
				'type' => Controls_Manager::SELECT2,
				'multiple' => true,
				'options' => [
					'h1' => 'H1',
					'h2' => 'H2',
					'h3' => 'H3',
					'h4' => 'H4',
					'h5' => 'H5',
					'h6' => 'H6',
				],
				'default' => [ 'h2', 'h3', 'h4' ],
				'frontend_available' => true,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'container_selector',
			[
				'label' => esc_html__( 'Look For Headings In', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => esc_html__( 'Automatic (the page content)', 'refraction' ),
				'label_block' => true,
				'frontend_available' => true,
				'description' => esc_html__( 'A CSS selector, e.g. .entry-content or #article. Leave empty to use the main content of the page.', 'refraction' ),
			]
		);

		$this->add_control(
			'exclude_selector',
			[
				'label' => esc_html__( 'Skip Headings Matching', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => '.no-toc, .widget-title',
				'label_block' => true,
				'frontend_available' => true,
				'description' => esc_html__( 'Headings with the class "refraction-toc-ignore" are always skipped.', 'refraction' ),
			]
		);

		$this->add_control(
			'marker',
			[
				'label' => esc_html__( 'Marker', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'numbers',
				'options' => [
					'numbers' => esc_html__( 'Numbers (1, 1.1, 1.2...)', 'refraction' ),
					'bullets' => esc_html__( 'Bullets', 'refraction' ),
					'none' => esc_html__( 'None', 'refraction' ),
				],
				'prefix_class' => 'refraction-toc--marker-',
				'frontend_available' => true,
				'separator' => 'before',
			]
		);

		$this->add_control(
			'hide_when_empty',
			[
				'label' => esc_html__( 'Hide When No Headings', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'default' => '',
			]
		);

		$this->add_control(
			'empty_message',
			[
				'label' => esc_html__( 'Message When Empty', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'No headings found on this page.', 'refraction' ),
				'condition' => [ 'hide_when_empty!' => 'yes' ],
				'label_block' => true,
			]
		);

		$this->end_section();

		$this->content_section( 'section_behavior', esc_html__( 'Behavior', 'refraction' ) );

		$this->add_control(
			'smooth_scroll',
			[
				'label' => esc_html__( 'Smooth Scroll', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'description' => esc_html__( 'Ignored for visitors who ask their system for reduced motion.', 'refraction' ),
				'frontend_available' => true,
			]
		);

		$this->add_responsive_control(
			'scroll_offset',
			[
				'label' => esc_html__( 'Scroll Offset', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 400 ] ],
				'default' => [ 'size' => 0, 'unit' => 'px' ],
				'description' => esc_html__( 'Space kept above the heading, for example for a sticky header.', 'refraction' ),
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'highlight_active',
			[
				'label' => esc_html__( 'Highlight Current Section', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'frontend_available' => true,
			]
		);

		$this->add_control(
			'collapsible',
			[
				'label' => esc_html__( 'Collapsible', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
				'return_value' => 'yes',
				'render_type' => 'template',
				'separator' => 'before',
			]
		);

		$this->add_control(
			'start_collapsed',
			[
				'label' => esc_html__( 'Start Collapsed', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'condition' => [ 'collapsible' => 'yes' ],
				'render_type' => 'template',
			]
		);

		$this->add_control(
			'sticky',
			[
				'label' => esc_html__( 'Sticky', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'prefix_class' => 'refraction-toc--sticky-',
				'description' => esc_html__( 'Keeps the list in view while the visitor scrolls past it. It stays inside its parent container, so give that container the height of the article.', 'refraction' ),
			]
		);

		$this->add_responsive_control(
			'sticky_offset',
			[
				'label' => esc_html__( 'Distance From Top', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 300 ] ],
				'default' => [ 'size' => 20, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}}.refraction-toc--sticky-yes' => 'top: calc({{SIZE}}{{UNIT}} + var(--wp-admin--admin-bar--height, 0px));' ],
				'condition' => [ 'sticky' => 'yes' ],
			]
		);

		$this->end_section();

		/* ---------------------------------------------------------------- style */
		$this->style_section( 'style_box', esc_html__( 'Box', 'refraction' ) );
		$this->box_style( 'box', '{{WRAPPER}} .refraction-toc' );
		$this->add_responsive_control(
			'max_height',
			[
				'label' => esc_html__( 'Maximum List Height', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'vh' ],
				'range' => [ 'px' => [ 'min' => 100, 'max' => 1000 ], 'vh' => [ 'min' => 10, 'max' => 100 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-toc__body' => 'max-height: {{SIZE}}{{UNIT}}; overflow-y: auto;' ],
			]
		);
		$this->end_section();

		$this->style_section( 'style_title', esc_html__( 'Title', 'refraction' ) );
		$this->text_style( 'title', '{{WRAPPER}} .refraction-toc__title' );
		$this->add_control(
			'header_bg',
			[
				'label' => esc_html__( 'Header Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-toc__header' => 'background-color: {{VALUE}};' ],
			]
		);
		$this->add_responsive_control(
			'header_padding',
			[
				'label' => esc_html__( 'Header Padding', 'refraction' ),
				'type' => Controls_Manager::DIMENSIONS,
				'size_units' => [ 'px', 'em' ],
				'selectors' => [ '{{WRAPPER}} .refraction-toc__header' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};' ],
			]
		);
		$this->end_section();

		$this->style_section( 'style_list', esc_html__( 'List', 'refraction' ) );
		$this->text_style( 'items', '{{WRAPPER}} .refraction-toc__link' );
		$this->add_control(
			'items_hover_color',
			[
				'label' => esc_html__( 'Hover Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-toc__link:hover, {{WRAPPER}} .refraction-toc__link:focus-visible' => 'color: {{VALUE}};' ],
			]
		);
		$this->add_control(
			'items_active_color',
			[
				'label' => esc_html__( 'Current Section Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-toc__link[aria-current="location"]' => 'color: {{VALUE}};' ],
			]
		);
		$this->add_responsive_control(
			'items_gap',
			[
				'label' => esc_html__( 'Space Between Items', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 40 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-toc__item' => 'margin-top: {{SIZE}}{{UNIT}};' ],
			]
		);
		$this->add_responsive_control(
			'indent',
			[
				'label' => esc_html__( 'Indent Per Level', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'max' => 80 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-toc__list .refraction-toc__list' => 'padding-inline-start: {{SIZE}}{{UNIT}};' ],
			]
		);
		$this->end_section();
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$tag = Utils::validate_html_tag( $settings['title_tag'] ?? 'h4' );
		$collapsible = 'yes' === $settings['collapsible'];
		$collapsed = $collapsible && 'yes' === $settings['start_collapsed'];
		$body_id = 'refraction-toc-body-' . $this->get_id();
		$has_title = ! Utils::is_empty( $settings['toc_title'] );
		$label = $has_title ? $settings['toc_title'] : __( 'Table of Contents', 'refraction' );

		$this->add_render_attribute( 'toc', [
			'class' => [ 'refraction-toc', $collapsed ? 'is-collapsed' : '' ],
			'data-hide-empty' => 'yes' === $settings['hide_when_empty'] ? 'yes' : 'no',
		] );
		?>
		<div <?php $this->print_render_attribute_string( 'toc' ); ?>>
			<?php if ( $has_title || $collapsible ) : ?>
				<div class="refraction-toc__header">
					<?php if ( $has_title ) : ?>
						<<?php Utils::print_validated_html_tag( $tag ); ?> class="refraction-toc__title"><?php echo esc_html( $settings['toc_title'] ); ?></<?php Utils::print_validated_html_tag( $tag ); ?>>
					<?php endif; ?>
					<?php if ( $collapsible ) : ?>
						<button type="button" class="refraction-toc__toggle" aria-expanded="<?php echo $collapsed ? 'false' : 'true'; ?>" aria-controls="<?php echo esc_attr( $body_id ); ?>">
							<span class="refraction-toc__toggle-icon" aria-hidden="true"></span>
							<span class="refraction-visually-hidden"><?php
								/* translators: %s: widget title */
								echo esc_html( sprintf( __( 'Toggle %s', 'refraction' ), wp_strip_all_tags( $label ) ) );
							?></span>
						</button>
					<?php endif; ?>
				</div>
			<?php endif; ?>
			<div class="refraction-toc__body" id="<?php echo esc_attr( $body_id ); ?>"<?php echo $collapsed ? ' hidden' : ''; ?>>
				<nav class="refraction-toc__nav" aria-label="<?php echo esc_attr( $label ); ?>"></nav>
				<?php if ( 'yes' !== $settings['hide_when_empty'] ) : ?>
					<p class="refraction-toc__empty" hidden><?php echo esc_html( $settings['empty_message'] ); ?></p>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}
}
