import Base from './base';

export default class StretchedElement extends Base {
	getStretchedClass() {
		return 'e-stretched';
	}

	getStretchSettingName() {
		return 'stretch_element';
	}

	getStretchActiveValue() {
		return 'yes';
	}

	bindEvents() {
		const handlerID = this.getUniqueHandlerID();

		refractionFrontend.addListenerOnce( handlerID, 'resize', this.stretch );

		refractionFrontend.addListenerOnce( handlerID, 'sticky:stick', this.stretch, this.$element );

		refractionFrontend.addListenerOnce( handlerID, 'sticky:unstick', this.stretch, this.$element );

		if ( refractionFrontend.isEditMode() ) {
			this.onKitChangeStretchContainerChange = this.onKitChangeStretchContainerChange.bind( this );
			refraction.channels.editor.on( 'kit:change:stretchContainer', this.onKitChangeStretchContainerChange );
		}
	}

	unbindEvents() {
		refractionFrontend.removeListeners( this.getUniqueHandlerID(), 'resize', this.stretch );

		if ( refractionFrontend.isEditMode() ) {
			refraction.channels.editor.off( 'kit:change:stretchContainer', this.onKitChangeStretchContainerChange );
		}
	}

	isActive( settings ) {
		return refractionFrontend.isEditMode() || settings.$element.hasClass( this.getStretchedClass() );
	}

	getStretchElementForConfig( childSelector = null ) {
		if ( childSelector ) {
			return this.$element.find( childSelector );
		}

		return this.$element;
	}

	getStretchElementConfig() {
		return {
			element: this.getStretchElementForConfig(),
			selectors: {
				container: this.getStretchContainer(),
			},
			considerScrollbar: refractionFrontend.isEditMode() && refractionFrontend.config.is_rtl,
		};
	}

	initStretch() {
		this.stretch = this.stretch.bind( this );

		this.stretchElement = new refractionModules.frontend.tools.StretchElement( this.getStretchElementConfig() );
	}

	getStretchContainer() {
		return refractionFrontend.getKitSettings( 'stretched_section_container' ) || window;
	}

	isStretchSettingEnabled() {
		return this.getElementSettings( this.getStretchSettingName() ) === this.getStretchActiveValue();
	}

	stretch() {
		if ( ! this.isStretchSettingEnabled() ) {
			return;
		}

		this.stretchElement.stretch();
	}

	onInit( ...args ) {
		if ( ! this.isActive( this.getSettings() ) ) {
			return;
		}

		this.initStretch();

		super.onInit( ...args );

		this.stretch();
	}

	onElementChange( propertyName ) {
		const stretchSettingName = this.getStretchSettingName();

		if ( stretchSettingName === propertyName ) {
			if ( this.isStretchSettingEnabled() ) {
				this.stretch();
			} else {
				this.stretchElement.reset();
			}
		}
	}

	onKitChangeStretchContainerChange() {
		this.stretchElement.setSettings( 'selectors.container', this.getStretchContainer() );

		this.stretch();
	}
}
