export default class StretchedSection extends refractionModules.frontend.handlers.StretchedElement {
	getStretchedClass() {
		return 'refraction-section-stretched';
	}

	getStretchSettingName() {
		return 'stretch_section';
	}

	getStretchActiveValue() {
		return 'section-stretched';
	}
}
