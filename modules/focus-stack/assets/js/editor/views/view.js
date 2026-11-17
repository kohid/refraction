/**
 * Every slide container is one card of the stack; the front-end handler places them (current, waiting, hidden) and
 * follows the slide picked in the panel.
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}

	onAddChild( childView ) {
		childView.$el.addClass( 'rf-fs__slide' ).attr( {
			role: 'group',
			'aria-roledescription': 'slide',
			'data-slide-index': childView.model.attributes.dataIndex,
		} );
	}

	/**
	 * Selecting something inside a waiting slide edits it where it is, without bringing the slide into focus, unless
	 * "Clicking a waiting slide opens it" is on.
	 *
	 * @param {number} index The slide's place, from 1.
	 */
	keepsItemInPlace( index ) {
		if ( 'yes' === this.model.getSetting( 'click_waiting' ) ) {
			return false;
		}

		const box = this.$el.find( '.rf-fs__slides' ).get( 0 );
		const slide = box ? Array.from( box.children ).filter( ( el ) => el.classList.contains( 'e-con' ) )[ index - 1 ] : null;

		return !! ( slide && slide.classList.contains( 'is-waiting' ) );
	}
}
