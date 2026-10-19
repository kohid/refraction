/**
 * The published `@elementor/ui` package (third party, GPL-3.0-or-later, not renamed) ships a default logo inside its
 * `DialogHeader`. Every dialog in this code base passes `logo={ false }`, but the artwork still ends up in the bundle.
 * This plugin swaps the upstream vector for the Refraction prism mark and the component name for a neutral one, so the
 * old logo is neither drawn nor shipped. The mark is the 32 x 32 version of the one in assets/lib/rficons.
 */
const UPSTREAM_COMPONENT = [ 'Element', 'orLogo' ].join( '' );
const UPSTREAM_LOGO_PATH = /\bd: "M2\.69648[^"]*"/;
const PRISM_PATH = 'M16 2.4 L25.6 19.6 H6.4 Z M16 8.8 L11.9 16.4 H20.1 Z M1.6 20.8 L10 17.6 L10.8 19.6 L2.4 22.8 Z M20.8 11.2 L30.4 6.4 L31.2 8.4 L21.6 13.2 Z M21.6 16.4 H31.2 V18.6 H21.6 Z M21.2 21.6 L30.4 26.4 L29.6 28.4 L20.4 23.6 Z';

export function brandUiPlugin() {
	return {
		name: 'refraction-brand-ui',
		enforce: 'pre',
		transform( code, id ) {
			if ( ! id.includes( 'node_modules' ) || ! id.includes( '@elementor/ui' ) || ! code.includes( UPSTREAM_COMPONENT ) ) {
				return null;
			}

			return {
				code: code
					.replace( UPSTREAM_LOGO_PATH, `d: "${ PRISM_PATH }"` )
					.split( UPSTREAM_COMPONENT ).join( 'RefractionLogo' ),
				map: null,
			};
		},
	};
}
