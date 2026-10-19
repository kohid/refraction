import BaseManager from '../base/manager';

export default class extends BaseManager {
	getDefaultSettings() {
		return {
			darkModeLinkID: 'refraction-editor-dark-mode-css',
		};
	}

	constructor( ...args ) {
		super( ...args );

		this.changeCallbacks = {
			ui_theme: this.onUIThemeChanged,
			refraction_theme: this.onRefractionThemeChanged,
			panel_width: this.onPanelWidthChanged,
			edit_buttons: this.onEditButtonsChanged,
			show_hidden_elements: this.onShowHiddenElementsChange,
			show_launchpad_checklist: this.toggleChecklistIconVisibility,
		};
	}

	toggleChecklistIconVisibility( switcherValue ) {
		const shouldShow = 'yes' === switcherValue;

		this.addMixpanelTrackingChecklist( shouldShow );

		$e.run( 'checklist/toggle-icon', shouldShow );
	}

	onUIThemeChanged( newValue ) {
		const $lightUi = jQuery( '#e-theme-ui-light-css' );
		const $darkUi = jQuery( '#e-theme-ui-dark-css' );

		if ( 'auto' === newValue ) {
			$lightUi.attr( 'media', '(prefers-color-scheme: light)' );
			$darkUi.attr( 'media', '(prefers-color-scheme: dark)' );

			return;
		}

		if ( 'light' === newValue ) {
			$lightUi.attr( 'media', 'all' );
			$darkUi.attr( 'media', 'none' );
		} else {
			$lightUi.attr( 'media', 'none' );
			$darkUi.attr( 'media', 'all' );
		}
	}

	// Paint the chosen Refraction theme at once. Automatic removes the attribute, so the editor looks as it always did.
	// The preview iframe is another document and is never touched.
	onRefractionThemeChanged( newValue ) {
		const root = document.documentElement;

		if ( ! newValue || 'auto' === newValue ) {
			root.removeAttribute( 'data-refraction-theme' );
		} else {
			root.setAttribute( 'data-refraction-theme', newValue );
		}
	}

	onPanelWidthChanged( newValue ) {
		refraction.panel.saveSize( { width: newValue.size + newValue.unit } );

		refraction.panel.setSize();
	}

	onEditButtonsChanged() {
		// Let the button change before the high-performance action of rendering the entire page
		setTimeout( () => refraction.getPreviewView()._renderChildren(), 300 );
	}

	onShowHiddenElementsChange() {
		refractionFrontend.elements.$body.toggleClass( 'e-preview--show-hidden-elements' );
	}

	addMixpanelTrackingChecklist( shouldShow ) {
		const name = shouldShow ? 'checklistShow' : 'checklistHide';
		const postId = refraction.getPreviewContainer().document.config.id;
		const postTitle = refraction.getPreviewContainer().model.attributes.settings.attributes.post_title;
		const postTypeTitle = refraction.getPreviewContainer().document.config.post_type_title;
		const documentType = refraction.getPreviewContainer().document.config.type;

		return (
			refractionCommon.eventsManager.dispatchEvent(
				refractionCommon.eventsManager.config.names.refractionEditor.userPreferences[ name ],
				{
					location: refractionCommon.eventsManager.config.locations.refractionEditor,
					secondaryLocation: refractionCommon.eventsManager.config.secondaryLocations.userPreferences,
					trigger: refractionCommon.eventsManager.config.triggers.toggleClick,
					element: refractionCommon.eventsManager.config.elements.toggle,
					postId,
					postTitle,
					postTypeTitle,
					documentType,
				},
			)
		);
	}
}
