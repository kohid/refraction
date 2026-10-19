<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

?>
<script type="text/template" id="tmpl-refraction-panel">
	<div id="refraction-panel-state-loading">
		<i class="rficon-loading rficon-animation-spin"></i>
	</div>
	<header id="refraction-panel-header-wrapper"></header>
	<main id="refraction-panel-content-wrapper"></main>
	<footer id="refraction-panel-footer" class="refraction-panel-footer-back-compat-wrapper" hidden></footer>
	<div id="refraction-mode-switcher"></div>
</script>

<script type="text/template" id="tmpl-refraction-panel-footer-back-compat">
	<button type="button" class="refraction-panel-footer-back-compat-preview" tabindex="-1" hidden></button>
</script>

<script type="text/template" id="tmpl-refraction-panel-menu">
	<div id="refraction-panel-page-menu-content"></div>
	<# if ( refraction.config.document.panel.needHelpUrl ) { #>
	<div id="refraction-panel__editor__help">
		<a id="refraction-panel__editor__help__link" href="{{{ refraction.config.document.panel.needHelpUrl }}}" target="_blank">
			<?php echo esc_html__( 'Need Help', 'refraction' ); ?>
			<i class="rficon-help-o" aria-hidden="true"></i>
		</a>
	</div>
	<# } #>
</script>

<script type="text/template" id="tmpl-refraction-panel-menu-group">
	<div class="refraction-panel-menu-group-title">{{{ title }}}</div>
	<div class="refraction-panel-menu-items"></div>
</script>

<script type="text/template" id="tmpl-refraction-panel-menu-item">
	<div class="refraction-panel-menu-item-icon">
		<i class="{{ icon }}"></i>
	</div>
	<# if ( 'undefined' === typeof type || 'link' !== type ) { #>
		<div class="refraction-panel-menu-item-title">{{{ title }}}</div>
	<# } else {
		let target = ( 'undefined' !== typeof newTab && newTab ) ? '_blank' : '_self';
	#>
		<a href="{{ link }}" target="{{ target }}"><div class="refraction-panel-menu-item-title">{{{ title }}}</div></a>
	<# } #>
</script>

<script type="text/template" id="tmpl-refraction-exit-dialog">
	<div><?php echo esc_html__( 'Now you can choose where you want to go on the site from the following options', 'refraction' ); ?></div>
	<div>
		<?php printf(
			/* translators: 1: Opening HTML <a> tag, 2: closing HTML <a> tag. */
			esc_html__( 'Any time you can change the settings in %1$sUser Preferences%2$s', 'refraction' ),
			'<a id="user-preferences">',
			'</a>'
		); ?>
	</div>
	<select id="exit-to-preferences"></select> <!--  Adding options by JS  -->
</script>

<script type="text/template" id="tmpl-refraction-panel-header">
	<button id="refraction-panel-header-menu-button" class="refraction-header-button" aria-label="<?php echo esc_attr__( 'Menu', 'refraction' ); ?>">
		<i class="refraction-icon rficon-menu-bar tooltip-target" aria-hidden="true" data-tooltip="<?php echo esc_attr__( 'Menu', 'refraction' ); ?>"></i>
	</button>
	<h2 id="refraction-panel-header-title"></h2>
	<# const extraClass = $e.components.get( 'document/elements' ).utils.allowAddingWidgets() ? '' : 'refraction-visibility-hidden'; #>
	<button id="refraction-panel-header-add-button" class="refraction-header-button {{{ extraClass }}}" aria-label="<?php echo esc_attr__( 'Widgets Panel', 'refraction' ); ?>">
		<i class="refraction-icon rficon-apps tooltip-target" aria-hidden="true" data-tooltip="<?php echo esc_attr__( 'Widgets Panel', 'refraction' ); ?>"></i>
	</button>
</script>

<script type="text/template" id="tmpl-refraction-mode-switcher-content">
	<label for="refraction-mode-switcher-preview-input" id="refraction-mode-switcher-preview" title="<?php echo esc_attr__( 'Hide Panel', 'refraction' ); ?>">
		<i class="rficon rficon-angle-left" aria-hidden="true" tabindex="0"></i>
		<span class="refraction-screen-only"><?php echo esc_html__( 'Hide Panel', 'refraction' ); ?></span>
	</label>
	<input id="refraction-mode-switcher-preview-input" type="checkbox">
