import BackwardsCompatibility from './backwards-compatibility';
import * as commands from './commands/';
import * as commandsInternal from './commands/internal';
import * as hooks from './hooks/';

/**
 * @typedef {import('./behaviors/footer-saver')} FooterSaver
 */

export default class Component extends BackwardsCompatibility {
	__construct( args = {} ) {
		super.__construct( args );

		this.footerSaver = new ( require( './behaviors/footer-saver' ) )();

		/**
		 * Auto save timer handlers.
		 *
		 * @type {Object}
		 */
		this.autoSaveTimers = {};

		/**
		 * Auto save interval.
		 *
		 * @type {number}
		 */
		this.autoSaveInterval = refraction.config.autosave_interval * 1000;

		refractionCommon.elements.$window.on( 'beforeunload', () => {
			if ( this.isEditorChanged() ) {
				// Returns a message to confirm dialog.
				return __( 'Please note: All unsaved changes will be lost.', 'refraction' );
			}
		} );
	}

	getNamespace() {
		return 'document/save';
	}

	/**
	 * TODO: test
	 *
	 * @param {Document} document
	 */
	startAutoSave( document ) {
		this.stopAutoSave( document );

		this.autoSaveTimers[ document.id ] = setTimeout( () => {
			$e.run( 'document/save/auto', { document } );

			delete this.autoSaveTimers[ document.id ];
		}, this.autoSaveInterval );
	}

	/**
	 * TODO: test
	 *
	 * @param {Document} document
	 */
	stopAutoSave( document ) {
		if ( this.autoSaveTimers[ document.id ] ) {
			clearTimeout( this.autoSaveTimers[ document.id ] );

			delete this.autoSaveTimers[ document.id ];
		}
	}

	defaultCommands() {
		return this.importCommands( commands );
	}

	defaultCommandsInternal() {
		return this.importCommands( commandsInternal );
	}

	defaultHooks() {
		return this.importHooks( hooks );
	}

	isEditorChanged() {
		return ( true === refraction.channels.editor.request( 'status' ) );
	}
}
