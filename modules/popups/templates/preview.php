<?php
/**
 * The page a Popup template shows on its own (the editor preview and the Preview button): the popup box on its
 * overlay, always open, so the designer sees the real thing. Visitors never get this page.
 */

use Refraction\Modules\Popups\Classes\Popup_Manager;
use Refraction\Modules\Popups\Classes\Popup_Renderer;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

$refraction_popup = Plugin::$instance->documents->get( get_queried_object_id() );
$refraction_popup_id = (int) get_queried_object_id();

Plugin::$instance->frontend->add_body_class( 'refraction-popup-preview' );
wp_enqueue_style( Popup_Manager::STYLE );

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<?php if ( ! current_theme_supports( 'title-tag' ) ) : ?>
		<title><?php echo esc_html( wp_get_document_title() ); ?></title>
	<?php endif; ?>
	<?php wp_head(); ?>
	<?php Utils::print_unescaped_internal_string( Utils::get_meta_viewport( 'canvas' ) ); ?>
</head>
<body <?php body_class(); ?>>
	<?php wp_body_open(); ?>
	<div class="refraction-popup refraction-popup-<?php echo (int) $refraction_popup_id; ?> is-preview is-open" data-rp-preview>
		<div class="refraction-popup__overlay"></div>
		<div class="refraction-popup__layer">
			<div class="refraction-popup__box" role="dialog" aria-modal="true" aria-label="<?php echo esc_attr( get_the_title( $refraction_popup_id ) ); ?>">
				<?php echo Popup_Renderer::close_button( $refraction_popup ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in the renderer. ?>
				<div class="refraction-popup__content">
					<?php Plugin::$instance->modules_manager->get_modules( 'page-templates' )->print_content(); ?>
				</div>
			</div>
		</div>
	</div>
	<?php wp_footer(); ?>
</body>
</html>