</script>

<script type="text/template" id="tmpl-editor-content">
	<div class="refraction-panel-navigation">
		<# _.each( elementData.tabs_controls, function( tabTitle, tabSlug ) {
			if ( 'content' !== tabSlug && ! refraction.userCan( 'design' ) ) {
				return;
			}
			$e.bc.ensureTab( 'panel/editor', tabSlug );
			#>
			<button class="refraction-component-tab refraction-panel-navigation-tab refraction-tab-control-{{ tabSlug }}" data-tab="{{ tabSlug }}">
				<span>{{{ tabTitle }}}</span>
			</button>
		<# } ); #>
	</div>
	<# if ( elementData.reload_preview ) { #>
		<div class="refraction-update-preview">
			<div class="refraction-update-preview-title"><?php echo esc_html__( 'Update changes to page', 'refraction' ); ?></div>
			<div class="refraction-update-preview-button-wrapper">
				<button class="refraction-update-preview-button refraction-button"><?php echo esc_html__( 'Apply', 'refraction' ); ?></button>
			</div>
		</div>
	<# } #>
	<div id="refraction-controls"></div>
	<# if ( elementData.help_url ) { #>
		<div id="refraction-panel__editor__help">
			<a id="refraction-panel__editor__help__link" href="{{ elementData.help_url }}" target="_blank">
				<?php echo esc_html__( 'Need Help', 'refraction' ); ?>
				<i class="rficon-help-o" aria-hidden="true"></i>
			</a>
		</div>
	<# } #>

</script>

<script type="text/template" id="tmpl-refraction-panel-schemes-disabled">
	<img class="refraction-nerd-box-icon" src="<?php Utils::print_unescaped_internal_string( REFRACTION_ASSETS_URL . 'images/information.svg' ); ?>" loading="lazy" alt="<?php echo esc_attr__( 'Refraction', 'refraction' ); ?>" />
	<div class="refraction-nerd-box-title">{{{ '<?php echo esc_html__( '%s are disabled', 'refraction' ); // phpcs:ignore WordPress.WP.I18n.MissingTranslatorsComment ?>'.replace( '%s', disabledTitle ) }}}</div>
	<div class="refraction-nerd-box-message"><?php
		printf(
			/* translators: %1$s Link open tag, %2$s: Link close tag. */
			esc_html__( 'You can enable it from the %1$sRefraction settings page%2$s.', 'refraction' ),
			'<a href="' . esc_url( Settings::get_url() ) . '" target="_blank">',
			'</a>'
		);
		?></div>
</script>

<script type="text/template" id="tmpl-refraction-panel-scheme-color-item">
	<div class="refraction-panel-scheme-color-picker-placeholder"></div>
	<div class="refraction-panel-scheme-color-title">{{{ title }}}</div>
</script>

