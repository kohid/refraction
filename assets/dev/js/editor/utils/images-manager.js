var ImagesManager;

ImagesManager = function() {
	var self = this;

	var cache = {};

	var debounceDelay = 300;

	var registeredItems = [];

	var getNormalizedSize = function( image ) {
		var size,
			imageSize = image.size;

		if ( 'custom' === imageSize ) {
			var customDimension = image.dimension;

			if ( customDimension.width || customDimension.height ) {
				size = 'custom_' + customDimension.width + 'x' + customDimension.height;
			} else {
				return 'full';
			}
		} else {
			size = imageSize;
		}

		return size;
	};

	var viewsToUpdate = {};

	// Sizes already waited for once (id|size): a size the server cannot give is not asked for again and again.
	var awaited = {};

	self.updateOnReceiveImage = function( showLoading = true ) {
		var elementView = refraction.getPanelView().getCurrentPageView().getOption( 'editedElementView' );

		if ( ! elementView ) {
			return;
		}

		if ( showLoading ) {
			elementView.$el.addClass( 'refraction-loading' );
		}

		// Add per cid for multiple images in a single view.
		viewsToUpdate[ elementView.cid ] = elementView;

		refraction.channels.editor.once( 'imagesManager:detailsReceived', function() {
			if ( ! _.isEmpty( viewsToUpdate ) ) {
				_( viewsToUpdate ).each( function( view ) {
					view.render();
					view.$el.removeClass( 'refraction-loading' );
				} );
			}
			viewsToUpdate = {};
		} );
	};

	self.getImageUrl = function( image ) {
		// Register for AJAX checking
		self.registerItem( image );

		var imageUrl = self.getItem( image );

		// If it's not in cache, like a new dropped widget or a custom size - get from settings
		if ( ! imageUrl ) {
			if ( 'custom' === image.size ) {
				if ( $e.routes.isPartOf( 'panel/editor' ) && image.model ) {
					self.updateOnReceiveImage();
				}

				return;
			}

			// If it's a new dropped widget
			imageUrl = image.url;

			// Not in cache yet: the saved address can be another size of the image (a smaller one makes the preview
			// narrower than the page). Draw the edited element again once its own size arrives, as the page shows it.
			var key = image.id + '|' + getNormalizedSize( image );

			if ( image.id && image.model && ! awaited[ key ] && $e.routes.isPartOf( 'panel/editor' ) ) {
				awaited[ key ] = true;
				self.updateOnReceiveImage( false );
			}
		}

		return imageUrl;
	};

	self.getItem = function( image ) {
		var size = getNormalizedSize( image ),
			id = image.id;

		if ( ! size ) {
			return false;
		}

		if ( cache[ id ] && cache[ id ][ size ] ) {
			return cache[ id ][ size ];
		}

		return false;
	};

	self.registerItem = function( image ) {
		if ( '' === image.id ) {
			// It's a new dropped widget
			return;
		}

		if ( self.getItem( image ) ) {
			// It's already in cache
			return;
		}

		registeredItems.push( image );

		self.debounceGetRemoteItems();
	};

	self.getRemoteItems = function() {
		var requestedItems = [],
			registeredItemsLength = Object.keys( registeredItems ).length,
			image,
			index;

		// It's one item, so we can render it from remote server
		if ( 0 === registeredItemsLength ) {
			return;
		}

		for ( index in registeredItems ) {
			image = registeredItems[ index ];

			var size = getNormalizedSize( image ),
				id = image.id,
				isFirstTime = ! cache[ id ] || 0 === Object.keys( cache[ id ] ).length;

			requestedItems.push( {
				id,
				size,
				is_first_time: isFirstTime,
			} );
		}

		refractionCommon.ajax.send(
			'get_images_details', {
				data: {
					items: requestedItems,
				},
				success: ( data ) => {
					var imageId,
						imageSize;

					for ( imageId in data ) {
						if ( ! cache[ imageId ] ) {
							cache[ imageId ] = {};
						}

						for ( imageSize in data[ imageId ] ) {
							cache[ imageId ][ imageSize ] = data[ imageId ][ imageSize ];
						}
					}
					registeredItems = [];

					refraction.channels.editor.trigger( 'imagesManager:detailsReceived', data );
				},
			},
		);
	};

	self.debounceGetRemoteItems = _.debounce( self.getRemoteItems, debounceDelay );
};

module.exports = new ImagesManager();
