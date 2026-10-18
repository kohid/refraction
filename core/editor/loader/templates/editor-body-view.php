<?php
namespace Refraction\Core\Editor\Loader\Templates;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

?>

<div id="refraction-loading">
	<div class="refraction-loader-wrapper">
		<div class="refraction-loader" aria-hidden="true">
			<div class="refraction-loader-boxes">
				<div class="refraction-loader-box"></div>
				<div class="refraction-loader-box"></div>
				<div class="refraction-loader-box"></div>
				<div class="refraction-loader-box"></div>
			</div>
		</div>
		<div class="refraction-loading-title"><?php echo esc_html__( 'Loading', 'refraction' ); ?></div>
	</div>
</div>

<h1 class="refraction-screen-only"><?php printf(
	/* translators: %s: Page title. */
	esc_html__( 'Edit "%s" with Refraction', 'refraction' ),
	esc_html( get_the_title() )
); ?></h1>

<div id="refraction-editor-wrapper-v2"></div>

<div id="refraction-editor-wrapper">
	<aside id="refraction-panel" class="refraction-panel" aria-labelledby="refraction-panel-header-title"></aside>
	<main id="refraction-preview" aria-label="<?php echo esc_attr__( 'Preview', 'refraction' ); ?>">
		<div id="refraction-responsive-bar"></div>
		<div id="refraction-preview-responsive-wrapper" class="refraction-device-desktop refraction-device-rotate-portrait">
			<div id="refraction-preview-loading">
				<i class="eicon-loading eicon-animation-spin" aria-hidden="true"></i>
			</div>
			<?php // IFrame will be created here by the Javascript later. ?>
		</div>
	</main>
	<aside id="refraction-navigator" aria-labelledby="refraction-navigator__header__title"></aside>
</div>
