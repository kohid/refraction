class FloatingBarsLibraryModule extends refractionModules.editor.utils.Module {
	onRefractionLoaded() {
		refraction.channels.editor.on( 'section:activated', this.hideAdvancedTab.bind( this ) );
	}

	hideAdvancedTab( sectionName, editor ) {
		const widgetType = editor?.model?.get( 'widgetType' ) || '';

		if ( ! widgetType.startsWith( 'floating-bars' ) ) {
			return;
		}

		const advancedTab = editor?.el.querySelector( '.refraction-tab-control-advanced' ) || false;

		if ( advancedTab ) {
			advancedTab.style.display = 'none';
		}
	}

	onRefractionInit() {
		const urlParams = new URLSearchParams( window.location.search );

		if ( 'floating-bars' === urlParams.get( 'floating_element' ) ) {
			refraction.hooks.addFilter( 'refraction/editor/template-library/template/classes', ( classes ) => {
				return classes.replace( 'refraction-template-library-template-floating_button', 'refraction-template-library-template-floating_bar' );
			}, 10, 1 );
		}
	}
}

export default FloatingBarsLibraryModule;
