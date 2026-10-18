<?php
namespace Refraction;


if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}
?>
<script type="text/template" id="tmpl-refraction-template-library-header-actions">
	<?php if ( User::is_current_user_can_upload_json() ) { ?>
		<button type="button" id="refraction-template-library-header-import" class="refraction-templates-modal__header__item" aria-label="<?php echo esc_attr__( 'Import Template', 'refraction' ); ?>">
			<i class="eicon-upload-circle-o" aria-hidden="true"></i>
			<span class="refraction-screen-only"><?php echo esc_html__( 'Import Template', 'refraction' ); ?></span>
		</button>
	<?php } ?>
	<button type="button" id="refraction-template-library-header-save" class="refraction-templates-modal__header__item" aria-label="<?php echo esc_attr__( 'Save', 'refraction' ); ?>">
		<i class="eicon-save-o" aria-hidden="true"></i>
		<span class="refraction-screen-only"><?php echo esc_html__( 'Save', 'refraction' ); ?></span>
	</button>
</script>

<script type="text/template" id="tmpl-refraction-template-library-header-menu">
	<# jQuery.each( tabs, ( tab, args ) => { #>
		<button
			role="tab"
			id="tab-{{{ tab }}}"
			aria-controls="refraction-template-library-templates-container"
			aria-selected="false"
			tabindex="-1"
			class="refraction-component-tab refraction-template-library-menu-item"
			data-tab="{{{ tab }}}"
		>
			{{{ args.title }}}
		</button>
	<# } ); #>
</script>

<script type="text/template" id="tmpl-refraction-template-library-header-preview">
	<div id="refraction-template-library-header-preview-insert-wrapper" class="refraction-templates-modal__header__item">
		{{{ refraction.templates.layout.getTemplateActionButton( obj ) }}}
	</div>
</script>

<script type="text/template" id="tmpl-refraction-template-library-header-back">
	<button type="button" class="refraction-template-library-header-back-button" aria-label="<?php echo esc_attr__( 'Back to Library', 'refraction' ); ?>">
		<i class="eicon-chevron-left" aria-hidden="true"></i>
		<span><?php echo esc_html__( 'Back to Library', 'refraction' ); ?></span>
	</button>
</script>

<script type="text/template" id="tmpl-refraction-template-library-loading">
	<div class="refraction-loader-wrapper">
		<div class="refraction-loader">
			<div class="refraction-loader-boxes">
				<div class="refraction-loader-box"></div>
				<div class="refraction-loader-box"></div>
				<div class="refraction-loader-box"></div>
				<div class="refraction-loader-box"></div>
			</div>
		</div>
		<div class="refraction-loading-title"><?php echo esc_html__( 'Loading', 'refraction' ); ?></div>
	</div>
</script>

