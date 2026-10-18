import { RuleTester } from '@typescript-eslint/rule-tester';

import { noPathImports } from '../no-path-imports';

const ruleTester = new RuleTester();

ruleTester.run( 'no-path-imports', noPathImports, {
	valid: [
		"import { something } from '@refraction/locations';",
		"import { something } from '@wordpress/components';",
		"import { something } from '@wordpress/i18n';",
		"import { something } from 'some-other-package/src/index';",
	],

	invalid: [
		{
			code: "import { something } from '@refraction/locations/src/index.ts';",
			errors: [
				{
					messageId: 'noRefractionPathImport',
					data: { value: '@refraction/locations/src/index.ts' },
				},
			],
		},
		{
			code: "import { something } from '@refraction/editor/src/components/button';",
			errors: [
				{
					messageId: 'noRefractionPathImport',
					data: { value: '@refraction/editor/src/components/button' },
				},
			],
		},
		{
			code: "import ArrowIcon from '@wordpress/icons/src/library/arrow';",
			errors: [
				{
					messageId: 'noWordpressPathImport',
					data: { value: '@wordpress/icons/src/library/arrow' },
				},
			],
		},
		{
			code: "import { Button } from '@wordpress/components/src/button';",
			errors: [
				{
					messageId: 'noWordpressPathImport',
					data: { value: '@wordpress/components/src/button' },
				},
			],
		},
	],
} );
