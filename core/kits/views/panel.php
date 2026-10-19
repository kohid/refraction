<script type="text/template" id="tmpl-refraction-kit-panel">
	<main id="refraction-kit__panel-content__wrapper" class="refraction-panel-content-wrapper"></main>
</script>

<script type="text/template" id="tmpl-refraction-kit-panel-content">
	<div id="refraction-kit-panel-content-controls"></div>
	<#
	const tabConfig = $e.components.get( 'panel/global' ).getActiveTabConfig();
	if ( tabConfig.helpUrl ) { #>
	<div id="refraction-panel__editor__help">
		<a id="refraction-panel__editor__help__link" href="{{ tabConfig.helpUrl }}" target="_blank">
			<?php echo esc_html__( 'Need Help', 'refraction' ); ?>
			<i class="rficon-help-o"></i>
		</a>
	</div>
	<#
	}

	if ( tabConfig.additionalContent ) {
		#> {{{ tabConfig.additionalContent }}} <#
	}
	#>
</script>

<script type="text/template" id="tmpl-refraction-global-style-repeater-row">
	<# let removeClass = 'remove',
			removeIcon = 'rficon-trash-o';

	if ( ! itemActions.remove ) {
		removeClass += '--disabled';

		removeIcon = 'rficon-disable-trash-o'
	}
	#>
	<# if ( itemActions.sort ) { #>
	<button class="refraction-repeater-row-tool refraction-repeater-row-tools refraction-repeater-tool-sort" aria-label="<?php echo esc_attr__( 'Reorder', 'refraction' ); ?>">
		<i class="rficon-cursor-move" aria-hidden="true"></i>
	</button>
	<# } #>
	<button class="refraction-repeater-row-tool refraction-repeater-tool-{{{ removeClass }}}" aria-label="<?php echo esc_attr__( 'Remove', 'refraction' ); ?>">
		<i class="{{{ removeIcon }}}" aria-hidden="true"></i>
		<# if ( itemActions.remove ) { #>
		<# } #>
	</button>
	<div class="refraction-repeater-row-controls"></div>
</script>
