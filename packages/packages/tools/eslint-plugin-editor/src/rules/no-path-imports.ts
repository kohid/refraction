import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

type Options = [];

type MessageIds = 'noRefractionPathImport' | 'noWordpressPathImport';

export const noPathImports = ESLintUtils.RuleCreator.withoutDocs< Options, MessageIds >( {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow deep path imports from `@refraction` and `@wordpress` packages.',
		},
		messages: {
			noRefractionPathImport:
				"Path import of Refraction dependencies is not allowed. Use the package root (e.g. '@refraction/locations' instead of '{{value}}').",
			noWordpressPathImport:
				"Path import of WordPress dependencies is not allowed. Use the package root (e.g. '@wordpress/components' instead of '{{value}}').",
		},
		schema: [],
	},

	defaultOptions: [],

	create( context ) {
		return {
			ImportDeclaration( node: TSESTree.ImportDeclaration ) {
				const value = node.source.value;

				if ( /^@refraction\/.+\/.+/.test( value ) ) {
					context.report( {
						node,
						messageId: 'noRefractionPathImport',
						data: { value },
					} );
				} else if ( /^@wordpress\/.+\/.+/.test( value ) ) {
					context.report( {
						node,
						messageId: 'noWordpressPathImport',
						data: { value },
					} );
				}
			},
		};
	},
} );
