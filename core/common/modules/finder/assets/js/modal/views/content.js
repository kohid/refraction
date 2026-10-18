import CategoriesView from './categories';
import { createDebouncedFinderSearch } from 'refraction-editor-utils/editor-one-events';

const FINDER_SEARCH_DEBOUNCE_MS = 300;

export default class extends Marionette.LayoutView {
	id() {
		return 'refraction-finder';
	}

	getTemplate() {
		return '#tmpl-refraction-finder';
	}

	ui() {
		return {
			searchInput: '#refraction-finder__search__input',
		};
	}

	events() {
		return {
			'input @ui.searchInput': 'onSearchInputInput',
		};
	}

	regions() {
		return {
			content: '#refraction-finder__content',
		};
	}

	initialize() {
		this.debouncedTrackSearch = createDebouncedFinderSearch( FINDER_SEARCH_DEBOUNCE_MS );
	}

	showCategoriesView() {
		this.content.show( new CategoriesView() );
	}

	getResultsCount() {
		if ( ! this.content.currentView ) {
			return 0;
		}

		const $visibleItems = this.content.currentView.$el.find( '.refraction-finder__results__item:visible' );
		return $visibleItems.length;
	}

	onSearchInputInput() {
		const value = this.ui.searchInput.val();

		if ( value ) {
			refractionCommon.finder.channel
				.reply( 'filter:text', value )
				.trigger( 'filter:change' );

			if ( ! ( this.content.currentView instanceof CategoriesView ) ) {
				this.showCategoriesView();
			}

			setTimeout( () => {
				const resultsCount = this.getResultsCount();
				this.debouncedTrackSearch( resultsCount, value );
			}, 50 );
		}

		this.content.currentView.$el.toggle( ! ! value );
	}

	onDestroy() {
		if ( this.debouncedTrackSearch?.cancel ) {
			this.debouncedTrackSearch.cancel();
		}
	}
}
