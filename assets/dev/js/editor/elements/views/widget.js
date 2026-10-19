import WidgetDraggable from './behaviors/widget-draggable';
import WidgetResizable from './behaviors/widget-resizeable';
import BaseWidget from './base-widget';

const BaseElementView = require( 'refraction-elements/views/base' );

const WidgetView = BaseWidget.extend( {
	_templateType: null,

	toggleEditTools: true,

	events() {
		var events = BaseWidget.prototype.events.apply( this, arguments );

		events.click = 'onClickEdit';

		return events;
	},

	behaviors() {
		var behaviors = BaseWidget.prototype.behaviors.apply( this, arguments );

		_.extend( behaviors, {
			InlineEditing: {
				behaviorClass: require( 'refraction-behaviors/inline-editing' ),
				inlineEditingClass: 'refraction-inline-editing',
			},
			Draggable: {
				behaviorClass: WidgetDraggable,
			},
			Resizable: {
				behaviorClass: WidgetResizable,
			},
		} );

		return refraction.hooks.applyFilters( 'elements/widget/behaviors', behaviors, this );
	},

	getContextMenuGroups() {
		var groups = BaseWidget.prototype.getContextMenuGroups.apply( this, arguments ),
			transferGroupIndex = groups.indexOf( _.findWhere( groups, { name: 'clipboard' } ) );

		groups.splice( transferGroupIndex + 1, 0, {
			name: 'save',
			actions: [
				{
					name: 'save',
					title: __( 'Save as a global', 'refraction' ),
					shortcut: jQuery( '<i>', { class: 'rficon-pro-icon' } ),
					promotionURL: 'https://github.com/kohid/refraction#readme',
					isEnabled: () => 'global' !== this.options.model.get( 'widgetType' ) &&
						! refraction.selection.isMultiple(),
				},
			],
		} );

		return groups;
	},

	render() {
		if ( this.model.isRemoteRequestActive() ) {
			this.handleEmptyWidget();

			this.$el.addClass( 'refraction-element' );

			return;
		}

		if ( this.isDestroyed ) {
			return;
		}

		BaseElementView.prototype.render.apply( this, arguments );
	},

	handleEmptyWidget() {
		this.$el
			.addClass( 'refraction-widget-empty' )
			.append( '<i class="refraction-widget-empty-icon ' + this.getEditModel().getIcon() + '"></i>' );
	},

	getTemplateType() {
		if ( null === this._templateType ) {
			var editModel = this.getEditModel(),
				$template = jQuery( '#tmpl-refraction-' + editModel.get( 'widgetType' ) + '-content' );

			this._templateType = $template.length ? 'js' : 'remote';
		}

		return this._templateType;
	},

	getHTMLContent( html ) {
		var htmlCache = this.getEditModel().getHtmlCache();

		return htmlCache || html;
	},

	attachElContent( html ) {
		_.defer( () => {
			refractionFrontend.elements.window.jQuery( this.el ).empty().append( this.getHandlesOverlay(), this.getHTMLContent( html ) );

			this.bindUIElements(); // Build again the UI elements since the content attached just now
		} );

		return this;
	},

	addInlineEditingAttributes( key, toolbar ) {
		this.addRenderAttribute( key, {
			class: 'refraction-inline-editing',
			'data-refraction-setting-key': key,
		} );

		if ( toolbar ) {
			this.addRenderAttribute( key, {
				'data-refraction-inline-editing-toolbar': toolbar,
			} );
		}
	},

	onRender() {
		var self = this;

		BaseWidget.prototype.onRender.apply( self, arguments );

		this.normalizeAttributes();

		// TODO: Find a better way to detect if all the images have been loaded
		self.$el.imagesLoaded().always( function() {
			setTimeout( function() {
				// Since 'outerHeight' will not handle hidden elements, and mark them as empty (e.g. nested tabs).
				const $widgetContainer = self.$el.children( '.refraction-widget-container' ).length ? self.$el.children( '.refraction-widget-container' ) : self.$el;

				if ( self.shouldGetEmptyView( $widgetContainer ) ) {
					self.handleEmptyWidget();
				}
			}, 200 );
			// Is element empty?
		} );
	},

	shouldGetEmptyView( $widgetContainer ) {
		if ( ! $widgetContainer.is( ':visible' ) ) {
			return false;
		}

		const hasZeroHeight = ! $widgetContainer.outerHeight();
		const isEmpty = $widgetContainer.is( ':empty' );

		return hasZeroHeight || isEmpty;
	},

	onClickEdit( event ) {
		if ( this.container?.isEditable() ) {
			this.onEditButtonClick( event );
		}
	},
} );

module.exports = WidgetView;
