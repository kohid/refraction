import environment from 'refraction-common/utils/environment';

export default class extends Marionette.LayoutView {
	id() {
		return 'refraction-hotkeys';
	}

	templateHelpers() {
		return {
			environment,
		};
	}

	getTemplate() {
		return '#tmpl-refraction-hotkeys';
	}
}
