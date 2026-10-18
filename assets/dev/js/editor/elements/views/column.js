import { DEFAULT_MAX_COLUMNS } from 'refraction-elements/views/section';

var BaseElementView = require( 'refraction-elements/views/base' ),
	ColumnEmptyView = require( 'refraction-elements/views/column-empty' ),
	ColumnView;

ColumnView = BaseElementView.extend( {
	template: Marionette.TemplateCache.get( '#tmpl-refraction-column-content' ),

	emptyView: ColumnEmptyView,

	childViewContainer: '> .refraction-widget-wrap',

	toggleEditTools: true,

	behaviors() {
		var behaviors = BaseElementView.prototype.behaviors.apply( this, arguments );

		_.extend( behaviors, {
			Sortable: {
				behaviorClass: require( 'refraction-behaviors/sortable' ),
				elChildType: 'widget',
			},
			Resizable: {
				behaviorClass: require( 'refraction-behaviors/column-resizable' ),
			},
		} );

		return refraction.hooks.applyFilters( 'elements/column/behaviors', behaviors, this );
	},

	className() {
		var classes = BaseElementView.prototype.className.apply( this, arguments ),
			type = this.isInner() ? 'inner' : 'top';

		return classes + ' refraction-column refraction-' + type + '-column';
	},

	tagName() {
		return this.model.getSetting( 'html_tag' ) || 'div';
	},

	ui() {
		var ui = BaseElementView.prototype.ui.apply( this, arguments );

		ui.columnInner = '> .refraction-widget-wrap';

		ui.percentsTooltip = '> .refraction-element-overlay .refraction-column-percents-tooltip';

		return ui;
	},

	getEditButtons() {
		const elementData = refraction.getElementData( this.model ),
			editTools = {};

		editTools.edit = {
			/* Translators: %s: Element name. */
			title: sprintf( __( 'Edit %s', 'refraction' ), elementData.title ),
			icon: 'column',
		};

		if ( refraction.getPreferences( 'edit_buttons' ) ) {
			editTools.duplicate = {
				/* Translators: %s: Element name. */
				title: sprintf( __( 'Duplicate %s', 'refraction' ), elementData.title ),
				icon: 'clone',
			};

			editTools.add = {
				/* Translators: %s: Element name. */
				title: sprintf( __( 'Add %s', 'refraction' ), elementData.title ),
				icon: 'plus',
			};
		}

		return editTools;
	},

	initialize() {
		BaseElementView.prototype.initialize.apply( this, arguments );

		this.model.get( 'editSettings' ).set( 'defaultEditRoute', 'layout' );
	},

	attachElContent() {
		BaseElementView.prototype.attachElContent.apply( this, arguments );

		const $tooltip = jQuery( '<div>', { class: 'refraction-column-percents-tooltip' } );

		this.$el.children( '.refraction-element-overlay' ).append( $tooltip );
	},

	getContextMenuGroups() {
		const self = this,
			groups = BaseElementView.prototype.getContextMenuGroups.apply( this, arguments ),
			generalGroupIndex = groups.indexOf( _.findWhere( groups, { name: 'general' } ) );

		groups.splice( generalGroupIndex + 1, 0, {
			name: 'addNew',
			actions: [
				{
					name: 'addNew',
					icon: 'eicon-plus',
					title: __( 'Add New Column', 'refraction' ),
					callback: this.addNewColumn.bind( this ),
					isEnabled: () => self.model.collection.length < DEFAULT_MAX_COLUMNS && ! refraction.selection.isMultiple(),
				},
			],
		} );

		return groups;
	},

	isDroppingAllowed() {
		// Don't allow dragging items to document which is not editable.
		if ( ! this.getContainer().isEditable() ) {
			return false;
		}

		var elementView = refraction.channels.panelElements.request( 'element:selected' );

		if ( ! elementView ) {
			return false;
		}

		var elType = elementView.model.get( 'elType' );

		if ( 'container' === elType ) {
			return true;
		}

		if ( 'section' === elType ) {
			return ! this.isInner();
		}

		return 'widget' === elType;
	},

	getPercentsForDisplay() {
		const inlineSize = +this.model.getSetting( '_inline_size' ) || this.getPercentSize();

		return inlineSize.toFixed( 1 ) + '%';
	},

	changeSizeUI() {
		const self = this,
			columnSize = self.model.getSetting( '_column_size' );

		self.$el.attr( 'data-col', columnSize );

		_.defer( function() { // Wait for the column size to be applied
			if ( self.ui.percentsTooltip ) {
				self.ui.percentsTooltip.text( self.getPercentsForDisplay() );
			}
		} );
	},

	getPercentSize( size ) {
		if ( ! size ) {
			size = this.el.getBoundingClientRect().width;
		}

		return +( size / this.$el.parent().width() * 100 ).toFixed( 3 );
	},

	getSortableOptions() {
		return {
			connectWith: '.refraction-widget-wrap',
			items: '> .refraction-element',
		};
	},

	changeChildContainerClasses() {
		const emptyClass = 'refraction-element-empty',
			populatedClass = 'refraction-element-populated';

		if ( this.ui.columnInner ) {
			if ( this.collection.isEmpty() ) {
				this.ui.columnInner.removeClass( populatedClass ).addClass( emptyClass );
			} else {
				this.ui.columnInner.removeClass( emptyClass ).addClass( populatedClass );
			}
		}
	},

	addNewColumn() {
		$e.run( 'document/elements/create', {
			model: {
				elType: 'column',
			},
			container: this.getContainer().parent,
			options: {
				at: this.$el.index() + 1,
			},
		} );
	},

	onRender() {
		const getDropIndex = ( side, event ) => {
			let newIndex = jQuery( event.currentTarget ).index();

			if ( 'top' === side ) {
				newIndex--;
			}

			return newIndex;
		};

		BaseElementView.prototype.onRender.apply( this, arguments );

		this.changeChildContainerClasses();

		this.changeSizeUI();

		this.$el.html5Droppable( {
			items: ' > .refraction-widget-wrap > .refraction-element, >.refraction-widget-wrap > .refraction-empty-view > .refraction-first-add',
			axis: [ 'vertical' ],
			groups: [ 'refraction-element' ],
			isDroppingAllowed: this.isDroppingAllowed.bind( this ),
			currentElementClass: 'refraction-html5dnd-current-element',
			placeholderClass: 'refraction-sortable-placeholder refraction-widget-placeholder',
			hasDraggingOnChildClass: 'refraction-dragging-on-child',
			onDropping: ( side, event ) => {
				// Triggering drag end manually, since it won't fired above iframe
				refraction.getPreviewView().onPanelElementDragEnd();

				this.onDrop(
					event,
					{ side, at: getDropIndex( side, event ) },
				);
			},
		} );
	},

	onAddButtonClick( event ) {
		event.stopPropagation();

		this.addNewColumn();
	},
} );

module.exports = ColumnView;
