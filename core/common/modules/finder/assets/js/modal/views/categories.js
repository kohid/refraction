import Category from './category';
import DynamicCategory from './dynamic-category';

export default class extends Marionette.CompositeView {
	id() {
		return 'refraction-finder__results-container';
	}

	ui() {
		this.selectors = {
			noResults: '#refraction-finder__no-results',
			categoryItem: '.refraction-finder__results__item',
		};

		return this.selectors;
	}

	events() {
		return {
			'mouseenter @ui.categoryItem': 'onCategoryItemMouseEnter',
		};
	}

	getTemplate() {
		return '#tmpl-refraction-finder-results-container';
	}

	getChildView( childModel ) {
		return childModel.get( 'dynamic' ) ? DynamicCategory : Category;
	}

	initialize() {
		this.$activeItem = null;

		this.childViewContainer = '#refraction-finder__results';

		this.collection = new Backbone.Collection( Object.values( refractionCommon.finder.getSettings( 'data' ) ) );
	}

	activateItem( $item ) {
		if ( this.$activeItem ) {
			this.$activeItem.removeClass( 'refraction-active' );
		}

		$item.addClass( 'refraction-active' );

		this.$activeItem = $item;
	}

	activateNextItem( reverse ) {
		const $allItems = jQuery( this.selectors.categoryItem );

		let nextItemIndex = 0;

		if ( this.$activeItem ) {
			nextItemIndex = $allItems.index( this.$activeItem ) + ( reverse ? -1 : 1 );

			if ( nextItemIndex >= $allItems.length ) {
				nextItemIndex = 0;
			} else if ( nextItemIndex < 0 ) {
				nextItemIndex = $allItems.length - 1;
			}
		}

		const $nextItem = $allItems.eq( nextItemIndex );

		this.activateItem( $nextItem );

		$nextItem[ 0 ].scrollIntoView( { block: 'nearest' } );
	}

	goToActiveItem( event ) {
		const $a = this.$activeItem.children( 'a' ),
			isControlClicked = $e.shortcuts.isControlEvent( event );

		if ( isControlClicked ) {
			$a.attr( 'target', '_blank' );
		}

		$a[ 0 ].click();

		if ( isControlClicked ) {
			$a.removeAttr( 'target' );
		}
	}

	onCategoryItemMouseEnter( event ) {
		this.activateItem( jQuery( event.currentTarget ) );
	}

	onChildviewToggleVisibility() {
		const allCategoriesAreEmpty = this.children.every( ( child ) => ! child.isVisible );

		this.ui.noResults.toggle( allCategoriesAreEmpty );
	}
}
