<?php
namespace Elementor;


if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
?>
<script type="text/template" id="tmpl-elementor-template-library-header-actions">
	<?php if ( User::is_current_user_can_upload_json() ) { ?>
		<button type="button" id="elementor-template-library-header-import" class="elementor-templates-modal__header__item" aria-label="<?php echo esc_attr__( 'Import Template', 'elementor' ); ?>">
			<i class="eicon-upload-circle-o" aria-hidden="true"></i>
			<span class="elementor-screen-only"><?php echo esc_html__( 'Import Template', 'elementor' ); ?></span>
		</button>
	<?php } ?>
	<button type="button" id="elementor-template-library-header-save" class="elementor-templates-modal__header__item" aria-label="<?php echo esc_attr__( 'Save', 'elementor' ); ?>">
		<i class="eicon-save-o" aria-hidden="true"></i>
		<span class="elementor-screen-only"><?php echo esc_html__( 'Save', 'elementor' ); ?></span>
	</button>
</script>

<script type="text/template" id="tmpl-elementor-template-library-header-menu">
	<# jQuery.each( tabs, ( tab, args ) => { #>
		<button
			role="tab"
			id="tab-{{{ tab }}}"
			aria-controls="elementor-template-library-templates-container"
			aria-selected="false"
			tabindex="-1"
			class="elementor-component-tab elementor-template-library-menu-item"
			data-tab="{{{ tab }}}"
		>
			{{{ args.title }}}
		</button>
	<# } ); #>
</script>

<script type="text/template" id="tmpl-elementor-template-library-header-preview">
	<div id="elementor-template-library-header-preview-insert-wrapper" class="elementor-templates-modal__header__item">
		{{{ elementor.templates.layout.getTemplateActionButton( obj ) }}}
	</div>
</script>

<script type="text/template" id="tmpl-elementor-template-library-header-back">
	<button type="button" class="elementor-template-library-header-back-button" aria-label="<?php echo esc_attr__( 'Back to Library', 'elementor' ); ?>">
		<i class="eicon-chevron-left" aria-hidden="true"></i>
		<span><?php echo esc_html__( 'Back to Library', 'elementor' ); ?></span>
	</button>
</script>

<script type="text/template" id="tmpl-elementor-template-library-loading">
	<div class="elementor-loader-wrapper">
		<div class="elementor-loader">
			<div class="elementor-loader-boxes">
				<div class="elementor-loader-box"></div>
				<div class="elementor-loader-box"></div>
				<div class="elementor-loader-box"></div>
				<div class="elementor-loader-box"></div>
			</div>
		</div>
		<div class="elementor-loading-title"><?php echo esc_html__( 'Loading', 'elementor' ); ?></div>
	</div>
</script>

