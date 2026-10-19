<?php
namespace Refraction\Modules\LoopBuilder\Widgets;

use Refraction\Controls_Manager;
use Refraction\Group_Control_Typography;
use Refraction\Modules\DynamicTags\Classes\Context;
use Refraction\Modules\LoopBuilder\Classes\Context_Token;
use Refraction\Modules\LoopBuilder\Classes\Pagination;
use Refraction\Modules\LoopBuilder\Classes\Query_Runner;
use Refraction\Modules\LoopBuilder\Controls\Group_Control_Query;
use Refraction\Plugin;
use Refraction\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Shared behaviour of the widgets that print a list of posts: the Query section, pagination (links, load
 * more, infinite scroll), the signed context the front end sends back to the REST endpoint, and
 * `render_page()`, which prints one page of items and is what both the page and the REST endpoint call.
 */
abstract class Base_Loop_Widget extends Widget_Base {

	const CATEGORY = 'refraction-loop';
	const QUERY_PREFIX = 'query_';

	/** Print the HTML of one post. Must return escaped, ready to print markup. */
	abstract protected function render_item( \WP_Post $post, array $settings, int $index, array $opts ): string;

	/** CSS class that tells the front end script which behaviour to attach. */
	abstract protected function get_layout_class(): string;

	public function get_categories() {
		return [ self::CATEGORY ];
	}

	public function get_style_depends(): array {
		return [ 'refraction-loop-frontend' ];
	}

	public function get_script_depends(): array {
		return [ 'refraction-loop-frontend' ];
	}

	/** The output depends on the database and the request, so the element cache must never keep it. */
	protected function is_dynamic_content(): bool {
		return true;
	}

	/** Whether a Taxonomy Filter widget may filter this widget. */
	public function is_filterable(): bool {
		return false;
	}

	/** True when the list is the current archive instead of a configured query. */
	protected function uses_archive_query(): bool {
		return false;
	}

	// ---------------------------------------------------------------------------------------------------
	// Controls
	// ---------------------------------------------------------------------------------------------------

