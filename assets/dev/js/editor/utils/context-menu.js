module.exports = refractionModules.Module.extend( {

	openMenuEvent: null,
	location: null,

	getDefaultSettings() {
		return {
			context: 'preview',
			actions: {},
			classes: {
				list: 'refraction-context-menu-list',
				group: 'refraction-context-menu-list__group',
				groupPrefix: 'refraction-context-menu-list__group-',
				item: 'refraction-context-menu-list__item',
				itemTypePrefix: 'refraction-context-menu-list__item-',
				itemTitle: 'refraction-context-menu-list__item__title',
				itemShortcut: 'refraction-context-menu-list__item__shortcut',
				iconShortcut: 'refraction-context-menu-list__item__icon',
				itemDisabled: 'refraction-context-menu-list__item--disabled',
				itemHasShortcutAction: 'refraction-context-menu-list__item--has-shortcut-action',
				divider: 'refraction-context-menu-list__divider',
				hidden: 'refraction-hidden',
				promotionLink: 'refraction-context-menu-list__item__shortcut--link-fullwidth',
			},
		};
	},

	buildActionItem( action ) {
		var self = this,
			classes = self.getSettings( 'classes' ),
			$item = jQuery( '<div>', { class: classes.item + ' ' + classes.itemTypePrefix + action.name, role: 'menuitem', tabindex: '0' } ),
			$itemTitle = jQuery( '<div>', { class: classes.itemTitle } ).text( action.title ),
			$itemIcon = jQuery( '<div>', { class: classes.iconShortcut } );

		if ( action.icon ) {
			$itemIcon.html( jQuery( '<i>', { class: action.icon } ) );
		}

		$item.append( $itemIcon, $itemTitle );

		if ( action.shortcut ) {
			var $itemShortcut = jQuery( '<div>', { class: classes.itemShortcut } ).html( action.shortcut );

			$item.append( $itemShortcut );
		}

		if ( action.callback ) {
			$item.on( 'click', function() {
				self.runAction( action );
			} );
			$item.on( 'keyup', function( event ) {
				const ENTER_KEY = 13,
					SPACE_KEY = 32;

				if ( ENTER_KEY === event.keyCode || SPACE_KEY === event.keyCode ) {
					self.runAction( action );
				}
			} );
		}

		action.$item = $item;

		return $item;
	},

	buildActionsList() {
		var self = this,
			classes = self.getSettings( 'classes' ),
			groups = self.getSettings( 'groups' ),
			$list = jQuery( '<div>', { class: classes.list, role: 'menu' } );

		groups.forEach( function( group ) {
			var $group = jQuery( '<div>', { class: classes.group + ' ' + classes.groupPrefix + group.name, role: 'group' } );

			group.actions.forEach( function( action ) {
				$group.append( self.buildActionItem( action ) );
			} );

			$list.append( $group );

			group.$item = $group;
		} );

		return $list;
	},

	toggleGroupVisibility( group, state ) {
		group.$item.toggleClass( this.getSettings( 'classes.hidden' ), ! state );
	},

	toggleActionVisibility( action, state ) {
		action.$item.toggleClass( this.getSettings( 'classes.hidden' ), ! state );
	},

	toggleActionUsability( action, state ) {
		this.maybeAddPromotionLink( action );

		action.$item.toggleClass( this.getSettings( 'classes.itemDisabled' ), ! state );

		if ( action.hasShortcutAction ) {
			action.$item.toggleClass( this.getSettings( 'classes.itemHasShortcutAction' ), ! state );
		}
	},

	maybeAddPromotionLink( action ) {
		if ( this.shouldAddPromotionLink( action ) ) {
			const iconContainer = action.$item.find( 'div.refraction-context-menu-list__item__shortcut' )[ 0 ];
			iconContainer.insertAdjacentHTML( 'beforeend', `<a href='${ action.promotionURL }' target="_blank" class="${ this.getSettings( 'classes.promotionLink' ) }"></a>` );
		}
	},

	shouldAddPromotionLink( action ) {
		return !! ( action.promotionURL &&
			! action.$item.find( 'a.refraction-context-menu-list__item__shortcut--link-fullwidth' )[ 0 ] &&
			action.$item.find( 'i.eicon-pro-icon' )[ 0 ] );
	},

	/**
	 * Update the action title.
	 *
	 * Sometimes the action title should dynamically change. This can be done by passing a function as the `title`
	 * property when initializing the context-menu, and here it actually invoked and assigned as the title.
	 *
	 * @param {*} action
	 */
	updateActionTitle( action ) {
		if ( 'function' === typeof action.title ) {
			action.$item.find( '.' + this.getSettings( 'classes' ).itemTitle ).text( action.title() );
		}
	},

	isActionEnabled( action ) {
		if ( ! action.callback && ! action.groups ) {
			return false;
		}

		return action.isEnabled ? action.isEnabled() : true;
	},

	isActionVisible( action ) {
		if ( 'function' === typeof action.isVisible ) {
			return action.isVisible();
		}

		return false !== action.isVisible;
	},

	runAction( action ) {
		if ( ! this.isActionEnabled( action ) || ! this.isActionVisible( action ) ) {
			return;
		}

		action.callback( this.openMenuEvent, {
			location: this.location,
			secondaryLocation: refractionCommon.eventsManager.config.secondaryLocations.contextMenu,
			trigger: refractionCommon.eventsManager.config.triggers.rightClick,
		} );

		this.getModal().hide();
	},

	initModal() {
		var modal;

		this.getModal = function() {
			if ( ! modal ) {
				modal = refractionCommon.dialogsManager.createWidget( 'simple', {
					className: 'refraction-context-menu',
					message: this.buildActionsList(),
					iframe: 'preview' === this.getSettings( 'context' ) ? refraction.$preview : null,
					effects: {
						hide: 'hide',
						show: 'show',
					},
					hide: {
						onOutsideContextMenu: true,
					},
					position: {
						my: ( refractionCommon.config.isRTL ? 'right' : 'left' ) + ' top',
						collision: 'fit',
					},
				} );
			}

			return modal;
		};
	},

	show( event, options = {} ) {
		var self = this,
			modal = self.getModal();

		this.openMenuEvent = event;
		this.location = options.location;

		modal.setSettings( 'position', {
			of: event,
		} );

		self.getSettings( 'groups' ).forEach( function( group ) {
			var isGroupVisible = false !== group.isVisible;

			self.toggleGroupVisibility( group, isGroupVisible );

			if ( isGroupVisible ) {
				group.actions.forEach( function( action ) {
					const isActionVisible = self.isActionVisible( action );

					self.toggleActionVisibility( action, isActionVisible );

					self.updateActionTitle( action );

					if ( isActionVisible ) {
						self.toggleActionUsability( action, self.isActionEnabled( action ) );
					}
				} );
			}
		} );

		modal.show();

		refraction.templates.eventManager.sendContextMenuExposureEvent();
	},

	destroy() {
		this.getModal().destroy();
	},

	onInit() {
		this.initModal();
	},
} );
