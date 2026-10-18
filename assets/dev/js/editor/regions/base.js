module.exports = Marionette.Region.extend( {

	storage: null,

	storageSizeKeys: null,

	constructor() {
		Marionette.Region.prototype.constructor.apply( this, arguments );

		var savedStorage = refractionCommon.storage.get( this.getStorageKey() );

		this.storage = savedStorage ? savedStorage : this.getDefaultStorage();

		this.storageSizeKeys = Object.keys( this.storage.size );
	},

	saveStorage( key, value ) {
		this.storage[ key ] = value;

		refractionCommon.storage.set( this.getStorageKey(), this.storage );
	},

	saveSize( size ) {
		if ( ! size ) {
			size = refraction.helpers.getElementInlineStyle( this.$el, this.storageSizeKeys );
		}

		this.saveStorage( 'size', size );
	},
} );
