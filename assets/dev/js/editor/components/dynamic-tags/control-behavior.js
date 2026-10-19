var TagPanelView = require( 'refraction-dynamic-tags/tag-panel-view' );

module.exports = Marionette.Behavior.extend( {

	tagView: null,

	listenerAttached: false,

	initialize() {
		if ( ! this.listenerAttached ) {
			this.listenTo( this.view.options.container.settings, 'change:external:__dynamic__', this.onAfterExternalChange );
			this.listenerAttached = true;
		}
	},

	shouldRenderTools() {
		const hasDefault = this.getOption( 'dynamicSettings' ).default;

		if ( hasDefault ) {
			return false;
		}

		return this.getOption( 'tags' ).length > 0;
	},

	renderTools() {
		if ( ! this.shouldRenderTools() ) {
			return;
		}

		const $dynamicSwitcher = jQuery( Marionette.Renderer.render( '#tmpl-refraction-control-dynamic-switcher' ) );

		$dynamicSwitcher.on( 'click', ( event ) => this.onDynamicSwitcherClick( event ) );

		this.$el.find( '.refraction-control-dynamic-switcher-wrapper' ).append( $dynamicSwitcher );

		this.ui.dynamicSwitcher = $dynamicSwitcher;

		if ( 'color' === this.view.model.get( 'type' ) ) {
			if ( this.view.colorPicker ) {
				this.moveDynamicSwitcherToColorPicker();
			} else {
				setTimeout( () => this.moveDynamicSwitcherToColorPicker() );
			}
		}

		// Add a Tipsy Tooltip to the Dynamic Switcher
		this.ui.dynamicSwitcher.tipsy( {
			title() {
				return this.getAttribute( 'data-tooltip' );
			},
			gravity: 's',
		} );
	},

	moveDynamicSwitcherToColorPicker() {
		const $colorPickerToolsContainer = this.view.colorPicker.$pickerToolsContainer;

		this.ui.dynamicSwitcher.removeClass( 'refraction-control-unit-1' ).addClass( 'e-control-tool' );

		const $eyedropper = $colorPickerToolsContainer.find( '.refraction-control-element-color-picker' );

		if ( $eyedropper.length ) {
			this.ui.dynamicSwitcher.insertBefore( $eyedropper );
		} else {
			$colorPickerToolsContainer.append( this.ui.dynamicSwitcher );
		}
	},

	toggleDynamicClass() {
		this.$el.toggleClass( 'refraction-control-dynamic-value', this.isDynamicMode() );
	},

	isDynamicMode() {
		var dynamicSettings = this.view.container.settings.get( '__dynamic__' );

		return ! ! ( dynamicSettings && dynamicSettings[ this.view.model.get( 'name' ) ] );
	},

	createTagsList() {
		var tags = _.groupBy( this.getOption( 'tags' ), 'group' ),
			groups = refraction.dynamicTags.getConfig( 'groups' ),
			$tagsList = this.ui.tagsList = jQuery( '<div>', { class: 'refraction-tags-list' } ),
			$tagsListInner = jQuery( '<div>', { class: 'refraction-tags-list__inner' } );

		$tagsList.append( $tagsListInner );

		jQuery.each( groups, function( groupName ) {
			var groupTags = tags[ groupName ];

			if ( ! groupTags ) {
				return;
			}

			var group = this,
				$groupTitle = jQuery( '<div>', { class: 'refraction-tags-list__group-title' } ).text( group.title );

			$tagsListInner.append( $groupTitle );

			groupTags.forEach( function( tag ) {
				var $tag = jQuery( '<div>', { class: 'refraction-tags-list__item' } );

				$tag.text( tag.title ).attr( 'data-tag-name', tag.name );

				$tagsListInner.append( $tag );
			} );
		} );

		$tagsListInner.on( 'click', '.refraction-tags-list__item', this.onTagsListItemClick.bind( this ) );

		refractionCommon.elements.$body.append( $tagsList );
	},

	getTagsList() {
		if ( ! this.ui.tagsList ) {
			this.createTagsList();
		}

		return this.ui.tagsList;
	},

	toggleTagsList() {
		var $tagsList = this.getTagsList();

		if ( $tagsList.is( ':visible' ) ) {
			$tagsList.hide();

			return;
		}

		const direction = refractionCommon.config.isRTL ? 'left' : 'right';

		$tagsList.show().position( {
			my: `${ direction } top`,
			at: `${ direction } bottom+5`,
			of: this.ui.dynamicSwitcher,
		} );
	},

	setTagView( id, name, settings ) {
		if ( this.tagView ) {
			this.tagView.destroy();
		}

		const tagView = this.tagView = new TagPanelView( {
				id,
				name,
				settings,
				controlName: this.view.model.get( 'name' ),
				dynamicSettings: this.getOption( 'dynamicSettings' ),
			} ),
			elementContainer = this.view.options.container,
			tagViewLabel = elementContainer.controls[ tagView.options.controlName ].label;

		tagView.options.container = new refractionModules.editor.Container( {
			type: 'dynamic',
			id,
			model: tagView.model,
			settings: tagView.model,
			view: tagView,
			parent: elementContainer,
			label: elementContainer.label + ' ' + tagViewLabel,
			controls: tagView.model.options.controls,
			renderer: elementContainer,
		} );

		tagView.render();

		this.$el.find( '.refraction-control-tag-area' ).after( tagView.el );

		this.listenTo( tagView, 'remove', this.onTagViewRemove.bind( this ) );
	},

	setDefaultTagView() {
		var tagData = refraction.dynamicTags.tagTextToTagData( this.getDynamicValue() );

		this.setTagView( tagData.id, tagData.name, tagData.settings );
	},

	tagViewToTagText() {
		var tagView = this.tagView;

		return refraction.dynamicTags.tagDataToTagText( tagView.getOption( 'id' ), tagView.getOption( 'name' ), tagView.model );
	},

	getDynamicValue() {
		return this.view.container.dynamic.get( this.view.model.get( 'name' ) );
	},

	destroyTagView() {
		if ( this.tagView ) {
			this.tagView.destroy();

			this.tagView = null;
		}
	},

	onRender() {
		this.$el.addClass( 'refraction-control-dynamic' );

		this.renderTools();

		this.toggleDynamicClass();

		if ( this.isDynamicMode() ) {
			this.setDefaultTagView();
		}
	},

	onDynamicSwitcherClick( event ) {
		event.stopPropagation();

		this.toggleTagsList();
	},

	onTagsListItemClick( event ) {
		const $tag = jQuery( event.currentTarget );

		this.setTagView( refractionCommon.helpers.getUniqueId(), $tag.data( 'tagName' ), {} );

		// If an element has an active global value, disable it before applying the dynamic value.
		if ( this.view.getGlobalKey() ) {
			this.view.triggerMethod( 'unset:global:value' );
		}

		if ( this.isDynamicMode() ) {
			$e.run( 'document/dynamic/settings', {
				container: this.view.options.container,
				settings: {
					[ this.view.model.get( 'name' ) ]: this.tagViewToTagText(),
				},
			} );
		} else {
			$e.run( 'document/dynamic/enable', {
				container: this.view.options.container,
				settings: {
					[ this.view.model.get( 'name' ) ]: this.tagViewToTagText(),
				},
			} );
		}

		this.toggleDynamicClass();
		this.toggleTagsList();

		if ( this.tagView.getTagConfig().settings_required ) {
			this.tagView.showSettingsPopup();
		}
	},

	onTagViewRemove() {
		$e.run( 'document/dynamic/disable', {
			container: this.view.options.container,
			settings: {
				// Set value for `undo` command.
				[ this.view.model.get( 'name' ) ]: this.tagViewToTagText(),
			},
		} );

		this.toggleDynamicClass();
	},

	onAfterExternalChange() {
		this.destroyTagView();

		if ( this.isDynamicMode() ) {
			this.setDefaultTagView();
		}

		this.toggleDynamicClass();
	},

	onDestroy() {
		this.destroyTagView();

		if ( this.ui.tagsList ) {
			this.ui.tagsList.remove();
		}
	},
} );