	protected function register_query_controls( array $exclude = [] ): void {
		$this->start_controls_section(
			'section_query',
			[
				'label' => esc_html__( 'Query', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_group_control(
			Group_Control_Query::get_type(),
			[
				'name' => 'query',
				'exclude' => $exclude,
			]
		);

		$this->end_controls_section();
	}

	protected function register_columns_controls( int $default = 3, string $section = 'section_layout' ): void {
		$this->add_responsive_control(
			'columns',
			[
				'label' => esc_html__( 'Columns', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => (string) $default,
				'tablet_default' => '2',
				'mobile_default' => '1',
				'options' => [
					'1' => '1',
					'2' => '2',
					'3' => '3',
					'4' => '4',
					'5' => '5',
					'6' => '6',
				],
				'selectors' => [
					'{{WRAPPER}} .refraction-loop-items' => '--refraction-loop-columns: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'column_gap',
			[
				'label' => esc_html__( 'Column gap', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
				'default' => [ 'size' => 24, 'unit' => 'px' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-loop-items' => '--refraction-loop-column-gap: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->add_responsive_control(
			'row_gap',
			[
				'label' => esc_html__( 'Row gap', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'size_units' => [ 'px', 'em' ],
				'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
				'default' => [ 'size' => 24, 'unit' => 'px' ],
				'selectors' => [
					'{{WRAPPER}} .refraction-loop-items' => '--refraction-loop-row-gap: {{SIZE}}{{UNIT}};',
				],
			]
		);
	}

	protected function register_pagination_controls( string $default = 'none', array $types = [] ): void {
		$this->start_controls_section(
			'section_pagination',
			[
				'label' => esc_html__( 'Pagination', 'refraction' ),
				'tab' => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'pagination_type',
			[
				'label' => esc_html__( 'Pagination', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => $default,
				'options' => $types ? $types : [
					'none' => esc_html__( 'None', 'refraction' ),
					'numbers' => esc_html__( 'Numbers', 'refraction' ),
					'prev_next' => esc_html__( 'Previous / Next', 'refraction' ),
					'numbers_prev_next' => esc_html__( 'Numbers + Previous / Next', 'refraction' ),
					'load_more' => esc_html__( 'Load more button', 'refraction' ),
					'infinite' => esc_html__( 'Infinite load', 'refraction' ),
				],
			]
		);

		$this->add_control(
			'pagination_page_limit',
			[
				'label' => esc_html__( 'Page limit (0 = all)', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'default' => 0,
				'min' => 0,
				'max' => 500,
				'condition' => [ 'pagination_type!' => 'none' ],
			]
		);

		$this->add_control(
			'pagination_prev_label',
			[
				'label' => esc_html__( 'Previous label', 'refraction' ),
				'default' => esc_html__( '&laquo; Previous', 'refraction' ),
				'condition' => [ 'pagination_type' => [ 'prev_next', 'numbers_prev_next' ] ],
			]
		);

		$this->add_control(
			'pagination_next_label',
			[
				'label' => esc_html__( 'Next label', 'refraction' ),
				'default' => esc_html__( 'Next &raquo;', 'refraction' ),
				'condition' => [ 'pagination_type' => [ 'prev_next', 'numbers_prev_next' ] ],
			]
		);

		$this->add_control(
			'load_more_label',
			[
				'label' => esc_html__( 'Button text', 'refraction' ),
				'default' => esc_html__( 'Load more', 'refraction' ),
				'condition' => [ 'pagination_type' => [ 'load_more', 'infinite' ] ],
			]
		);

		$this->add_control(
			'nothing_found_message',
			[
				'label' => esc_html__( 'Nothing found message', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Nothing found.', 'refraction' ),
				'separator' => 'before',
			]
		);

		$this->end_controls_section();
	}

	protected function register_pagination_style_controls(): void {
		$this->start_controls_section(
			'section_pagination_style',
			[
				'label' => esc_html__( 'Pagination', 'refraction' ),
				'tab' => Controls_Manager::TAB_STYLE,
				'condition' => [ 'pagination_type!' => 'none' ],
			]
		);

		$this->add_responsive_control(
			'pagination_align',
			[
				'label' => esc_html__( 'Alignment', 'refraction' ),
				'type' => Controls_Manager::CHOOSE,
				'options' => [
					'flex-start' => [ 'title' => esc_html__( 'Start', 'refraction' ), 'icon' => 'rficon-text-align-left' ],
					'center' => [ 'title' => esc_html__( 'Center', 'refraction' ), 'icon' => 'rficon-text-align-center' ],
					'flex-end' => [ 'title' => esc_html__( 'End', 'refraction' ), 'icon' => 'rficon-text-align-right' ],
				],
				'default' => 'center',
				'selectors' => [
					'{{WRAPPER}} .refraction-pagination, {{WRAPPER}} .refraction-loop-more-wrap' => 'justify-content: {{VALUE}};',
				],
			]
		);

		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name' => 'pagination_typography',
				'selector' => '{{WRAPPER}} .refraction-pagination .page-numbers, {{WRAPPER}} .refraction-loop-more',
			]
		);

		$this->add_control(
			'pagination_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-pagination a.page-numbers, {{WRAPPER}} .refraction-loop-more' => 'color: {{VALUE}};',
				],
			]
		);

		$this->add_control(
			'pagination_active_color',
			[
				'label' => esc_html__( 'Current page color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .refraction-pagination .page-numbers.current' => 'color: {{VALUE}}; border-color: {{VALUE}};',
				],
			]
		);

		$this->add_responsive_control(
			'pagination_spacing',
			[
				'label' => esc_html__( 'Space above', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 0, 'max' => 100 ] ],
				'selectors' => [
					'{{WRAPPER}} .refraction-pagination, {{WRAPPER}} .refraction-loop-more-wrap' => 'margin-top: {{SIZE}}{{UNIT}};',
				],
			]
		);

		$this->end_controls_section();
	}

	// ---------------------------------------------------------------------------------------------------
	// Query and paging
	// ---------------------------------------------------------------------------------------------------

	/**
	 * @param array|null $filter  A sanitised Taxonomy Filter choice.
	 * @param array      $opts    `archive_vars` when running for the REST endpoint.
	 */
	protected function get_query_args( int $paged, ?array $filter, array $opts ): array {
		return Query_Runner::args_from_settings( $this->get_settings_for_display(), self::QUERY_PREFIX, $paged, Query_Runner::sanitize_filter( $filter ) );
	}

	/** Offset the editor chose, which paging has to subtract. */
	protected function get_base_offset(): int {
		return absint( $this->get_settings_for_display( self::QUERY_PREFIX . 'offset' ) );
	}

	protected function get_page_param(): string {
		return 'rpage-' . $this->get_id();
	}

	protected function get_requested_page(): int {
		if ( $this->uses_archive_query() ) {
			return max( 1, (int) get_query_var( 'paged' ) );
		}

		return isset( $_GET[ $this->get_page_param() ] ) ? max( 1, absint( wp_unslash( $_GET[ $this->get_page_param() ] ) ) ) : 1; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	}

	protected function get_page_url( int $page, array $opts ): string {
		$base = $opts['url'] ?? '';

		if ( $this->uses_archive_query() && '' === $base ) {
			return get_pagenum_link( $page );
		}

		if ( '' === $base ) {
			$base = $this->get_current_url();
		}

		if ( $this->uses_archive_query() ) {
			return 1 === $page ? remove_query_arg( 'paged', $base ) : add_query_arg( 'paged', $page, $base );
		}

		return 1 === $page ? remove_query_arg( $this->get_page_param(), $base ) : add_query_arg( $this->get_page_param(), $page, $base );
	}

	protected function get_current_url(): string {
		global $wp;

		$path = isset( $wp->request ) ? $wp->request : '';
		$url = home_url( user_trailingslashit( $path ) );
		$args = [];

		foreach ( (array) $_GET as $key => $value ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			if ( is_scalar( $value ) && 0 !== strpos( (string) $key, 'rpage-' ) && 'paged' !== $key ) {
				$args[ sanitize_key( (string) $key ) ] = sanitize_text_field( wp_unslash( (string) $value ) );
			}
		}

		return $args ? add_query_arg( $args, $url ) : $url;
	}

	/**
	 * Print-ready data for one page: the items markup, the pagination markup and the numbers.
	 *
	 * @return array{items:string,pagination:string,page:int,total:int,has_more:bool,count:int}
	 */
	public function render_page( int $page, ?array $filter = null, array $opts = [] ): array {
		$settings = $this->get_settings_for_display();
		$page = max( 1, $page );
		$query = Query_Runner::query( $this->get_query_args( $page, $filter, $opts ) );
		$per_page = max( 1, (int) $query->get( 'posts_per_page' ) );
		$total = Pagination::total_pages( (int) $query->found_posts, $per_page, $this->uses_archive_query() ? 0 : $this->get_base_offset() );
		$limit = absint( $settings['pagination_page_limit'] ?? 0 );

		if ( $limit && $total > $limit ) {
			$total = $limit;
		}

		if ( $total > 0 && $page > $total ) {
			$page = $total;
			$query = Query_Runner::query( $this->get_query_args( $page, $filter, $opts ) );
		}

		$items = '';
		$ids = [];
		$index = 0;

		foreach ( $query->posts as $post ) {
			if ( ! $post instanceof \WP_Post ) {
				continue;
			}

			$html = $this->render_item( $post, $settings, $index, $opts + [ 'first' => 0 === $index ] );

			if ( '' !== $html ) {
				$items .= $html;
				$ids[] = $post->ID;
				++$index;
			}
		}

		wp_reset_postdata();

		if ( empty( $opts['rest'] ) ) {
			Query_Runner::register_displayed( $ids );
		}

		return [
			'items' => $items,
			'pagination' => $this->render_pagination( $page, $total, $settings, $opts ),
			'page' => $page,
			'total' => $total,
			'has_more' => $page < $total,
			'count' => $index,
		];
	}

	protected function render_pagination( int $page, int $total, array $settings, array $opts ): string {
		$type = (string) ( $settings['pagination_type'] ?? 'none' );

		if ( 'none' === $type || $total < 2 ) {
			return '';
		}

		if ( 'load_more' === $type || 'infinite' === $type ) {
			if ( $page >= $total ) {
				return '';
			}

			return '<div class="refraction-loop-more-wrap"><a class="refraction-loop-more" href="' . esc_url( $this->get_page_url( $page + 1, $opts ) ) . '" data-page="' . esc_attr( (string) ( $page + 1 ) ) . '" role="button">' . esc_html( (string) ( $settings['load_more_label'] ?? '' ) ) . '</a></div>';
		}

		$show_numbers = in_array( $type, [ 'numbers', 'numbers_prev_next' ], true );
		$show_prev_next = in_array( $type, [ 'prev_next', 'numbers_prev_next' ], true );
		$html = '<nav class="refraction-pagination" aria-label="' . esc_attr__( 'Pagination', 'refraction' ) . '">';

		if ( $show_prev_next ) {
			$label = wp_kses_post( (string) ( $settings['pagination_prev_label'] ?? '' ) );
			$html .= $page > 1
				? '<a class="page-numbers prev" rel="prev" href="' . esc_url( $this->get_page_url( $page - 1, $opts ) ) . '" data-page="' . esc_attr( (string) ( $page - 1 ) ) . '">' . $label . '</a>'
				: '<span class="page-numbers prev disabled">' . $label . '</span>';
		}

		if ( $show_numbers ) {
			foreach ( Pagination::pages( $page, $total, 2 ) as $item ) {
				if ( '…' === $item ) {
					$html .= '<span class="page-numbers dots">&hellip;</span>';
				} elseif ( $item === $page ) {
					$html .= '<span class="page-numbers current" aria-current="page">' . esc_html( (string) $item ) . '</span>';
				} else {
					$html .= '<a class="page-numbers" href="' . esc_url( $this->get_page_url( (int) $item, $opts ) ) . '" data-page="' . esc_attr( (string) $item ) . '">' . esc_html( (string) $item ) . '</a>';
				}
			}
		}

		if ( $show_prev_next ) {
			$label = wp_kses_post( (string) ( $settings['pagination_next_label'] ?? '' ) );
			$html .= $page < $total
				? '<a class="page-numbers next" rel="next" href="' . esc_url( $this->get_page_url( $page + 1, $opts ) ) . '" data-page="' . esc_attr( (string) ( $page + 1 ) ) . '">' . $label . '</a>'
				: '<span class="page-numbers next disabled">' . $label . '</span>';
		}

		return $html . '</nav>';
	}

	// ---------------------------------------------------------------------------------------------------
	// Output
	// ---------------------------------------------------------------------------------------------------

	/** What the browser may send back: which document and widget, and (for archives) the query variables. */
	protected function get_context_token(): string {
		$document = Plugin::$instance->documents->get_current();
		$post = Context::get_post();
		$data = [
			'doc' => $document ? (int) $document->get_main_id() : (int) get_the_ID(),
			'widget' => $this->get_id(),
			'post' => $post ? $post->ID : 0,
			'url' => esc_url_raw( $this->get_current_url() ),
		];

		if ( $this->uses_archive_query() ) {
			$data['archive'] = Query_Runner::archive_vars();
		}

		return Context_Token::sign( $data, self::signing_key() );
	}

	public static function signing_key(): string {
		return wp_salt( 'auth' ) . '|refraction-loop';
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$page = $this->get_requested_page();
		$is_edit = Plugin::$instance->editor->is_edit_mode();
		$result = $this->render_page( $page, null, $is_edit ? [] : [ 'url' => $this->uses_archive_query() ? '' : $this->get_current_url() ] );
		$type = (string) ( $settings['pagination_type'] ?? 'none' );

		$this->add_render_attribute( 'loop', [
			'class' => [ 'refraction-loop', $this->get_layout_class() ],
			'data-pagination' => $type,
			'data-page' => (string) $result['page'],
			'data-total' => (string) $result['total'],
			'data-widget-type' => $this->get_name(),
			'data-filterable' => $this->is_filterable() ? '1' : '0',
		] );

		if ( ! $is_edit ) {
			$this->add_render_attribute( 'loop', 'data-token', $this->get_context_token() );
		}

		?>
		<div <?php $this->print_render_attribute_string( 'loop' ); ?>>
			<?php echo $this->get_before_items_html( $result ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?>
			<?php if ( 0 === $result['count'] ) : ?>
				<p class="refraction-loop-empty"><?php echo esc_html( (string) ( $settings['nothing_found_message'] ?? '' ) ); ?></p>
				<div class="<?php echo esc_attr( $this->get_items_class() ); ?>" hidden></div>
			<?php else : ?>
				<div class="<?php echo esc_attr( $this->get_items_class() ); ?>">
					<?php echo $result['items']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts and builder output. ?>
				</div>
			<?php endif; ?>
			<div class="refraction-loop-pagination">
				<?php echo $result['pagination']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?>
			</div>
			<div class="refraction-loop-status screen-reader-text" role="status" aria-live="polite"></div>
		</div>
		<?php
	}

	protected function get_items_class(): string {
		return 'refraction-loop-items';
	}

	/** Markup printed above the items (the Portfolio filter bar). */
	protected function get_before_items_html( array $result ): string {
		return '';
	}

	/** Runs `$callback` with the post as the current post (global post, template tags and dynamic tags). */
	protected function with_post( \WP_Post $post, callable $callback ) {
		$previous = $GLOBALS['post'] ?? null;
		$GLOBALS['post'] = $post; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited
		setup_postdata( $post );
		Context::push_post( $post->ID );

		try {
			return $callback();
		} finally {
			Context::pop_post();
			$GLOBALS['post'] = $previous; // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited

			if ( $previous instanceof \WP_Post ) {
				setup_postdata( $previous );
			} else {
				wp_reset_postdata();
			}
		}
	}

	/** Escaped image markup for the featured image of a post, '' when it has none. */
	protected function get_thumbnail_html( \WP_Post $post, string $size, string $class = '' ): string {
		$id = (int) get_post_thumbnail_id( $post );

		if ( ! $id ) {
			return '';
		}

		$sizes = array_merge( get_intermediate_image_sizes(), [ 'full' ] );

		return wp_get_attachment_image( $id, in_array( $size, $sizes, true ) ? $size : 'medium_large', false, [ 'class' => $class, 'loading' => 'lazy' ] );
	}

	protected function get_image_size_options(): array {
		$options = [];

		foreach ( array_merge( get_intermediate_image_sizes(), [ 'full' ] ) as $size ) {
			$options[ $size ] = ucwords( str_replace( [ '_', '-' ], ' ', $size ) );
		}

		return $options;
	}

	/** Makes Widget_Base print a placeholder JS template: the editor renders these widgets on the server. */
	protected function content_template() {}
}
