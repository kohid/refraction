<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Carousel_Kit;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Review_Logic;
use Refraction\Repeater;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Review cards with a star rating, from data the owner types in (no review service is contacted).
 */
class Reviews extends Pro_Widget {

	use Carousel_Kit;

	public function get_name() {
		return 'refraction-reviews';
	}

	public function get_title() {
		return esc_html__( 'Reviews', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-review';
	}

	public function get_keywords() {
		return [ 'reviews', 'rating', 'stars', 'testimonial', 'feedback', 'carousel' ];
	}

	public function get_style_depends(): array {
		return [ 'e-swiper', 'widget-pro-carousel', 'widget-reviews' ];
	}

	public function get_script_depends(): array {
		return [ 'swiper' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_reviews', esc_html__( 'Reviews', 'refraction' ) );

		$repeater = new Repeater();

		$repeater->add_control(
			'name',
			[
				'label' => esc_html__( 'Name', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Reviewer', 'refraction' ),
				'label_block' => true,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'rating',
			[
				'label' => esc_html__( 'Rating', 'refraction' ),
				'type' => Controls_Manager::NUMBER,
				'min' => 0,
				'max' => 5,
				'step' => 0.5,
				'default' => 5,
			]
		);

		$repeater->add_control(
			'content',
			[
				'label' => esc_html__( 'Review', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'Great product and friendly service.', 'refraction' ),
				'rows' => 4,
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'date',
			[
				'label' => esc_html__( 'Date', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => esc_html__( 'March 2026', 'refraction' ),
				'dynamic' => [ 'active' => true ],
			]
		);

		$repeater->add_control(
			'source',
			[
				'label' => esc_html__( 'Source Label', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'placeholder' => esc_html__( 'Verified buyer', 'refraction' ),
				'description' => esc_html__( 'Plain text only; nothing is fetched from another site.', 'refraction' ),
			]
		);

		$repeater->add_control(
			'image',
			[
				'label' => esc_html__( 'Avatar', 'refraction' ),
				'type' => Controls_Manager::MEDIA,
			]
		);

		$this->add_control(
			'reviews',
			[
				'label' => esc_html__( 'Items', 'refraction' ),
				'type' => Controls_Manager::REPEATER,
				'fields' => $repeater->get_controls(),
				'default' => [
					[ 'name' => 'Alex', 'rating' => 5, 'content' => 'Great product and friendly service.' ],
					[ 'name' => 'Sam', 'rating' => 4.5, 'content' => 'Does what it says. Would buy again.' ],
					[ 'name' => 'Kim', 'rating' => 4, 'content' => 'Good value for money.' ],
				],
				'title_field' => '{{{ name }}} ({{{ rating }}})',
			]
		);

		$this->add_control(
			'layout',
			[
				'label' => esc_html__( 'Layout', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'grid',
				'options' => [
					'grid' => esc_html__( 'Grid', 'refraction' ),
					'carousel' => esc_html__( 'Carousel', 'refraction' ),
				],
				'separator' => 'before',
			]
		);

		$this->add_responsive_control(
			'columns',
			[
				'label' => esc_html__( 'Columns', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '3',
				'tablet_default' => '2',
				'mobile_default' => '1',
				'options' => [ '1' => '1', '2' => '2', '3' => '3', '4' => '4' ],
				'selectors' => [ '{{WRAPPER}} .refraction-reviews--grid' => 'grid-template-columns: repeat({{VALUE}}, minmax(0, 1fr));' ],
				'condition' => [ 'layout' => 'grid' ],
			]
		);

		$this->add_responsive_control(
			'gap',
			[
				'label' => esc_html__( 'Gap', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'max' => 80 ] ],
				'default' => [ 'size' => 20, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-reviews--grid' => 'gap: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'layout' => 'grid' ],
			]
		);

		$this->add_control(
			'max_stars',
			[
				'label' => esc_html__( 'Stars', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => '5',
				'options' => [ '3' => '3', '4' => '4', '5' => '5', '10' => '10' ],
			]
		);

		$this->add_control(
			'show_rating_number',
			[
				'label' => esc_html__( 'Show Rating Number', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'default' => '',
				'return_value' => 'yes',
			]
		);

		$this->end_section();

		$this->carousel_options_section( [ 'default_per_view' => 3, 'condition' => [ 'layout' => 'carousel' ] ] );

		$this->style_section( 'section_rv_card', esc_html__( 'Card', 'refraction' ) );
		$this->box_style( 'rv_card', '{{WRAPPER}} .refraction-review' );
		$this->end_section();

		$this->style_section( 'section_rv_text', esc_html__( 'Text', 'refraction' ) );
		$this->text_style( 'rv_content', '{{WRAPPER}} .refraction-review__content' );
		$this->text_style( 'rv_name', '{{WRAPPER}} .refraction-review__name' );
		$this->text_style( 'rv_meta', '{{WRAPPER}} .refraction-review__meta' );
		$this->end_section();

		$this->style_section( 'section_rv_stars', esc_html__( 'Stars', 'refraction' ) );
		$this->add_control(
			'star_color',
			[
				'label' => esc_html__( 'Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#f5a623',
				'selectors' => [ '{{WRAPPER}} .refraction-stars' => '--refraction-star-color: {{VALUE}};' ],
			]
		);
		$this->add_control(
			'star_empty_color',
			[
				'label' => esc_html__( 'Empty Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'default' => '#d0d5dd',
				'selectors' => [ '{{WRAPPER}} .refraction-stars' => '--refraction-star-empty: {{VALUE}};' ],
			]
		);
		$this->add_responsive_control(
			'star_size',
			[
				'label' => esc_html__( 'Size', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 10, 'max' => 40 ] ],
				'default' => [ 'size' => 18, 'unit' => 'px' ],
				'selectors' => [ '{{WRAPPER}} .refraction-stars' => 'font-size: {{SIZE}}{{UNIT}};' ],
			]
		);
		$this->end_section();

		$this->carousel_nav_style_section( [ 'layout' => 'carousel' ] );
	}

	private function star_svg(): string {
		return '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
	}

	private function render_stars( $rating, int $max ): void {
		$value = Review_Logic::clamp( $rating, $max );
		/* translators: 1: rating, 2: maximum rating */
		$label = sprintf( __( 'Rated %1$s out of %2$s', 'refraction' ), Review_Logic::format( $value ), $max );

		echo '<span class="refraction-stars" role="img" aria-label="' . esc_attr( $label ) . '">';
		foreach ( Review_Logic::stars( $value, $max ) as $state ) {
			echo '<span class="refraction-star refraction-star--' . esc_attr( $state ) . '" aria-hidden="true">';
			echo '<span class="refraction-star__base">' . $this->star_svg() . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG.
			if ( 'empty' !== $state ) {
				echo '<span class="refraction-star__fill">' . $this->star_svg() . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG.
			}
			echo '</span>';
		}
		echo '</span>';
	}

	private function render_review( array $settings, array $review, string $tag, string $key, int $index, int $total, bool $in_carousel ): void {
		$max = (int) $settings['max_stars'];
		$classes = [ 'refraction-review', 'refraction-repeater-item-' . $review['_id'] ];

		if ( $in_carousel ) {
			$this->add_slide_attributes( $key, $index, $total, $classes );
		} else {
			$this->add_render_attribute( $key, 'class', $classes, true );
		}

		$avatar = ! empty( $review['image']['url'] ) ? $review['image']['url'] : '';
		?>
		<<?php Utils::print_validated_html_tag( $tag ); ?> <?php $this->print_render_attribute_string( $key ); ?>>
			<div class="refraction-review__top">
				<?php if ( $avatar ) : ?>
					<img class="refraction-review__avatar" src="<?php echo esc_url( $avatar ); ?>" alt="" loading="lazy" width="48" height="48">
				<?php endif; ?>
				<div class="refraction-review__who">
					<?php if ( ! Utils::is_empty( $review['name'] ) ) : ?>
						<span class="refraction-review__name"><?php echo esc_html( $review['name'] ); ?></span>
					<?php endif; ?>
					<?php if ( ! Utils::is_empty( $review['source'] ?? '' ) || ! Utils::is_empty( $review['date'] ?? '' ) ) : ?>
						<span class="refraction-review__meta"><?php echo esc_html( trim( ( $review['source'] ?? '' ) . ( ! Utils::is_empty( $review['source'] ?? '' ) && ! Utils::is_empty( $review['date'] ?? '' ) ? ', ' : '' ) . ( $review['date'] ?? '' ) ) ); ?></span>
					<?php endif; ?>
				</div>
			</div>
			<div class="refraction-review__rating">
				<?php $this->render_stars( $review['rating'] ?? 0, $max ); ?>
				<?php if ( 'yes' === $settings['show_rating_number'] ) : ?>
					<span class="refraction-review__number" aria-hidden="true"><?php echo esc_html( Review_Logic::format( Review_Logic::clamp( $review['rating'] ?? 0, $max ) ) ); ?></span>
				<?php endif; ?>
			</div>
			<?php if ( ! Utils::is_empty( $review['content'] ?? '' ) ) : ?>
				<p class="refraction-review__content"><?php echo wp_kses_post( nl2br( esc_html( $review['content'] ) ) ); ?></p>
			<?php endif; ?>
		</<?php Utils::print_validated_html_tag( $tag ); ?>>
		<?php
	}

	protected function render() {
		$settings = $this->get_settings_for_display();
		$reviews = array_values( $settings['reviews'] ?? [] );

		if ( empty( $reviews ) ) {
			$this->render_editor_hint( esc_html__( 'Add at least one review.', 'refraction' ) );
			return;
		}

		$total = count( $reviews );

		if ( 'carousel' === $settings['layout'] ) {
			$this->add_carousel_attributes( $settings, __( 'Reviews', 'refraction' ), 'refraction-reviews' );
			?>
			<div class="refraction-pc-wrapper">
				<div <?php $this->print_render_attribute_string( 'carousel' ); ?>>
					<div class="refraction-pc__track swiper-wrapper">
						<?php foreach ( $reviews as $index => $review ) : ?>
							<?php $this->render_review( $settings, $review, 'article', 'review_' . $index, $index, $total, true ); ?>
						<?php endforeach; ?>
					</div>
					<?php $this->render_carousel_nav( $settings, $total ); ?>
				</div>
			</div>
			<?php
			return;
		}
		?>
		<div class="refraction-reviews refraction-reviews--grid">
			<?php foreach ( $reviews as $index => $review ) : ?>
				<?php $this->render_review( $settings, $review, 'article', 'review_' . $index, $index, $total, false ); ?>
			<?php endforeach; ?>
		</div>
		<?php
	}
}
