<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// The floating Elements window (assets/dev/js/editor/regions/elements-float): the widgets list in a window of its own,
// moved like Structure and docked to the left or the right edge.
?>
<script type="text/template" id="tmpl-refraction-elements-float">
	<div id="refraction-elements-float__header" class="rf-ef__header">
		<button type="button" class="rf-ef__button rf-ef__dock" data-dock="left" aria-pressed="false" title="<?php echo esc_attr__( 'Dock to the left', 'refraction' ); ?>">
			<i class="rficon-align-start-h" aria-hidden="true"></i>
			<span class="refraction-screen-only"><?php echo esc_html__( 'Dock to the left', 'refraction' ); ?></span>
		</button>
		<h2 id="refraction-elements-float__title" class="rf-ef__title"><?php echo esc_html__( 'Elements', 'refraction' ); ?></h2>
		<button type="button" class="rf-ef__button rf-ef__dock" data-dock="right" aria-pressed="false" title="<?php echo esc_attr__( 'Dock to the right', 'refraction' ); ?>">
			<i class="rficon-align-end-h" aria-hidden="true"></i>
			<span class="refraction-screen-only"><?php echo esc_html__( 'Dock to the right', 'refraction' ); ?></span>
		</button>
		<button type="button" class="rf-ef__button rf-ef__close" title="<?php echo esc_attr__( 'Hide Elements', 'refraction' ); ?>">
			<i class="rficon-close" aria-hidden="true"></i>
			<span class="refraction-screen-only"><?php echo esc_html__( 'Hide Elements', 'refraction' ); ?></span>
		</button>
	</div>
	<div class="refraction-panel rf-ef__panel">
		<div class="rf-ef__search">
			<label for="refraction-elements-float__search" class="screen-reader-text"><?php echo esc_html__( 'Search Widget:', 'refraction' ); ?></label>
			<input type="search" id="refraction-elements-float__search" class="rf-ef__search-input" placeholder="<?php esc_attr_e( 'Search Widget...', 'refraction' ); ?>" autocomplete="off"/>
			<i class="rficon-search-bold" aria-hidden="true"></i>
		</div>
		<div class="rf-ef__body"></div>
	</div>
	<div class="rf-ef__footer" aria-hidden="true"><i class="rficon-ellipsis-h"></i></div>
</script>
