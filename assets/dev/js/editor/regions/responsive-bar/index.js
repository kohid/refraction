import ResponsiveBar from 'refraction-regions/responsive-bar/responsive-bar';

refraction.on( 'preview:loaded', ( isFirstLoad ) => {
	if ( ! isFirstLoad ) {
		return;
	}

	refraction.addRegions( {
		responsiveBar: {
			el: '#refraction-responsive-bar',
			regionClass: ResponsiveBar,
		},
	} );

	refraction.trigger( 'responsiveBar:init' );
} );
