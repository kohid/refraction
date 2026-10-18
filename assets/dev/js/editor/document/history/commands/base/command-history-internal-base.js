/**
 * @typedef {import ('refraction/modules/history/assets/js/module')} HistoryManager
 */

export default class CommandHistoryInternalBase extends $e.modules.editor.CommandContainerInternalBase {
	initialize( args ) {
		super.initialize( args );

		/**
		 * @type {HistoryManager}
		 */
		this.history = refraction.documents.getCurrent().history;
	}
}
