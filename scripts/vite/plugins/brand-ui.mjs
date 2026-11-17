/**
 * The published `@elementor/ui` package (third party, GPL-3.0-or-later, not renamed) ships a default logo inside its
 * `DialogHeader`. Every dialog in this code base passes `logo={ false }`, but the artwork still ends up in the bundle.
 * This plugin swaps the upstream vector for the Refraction prism mark and the component name for a neutral one, so the
 * old logo is neither drawn nor shipped. The mark is the 32 x 32 version of the one in assets/lib/rficons.
 */
const UPSTREAM_COMPONENT = [ 'Element', 'orLogo' ].join( '' );
const UPSTREAM_LOGO_PATH = /\bd: "M2\.69648[^"]*"/;
// The Refraction logo in one color (0.117.0): the corner (its bars as sub-paths; drawn with the upstream non-zero fill
// they merge into the corner) and the circle. Every dialog passes `logo={ false }`, so it is not drawn anyway.
const PRISM_PATH = 'M11.11 32 L0 32 L0 0 L32 0 L32 11.11 L11.11 11.11 L11.11 32ZM0.64 11.11 L10.56 14.06 L10.56 16 L0.64 16 L0.64 11.11ZM11.11 0.64 L14.06 10.56 L16 10.56 L16 0.64 L11.11 0.64ZM0.64 21.12 L0.64 17.28 L10.56 17.28 L10.56 21.12 L0.64 21.12ZM21.12 0.64 L17.28 0.64 L17.28 10.56 L21.12 10.56 L21.12 0.64ZM0.64 26.24 L0.64 22.4 L10.56 22.4 L10.56 26.24 L0.64 26.24ZM26.24 0.64 L22.4 0.64 L22.4 10.56 L26.24 10.56 L26.24 0.64ZM0.64 27.52 L0.64 31.36 L10.56 31.36 L10.56 27.52 L0.64 27.52ZM27.52 0.64 L31.36 0.64 L31.36 10.56 L27.52 10.56 L27.52 0.64ZM0.64 9.78 L10.56 12.72 L10.56 11.46 L0.64 1.54 L0.64 9.78ZM9.78 0.64 L12.72 10.56 L11.46 10.56 L1.54 0.64 L9.78 0.64ZM21.44 26.40 A4.96 4.96 0 1 0 31.36 26.40 A4.96 4.96 0 1 0 21.44 26.40 Z';

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
