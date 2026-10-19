<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

?>
<script type="text/template" id="tmpl-refraction-repeater-row">
	<div class="refraction-repeater-row-tools">
		<# if ( itemActions.drag_n_drop ) {  #>
			<button class="refraction-repeater-row-handle-sortable" aria-label="<?php echo esc_attr__( 'Drag & Drop', 'refraction' ); ?>">
				<i class="rficon-ellipsis-v" aria-hidden="true"></i>
			</button>
		<# } #>
		<button class="refraction-repeater-row-item-title"></button>
		<# if ( itemActions.duplicate ) {  #>
			<button class="refraction-repeater-row-tool refraction-repeater-tool-duplicate" aria-label="<?php echo esc_attr__( 'Duplicate', 'refraction' ); ?>">
				<i class="rficon-copy" aria-hidden="true"></i>
			</button>
		<# }
		if ( itemActions.remove ) {  #>
			<button class="refraction-repeater-row-tool refraction-repeater-tool-remove" aria-label="<?php echo esc_attr__( 'Remove', 'refraction' ); ?>">
				<i class="rficon-close" aria-hidden="true"></i>
			</button>
		<# } #>
	</div>
	<div class="refraction-repeater-row-controls"></div>
</script>
