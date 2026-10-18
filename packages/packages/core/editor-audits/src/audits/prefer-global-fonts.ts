import { __, sprintf } from '@wordpress/i18n';

import { type Audit, type AuditViolation } from '../types';
import { collectHardcodedFonts } from '../utils/collect-hardcoded-fonts';
import { findMatchingGlobalByValue } from '../utils/match-global-by-value';
import { walkElements } from '../utils/walk';

export const audit: Audit = {
	id: 'audits/prefer-global-fonts',
	title: __( 'Prefer global fonts', 'refraction' ),
	description: __( 'Global fonts make the design consistent and easy to update site-wide.', 'refraction' ),
	fixHint: __( 'Replace the hard-coded value with the matching global font.', 'refraction' ),
	categories: [ 'best-practices', 'performance' ],
	severity: 'info',
	weight: 3,
	evaluate: ( ctx ) => {
		if ( ctx.elements.tree.length === 0 ) {
			return { status: 'skipped', reason: __( 'No elements', 'refraction' ) };
		}

		if ( ctx.kit.globals.fonts.length === 0 ) {
			return { status: 'skipped', reason: __( 'No global fonts', 'refraction' ) };
		}

		const violations: AuditViolation[] = [];

		walkElements( ctx.elements.tree, ( node ) => {
			for ( const { value } of collectHardcodedFonts( node.settings ) ) {
				const global = findMatchingGlobalByValue( value, ctx.kit.globals.fonts );

				if ( ! global ) {
					continue;
				}

				violations.push( {
					auditId: audit.id,
					elementId: node.id,
					targetHint: 'element-settings',
					label: sprintf(
						/* translators: %s: global font title. */
						__( 'replace hardcoded typography with "%s" global font', 'refraction' ),
						global.title
					),
				} );
			}
		} );

		return violations.length === 0 ? { status: 'pass' } : { status: 'fail', violations };
	},
};
