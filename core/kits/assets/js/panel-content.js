export default class extends refractionModules.editor.views.ControlsStack {
	id() {
		return 'refraction-kit-panel-content';
	}

	getTemplate() {
		return '#tmpl-refraction-kit-panel-content';
	}

	childViewContainer() {
		return '#refraction-kit-panel-content-controls';
	}

	onBeforeShow() {
		const tabConfig = $e.components.get( 'panel/global' ).getActiveTabConfig();

		refraction.hooks.doAction( `panel/${ tabConfig.group }/tab/before-show`, { id: tabConfig.id } );
	}

	onBeforeDestroy() {
		const tabConfig = $e.components.get( 'panel/global' ).getActiveTabConfig();

		refraction.hooks.doAction( `panel/${ tabConfig.group }/tab/before-destroy`, { id: tabConfig.id } );
	}

	childViewOptions() {
		const container = this.getOption( 'container' );

		return {
			elementSettingsModel: container.settings,
			container,
		};
	}
}
