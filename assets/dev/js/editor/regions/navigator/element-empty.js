export default class extends Marionette.ItemView {
	getTemplate() {
		return '#tmpl-refraction-navigator__elements--empty';
	}

	className() {
		return 'refraction-empty-view';
	}

	onRender() {
		this.$el.css( 'padding-inline-start', this.getOption( 'indent' ) + 'px' );
	}
}