<script type="text/template" id="tmpl-elementor-template-library-templates">
	<#
		var activeSource = elementor.templates.getFilter('source');
	#>
	<div id="elementor-template-library-toolbar">
		<div class="elementor-template-library-filter-toolbar-side-actions">
			<div id="elementor-template-library-filter-text-wrapper">
				<label for="elementor-template-library-filter-text" class="elementor-screen-only"><?php echo esc_html__( 'Search Templates:', 'elementor' ); ?></label>
				<input type="search" id="elementor-template-library-filter-text" placeholder="<?php echo esc_attr__( 'Search', 'elementor' ); ?>">
				<i class="eicon-search" aria-hidden="true"></i>
			</div>
		</div>
	</div>
	<div class="elementor-screen-only" aria-live="polite" id="elementor-template-library-sort-status" aria-atomic="true"></div>
	<div class="elementor-screen-only" aria-live="polite" id="elementor-template-library-load-status" aria-atomic="true"></div>
	<# if ( 'local' === activeSource ) { #>
		<div class="toolbar-container">
				<section class="bulk-selection-action-bar" role="region" aria-label="<?php echo esc_attr__( 'Bulk actions', 'elementor' ); ?>">
					<button type="button" class="clear-bulk-selections" aria-label="<?php echo esc_attr__( 'Deselect all and close bulk selection', 'elementor' ); ?>">
						<i class="eicon-editor-close" aria-hidden="true"></i>
					</button>
					<span class="selected-count" aria-live="polite"></span>
					<button type="button" class="bulk-delete" aria-label="<?php echo esc_attr__( 'Delete selected templates', 'elementor' ); ?>">
						<i class="eicon-library-delete" aria-hidden="true"></i>
					</button>
				</section>
			<div id="elementor-template-library-navigation-container"></div>
		</div>
		<div id="elementor-template-library-order-toolbar-local">
			<div class="elementor-template-library-local-column-1">
				<input type="checkbox" id="bulk-select-all">
				<input type="radio" id="elementor-template-library-order-local-title" class="elementor-template-library-order-input" name="elementor-template-library-order-local" value="title" data-default-ordering-direction="asc">
				<label for="elementor-template-library-order-local-title" class="elementor-template-library-order-label"><?php echo esc_html__( 'Name', 'elementor' ); ?></label>
			</div>
			<div class="elementor-template-library-local-column-2">
				<input type="radio" id="elementor-template-library-order-local-type" class="elementor-template-library-order-input" name="elementor-template-library-order-local" value="type" data-default-ordering-direction="asc">
				<label for="elementor-template-library-order-local-type" class="elementor-template-library-order-label"><?php echo esc_html__( 'Type', 'elementor' ); ?></label>
			</div>
			<div class="elementor-template-library-local-column-3">
				<input type="radio" id="elementor-template-library-order-local-author" class="elementor-template-library-order-input" name="elementor-template-library-order-local" value="author" data-default-ordering-direction="asc">
				<label for="elementor-template-library-order-local-author" class="elementor-template-library-order-label"><?php echo esc_html__( 'Created By', 'elementor' ); ?></label>
			</div>
			<div class="elementor-template-library-local-column-4">
				<input type="radio" id="elementor-template-library-order-local-date" class="elementor-template-library-order-input" name="elementor-template-library-order-local" value="date">
				<label for="elementor-template-library-order-local-date" class="elementor-template-library-order-label"><?php echo esc_html__( 'Creation Date', 'elementor' ); ?></label>
			</div>
			<div class="elementor-template-library-local-column-5">
				<div class="elementor-template-library-order-label"><?php echo esc_html__( 'Actions', 'elementor' ); ?></div>
			</div>
		</div>
	<# } #>
	<div id="elementor-template-library-templates-container" role="tabpanel"></div>
</script>

<script type="text/template" id="tmpl-elementor-template-library-navigation-container">
	<button class="elementor-template-library-navigation-back-button elementor-button e-button">
		<i class="eicon-chevron-left"></i>
		<?php echo esc_html__( 'Back', 'elementor' ); ?>
	</button>
	<span class="elementor-template-library-current-folder-title"></span>
</script>

