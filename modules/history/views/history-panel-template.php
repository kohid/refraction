<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

?>
<script type="text/template" id="tmpl-refraction-panel-history-page">
	<div id="refraction-panel-elements-navigation" class="refraction-panel-navigation">
		<button class="refraction-component-tab refraction-panel-navigation-tab" data-tab="actions"><?php echo esc_html__( 'Actions', 'refraction' ); ?></button>
		<button class="refraction-component-tab refraction-panel-navigation-tab" data-tab="revisions"><?php echo esc_html__( 'Revisions', 'refraction' ); ?></button>
	</div>
	<div id="refraction-panel-history-content"></div>
</script>

<script type="text/template" id="tmpl-refraction-panel-history-tab">
	<div id="refraction-history-list"></div>
	<div class="refraction-history-revisions-message"><?php echo esc_html__( 'Switch to Revisions tab for older versions', 'refraction' ); ?></div>
</script>

<script type="text/template" id="tmpl-refraction-panel-history-no-items">
	<img class="refraction-nerd-box-icon" src="<?php
		// PHPCS - Safe Refraction SVG
		echo REFRACTION_ASSETS_URL . 'images/information.svg'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>" loading="lazy" alt="<?php echo esc_attr__( 'Refraction', 'refraction' ); ?>" />
	<div class="refraction-nerd-box-title"><?php echo esc_html__( 'No History Yet', 'refraction' ); ?></div>
	<div class="refraction-nerd-box-message"><?php echo esc_html__( 'Once you start working, you\'ll be able to redo / undo any action you make in the editor.', 'refraction' ); ?></div>
</script>

<script type="text/template" id="tmpl-refraction-panel-history-item">
	<div class="refraction-history-item__details">
		<span class="refraction-history-item__title">{{{ title }}}</span>
		<span class="refraction-history-item__subtitle">{{{ subTitle }}}</span>
		<span class="refraction-history-item__action">{{{ action }}}</span>
	</div>
	<div class="refraction-history-item__icon">
		<span class="rficon" aria-hidden="true"></span>
	</div>
</script>
