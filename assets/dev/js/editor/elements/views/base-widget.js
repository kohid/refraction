const BaseElementView = require( 'refraction-elements/views/base' );

/**
 * @augments BaseElementView
 */
class BaseWidgetView extends BaseElementView {
	initialize( options ) {
		super.initialize( options );

		const editModel = this.getEditModel();

		editModel.on( {
			'before:remote:render': this.onModelBeforeRemoteRender.bind( this ),
			'remote:render': this.onModelRemoteRender.bind( this ),
			'settings:loaded': () => setTimeout( this.render.bind( this ) ),
		} );

		if ( 'remote' === this.getTemplateType() && ! this.getEditModel().getHtmlCache() ) {
			editModel.renderRemoteServer();
		}

		const onRenderMethod = this.onRender;

		this.render = _.throttle( this.render, 300 );

		this.onRender = function() {
			_.defer( onRenderMethod.bind( this ) );
		};
	}

	className() {
		const baseClasses = super.className();

		return baseClasses + ' refraction-widget ' + refraction.getElementData( this.getEditModel() ).html_wrapper_class;
	}

	normalizeAttributes() {
		const editModel = this.getEditModel(),
			skinType = editModel.getSetting( '_skin' ) || 'default';

		this.$el
			.attr( 'data-widget_type', editModel.get( 'widgetType' ) + '.' + skinType )
			.removeClass( 'refraction-widget-empty' )
			.children( '.refraction-widget-empty-icon' )
			.remove();
	}

	getTemplate() {
		const editModel = this.getEditModel();

		if ( 'remote' !== this.getTemplateType() ) {
			return Marionette.TemplateCache.get( '#tmpl-refraction-' + editModel.get( 'widgetType' ) + '-content' );
		}

		return _.template( '' );
	}

	getEditButtons() {
		const elementData = refraction.getElementData( this.model ),
			editTools = {};

		editTools.edit = {
			/* Translators: %s: Element name. */
			title: sprintf( __( 'Edit %s', 'refraction' ), elementData.title ),
			icon: 'edit',
		};

		if ( refraction.getPreferences( 'edit_buttons' ) ) {
			editTools.duplicate = {
				/* Translators: %s: Element name. */
				title: sprintf( __( 'Duplicate %s', 'refraction' ), elementData.title ),
				icon: 'clone',
			};
		}

		return editTools;
	}

	getRepeaterSettingKey( settingKey, repeaterKey, repeaterItemIndex ) {
		return [ repeaterKey, repeaterItemIndex, settingKey ].join( '.' );
	}

	onModelBeforeRemoteRender() {
		this.$el.addClass( 'refraction-loading' );
	}

	onModelRemoteRender() {
		if ( this.isDestroyed ) {
			return;
		}

		this.$el.removeClass( 'refraction-loading' );

		// If container document has been changed during the remote request, don't render.
		if ( this.getContainer().document.id !== refraction.documents.getCurrent().id ) {
			return;
		}

		this.render();
	}

	onBeforeDestroy() {
		// Remove old style from the DOM.
		refraction.$previewContents.find( '#refraction-style-' + this.model.get( 'id' ) ).remove();
	}
}

module.exports = BaseWidgetView;
