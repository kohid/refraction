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

	if ( $id && ( is_archive() || is_search() || is_home() ) && class_exists( '\Refraction\Plugin' ) ) {
		echo '<div id="lb-archive-footer">' . \Refraction\Plugin::$instance->frontend->get_builder_content_for_display( $id, true ) . '</div>'; // phpcs:ignore
	}
} );

/**
 * A widget with one dynamic-enabled control of every type, to check the dynamic switcher in the editor and
 * the values on the front end.
 */
add_action( 'refraction/widgets/register', function ( $widgets_manager ) {
	if ( ! class_exists( 'LB_Dynamic_Test' ) ) {
		class LB_Dynamic_Test extends \Refraction\Widget_Base {
			public function get_name() {
				return 'lb-dynamic-test';
			}

			public function get_title() {
				return 'LB Dynamic Test';
			}

			public function get_icon() {
				return 'rficon-database';
			}

			protected function is_dynamic_content(): bool {
				return true;
			}

			protected function register_controls() {
				$this->start_controls_section( 'content', [ 'label' => 'Content' ] );
				$dynamic = [ 'active' => true ];
				$this->add_control( 't_text', [ 'label' => 'Text', 'type' => \Refraction\Controls_Manager::TEXT, 'dynamic' => $dynamic ] );
				$this->add_control( 't_textarea', [ 'label' => 'Textarea', 'type' => \Refraction\Controls_Manager::TEXTAREA, 'dynamic' => $dynamic ] );
				$this->add_control( 't_wysiwyg', [ 'label' => 'Wysiwyg', 'type' => \Refraction\Controls_Manager::WYSIWYG, 'dynamic' => $dynamic ] );
				$this->add_control( 't_url', [ 'label' => 'Url', 'type' => \Refraction\Controls_Manager::URL, 'dynamic' => $dynamic ] );
				$this->add_control( 't_image', [ 'label' => 'Image', 'type' => \Refraction\Controls_Manager::MEDIA, 'dynamic' => $dynamic ] );
				$this->add_control( 't_gallery', [ 'label' => 'Gallery', 'type' => \Refraction\Controls_Manager::GALLERY, 'dynamic' => $dynamic ] );
				$this->add_control( 't_number', [ 'label' => 'Number', 'type' => \Refraction\Controls_Manager::NUMBER, 'dynamic' => $dynamic ] );
				$this->add_control( 't_color', [ 'label' => 'Color', 'type' => \Refraction\Controls_Manager::COLOR, 'dynamic' => $dynamic ] );
				$this->add_control( 't_date', [ 'label' => 'Date', 'type' => \Refraction\Controls_Manager::DATE_TIME, 'dynamic' => $dynamic ] );
				$this->end_controls_section();
			}

			protected function render() {
				$s = $this->get_settings_for_display();
				$gallery = array_map( fn( $i ) => esc_url( $i['url'] ?? '' ), (array) ( $s['t_gallery'] ?? [] ) );
				?>
				<div class="lb-dyn">
					<p class="lb-dyn-text"><?php echo esc_html( (string) $s['t_text'] ); ?></p>
					<p class="lb-dyn-textarea"><?php echo esc_html( (string) $s['t_textarea'] ); ?></p>
					<div class="lb-dyn-wysiwyg"><?php echo wp_kses_post( (string) $s['t_wysiwyg'] ); ?></div>
					<a class="lb-dyn-url" href="<?php echo esc_url( (string) ( $s['t_url']['url'] ?? '' ) ); ?>">link</a>
					<img class="lb-dyn-image" alt="" src="<?php echo esc_url( (string) ( $s['t_image']['url'] ?? '' ) ); ?>">
					<p class="lb-dyn-gallery"><?php echo esc_html( implode( ' ', $gallery ) ); ?></p>
					<p class="lb-dyn-number"><?php echo esc_html( (string) $s['t_number'] ); ?></p>
					<p class="lb-dyn-color" style="color: <?php echo esc_attr( (string) $s['t_color'] ); ?>">color</p>
					<p class="lb-dyn-date"><?php echo esc_html( (string) $s['t_date'] ); ?></p>
				</div>
				<?php
			}
		}
	}

	$widgets_manager->register( new LB_Dynamic_Test() );
} );