<script type="text/template" id="tmpl-elementor-template-library-template-local">
	<div class="elementor-template-library-template-name elementor-template-library-local-column-1">
		<input type="checkbox" class="bulk-selection-item-checkbox" data-template_id="{{ template_id }}" data-type="{{ type }}" data-status="{{ status }}" aria-label="<?php echo esc_attr__( 'Select template', 'elementor' ); ?> {{{ title }}}" aria-checked="false">
		<span>{{ title }}</span>
	</div>
	<div class="elementor-template-library-template-meta elementor-template-library-template-type elementor-template-library-local-column-2">{{{ elementor.translate( type ) }}}</div>
	<div class="elementor-template-library-template-meta elementor-template-library-template-author elementor-template-library-local-column-3">{{{ author }}}</div>
	<div class="elementor-template-library-template-meta elementor-template-library-template-date elementor-template-library-local-column-4">{{{ human_date }}}</div>
	<div class="elementor-template-library-template-controls elementor-template-library-local-column-5">
		<button type="button" class="elementor-template-library-template-preview elementor-button e-btn-txt">
			<i class="eicon-preview-medium" aria-hidden="true"></i>
			<span class="elementor-template-library-template-control-title"><?php echo esc_html__( 'Preview', 'elementor' ); ?></span>
		</button>
		<button class="elementor-template-library-template-action elementor-template-library-template-insert elementor-button e-primary e-btn-txt">
			<i class="eicon-library-download" aria-hidden="true"></i>
			<span class="elementor-button-title"><?php echo esc_html__( 'Insert', 'elementor' ); ?></span>
		</button>
		<button type="button" class="elementor-template-library-template-more-toggle" aria-haspopup="menu" aria-expanded="false" aria-label="<?php echo esc_attr__( 'More actions for template', 'elementor' ); ?> {{{ title }}}">
			<i class="eicon-ellipsis-h" aria-hidden="true"></i>
			<span class="elementor-screen-only"><?php echo esc_html__( 'More actions', 'elementor' ); ?></span>
		</button>
		<ul class="elementor-template-library-template-more" role="menu" aria-label="<?php echo esc_attr__( 'More actions for template', 'elementor' ); ?> {{{ title }}}">
			<li role="menuitem">
				<a href="{{ export_link }}" class="elementor-template-library-template-export">
					<i class="eicon-library-download" aria-hidden="true"></i>
					<span class="elementor-template-library-template-control-title"><?php echo esc_html__( 'Export', 'elementor' ); ?></span>
				</a>
			</li>
			<li role="menuitem">
				<button type="button" class="elementor-template-library-template-rename">
					<i class="eicon-library-edit" aria-hidden="true"></i>
					<span class="elementor-template-library-template-control-title"><?php echo esc_html__( 'Rename', 'elementor' ); ?></span>
				</button>
			</li>
			<li role="menuitem">
				<button type="button" class="elementor-template-library-template-delete">
					<i class="eicon-library-delete" aria-hidden="true"></i>
					<span class="elementor-template-library-template-control-title"><?php echo esc_html__( 'Delete', 'elementor' ); ?></span>
				</button>
			</li>
		</ul>
	</div>
</script>

<script type="text/template" id="tmpl-elementor-template-library-insert-button">
	<a class="elementor-template-library-template-action elementor-template-library-template-insert elementor-button e-primary" role="button" tabindex="0">
		<i class="eicon-library-download" aria-hidden="true"></i>
		<span class="elementor-button-title"><?php echo esc_html__( 'Insert', 'elementor' ); ?></span>
	</a>
</script>

<script type="text/template" id="tmpl-elementor-template-library-apply-ai-button">
	<a class="elementor-template-library-template-action elementor-template-library-template-apply-ai elementor-button e-primary">
		<i class="eicon-file-download" aria-hidden="true"></i>
		<span class="elementor-button-title"><?php echo esc_html__( 'Apply', 'elementor' ); ?></span>
	</a>
</script>

<script type="text/template" id="tmpl-elementor-template-library-insert-and-ai-variations-buttons">
	<a class="elementor-template-library-template-action elementor-template-library-template-insert elementor-button e-primary" role="button" tabindex="0">
		<i class="eicon-library-download" aria-hidden="true"></i>
		<span class="elementor-button-title"><?php echo esc_html__( 'Insert', 'elementor' ); ?></span>
	</a>
	<a class="elementor-template-library-template-action elementor-template-library-template-generate-variation elementor-button e-btn-txt e-btn-txt-border" role="button" tabindex="0">
		<i class="eicon-ai" aria-hidden="true"></i>
		<span class="elementor-button-title"><?php echo esc_html__( 'Generate Variations', 'elementor' ); ?></span>
	</a>
</script>

<script type="text/template" id="tmpl-elementor-template-library-save-template">
	<div class="elementor-template-library-blank-icon">
		<#
			const templateIcon = typeof icon === 'undefined' ? '<i class="eicon-library-upload" aria-hidden="true"></i>' : icon;
			print( templateIcon );
		#>
		<span class="elementor-screen-only"><?php echo esc_html__( 'Save', 'elementor' ); ?></span>
	</div>
	<div class="elementor-template-library-blank-title">{{{ title }}}</div>
	<div class="elementor-template-library-blank-message">{{{ description }}}</div>
	<form id="elementor-template-library-save-template-form">
		<input type="hidden" name="post_id" value="<?php echo esc_attr( get_the_ID() ); ?>">
		<input id="elementor-template-library-save-template-name" name="title" placeholder="<?php echo esc_attr__( 'Enter Template Name', 'elementor' ); ?>" required>
		<button id="elementor-template-library-save-template-submit" class="elementor-button e-primary">
			<span class="elementor-state-icon">
				<i class="eicon-loading eicon-animation-spin" aria-hidden="true"></i>
			</span>
			<?php echo esc_html__( 'Save', 'elementor' ); ?>
		</button>
	</form>
