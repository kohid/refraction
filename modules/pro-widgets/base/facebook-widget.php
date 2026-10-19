<?php
namespace Refraction\Modules\ProWidgets\Base;

use Refraction\Controls_Manager;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Shared by the four Facebook widgets. They print one plain `iframe` that points at a facebook.com plugin page and
 * only when the site owner entered an address. No SDK script and no tracking pixel is added by Refraction; the
 * visitor's browser talks to Facebook only because the iframe is on the page (loaded lazily).
 */
abstract class Facebook_Widget extends Pro_Widget {

	public function get_style_depends(): array {
		return [ 'widget-facebook' ];
	}

	protected function privacy_note_control(): void {
		$this->add_control(
			'privacy_note',
			[
				'type' => Controls_Manager::RAW_HTML,
				'raw' => esc_html__( 'This widget embeds a Facebook plugin. Visitors’ browsers contact Facebook when the frame is on the page (and then Facebook’s own privacy policy applies). Nothing is loaded if no address is entered.', 'refraction' ),
				'content_classes' => 'refraction-descriptor',
			]
		);
	}

	/**
	 * @param string $src    Address built by Facebook_Url (already validated; empty means print nothing).
	 * @param string $title  Accessible name of the frame.
	 */
	protected function render_frame( string $src, string $title, $width, $height, string $extra_class = '' ): void {
		if ( '' === $src ) {
			return;
		}

		$this->add_render_attribute( 'frame', [
			'class' => array_filter( [ 'refraction-facebook__frame', $extra_class ] ),
			'src' => $src,
			'title' => $title,
			'loading' => 'lazy',
			'referrerpolicy' => 'origin-when-cross-origin',
			'allow' => 'encrypted-media',
			'allowfullscreen' => 'true',
			'scrolling' => 'no',
			'width' => $width ? (string) $width : '',
			'height' => $height ? (string) $height : '',
		] );
		?>
		<div class="refraction-facebook">
			<iframe <?php $this->print_render_attribute_string( 'frame' ); ?>></iframe>
		</div>
		<?php
	}

	protected function current_url(): string {
		$url = get_permalink();

		return $url ? $url : home_url( '/' );
	}
}
