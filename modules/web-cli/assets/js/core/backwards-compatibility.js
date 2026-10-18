import ComponentBase from 'refraction-api/modules/component-base';

export default class BackwardsCompatibility {
	ensureTab( namespace, tabSlug, page = '' ) {
		let component = $e.components.get( namespace );

		if ( ! component ) {
			const Component = class extends ComponentBase {
				getNamespace() {
					return namespace;
				}

				renderTab( tab ) {
					refraction.getPanelView().setPage( page ).activateTab( tab );
				}
			};

			component = $e.components.register( new Component() );
		}

		if ( ! component.hasTab( tabSlug ) && refraction.config.tabs[ tabSlug ] ) {
			component.addTab( tabSlug, {
				title: refraction.config.tabs[ tabSlug ],
			} );
		}
	}
}
