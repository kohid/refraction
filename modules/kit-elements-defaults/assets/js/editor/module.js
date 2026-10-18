import Component from './component';
import { loadElementsDefaults } from './api';
import { extractElementType } from './utils';

export default class Module extends refractionModules.editor.utils.Module {
	onRefractionInit() {
		loadElementsDefaults();
		this.#addContextMenuItem();
	}

	onRefractionInitComponents() {
		window.$e.components.register( new Component() );
	}

	#addContextMenuItem() {
		if ( ! refraction.config?.user?.is_administrator ) {
			return;
		}

		[ 'widget', 'container', 'section' ].forEach( ( elType ) => {
			refraction.hooks.addFilter( `elements/${ elType }/contextMenuGroups`, ( groups, view ) => {
				// Supporting only inner section and not sections,
				// extractElementType() will return 'inner-section' for inner sections instead of 'section'.
				if ( 'section' === extractElementType( view.options?.model || {} ) ) {
					return groups;
				}

				return groups.map( ( group ) => {
					if ( group.name !== 'save' ) {
						return group;
					}

					group.actions = [
						...group.actions,
						{
							name: 'save-as-default',
							title: __( 'Save as default', 'refraction' ),
							isEnabled: () => ! view.getContainer().isLocked(),
							callback: () => {
								$e.run( 'kit-elements-defaults/confirm-creation', { container: view.getContainer() } );
							},
						},
					];

					return group;
				} );
			} );
		} );
	}
}
