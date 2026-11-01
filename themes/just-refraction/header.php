<?php
/**
 * The page head and the header: Refraction's header template when it has one for this page, else the theme's own
 * (unless switched off in the Customizer).
 *
 * @package Just_Refraction
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#content"><?php esc_html_e( 'Skip to content', 'just-refraction' ); ?></a>
<?php
$just_refraction_printed = function_exists( 'refraction_theme_builder_header' ) && refraction_theme_builder_header();

if ( ! $just_refraction_printed && just_refraction_shows_header_footer() ) :
	?>
<header class="jr-header">
	<div class="jr-brand">
		<?php
		if ( has_custom_logo() ) {
			the_custom_logo();
		} else {
			printf( '<a class="jr-site-title" href="%s" rel="home">%s</a>', esc_url( home_url( '/' ) ), esc_html( get_bloginfo( 'name' ) ) );
		}
		?>
	</div>
	<?php if ( has_nav_menu( 'primary' ) ) : ?>
		<nav class="jr-nav" aria-label="<?php esc_attr_e( 'Main', 'just-refraction' ); ?>">
			<?php wp_nav_menu( [ 'theme_location' => 'primary', 'container' => false, 'depth' => 2 ] ); ?>
		</nav>
	<?php endif; ?>
</header>
	<?php
endif;
