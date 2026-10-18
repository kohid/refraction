export default class extends Marionette.ItemView {
	getTemplate() {
		return '#tmpl-refraction-panel-revisions-loading';
	}

	id() {
		return 'refraction-panel-revisions-loading';
	}

	onRender() {
		this.options.document.revisions.requestRevisions( () => {
			setTimeout( () => $e.routes.refreshContainer( 'panel' ) );
		} );
	}
}
