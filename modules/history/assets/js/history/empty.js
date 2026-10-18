export default class extends Marionette.ItemView {
	getTemplate() {
		return '#tmpl-refraction-panel-history-no-items';
	}

	id() {
		return 'refraction-panel-history-no-items';
	}

	onDestroy() {
		this._parent.$el.removeClass( 'refraction-empty' );
	}
}
