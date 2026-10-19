<?php
/**
 * Test helper for scripts/check-loop-builder.mjs, copied into mu-plugins by the check (test sites only).
 * - the shortcode [lb_sc]
 * - a stand-in for Advanced Custom Fields: when the option lb_fake_acf is set, get_field() exists
 * - option lb_archive_page: that page's Refraction content is printed in the footer of every archive
 */
add_shortcode( 'lb_sc', fn() => 'SC-OK' );

if ( get_option( 'lb_fake_acf' ) && ! function_exists( 'get_field' ) ) {
	function get_field( $key, $source = null ) {
		$map = [
			'acf_demo' => 'ACF-TEXT',
			'acf_number' => '42',
			'acf_url' => 'https://example.com/acf',
			'acf_color' => '#aa5500',
			'acf_date' => '20250131',
			'acf_image' => [ 'ID' => (int) get_option( 'lb_fake_acf_image' ), 'url' => '' ],
			'acf_gallery' => [ (int) get_option( 'lb_fake_acf_image' ) ],
		];

		return $map[ $key ] ?? null;
	}
}

add_action( 'wp_footer', function () {
	$id = (int) get_option( 'lb_archive_page' );

	if ( $id && is_archive() && class_exists( '\Refraction\Plugin' ) ) {
		echo '<div id="lb-archive-footer">' . \Refraction\Plugin::$instance->frontend->get_builder_content_for_display( $id, true ) . '</div>'; // phpcs:ignore
	}
} );
