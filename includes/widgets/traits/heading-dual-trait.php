<?php
namespace Refraction\Includes\Widgets\Traits;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Dual Heading (Heading widget): a second, highlighted part after the title, in its own color or gradient and with a
 * mark behind it (a highlighter stroke, a rounded highlighter, an underline or a background), which can draw itself
 * when the heading scrolls into view. The heading reads "Title Highlighted text After text", one sentence.
 *
 * Markup: <span class="refraction-heading-dual">…</span> inside the heading. Styles in
 * frontend/partials/_heading-dual.scss (in frontend.css), the drawing in frontend/handlers/heading-dual.js. The widget
 * carries refraction-dual-mark-<style>, refraction-dual-fill-<color|gradient> and refraction-dual-draw-yes.
 */
trait Heading_Dual_Trait {

	/** The Content tab controls, inside the Heading section, after the HTML tag. */
	protected function add_heading_dual_content_controls(): void {
		$this->add_control(
			'rf_dual',
			[
				'label' => esc_html__( 'Dual Heading', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'description' => esc_html__( 'Add a highlighted part after the title, in its own color and with a mark behind it.', 'refraction' ),
				'separator' => 'before',
				'render_type' => 'template',
			]
		);

		$when = [ 'rf_dual' => 'yes' ];

		$this->add_control(
			'rf_dual_text',
			[
				'label' => esc_html__( 'Highlighted Text', 'refraction' ),
				'type' => Controls_Manager::TEXTAREA,
				'rows' => 2,
				'dynamic' => [ 'active' => true ],
				'default' => esc_html__( 'highlighted words', 'refraction' ),
				'placeholder' => esc_html__( 'stride with GoPet AI', 'refraction' ),
				'condition' => $when,
			]
		);

		$this->add_control(
			'rf_dual_after',
			[
				'label' => esc_html__( 'Text After', 'refraction' ),
				'type' => Controls_Manager::TEXT,
				'dynamic' => [ 'active' => true ],
				'placeholder' => '.',
				'description' => esc_html__( 'In the title color, for example the full stop. Punctuation joins without a space.', 'refraction' ),
				'condition' => $when,
			]
		);

		$this->add_control(
			'rf_dual_break',
			[
				'label' => esc_html__( 'Highlighted Text On A New Line', 'refraction' ),
				'type' => Controls_Manager::SWITCHER,
				'condition' => $when,
			]
		);
	}

	/** The Style tab section "Highlighted Text". */
	protected function add_heading_dual_style_controls(): void {
		// Shown for the Dual Heading part, and for the words highlighted with Highlight Words (modules/highlight-words).
		Heading_Dual_Style::controls( $this, [ 'conditions' => [ 'relation' => 'or', 'terms' => [ [ 'name' => 'rf_dual', 'value' => 'yes' ], [ 'name' => 'rf_hl_words', 'operator' => '!==', 'value' => '' ] ] ] ] );
	}

	/**
	 * The heading's inner HTML: the title, then the highlighted part and the text after it when Dual Heading is on.
	 *
	 * @param string $title The title, already sanitized.
	 */
	protected function heading_dual_html( array $settings, string $title ): string {
		$dual = 'yes' === ( $settings['rf_dual'] ?? '' ) ? trim( (string) ( $settings['rf_dual_text'] ?? '' ) ) : '';

		if ( '' === $dual ) {
			return $title;
		}

		$after = (string) ( $settings['rf_dual_after'] ?? '' );
		$joiner = 'yes' === ( $settings['rf_dual_break'] ?? '' ) ? '<br>' : ( '' === trim( $title ) ? '' : ' ' );

		return $title . $joiner . '<span class="refraction-heading-dual">' . wp_kses_post( $dual ) . '</span>' . self::heading_dual_after( $after );
	}

	/** The text after the highlighted part: punctuation joins it directly, anything else after a space. */
	public static function heading_dual_after( string $after ): string {
		if ( '' === trim( $after ) ) {
			return '';
		}

		$after = wp_kses_post( $after );

		return preg_match( '/^[\s]*[.,!?;:)\]}…%’”\'"»\x{3002}\x{FF01}\x{FF1F}]/u', $after ) ? ltrim( $after ) : ' ' . ltrim( $after );
	}
}