</script>

<script type="text/template" id="tmpl-elementor-template-library-import">
	<form id="elementor-template-library-import-form">
		<div class="elementor-template-library-blank-icon">
			<i class="eicon-library-upload" aria-hidden="true"></i>
		</div>
		<div class="elementor-template-library-blank-title"><?php echo esc_html__( 'Import Template to Your Library', 'elementor' ); ?></div>
		<div class="elementor-template-library-blank-message"><?php echo esc_html__( 'Drag & drop your .JSON or .zip template file', 'elementor' ); ?></div>
		<div id="elementor-template-library-import-form-or"><?php echo esc_html__( 'or', 'elementor' ); ?></div>
		<label for="elementor-template-library-import-form-input" id="elementor-template-library-import-form-label" class="elementor-button e-primary"><?php echo esc_html__( 'Select File', 'elementor' ); ?></label>
		<input id="elementor-template-library-import-form-input" type="file" name="file" accept=".json,.zip" required/>
	</form>
</script>

<script type="text/template" id="tmpl-elementor-template-library-templates-empty">
	<div class="elementor-template-library-blank-icon"></div>
	<div class="elementor-template-library-blank-title"></div>
	<div class="elementor-template-library-blank-message"></div>

</script>

<script type="text/template" id="tmpl-elementor-template-library-preview">
	<iframe></iframe>
</script>

<script type="text/template" id="tmpl-elementor-global-styles-dialog">
	<div class="elementor-global-styles-dialog">
		<div class="elementor-global-styles-dialog__header">
			<h2><?php echo esc_html__( 'Choose how to apply styles', 'elementor' ); ?></h2>
			<p><?php echo esc_html__( 'This affects page settings, classes, and variables.', 'elementor' ); ?></p>
		</div>
		<div class="elementor-global-styles-dialog__options">
			<label class="elementor-global-styles-dialog__radio-card">
				<input type="radio" name="elementor-global-styles-mode" id="elementor-global-styles-match" value="match_site" checked>
				<div class="elementor-global-styles-dialog__radio-card-content">
					<div class="elementor-global-styles-dialog__radio-label"><?php echo esc_html__( 'Use this site’s style', 'elementor' ); ?></div>
					<div class="elementor-global-styles-dialog__radio-description">
						<?php echo esc_html__( 'Apply your site styles to the imported template.', 'elementor' ); ?>
					</div>
				</div>
			</label>
			<label class="elementor-global-styles-dialog__radio-card elementor-global-styles-dialog__radio-card--keep">
				<input type="radio" name="elementor-global-styles-mode" id="elementor-global-styles-keep" value="keep">
				<div class="elementor-global-styles-dialog__radio-card-content">
					<div class="elementor-global-styles-dialog__radio-label"><?php echo esc_html__( 'Keep the template styles', 'elementor' ); ?></div>
					<div class="elementor-global-styles-dialog__radio-description">
						<?php echo esc_html__( 'The template will keep its original design.', 'elementor' ); ?>
					</div>
				</div>
			</label>
			<div class="elementor-global-styles-dialog__checkbox-container" style="display: none;">
				<label class="elementor-global-styles-dialog__checkbox-option">
					<input type="checkbox" id="elementor-global-styles-create" checked>
					<span class="elementor-global-styles-dialog__checkbox-label">
						<?php echo esc_html__( 'Add the template’s classes and variables to my site.', 'elementor' ); ?>
					</span>
				</label>
			</div>
		</div>
		<div class="elementor-global-styles-dialog__footer">
			<button type="button" class="elementor-global-styles-dialog__button-cancel" id="elementor-global-styles-cancel"><?php echo esc_html__( 'Cancel', 'elementor' ); ?></button>
			<button type="button" class="elementor-global-styles-dialog__button-insert" id="elementor-global-styles-insert"><?php echo esc_html__( 'Insert', 'elementor' ); ?></button>
		</div>
	</div>
</script>
