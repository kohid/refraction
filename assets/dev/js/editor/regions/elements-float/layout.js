/**
 * The content of the floating Elements window: the same widget categories and tiles as the panel's Elements page
 * (dragging a tile into the page or clicking it adds the widget), with a search of its own so typing here does not
 * filter the panel.
 */
const ElementView = require( 'refraction-panel/pages/elements/views/element' );
const CategoryView = require( 'refraction-panel/pages/elements/views/category' );

// Ids of the panel's categories would be doubled while both lists are shown.
const FloatCategoryView = CategoryView.extend( {
	id() {
		return 'refraction-elements-float-category-' + this.model.get( 'name' );
	},
} );

const CategoriesView = Marionette.CollectionView.extend( {
	childView: FloatCategoryView,
	className: 'rf-ef__categories',
} );

const ResultsView = Marionette.CollectionView.extend( {
	childView: ElementView,
	className: 'refraction-responsive-panel rf-ef__results',

	initialize( options ) {
		this.term = options.term.toLowerCase();
	},

	filter( model ) {
		if ( model.get( 'hideOnSearch' ) ) {
			return false;
		}

		const words = [ model.get( 'title' ) || '' ].concat( model.get( 'keywords' ) || [] );

		return words.some( ( word ) => -1 !== String( word ).toLowerCase().indexOf( this.term ) );
	},

	emptyView: Marionette.ItemView.extend( {
		className: 'rf-ef__empty',
		template: () => __( 'No widget matches this search.', 'refraction' ),
	} ),
} );

export default class extends Marionette.LayoutView {
	getTemplate() {
		return '#tmpl-refraction-elements-float';
	}

	id() {
		return 'refraction-elements-float__inner';
	}

	ui() {
		return {
			search: '.rf-ef__search-input',
			dock: '.rf-ef__dock',
			close: '.rf-ef__close',
		};
	}

	events() {
		return {
			'input @ui.search': 'onSearch',
			'keydown @ui.search': 'onSearchKey',
			'click @ui.dock': 'onDockClick',
			'click @ui.close': 'onCloseClick',
		};
	}

	regions() {
		return {
			body: '.rf-ef__body',
		};
	}

	initialize() {
		this.buildCollections();
	}

	// The panel's own rules for which widgets are listed and how they are grouped (deprecated, presets, hidden ones).
	buildCollections() {
		const PanelElementsLayoutView = require( 'refraction-panel/pages/elements/elements' );
		const builder = Object.create( PanelElementsLayoutView.prototype );

		builder.initElementsCollection();
		builder.initCategoriesCollection();

		this.elementsCollection = builder.elementsCollection;
		this.categoriesCollection = builder.categoriesCollection;
	}

	onShow() {
		this.showCategories();
		this.updateDockButtons();
	}

	showCategories() {
		this.body.show( new CategoriesView( { collection: this.categoriesCollection } ) );
	}

	onSearch() {
		const term = this.ui.search.val().trim();

		if ( ! term ) {
			this.showCategories();
			return;
		}

		this.body.show( new ResultsView( { collection: this.elementsCollection, term } ) );
	}

	onSearchKey( event ) {
		if ( 'Escape' === event.key ) {
			this.ui.search.val( '' );
			this.showCategories();
		}
	}

	onDockClick( event ) {
		const side = event.currentTarget.dataset.dock;

		// The button of the side it is docked to floats it again.
		$e.run( 'elements-float/dock', { side: this.getOption( 'region' ).dockSide === side ? '' : side } );
	}

	onCloseClick() {
		$e.run( 'elements-float/close' );
	}

	updateDockButtons() {
		const current = this.getOption( 'region' ).dockSide;

		this.ui.dock.each( ( index, button ) => {
			const active = button.dataset.dock === current;

			button.classList.toggle( 'rf-ef__dock--active', active );
			button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
		} );
	}
}