<script type="text/template" id="tmpl-refraction-template-library-templates">
	<#
		var activeSource = refraction.templates.getFilter('source');
	#>
	<div id="refraction-template-library-toolbar">
		<div class="refraction-template-library-filter-toolbar-side-actions">
			<div id="refraction-template-library-filter-text-wrapper">
				<label for="refraction-template-library-filter-text" class="refraction-screen-only"><?php echo esc_html__( 'Search Templates:', 'refraction' ); ?></label>
				<input type="search" id="refraction-template-library-filter-text" placeholder="<?php echo esc_attr__( 'Search', 'refraction' ); ?>">
				<i class="eicon-search" aria-hidden="true"></i>
			</div>
		</div>
	</div>
	<div class="refraction-screen-only" aria-live="polite" id="refraction-template-library-sort-status" aria-atomic="true"></div>
	<div class="refraction-screen-only" aria-live="polite" id="refraction-template-library-load-status" aria-atomic="true"></div>
	<# if ( 'local' === activeSource ) { #>
		<div class="toolbar-container">
				<section class="bulk-selection-action-bar" role="region" aria-label="<?php echo esc_attr__( 'Bulk actions', 'refraction' ); ?>">
					<button type="button" class="clear-bulk-selections" aria-label="<?php echo esc_attr__( 'Deselect all and close bulk selection', 'refraction' ); ?>">
						<i class="eicon-editor-close" aria-hidden="true"></i>
					</button>
					<span class="selected-count" aria-live="polite"></span>
					<button type="button" class="bulk-delete" aria-label="<?php echo esc_attr__( 'Delete selected templates', 'refraction' ); ?>">
						<i class="eicon-library-delete" aria-hidden="true"></i>
					</button>
				</section>
			<div id="refraction-template-library-navigation-container"></div>
		</div>
		<div id="refraction-template-library-order-toolbar-local">
			<div class="refraction-template-library-local-column-1">
				<input type="checkbox" id="bulk-select-all">
				<input type="radio" id="refraction-template-library-order-local-title" class="refraction-template-library-order-input" name="refraction-template-library-order-local" value="title" data-default-ordering-direction="asc">
				<label for="refraction-template-library-order-local-title" class="refraction-template-library-order-label"><?php echo esc_html__( 'Name', 'refraction' ); ?></label>
			</div>
			<div class="refraction-template-library-local-column-2">
				<input type="radio" id="refraction-template-library-order-local-type" class="refraction-template-library-order-input" name="refraction-template-library-order-local" value="type" data-default-ordering-direction="asc">
				<label for="refraction-template-library-order-local-type" class="refraction-template-library-order-label"><?php echo esc_html__( 'Type', 'refraction' ); ?></label>
			</div>
			<div class="refraction-template-library-local-column-3">
				<input type="radio" id="refraction-template-library-order-local-author" class="refraction-template-library-order-input" name="refraction-template-library-order-local" value="author" data-default-ordering-direction="asc">
				<label for="refraction-template-library-order-local-author" class="refraction-template-library-order-label"><?php echo esc_html__( 'Created By', 'refraction' ); ?></label>
			</div>
			<div class="refraction-template-library-local-column-4">
				<input type="radio" id="refraction-template-library-order-local-date" class="refraction-template-library-order-input" name="refraction-template-library-order-local" value="date">
				<label for="refraction-template-library-order-local-date" class="refraction-template-library-order-label"><?php echo esc_html__( 'Creation Date', 'refraction' ); ?></label>
			</div>
			<div class="refraction-template-library-local-column-5">
				<div class="refraction-template-library-order-label"><?php echo esc_html__( 'Actions', 'refraction' ); ?></div>
			</div>
		</div>
	<# } #>
	<div id="refraction-template-library-templates-container" role="tabpanel"></div>
</script>

<script type="text/template" id="tmpl-refraction-template-library-navigation-container">
	<button class="refraction-template-library-navigation-back-button refraction-button e-button">
		<i class="eicon-chevron-left"></i>
		<?php echo esc_html__( 'Back', 'refraction' ); ?>
	</button>
	<span class="refraction-template-library-current-folder-title"></span>
</script>

