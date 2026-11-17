export class View extends $e.components.get( 'nested-elements/nested-repeater' ).exports.NestedViewBase {
	events() {
		const events = super.events();

		events.click = ( e ) => {
			// If the clicked Nested Element is not within the currently edited document, don't do anything with it.
			if ( refraction.documents.currentDocument.id.toString() !== e.target.closest( '.refraction' ).dataset.refractionId ) {
				return;
			}

			const closest = e.target.closest( '.refraction-element' );

			let targetContainer = null;

			// For clicks on container/widget.
			if ( [ 'container', 'widget' ].includes( closest?.dataset.element_type ) ) { // eslint-disable-line camelcase
				// In case the container empty, click should be handled by the EmptyView.
				const container = refraction.getContainer( closest.dataset.id );

				if ( container.view.isEmpty() ) {
					return true;
				}

				// If not empty, open it.
				targetContainer = container;
			}

			e.stopPropagation();

			$e.run( 'document/elements/select', { container: targetContainer || this.getContainer() } );
		};

		return events;
	}

	/**
	 * Function renderHTML().
	 *
	 * The `renderHTML()` method is overridden as it causes redundant renders when removing focus from any nested element.
	 * This is because the original `renderHTML()` method sets `editModel.renderOnLeave = true;`.
	 */
	renderHTML() {
		const templateType = this.getTemplateType(),
			editModel = this.getEditModel();

		if ( 'js' === templateType ) {
			editModel.setHtmlCache();

			if ( ! this.renderKeepingChildren() ) {
				this.render();
			}
		} else {
			editModel.renderRemoteServer();
		}
	}

	/**
	 * Redraws the widget's own markup and puts its existing child containers back in their places, instead of building
	 * every child again (0.111.0). A full render rebuilt each slide or tab with every widget inside it and ran all their
	 * handlers again: about 0.9 s for three short slides, on every settings change of the widget and every new slide.
	 * The children stay the same views (their DOM, events and handlers), placed again through getChildViewContainer(),
	 * so per-slot layouts (tabs) keep working. Falls back to a full render when the views do not match the models.
	 *
	 * @return {boolean} Whether it redrew this way.
	 */
	renderKeepingChildren() {
		if ( ! this.isRendered || this.isDestroyed || this._isRendering || ! this.collection || ! this.children || ! this.children.length ) {
			return false;
		}

		const views = this.collection.map( ( model ) => this.children.findByModel( model ) );

		if ( views.length !== this.children.length || views.some( ( view ) => ! view || view.isDestroyed ) ) {
			return false;
		}

		// Out of the DOM first: the template is written with jQuery's empty(), which would drop their data and events.
		views.forEach( ( view ) => view.$el.detach() );

		this._isRendering = true;
		this.resetChildViewContainer();
		this.triggerMethod( 'before:render', this );
		this._renderTemplate();

		views.forEach( ( view, index ) => {
			view._index = index;
			this.getChildViewContainer( this, view ).append( view.el );
		} );

		this._isRendering = false;
		this.triggerMethod( 'render', this );

		return true;
	}
}

export default View;
