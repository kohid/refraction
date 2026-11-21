import ComponentBase from 'refraction-api/modules/component-base';
import * as commands from './commands/';

export default class Component extends ComponentBase {
	/**
	 * What copying a container copies: a nested widget's own slide or item (locked) copies its widget.
	 *
	 * @param {Object} container
	 */
	static copyTarget( container ) {
		if ( container?.isLocked?.() && 'widget' === container.parent?.model?.get( 'elType' ) ) {
			return container.parent;
		}

		return container;
	}

	getNamespace() {
		return 'document/ui';
	}

	defaultCommands() {
		return this.importCommands( commands );
	}

	defaultShortcuts() {
		// A widget's own slide or item (locked: it goes with its widget) stands for its widget when copying.
		const copyable = () => refraction.selection.getElements().map( ( container ) => Component.copyTarget( container ) );

		const shouldRun = () => {
			const selectedElements = refraction.selection.getElements();

			if ( ! selectedElements.length ) {
				return false;
			}

			const hasLockedContainers = selectedElements.some( ( container ) => container?.isLocked?.() );

			return ! hasLockedContainers;
		};

		return {
			copy: {
				keys: 'ctrl+c',
				exclude: [ 'input' ],
				// In a widget's inline editing with no text selected, Ctrl+C copies the widget.
				noTextSelected: true,
				dependency: () => copyable().length > 0 && ! copyable().some( ( container ) => container?.isLocked?.() ),
			},
			delete: {
				keys: 'del',
				exclude: [ 'input' ],
				dependency: () => shouldRun(),
			},
			duplicate: {
				keys: 'ctrl+d',
				dependency: () => shouldRun() && $e.components.get( 'document/elements' ).utils.allowAddingWidgets(),
			},
			paste: {
				keys: 'ctrl+v',
				exclude: [ 'input' ],
				dependency: () => $e.components.get( 'document/elements' ).utils.allowAddingWidgets(),
			},
			'paste-style': {
				keys: 'ctrl+shift+v',
				exclude: [ 'input' ],
			},
		};
	}
}
