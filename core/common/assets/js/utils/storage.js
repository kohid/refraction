export default class extends refractionModules.Module {
	get( key, options ) {
		options = options || {};

		let storage;

		try {
			storage = options.session ? sessionStorage : localStorage;
		} catch ( e ) {
			return key ? undefined : {};
		}

		let refractionStorage = storage.getItem( 'refraction' );

		if ( refractionStorage ) {
			refractionStorage = JSON.parse( refractionStorage );
		} else {
			refractionStorage = {};
		}

		if ( ! refractionStorage.__expiration ) {
			refractionStorage.__expiration = {};
		}

		const expiration = refractionStorage.__expiration;

		let expirationToCheck = [];

		if ( key ) {
			if ( expiration[ key ] ) {
				expirationToCheck = [ key ];
			}
		} else {
			expirationToCheck = Object.keys( expiration );
		}

		let entryExpired = false;

		expirationToCheck.forEach( ( expirationKey ) => {
			if ( new Date( expiration[ expirationKey ] ) < new Date() ) {
				delete refractionStorage[ expirationKey ];

				delete expiration[ expirationKey ];

				entryExpired = true;
			}
		} );

		if ( entryExpired ) {
			this.save( refractionStorage, options.session );
		}

		if ( key ) {
			return refractionStorage[ key ];
		}

		return refractionStorage;
	}

	set( key, value, options ) {
		options = options || {};

		const refractionStorage = this.get( null, options );

		refractionStorage[ key ] = value;

		if ( options.lifetimeInSeconds ) {
			const date = new Date();

			date.setTime( date.getTime() + ( options.lifetimeInSeconds * 1000 ) );

			refractionStorage.__expiration[ key ] = date.getTime();
		}

		this.save( refractionStorage, options.session );
	}

	save( object, session ) {
		let storage;

		try {
			storage = session ? sessionStorage : localStorage;
		} catch ( e ) {
			return;
		}

		storage.setItem( 'refraction', JSON.stringify( object ) );
	}
}
