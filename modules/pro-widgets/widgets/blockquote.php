<?php
namespace Refraction\Modules\ProWidgets\Widgets;

use Refraction\Controls_Manager;
use Refraction\Modules\ProWidgets\Base\Pro_Widget;
use Refraction\Modules\ProWidgets\Classes\Share_Links;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Blockquote extends Pro_Widget {

	public function get_name() {
		return 'refraction-blockquote';
	}

	public function get_title() {
		return esc_html__( 'Blockquote', 'refraction' );
	}

	public function get_icon() {
		return 'rficon-blockquote';
	}

	public function get_keywords() {
		return [ 'blockquote', 'quote', 'paragraph', 'testimonial', 'tweet', 'cite' ];
	}

	public function get_style_depends(): array {
		return [ 'widget-blockquote' ];
	}

	protected function register_controls() {
		$this->content_section( 'section_quote', esc_html__( 'Blockquote', 'refraction' ) );

		$this->add_control(
			'quote',
			[
				'label' => esc_html__( 'Quote', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'default' => esc_html__( 'Write the words worth remembering here.', 'refraction' ),
				'rows' => 5,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'author',
			[
				'label' => esc_html__( 'Author', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'John Doe', 'refraction' ),
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'author_title',
			[
				'label' => esc_html__( 'Author Title', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'dynamic' => [ 'active' => true ],
			]
		);

		$this->add_control(
			'skin',
			[
				'label' => esc_html__( 'Skin', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'border',
				'options' => [
					'border' => esc_html__( 'Border', 'refraction' ),
					'quotation' => esc_html__( 'Quotation Mark', 'refraction' ),
					'boxed' => esc_html__( 'Boxed', 'refraction' ),
					'clean' => esc_html__( 'Clean', 'refraction' ),
				],
				'prefix_class' => 'refraction-blockquote--skin-',
				'render_type' => 'template',
				'separator' => 'before',
			]
		);

		$this->align_control( 'text_align', '{{WRAPPER}} .refraction-blockquote', [] );

		$this->end_section();

		$this->content_section( 'section_tweet', esc_html__( 'Tweet Button', 'refraction' ) );

		$this->add_control(
			'tweet_button',
			[
				'label' => esc_html__( 'Show', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'return_value' => 'yes',
				'description' => esc_html__( 'A plain link to X (Twitter) with the quote filled in. Nothing loads from X until the visitor clicks it.', 'refraction' ),
			]
		);

		$this->add_control(
			'tweet_label',
			[
				'label' => esc_html__( 'Label', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'default' => esc_html__( 'Tweet', 'refraction' ),
				'condition' => [ 'tweet_button' => 'yes' ],
			]
		);

		$this->add_control(
			'tweet_target',
			[
				'label' => esc_html__( 'Link To Share', 'refraction' ),
				'type' => Controls_Manager::SELECT,
				'default' => 'current',
				'options' => [
					'current' => esc_html__( 'Current page', 'refraction' ),
					'custom' => esc_html__( 'Custom URL', 'refraction' ),
				],
				'condition' => [ 'tweet_button' => 'yes' ],
			]
		);

		$this->add_control(
			'tweet_url',
			[
				'label' => esc_html__( 'URL', 'refraction' ),
				'type' => Controls_Manager::URL,
				'condition' => [ 'tweet_button' => 'yes', 'tweet_target' => 'custom' ],
			]
		);

		$this->end_section();

		/* ---------------------------------------------------------------- style */
		$this->style_section( 'style_box', esc_html__( 'Box', 'refraction' ) );
		$this->box_style( 'box', '{{WRAPPER}} .refraction-blockquote' );
		$this->add_control(
			'accent_color',
			[
				'label' => esc_html__( 'Accent Color', 'refraction' ),
				'type' => Controls_Manager::COLOR,
				'selectors' => [ '{{WRAPPER}} .refraction-blockquote' => '--refraction-bq-accent: {{VALUE}};' ],
				'description' => esc_html__( 'Border and quotation mark color.', 'refraction' ),
			]
		);
		$this->add_control(
			'accent_width',
			[
				'label' => esc_html__( 'Border Width', 'refraction' ),
				'type' => Controls_Manager::SLIDER,
				'range' => [ 'px' => [ 'min' => 1, 'max' => 20 ] ],
				'selectors' => [ '{{WRAPPER}} .refraction-blockquote' => '--refraction-bq-width: {{SIZE}}{{UNIT}};' ],
				'condition' => [ 'skin' => 'border' ],
			]
		);
		$this->end_section();

		$this->style_section( 'style_quote', esc_html__( 'Quote', 'refraction' ) );
		$this->text_style( 'quote', '{{WRAPPER}} .refraction-blockquote__text' );
		$this->end_section();

		$this->style_section( 'style_author', esc_html__( 'Author', 'refraction' ) );
		$this->text_style( 'author', '{{WRAPPER}} .refraction-blockquote__cite' );
		$this->add_control( 'heading_author_title', [ 'label' => esc_html__( 'Author Title', 'refraction' ), 'type' => Controls_Manager::HEADING, 'separator' => 'before' ] );
		$this->text_style( 'author_title', '{{WRAPPER}} .refraction-blockquote__author-title' );
		$this->end_section();

		$this->style_section( 'style_tweet', esc_html__( 'Tweet Button', 'refraction' ), [ 'tweet_button' => 'yes' ] );
		$this->button_style_controls( 'tweet', '{{WRAPPER}} .refraction-blockquote__tweet' );
		$this->end_section();
	}

	private function current_url(): string {
		global $wp;

		if ( is_singular() && get_permalink() ) {
			return get_permalink();
		}

		return isset( $wp->request ) && '' !== $wp->request ? user_trailingslashit( home_url( $wp->request ) ) : home_url( '/' );
	}

	protected function render() {
		$settings = $this->get_settings_for_display();

		if ( Utils::is_empty( $settings['quote'] ) ) {
			$this->render_editor_hint( esc_html__( 'Write a quote.', 'refraction' ) );
			return;
		}

		$has_author = ! Utils::is_empty( $settings['author'] );
		$has_title = ! Utils::is_empty( $settings['author_title'] );
		$tweet = '';

		if ( 'yes' === $settings['tweet_button'] ) {
			$target = 'custom' === $settings['tweet_target'] && ! empty( $settings['tweet_url']['url'] ) ? $settings['tweet_url']['url'] : $this->current_url();
			$text = Share_Links::tweet_text( (string) $settings['quote'], $has_author ? (string) $settings['author'] : '' );
			$tweet = Share_Links::build( 'x', $target, $text );
			$this->add_render_attribute( 'tweet', [
				'class' => 'refraction-blockquote__tweet',
				'href' => esc_url( $tweet, [ 'https' ] ),
				'target' => '_blank',
				'rel' => 'noopener noreferrer nofollow',
			] );
		}

		$this->add_render_attribute( 'figure', 'class', 'refraction-blockquote' );
		?>
		<figure <?php $this->print_render_attribute_string( 'figure' ); ?>>
			<blockquote class="refraction-blockquote__content">
				<p class="refraction-blockquote__text"><?php echo wp_kses_post( nl2br( esc_html( $settings['quote'] ) ) ); ?></p>
			</blockquote>
			<?php if ( $has_author || $has_title ) : ?>
				<figcaption class="refraction-blockquote__caption">
					<?php if ( $has_author ) : ?>
						<cite class="refraction-blockquote__cite"><?php echo esc_html( $settings['author'] ); ?></cite>
					<?php endif; ?>
					<?php if ( $has_title ) : ?>
						<span class="refraction-blockquote__author-title"><?php echo esc_html( $settings['author_title'] ); ?></span>
					<?php endif; ?>
				</figcaption>
			<?php endif; ?>
			<?php if ( $tweet ) : ?>
				<a <?php $this->print_render_attribute_string( 'tweet' ); ?>>
					<span class="refraction-blockquote__tweet-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" focusable="false"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></span>
					<span class="refraction-blockquote__tweet-label"><?php echo esc_html( $settings['tweet_label'] ); ?></span>
					<span class="refraction-visually-hidden"> <?php esc_html_e( '(opens in a new tab)', 'refraction' ); ?></span>
				</a>
			<?php endif; ?>
		</figure>
		<?php
	}
}
