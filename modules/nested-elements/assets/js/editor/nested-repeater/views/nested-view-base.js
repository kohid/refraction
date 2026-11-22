export default class NestedViewBase extends refraction.modules.elements.views.BaseWidget {
	// Sometimes the children placement is not in the end of the element, but somewhere else, eg: deep inside the element template.
	// If `defaults_placeholder_selector` is set, it will be used to find the correct place to insert the children.
	getChildViewContainer( containerView, childView ) {
		const { elements_placeholder_selector: customSelector, child_container_placeholder_selector: childContainerSelector } = this.model.config.defaults;

		if ( childView !== undefined && childView._index !== undefined && childContainerSelector ) {
			// This widget's own slots (not those of a widget of the same kind inside a slide), counted among themselves:
			// the widget can draw other things beside them, such as the Steps widget's progress bar (0.147.0).
			return containerView.$el.find( childContainerSelector )
				.filter( ( i, el ) => el.parentElement.closest( '.refraction-element' ) === containerView.el )
				.eq( childView._index );
		}

		if ( customSelector ) {
			return containerView.$el.find( this.model.config.defaults.elements_placeholder_selector );
		}

		return super.getChildViewContainer( containerView, childView );
	}

	/**
	 * A child added (a new slide, or a slide moved: removed and added at its new place) goes into the slot of its
	 * place, and every other child into its own (0.138.0). The default put a moved child next to its old neighbour,
	 * inside that neighbour's slot, after the widget had already drawn its slots in the new order: a slot held two
	 * slides and another none, so the slides showed each other's picture, background and settings.
	 *
	 * @param {Object} collectionView
	 * @param {Object} childView
	 * @param {number} index
	 */
	attachHtml( collectionView, childView, index ) {
		if ( ! this.usesChildSlots() || collectionView.isBuffering ) {
			return super.attachHtml( collectionView, childView, index );
		}

		childView._index = index;
		this.getChildViewContainer( collectionView, childView ).append( childView.el );
		this.placeChildrenInSlots();
	}

	onRemoveChild() {
		if ( this.usesChildSlots() && ! this.isDestroyed ) {
			this.placeChildrenInSlots();
		}
	}

	/** Whether every child has its own slot in the widget's markup (child_container_placeholder_selector). */
	usesChildSlots() {
		return !! this.model.config?.defaults?.child_container_placeholder_selector;
	}

	/** Every child in the slot of its place in the list. */
	placeChildrenInSlots() {
		if ( ! this.collection || ! this.children ) {
			return;
		}

		this.collection.each( ( model, index ) => {
			const view = this.children.findByModel( model );

			if ( ! view || view.isDestroyed ) {
				return;
			}

			view._index = index;
			const slot = this.getChildViewContainer( this, view ).first();

			if ( slot.length && view.el.parentNode !== slot[ 0 ] ) {
				slot.append( view.el );
			}
		} );
	}

	getChildType() {
		return [ 'container' ];
	}

	onRender() {
		super.onRender();

		this.normalizeAttributes();
	}
}
