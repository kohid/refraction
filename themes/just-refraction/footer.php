<?php
/**
 * The footer: Refraction's footer template when it has one for this page, else the theme's own (unless switched off).
 *
 * @package Just_Refraction
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$just_refraction_printed = function_exists( 'refraction_theme_builder_footer' ) && refraction_theme_builder_footer();

if ( ! $just_refraction_printed && just_refraction_shows_header_footer() ) :
	?>
<footer class="jr-footer">
	<?php if ( has_nav_menu( 'footer' ) ) : ?>
		<nav class="jr-nav" aria-label="<?php esc_attr_e( 'Footer', 'just-refraction' ); ?>">
			<?php wp_nav_menu( [ 'theme_location' => 'footer', 'container' => false, 'depth' => 1 ] ); ?>
		</nav>
	<?php endif; ?>
	<p class="jr-copyright">&copy; <?php echo esc_html( wp_date( 'Y' ) ); ?> <?php echo esc_html( get_bloginfo( 'name' ) ); ?></p>
</footer>
	<?php
endif;

wp_footer();
?>
</body>
</html>