<script type="text/template" id="tmpl-refraction-panel-scheme-typography-item">
	<div class="refraction-panel-heading">
		<div class="refraction-panel-heading-toggle">
			<i class="rficon-caret-right" aria-hidden="true"></i>
		</div>
		<div class="refraction-panel-heading-title">{{{ title }}}</div>
	</div>
	<div class="refraction-panel-scheme-typography-items refraction-panel-box-content">
		<?php
		$scheme_fields_keys = Group_Control_Typography::get_scheme_fields_keys();

		$typography_group = Plugin::$instance->controls_manager->get_control_groups( 'typography' );
		$typography_fields = $typography_group->get_fields();

		$scheme_fields = array_intersect_key( $typography_fields, array_flip( $scheme_fields_keys ) );

		foreach ( $scheme_fields as $option_name => $option ) :
			?>
			<div class="refraction-panel-scheme-typography-item refraction-control refraction-control-type-select">
				<div class="refraction-panel-scheme-item-title refraction-control-title"><?php echo esc_html( $option['label'] ); ?></div>
				<div class="refraction-panel-scheme-typography-item-value refraction-control-input-wrapper">
					<?php if ( 'select' === $option['type'] ) : ?>
						<select name="<?php echo esc_attr( $option_name ); ?>" class="refraction-panel-scheme-typography-item-field">
							<?php foreach ( $option['options'] as $field_key => $field_value ) : ?>
								<option value="<?php echo esc_attr( $field_key ); ?>"><?php echo esc_html( $field_value ); ?></option>
							<?php endforeach; ?>
						</select>
					<?php elseif ( 'font' === $option['type'] ) : ?>
						<select name="<?php echo esc_attr( $option_name ); ?>" class="refraction-panel-scheme-typography-item-field">
							<option value=""><?php echo esc_html__( 'Default', 'refraction' ); ?></option>
							<?php foreach ( Fonts::get_font_groups() as $group_type => $group_label ) : ?>
								<optgroup label="<?php echo esc_attr( $group_label ); ?>">
									<?php foreach ( Fonts::get_fonts_by_groups( [ $group_type ] ) as $font_title => $font_type ) : ?>
										<option value="<?php echo esc_attr( $font_title ); ?>"><?php echo esc_html( $font_title ); ?></option>
									<?php endforeach; ?>
								</optgroup>
							<?php endforeach; ?>
						</select>
					<?php elseif ( 'text' === $option['type'] ) : ?>
						<input name="<?php echo esc_attr( $option_name ); ?>" class="refraction-panel-scheme-typography-item-field" />
					<?php endif; ?>
				</div>
			</div>
		<?php endforeach; ?>
	</div>
</script>

<script type="text/template" id="tmpl-refraction-control-responsive-switchers">
	<div class="refraction-control-responsive-switchers">
		<div class="refraction-control-responsive-switchers__holder">
		<#
			const activeBreakpoints = refraction.config.responsive.activeBreakpoints,
				devicesForDisplay = refraction.breakpoints.getActiveBreakpointsList( { largeToSmall: true, withDesktop: true } );

			var devices = responsive.devices || devicesForDisplay;

			_.each( devices, function( device ) {
				// The 'Desktop' label is made accessible via the global config because it needs to be translated.
				var deviceLabel = 'desktop' === device ? '<?php esc_html_e( 'Desktop', 'refraction' ); ?>' : activeBreakpoints[ device ].label,
					tooltipDir = "<?php echo is_rtl() ? 'e' : 'w'; ?>";
			#>
				<button class="refraction-responsive-switcher tooltip-target refraction-responsive-switcher-{{ device }}" data-device="{{ device }}" data-tooltip="{{ deviceLabel }}" data-tooltip-pos="{{ tooltipDir }}" aria-label="{{ deviceLabel }}">
					<i class="{{ refraction.config.responsive.icons_map[ device ] }}" aria-hidden="true"></i>
				</button>
			<# } );
		#>
		</div>
	</div>
</script>

<script type="text/template" id="tmpl-refraction-control-dynamic-switcher">
	<button class="refraction-control-dynamic-switcher refraction-control-unit-1" data-tooltip="<?php echo esc_attr__( 'Dynamic Tags', 'refraction' ); ?>" aria-label="<?php echo esc_attr__( 'Dynamic Tags', 'refraction' ); ?>">
		<i class="rficon-database" aria-hidden="true"></i>
	</button>
</script>

<script type="text/template" id="tmpl-refraction-control-element-color-picker">
	<button class="refraction-control-element-color-picker e-control-tool" data-tooltip="<?php echo esc_attr__( 'Color Sampler', 'refraction' ); ?>" aria-label="<?php echo esc_attr__( 'Color Sampler', 'refraction' ); ?>">
		<i class="rficon-eyedropper" aria-hidden="true"></i>
	</button>
</script>

<script type="text/template" id="tmpl-refraction-control-dynamic-cover">
	<div class="refraction-dynamic-cover__settings">
		<i class="rficon-{{ hasSettings ? 'wrench' : 'database' }}"></i>
	</div>
	<div class="refraction-dynamic-cover__title" title="{{{ title + ' ' + content }}}">{{{ title + ' ' + content }}}</div>
	<# if ( isRemovable ) { #>
		<div class="refraction-dynamic-cover__remove">
			<i class="rficon-close-circle"></i>
		</div>
	<# } #>
</script>
