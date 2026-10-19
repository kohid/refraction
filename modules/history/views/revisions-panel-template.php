<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

?>
<script type="text/template" id="tmpl-refraction-panel-revisions">
	<div class="refraction-panel-box">
		<div class="refraction-panel-revisions-buttons">
			<button class="refraction-button e-btn-txt e-revision-discard" disabled>
				<?php echo esc_html__( 'Discard', 'refraction' ); ?>
			</button>
			<button class="refraction-button e-revision-save" disabled>
				<?php echo esc_html__( 'Apply', 'refraction' ); ?>
			</button>
		</div>
	</div>

	<div class="refraction-panel-box">
		<div id="refraction-revisions-list" class="refraction-panel-box-content"></div>
	</div>
</script>

<script type="text/template" id="tmpl-refraction-panel-revisions-no-revisions">
	<#
	var no_revisions_1 = '<?php echo esc_html__( 'Revision history lets you save your previous versions of your work, and restore them any time.', 'refraction' ); ?>',
		no_revisions_2 = '<?php echo esc_html__( 'Start designing your page and you will be able to see the entire revision history here.', 'refraction' ); ?>',
		revisions_disabled_1 = '<?php echo esc_html__( 'It looks like the post revision feature is unavailable in your website.', 'refraction' ); ?>',
		revisions_disabled_2 = '';
	#>
	<img class="refraction-nerd-box-icon" src="<?php
	// PHPCS - Safe Refraction SVG
	echo REFRACTION_ASSETS_URL . 'images/information.svg' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>" loading="lazy" alt="<?php echo esc_attr__( 'Refraction', 'refraction' ); ?>" />
	<div class="refraction-nerd-box-title"><?php echo esc_html__( 'No Revisions Saved Yet', 'refraction' ); ?></div>
	<div class="refraction-nerd-box-message">{{{ refraction.config.document.revisions.enabled ? no_revisions_1 : revisions_disabled_1 }}}</div>
	<div class="refraction-nerd-box-message">{{{ refraction.config.document.revisions.enabled ? no_revisions_2 : revisions_disabled_2 }}}</div>
</script>

<script type="text/template" id="tmpl-refraction-panel-revisions-loading">
	<i class="rficon-loading rficon-animation-spin" aria-hidden="true"></i>
</script>

<script type="text/template" id="tmpl-refraction-panel-revisions-revision-item">
	<button class="refraction-revision-item__wrapper {{ type }}">
		<div class="refraction-revision-item__gravatar">{{{ gravatar }}}</div>
		<div class="refraction-revision-item__details">
			<div class="refraction-revision-date" title="{{{ new Date( timestamp * 1000 ) }}}">{{{ date }}}</div>
			<div class="refraction-revision-meta">
				<span>{{{ typeLabel }}}</span>
				<?php echo esc_html__( 'By', 'refraction' ); ?> {{{ author }}}
				<span>(#{{{ id }}})</span>&nbsp;
			</div>
		</div>
		<div class="refraction-revision-item__tools">
			<i class="refraction-revision-item__tools-spinner rficon-loading rficon-animation-spin" aria-hidden="true"></i>

			<# if ( 'current' === type ) { #>
				<i class="refraction-revision-item__tools-current rficon-check" aria-hidden="true"></i>
				<span class="refraction-screen-only"><?php echo esc_html__( 'Published', 'refraction' ); ?></span>
			<# } #>

<!--			<# if ( 'revision' === type ) { #>-->
<!--				<i class="rficon-undo" aria-hidden="true"></i>-->
<!--				<span class="refraction-screen-only">--><?php // echo esc_html__( 'Restore', 'refraction' ); ?><!--</span>-->
<!--			<# } #>-->

		</div>
	</button>
</script>