<script type="text/template" id="tmpl-refraction-template-library-template-local">
	<div class="refraction-template-library-template-name refraction-template-library-local-column-1">
		<input type="checkbox" class="bulk-selection-item-checkbox" data-template_id="{{ template_id }}" data-type="{{ type }}" data-status="{{ status }}" aria-label="<?php echo esc_attr__( 'Select template', 'refraction' ); ?> {{{ title }}}" aria-checked="false">
		<span>{{ title }}</span>
	</div>
	<div class="refraction-template-library-template-meta refraction-template-library-template-type refraction-template-library-local-column-2">{{{ refraction.translate( type ) }}}</div>
	<div class="refraction-template-library-template-meta refraction-template-library-template-author refraction-template-library-local-column-3">{{{ author }}}</div>
	<div class="refraction-template-library-template-meta refraction-template-library-template-date refraction-template-library-local-column-4">{{{ human_date }}}</div>
	<div class="refraction-template-library-template-controls refraction-template-library-local-column-5">
		<button type="button" class="refraction-template-library-template-preview refraction-button e-btn-txt">
			<i class="eicon-preview-medium" aria-hidden="true"></i>
			<span class="refraction-template-library-template-control-title"><?php echo esc_html__( 'Preview', 'refraction' ); ?></span>
		</button>
		<button class="refraction-template-library-template-action refraction-template-library-template-insert refraction-button e-primary e-btn-txt">
			<i class="eicon-library-download" aria-hidden="true"></i>
			<span class="refraction-button-title"><?php echo esc_html__( 'Insert', 'refraction' ); ?></span>
		</button>
		<button type="button" class="refraction-template-library-template-more-toggle" aria-haspopup="menu" aria-expanded="false" aria-label="<?php echo esc_attr__( 'More actions for template', 'refraction' ); ?> {{{ title }}}">
			<i class="eicon-ellipsis-h" aria-hidden="true"></i>
			<span class="refraction-screen-only"><?php echo esc_html__( 'More actions', 'refraction' ); ?></span>
		</button>
		<ul class="refraction-template-library-template-more" role="menu" aria-label="<?php echo esc_attr__( 'More actions for template', 'refraction' ); ?> {{{ title }}}">
			<li role="menuitem">
				<a href="{{ export_link }}" class="refraction-template-library-template-export">
					<i class="eicon-library-download" aria-hidden="true"></i>
					<span class="refraction-template-library-template-control-title"><?php echo esc_html__( 'Export', 'refraction' ); ?></span>
				</a>
			</li>
			<li role="menuitem">
				<button type="button" class="refraction-template-library-template-rename">
					<i class="eicon-library-edit" aria-hidden="true"></i>
					<span class="refraction-template-library-template-control-title"><?php echo esc_html__( 'Rename', 'refraction' ); ?></span>
				</button>
			</li>
			<li role="menuitem">
				<button type="button" class="refraction-template-library-template-delete">
					<i class="eicon-library-delete" aria-hidden="true"></i>
					<span class="refraction-template-library-template-control-title"><?php echo esc_html__( 'Delete', 'refraction' ); ?></span>
				</button>
			</li>
		</ul>
	</div>
</script>

<script type="text/template" id="tmpl-refraction-template-library-insert-button">
	<a class="refraction-template-library-template-action refraction-template-library-template-insert refraction-button e-primary" role="button" tabindex="0">
		<i class="eicon-library-download" aria-hidden="true"></i>
		<span class="refraction-button-title"><?php echo esc_html__( 'Insert', 'refraction' ); ?></span>
	</a>
</script>

<script type="text/template" id="tmpl-refraction-template-library-apply-ai-button">
	<a class="refraction-template-library-template-action refraction-template-library-template-apply-ai refraction-button e-primary">
		<i class="eicon-file-download" aria-hidden="true"></i>
		<span class="refraction-button-title"><?php echo esc_html__( 'Apply', 'refraction' ); ?></span>
	</a>
</script>

<script type="text/template" id="tmpl-refraction-template-library-insert-and-ai-variations-buttons">
	<a class="refraction-template-library-template-action refraction-template-library-template-insert refraction-button e-primary" role="button" tabindex="0">
		<i class="eicon-library-download" aria-hidden="true"></i>
		<span class="refraction-button-title"><?php echo esc_html__( 'Insert', 'refraction' ); ?></span>
	</a>
	<a class="refraction-template-library-template-action refraction-template-library-template-generate-variation refraction-button e-btn-txt e-btn-txt-border" role="button" tabindex="0">
		<i class="eicon-ai" aria-hidden="true"></i>
		<span class="refraction-button-title"><?php echo esc_html__( 'Generate Variations', 'refraction' ); ?></span>
	</a>
</script>

<script type="text/template" id="tmpl-refraction-template-library-save-template">
	<div class="refraction-template-library-blank-icon">
		<#
			const templateIcon = typeof icon === 'undefined' ? '<i class="eicon-library-upload" aria-hidden="true"></i>' : icon;
			print( templateIcon );
		#>
		<span class="refraction-screen-only"><?php echo esc_html__( 'Save', 'refraction' ); ?></span>
	</div>
	<div class="refraction-template-library-blank-title">{{{ title }}}</div>
	<div class="refraction-template-library-blank-message">{{{ description }}}</div>
	<form id="refraction-template-library-save-template-form">
		<input type="hidden" name="post_id" value="<?php echo esc_attr( get_the_ID() ); ?>">
		<input id="refraction-template-library-save-template-name" name="title" placeholder="<?php echo esc_attr__( 'Enter Template Name', 'refraction' ); ?>" required>
		<button id="refraction-template-library-save-template-submit" class="refraction-button e-primary">
			<span class="refraction-state-icon">
				<i class="eicon-loading eicon-animation-spin" aria-hidden="true"></i>
			</span>
			<?php echo esc_html__( 'Save', 'refraction' ); ?>
		</button>
	</form>
