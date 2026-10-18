/**
 * @jest-environment node
 */

import * as fs from 'fs';
import { vol } from 'memfs';
import * as path from 'path';
import { webpack } from 'webpack';

import { GenerateWordPressAssetFileWebpackPlugin } from '../index';

jest.mock( 'fs', () => jest.requireActual( 'memfs' ) );

describe( '@refraction/generate-wordpress-asset-file-webpack-plugin', () => {
	beforeEach( () => {
		const fileContent = `
			import refraction from '@refraction/editor';
			import wp from '@wordpress/element';
			import other from '@other/package';
			import react from 'react';
			import ReactDOM from 'react-dom';

			refraction();
			wp();
			other();
		`;

		fs.writeFileSync( path.resolve( '/app.js' ), fileContent );
		fs.writeFileSync( path.resolve( '/extension.js' ), fileContent );
		fs.writeFileSync( path.resolve( '/util.js' ), fileContent );
	} );

	afterEach( () => {
		vol.reset();
	} );

	it( 'should generate assets files', ( done ) => {
		// Arrange.
		const compiler = webpack( {
			mode: 'development',
			entry: {
				app: path.resolve( '/app.js' ),
				extension: path.resolve( '/extension.js' ),
				util: path.resolve( '/util.js' ),
			},
			output: {
				filename: '[name].js',
				path: path.resolve( '/dist' ),
			},
			externals: {
				// Required so webpack won't try to resolve those packages, which don't exist.
				'@refraction/editor': 'editor',
				'@wordpress/element': 'wp',
				'@other/package': 'other',
				react: 'react',
				'react-dom': 'reactDOM',
			},
			plugins: [
				new GenerateWordPressAssetFileWebpackPlugin( {
					handle: ( entryName ) => `refraction-v2-${ entryName }`,
					map: [
						{ request: 'react', handle: 'react' },
						{ request: 'react-dom', handle: 'react-dom' },
						{ request: /^@refraction\/(.+)$/, handle: 'refraction-v2-$1' },
						{ request: /^@wordpress\/(.+)$/, handle: 'wp-$1' },
					],
				} ),
			],
		} );

		// Expect.
		expect.assertions( 6 );

		// Act.
		compiler?.run( ( err, stats ) => {
			// Assert.
			expect( err ).toBe( null );
			expect( stats?.hasErrors() ).toBe( false );
			expect( stats?.hasWarnings() ).toBe( false );

			const files = [ 'app.asset.php', 'extension.asset.php', 'util.asset.php' ];

			files.forEach( ( fileName ) => {
				const fileContent = fs.readFileSync( path.resolve( `/dist/${ fileName }` ), { encoding: 'utf8' } );

				expect( fileContent ).toMatchSnapshot( fileName );
			} );

			done();
		} );
	} );
} );
