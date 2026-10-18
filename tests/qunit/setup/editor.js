wp.heartbeat = {
	connectNow: () => {},
};

const originalGet = Marionette.TemplateCache.get;

Marionette.TemplateCache.get = function( template ) {
	if ( jQuery( template ).length ) {
		return originalGet.apply( Marionette.TemplateCache, [ template ] );
	}

	return () => `<div class="${ template }"></div>`;
};

Marionette.Region.prototype._ensureElement = () => {
	return true;
};

Marionette.Region.prototype.attachHtml = () => {
};

Marionette.CompositeView.prototype.getChildViewContainer = ( containerView ) => {
	containerView.$childViewContainer = jQuery( containerView.el );
	containerView.$childViewContainer.appendTo(
		jQuery( '#refraction-preview-iframe' ).contents().find( '.refraction.refraction-1' ),
	);
	return containerView.$childViewContainer;
};
