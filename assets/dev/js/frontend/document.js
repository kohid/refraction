export default class extends refractionModules.ViewModule {
	getDefaultSettings() {
		return {
			selectors: {
				elements: '.refraction-element',
				nestedDocumentElements: '.refraction .refraction-element',
			},
			classes: {
				editMode: 'refraction-edit-mode',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );

		return {
			$elements: this.$element.find( selectors.elements ).not( this.$element.find( selectors.nestedDocumentElements ) ),
		};
	}

	getDocumentSettings( setting ) {
		let elementSettings;

		if ( this.isEdit ) {
			elementSettings = {};

			const settings = refraction.settings.page.model;

			jQuery.each( settings.getActiveControls(), ( controlKey ) => {
				elementSettings[ controlKey ] = settings.attributes[ controlKey ];
			} );
		} else {
			elementSettings = this.$element.data( 'refraction-settings' ) || {};
		}

		return this.getItems( elementSettings, setting );
	}

	runElementsHandlers() {
		this.elements.$elements.each( ( index, element ) => setTimeout( () => refractionFrontend.elementsHandler.runReadyTrigger( element ) ) );
	}

	onInit() {
		this.$element = this.getSettings( '$element' );

		super.onInit();

		this.isEdit = this.$element.hasClass( this.getSettings( 'classes.editMode' ) );

		if ( this.isEdit ) {
			refraction.on( 'document:loaded', () => {
				refraction.settings.page.model.on( 'change', this.onSettingsChange.bind( this ) );
			} );
		} else {
			this.runElementsHandlers();
		}
	}

	onSettingsChange() {}
}
