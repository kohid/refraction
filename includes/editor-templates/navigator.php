<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

?>
<script type="text/template" id="tmpl-refraction-navigator">
	<div id="refraction-navigator__header">
		<button id="refraction-navigator__toggle-all" data-refraction-action="expand" aria-label="<?php echo esc_attr__( 'Expand all elements', 'refraction' ); ?>">
			<i class="rficon-expand" aria-hidden="true"></i>
		</button>
		<h2 id="refraction-navigator__header__title"><?php echo esc_html__( 'Structure', 'refraction' ); ?></h2>
		<button id="refraction-navigator__close" aria-label="<?php echo esc_attr__( 'Close structure', 'refraction' ); ?>">
			<i class="rficon-close" aria-hidden="true"></i>
		</button>
	</div>
	<div id="refraction-navigator__elements"></div>
	<div id="refraction-navigator__footer">
		<div id="refraction-navigator__footer__resize-bar">
			<i class="rficon-ellipsis-h" aria-hidden="true"></i>
			<span class="refraction-screen-only"><?php echo esc_html__( 'Resize structure', 'refraction' ); ?></span>
		</div>
	</div>
</script>

<script type="text/template" id="tmpl-refraction-navigator__elements">
	<# if ( obj.elType ) { #>
		<div class="refraction-navigator__item" data-locked="{{ obj.isLocked ? 'true' : 'false' }}" tabindex="0">
			<div class="refraction-navigator__element__list-toggle">
				<i class="rficon-sort-down" aria-hidden="true"></i>
				<span class="refraction-screen-only"><?php echo esc_html__( 'Show/hide inner elements', 'refraction' ); ?></span>
			</div>
			<#
			if ( icon ) { #>
				<div class="refraction-navigator__element__element-type">
					<i class="{{{ icon }}}" aria-hidden="true"></i>
				</div>
			<# } #>
			<div class="refraction-navigator__element__title">
				<span class="refraction-navigator__element__title__text">{{{ title }}}</span>
			</div>
			<div class="refraction-navigator__element__toggle">
				<i class="rficon-preview-medium" aria-hidden="true"></i>
				<span class="refraction-screen-only"><?php echo esc_html__( 'Show/hide Element', 'refraction' ); ?></span>
			</div>
			<div class="refraction-navigator__element__indicators"></div>
		</div>
	<# } #>
	<div class="refraction-navigator__elements"></div>
</script>

<script type="text/template" id="tmpl-refraction-navigator__elements--empty">
	<div class="refraction-empty-view__title"><?php echo esc_html__( 'Empty', 'refraction' ); ?></div>
</script>

<script type="text/template" id="tmpl-refraction-navigator__root--empty">
	<img class="refraction-nerd-box-icon" src="<?php echo REFRACTION_ASSETS_URL . 'images/information.svg'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>" loading="lazy" alt="<?php echo esc_attr__( 'Refraction', 'refraction' ); ?>" />
	<div class="refraction-nerd-box-title"><?php echo esc_html__( 'Easy Navigation is Here!', 'refraction' ); ?></div>
	<div class="refraction-nerd-box-message"><?php echo esc_html__( 'Once you fill your page with content, this window will give you an overview display of all the page elements. This way, you can easily move around any section, column, or widget.', 'refraction' ); ?></div>
</script>
