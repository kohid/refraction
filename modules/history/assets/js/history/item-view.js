export default class extends Marionette.ItemView {
	tagName() {
		return 'button';
	}

	getTemplate() {
		return '#tmpl-refraction-panel-history-item';
	}

	className() {
		return 'refraction-history-item refraction-history-item-' + this.model.get( 'status' );
	}

	triggers() {
		return {
			click: 'click',
		};
	}
}
