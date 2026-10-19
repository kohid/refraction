/**
 * Every slide container is a Swiper slide. The front-end handler rebuilds the Swiper when slides come and go
 * (it watches the track), so adding, removing, duplicating and moving slides update the preview live.
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}

	onAddChild( childView ) {
		childView.$el.addClass( 'swiper-slide refraction-nc__slide' ).attr( {
			role: 'group',
			'aria-roledescription': 'slide',
			'data-slide-index': childView.model.attributes.dataIndex,
		} );
	}
}
