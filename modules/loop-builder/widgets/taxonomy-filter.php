<?php
namespace Refraction\Modules\LoopBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\LoopBuilder\Classes\Query_Lookup;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Taxonomy Filter: a row of term buttons that filters a Loop Grid (or Posts widget) of the same page. The
 * grid reloads its items from the server for the chosen term without leaving the page.
 */
class Taxonomy_Filter extends Widget_Base {

	public function get_name() {
		return 'taxonomy-filter';
	}

	public function get_title() {
		return esc_html__( 'Taxonomy Filter', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-taxonomy-filter';
	}

	public function get_categories() {
		return [ Base_Loop_Widget::CATEGORY ];
	}

	public function get_keywords() {
		return [ 'filter', 'taxonomy', 'category', 'tag', 'loop', 'terms' ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-loop-frontend' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-loop-frontend' ];
	}

	protected function is_dynamic_content(): bool {
		return true;
	}

	protected function register_controls() {
		$this->start_controls_section(
			'section_filter',
			[
				'label' => esc_html__( 'Filter', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$taxonomies = [];

		foreach ( get_taxonomies( [ 'public' => true ], 'objects' ) as $taxonomy ) {
			$taxonomies[ $taxonomy->name ] = $taxonomy->label;
		}

		$this->add_control(
			'taxonomy',
			[
				'label' => esc_html__( 'Taxonomy', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => isset( $taxonomies['category'] ) ? 'category' : (string) key( $taxonomies ),
				'options' => $taxonomies,
			]
		);

		$this->add_control(
			'target_id',
			[
				'label' => esc_html__( 'Loop Grid CSS ID', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'description' => esc_html__( 'Set this ID in the Advanced tab of the Loop Grid (or Posts widget). Leave empty to filter the first one on the page.', 'refraction' ),
				'ai' => [ 'active' => false ],
			]
		);

		$this->add_control(
			'show_all',
			[
				'label' => esc_html__( '"All" button', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->add_control(
			'all_label',
			[
				'label' => esc_html__( '"All" label', 'refraction' ),
				'default' => esc_html__( 'All', 'refraction' ),
				'condition' => [ 'show_all' => 'yes' ],
			]
		);

		$this->add_control(
			'show_count',
			[
				'label' => esc_html__( 'Show post count', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
			]
		);

		$this->add_control(
			'hide_empty',
			[
				'label' => esc_html__( 'Hide empty terms', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => 'yes',
			]
		);

		$this->add_control(
			'orderby',
			[
				'label' => esc_html__( 'Order by', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'name',
				'options' => [
					'name' => esc_html__( 'Name', 'refraction' ),
					'count' => esc_html__( 'Post count', 'refraction' ),
					'term_id' => esc_html__( 'ID', 'refraction' ),
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section(
			'section_style',
			[
				'label' => esc_html__( 'Buttons', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_responsive_control(
			'align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'flex-start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'flex-end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				],
				'default' => 'flex-start',
				'selectors' => [ '{{WRAPPER}} .refraction-taxonomy-filter' => 'justify-content: {{VALUE}};' ],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'typography',
				'selector' => '{{WRAPPER}} .refraction-taxonomy-filter__item',
			]
		);

		$this->add_control(
			'color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-taxonomy-filter__item' => 'color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'background',
			[
				'label' => esc_html__( 'Background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-taxonomy-filter__item' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'active_color',
			[
				'label' => esc_html__( 'Active color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-taxonomy-filter__item.is-active' => 'color: {{VALUE}}; border-color: {{VALUE}};' ],
			]
		);

		$this->add_control(
			'active_background',
			[
				'label' => esc_html__( 'Active background', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-taxonomy-filter__item.is-active' => 'background-color: {{VALUE}};' ],
			]
		);

		$this->add_responsive_control(
			'gap',
			[
				'label' => esc_html__( 'Gap', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 40 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-taxonomy-filter' => 'gap: {{SIZE}}{{UNIT}};' ],
			]
		);

		$this->end_controls_section();
	}

	/**
	 * Published posts of the term that a list can show. The stored term count also counts password protected
	 * posts, which the loop widgets never list, so it is counted again.
	 */
	private function count_visible_posts( \WP_Term $term ): int {
		$query = new \WP_Query( [
			'post_type' => Query_Lookup::post_types(),
			'post_status' => 'publish',
			'has_password' => false,
			'posts_per_page' => 1,
			'fields' => 'ids',
			'ignore_sticky_posts' => true,
			'tax_query' => [ [ 'taxonomy' => $term->taxonomy, 'field' => 'term_id', 'terms' => [ $term->term_id ] ] ], // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
		] );

		return (int) $query->found_posts;
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$taxonomy = sanitize_key( (string) $settings['taxonomy'] );
		$public = get_taxonomies( [ 'public' => true ] );

		if ( ! in_array( $taxonomy, $public, true ) ) {
			return;
		}

		$orderby = in_array( $settings['orderby'], [ 'name', 'count', 'term_id' ], true ) ? $settings['orderby'] : 'name';
		$terms = get_terms( [
			'taxonomy' => $taxonomy,
			'hide_empty' => 'yes' === $settings['hide_empty'],
			'orderby' => $orderby,
			'order' => 'count' === $orderby ? 'DESC' : 'ASC',
			'number' => 100,
		] );

		if ( is_wp_error( $terms ) ) {
			return;
		}

		$target = preg_replace( '/[^A-Za-z0-9_\-]/', '', (string) $settings['target_id'] );

		?>
		<div class="refraction-taxonomy-filter" role="group" aria-label="<?php echo esc_attr__( 'Filter', 'refraction' ); ?>" data-taxonomy="<?php echo esc_attr( $taxonomy ); ?>" data-target="<?php echo esc_attr( $target ); ?>">
			<?php if ( 'yes' === $settings['show_all'] ) : ?>
				<button type="button" class="refraction-taxonomy-filter__item is-active" data-term-id="0" aria-pressed="true"><?php echo esc_html( (string) $settings['all_label'] ); ?></button>
			<?php endif; ?>
			<?php foreach ( $terms as $term ) : ?>
				<button type="button" class="refraction-taxonomy-filter__item" data-term-id="<?php echo esc_attr( (string) $term->term_id ); ?>" aria-pressed="false">
					<?php echo esc_html( $term->name ); ?>
					<?php if ( 'yes' === $settings['show_count'] ) : ?>
						<span class="refraction-taxonomy-filter__count"><?php echo esc_html( (string) $this->count_visible_posts( $term ) ); ?></span>
					<?php endif; ?>
				</button>
			<?php endforeach; ?>
		</div>
		<?php
	}
}
