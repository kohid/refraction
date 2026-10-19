<?php
namespace Refraction\Modules\LoopBuilder\Widgets;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Loop Grid: a grid that prints a Loop Item template for each post of a query.
 */
class Loop_Grid extends Template_Loop_Widget {

	public function get_name() {
		return 'loop-grid';
	}

	public function get_title() {
		return esc_html__( 'Loop Grid', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-posts-grid';
	}

	public function get_keywords() {
		return [ 'loop', 'grid', 'posts', 'query', 'template', 'cpt' ];
	}

	public function is_filterable(): bool {
		return true;
	}

	protected function get_layout_class(): string {
		return 'refraction-loop--grid';
	}

	protected function register_controls() {
		$this->register_template_controls();

		$this->start_controls_section(
			'section_layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'tab' => \Refraction\Controls_Manager::TAB_CONTENT,
			]
		);

		$this->register_columns_controls( 3 );

		$this->end_controls_section();

		$this->register_query_controls();
		$this->register_pagination_controls();
		$this->register_pagination_style_controls();
	}

	protected function render() {
		if ( $this->render_missing_template() ) {
			return;
		}

		parent::render();
	}
}