</script>

<script type="text/template" id="tmpl-refraction-template-library-import">
	<form id="refraction-template-library-import-form">
		<div class="refraction-template-library-blank-icon">
			<i class="eicon-library-upload" aria-hidden="true"></i>
		</div>
		<div class="refraction-template-library-blank-title"><?php echo esc_html__( 'Import Template to Your Library', 'refraction' ); ?></div>
		<div class="refraction-template-library-blank-message"><?php echo esc_html__( 'Drag & drop your .JSON or .zip template file', 'refraction' ); ?></div>
		<div id="refraction-template-library-import-form-or"><?php echo esc_html__( 'or', 'refraction' ); ?></div>
		<label for="refraction-template-library-import-form-input" id="refraction-template-library-import-form-label" class="refraction-button e-primary"><?php echo esc_html__( 'Select File', 'refraction' ); ?></label>
		<input id="refraction-template-library-import-form-input" type="file" name="file" accept=".json,.zip" required/>
	</form>
</script>

<script type="text/template" id="tmpl-refraction-template-library-templates-empty">
	<div class="refraction-template-library-blank-icon"></div>
	<div class="refraction-template-library-blank-title"></div>
	<div class="refraction-template-library-blank-message"></div>

</script>

<script type="text/template" id="tmpl-refraction-template-library-preview">
	<iframe></iframe>
</script>

<script type="text/template" id="tmpl-refraction-global-styles-dialog">
	<div class="refraction-global-styles-dialog">
		<div class="refraction-global-styles-dialog__header">
			<h2><?php echo esc_html__( 'Choose how to apply styles', 'refraction' ); ?></h2>
			<p><?php echo esc_html__( 'This affects page settings, classes, and variables.', 'refraction' ); ?></p>
		</div>
		<div class="refraction-global-styles-dialog__options">
			<label class="refraction-global-styles-dialog__radio-card">
				<input type="radio" name="refraction-global-styles-mode" id="refraction-global-styles-match" value="match_site" checked>
				<div class="refraction-global-styles-dialog__radio-card-content">
					<div class="refraction-global-styles-dialog__radio-label"><?php echo esc_html__( 'Use this site’s style', 'refraction' ); ?></div>
					<div class="refraction-global-styles-dialog__radio-description">
						<?php echo esc_html__( 'Apply your site styles to the imported template.', 'refraction' ); ?>
					</div>
				</div>
			</label>
			<label class="refraction-global-styles-dialog__radio-card refraction-global-styles-dialog__radio-card--keep">
				<input type="radio" name="refraction-global-styles-mode" id="refraction-global-styles-keep" value="keep">
				<div class="refraction-global-styles-dialog__radio-card-content">
					<div class="refraction-global-styles-dialog__radio-label"><?php echo esc_html__( 'Keep the template styles', 'refraction' ); ?></div>
					<div class="refraction-global-styles-dialog__radio-description">
						<?php echo esc_html__( 'The template will keep its original design.', 'refraction' ); ?>
					</div>
				</div>
			</label>
			<div class="refraction-global-styles-dialog__checkbox-container" style="display: none;">
				<label class="refraction-global-styles-dialog__checkbox-option">
					<input type="checkbox" id="refraction-global-styles-create" checked>
					<span class="refraction-global-styles-dialog__checkbox-label">
						<?php echo esc_html__( 'Add the template’s classes and variables to my site.', 'refraction' ); ?>
					</span>
				</label>
			</div>
		</div>
		<div class="refraction-global-styles-dialog__footer">
			<button type="button" class="refraction-global-styles-dialog__button-cancel" id="refraction-global-styles-cancel"><?php echo esc_html__( 'Cancel', 'refraction' ); ?></button>
			<button type="button" class="refraction-global-styles-dialog__button-insert" id="refraction-global-styles-insert"><?php echo esc_html__( 'Insert', 'refraction' ); ?></button>
		</div>
	</div>
</script>
