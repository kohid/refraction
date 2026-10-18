<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
?>
<script type="text/template" id="tmpl-refraction-templates-modal__header">
	<div class="refraction-templates-modal__header__logo-area"></div>
	<div class="refraction-templates-modal__header__menu-area"></div>
	<div class="refraction-templates-modal__header__items-area">
		<# if ( closeType ) { #>
			<button type="button" class="refraction-templates-modal__header__close refraction-templates-modal__header__close--{{{ closeType }}} refraction-templates-modal__header__item" aria-label="<?php echo esc_attr__( 'Close', 'refraction' ); ?>">
				<# if ( 'skip' === closeType ) { #>
				<span><?php echo esc_html__( 'Skip', 'refraction' ); ?></span>
				<# } #>
				<i class="eicon-close" aria-hidden="true"></i>
				<span class="refraction-screen-only">{{{ $e.components?.get( 'document/elements' )?.utils?.getTitleForLibraryClose() }}}</span>
			</button>
		<# } #>
		<div id="refraction-template-library-header-tools"></div>
	</div>
</script>

<script type="text/template" id="tmpl-refraction-templates-modal__header__logo">
	<span class="refraction-templates-modal__header__logo__icon-wrapper e-logo-wrapper">
		<i class="eicon-refraction-circle"></i>
	</span>
	<span class="refraction-templates-modal__header__logo__title">{{{ title }}}</span>
</script>
