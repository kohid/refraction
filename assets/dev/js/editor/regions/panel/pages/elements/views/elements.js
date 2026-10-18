var PanelElementsElementsView;

PanelElementsElementsView = Marionette.CollectionView.extend( {
	childView: require( 'refraction-panel/pages/elements/views/element' ),

	id: 'refraction-panel-elements',

	className: 'refraction-responsive-panel',

	initialize() {
		this.listenTo( refraction.channels.panelElements, 'filter:change', this.onFilterChanged );
		// Apply comparator immediately — the view may be created mid-search (filter:change already fired).
		this._syncAtomicComparator();
	},

	_syncAtomicComparator() {
		const filterValue = refraction.channels.panelElements.request( 'filter:value' );
		if ( filterValue && refractionCommon.config.experimentalFeatures?.e_atomic_elements ) {
			this.viewComparator = ( a, b ) => {
				if ( a.get( 'atomic' ) && ! b.get( 'atomic' ) ) {
					return -1;
				}
				if ( ! a.get( 'atomic' ) && b.get( 'atomic' ) ) {
					return 1;
				}
				return 0;
			};
		} else {
			this.viewComparator = null;
		}
	},

	filter( childModel ) {
		const filterValue = refraction.channels.panelElements.request( 'filter:value' );

		if ( ! filterValue ) {
			return true;
		}

		if ( childModel.get( 'hideOnSearch' ) ) {
			return false;
		}

		if ( -1 !== childModel.get( 'title' ).toLowerCase().indexOf( filterValue.toLowerCase() ) ) {
			return true;
		}

		// Get the filter input localized value.
		const localized = refraction.channels.panelElements.request( 'filter:localized' ) || '';

		return _.any( childModel.get( 'keywords' ), function( keyword ) {
			keyword = keyword.toLowerCase();

			const regularFilter = ( -1 !== keyword.indexOf( filterValue.toLowerCase() ) ),
				localizedFilter = ( localized && -1 !== keyword.indexOf( localized.toLowerCase() ) );

			return regularFilter || localizedFilter;
		} );
	},

	onFilterChanged() {
		const filterValue = refraction.channels.panelElements.request( 'filter:value' );

		this._syncAtomicComparator();

		if ( ! filterValue ) {
			this.onFilterEmpty();
		}

		this._renderChildren();

		this.triggerMethod( 'children:render' );
	},

	onFilterEmpty() {
		$e.routes.refreshContainer( 'panel' );
	},
} );

module.exports = PanelElementsElementsView;
