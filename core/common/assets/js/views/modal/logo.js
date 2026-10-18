export default class extends Marionette.ItemView {
	getTemplate() {
		return '#tmpl-refraction-templates-modal__header__logo';
	}

	className() {
		return 'refraction-templates-modal__header__logo';
	}

	events() {
		return {
			click: 'onClick',
		};
	}

	templateHelpers() {
		return {
			title: this.getOption( 'title' ),
		};
	}

	onClick() {
		const clickCallback = this.getOption( 'click' );

		if ( clickCallback ) {
			clickCallback();
		}
	}
}
