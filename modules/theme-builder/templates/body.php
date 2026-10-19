<?php
/**
 * Refraction Theme Builder page: the site header, the matching Single / Archive / Search Results / Error 404
 * template and the site footer. The header and footer are the Refraction ones when a template matches and the
 * theme's own otherwise (get_header() and get_footer() on classic themes, the header and footer template parts
 * on block themes).
 */

use Refraction\Modules\ThemeBuilder\Module;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

$refraction_locations = Module::instance()->get_locations_manager();
$refraction_body = $refraction_locations->get_markup( $refraction_locations->get_body_location() );

Plugin::$instance->frontend->add_body_class( 'refraction-template-theme-builder' );

if ( wp_is_block_theme() ) :
	?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
	<?php wp_body_open(); ?>
<div class="wp-site-blocks">
	<?php
	echo do_blocks( '<!-- wp:template-part {"slug":"header","tagName":"header","area":"header"} /-->' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Block output.
	echo $refraction_body; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built in Locations_Manager::get_markup().
	echo do_blocks( '<!-- wp:template-part {"slug":"footer","tagName":"footer","area":"footer"} /-->' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Block output.
	?>
</div>
	<?php wp_footer(); ?>
</body>
</html>
	<?php
else :
	get_header();
	echo $refraction_body; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built in Locations_Manager::get_markup().
	get_footer();
endif;
