<?php
namespace Refraction;


if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
?>
<script type="text/template" id="tmpl-refraction-panel-elements">
	<# if ( $e.components.get( 'document/elements' ).utils.allowAddingWidgets()) { #>
	<div id="refraction-panel-elements-navigation" class="refraction-panel-navigation">
		<button class="refraction-component-tab refraction-panel-navigation-tab" data-tab="categories"><?php echo esc_html__( 'Elements', 'refraction' ); ?></button>
		<button class="refraction-component-tab refraction-panel-navigation-tab" data-tab="global"><?php echo esc_html__( 'Globals', 'refraction' ); ?></button>
	</div>
	<# } #>
	<div id="refraction-panel-elements-search-area"></div>
	<div id="refraction-panel-elements-notice-area"></div>
	<div id="refraction-panel-elements-wrapper"></div>
</script>

<script type="text/template" id="tmpl-refraction-panel-categories">
	<div id="refraction-panel-categories"></div>
</script>

<script type="text/template" id="tmpl-refraction-panel-elements-category">
	<button class="refraction-panel-heading refraction-panel-category-title">
		<span class="refraction-panel-heading-toggle">
			<i class="eicon-caret-right" aria-hidden="true"></i>
		</span>
		<span class="refraction-panel-heading-title">{{{ title }}}</span>
		<?php do_action( 'refraction/editor/templates/panel/category' ); ?>
	</button>
	<div class="refraction-panel-category-items refraction-responsive-panel">
		<?php do_action( 'refraction/editor/templates/panel/category/content' ); ?>
	</div>
</script>

<script type="text/template" id="tmpl-refraction-panel-element-search">
	<label for="refraction-panel-elements-search-input" class="screen-reader-text"><?php echo esc_html__( 'Search Widget:', 'refraction' ); ?></label>
	<input type="search" id="refraction-panel-elements-search-input" placeholder="<?php esc_attr_e( 'Search Widget...', 'refraction' ); ?>" autocomplete="off"/>
	<i class="eicon-search-bold" aria-hidden="true"></i>
</script>

<script type="text/template" id="tmpl-refraction-element-library-element">
	<button class="refraction-element" data-library-element-type="{{ elType === 'widget' ? widgetType : elType }}">
	<# if ( obj.integration ) { #>
			<i class="eicon-plug"></i>
		<# } else if ( false === obj.editable ) { #>
			<i class="eicon-lock"></i>
		<# } #>
		<div class="icon">
			<i class="{{ icon }}" aria-hidden="true"></i>
		</div>
		<div class="title-wrapper">
			<div class="title">{{{ title }}}</div>
		</div>
	</button>
</script>

<script type="text/template" id="tmpl-refraction-panel-global">
	<div class="refraction-nerd-box"></div>
</script>
