#!/usr/bin/env node
/**
 * Practice Ask Claude's Claude Code mode on a throw-away local site, for the design study
 * (docs/refraction/design-study/README.md). Needs dist/refraction.zip (node scripts/build-release.mjs).
 *
 *   node scripts/claude/design-practice.mjs site --site DIR --port N
 *       a fresh WordPress site with Refraction, a "Claude Code builder" with an Application Password, and a few
 *       abstract sample pictures in the library; writes DIR/practice.env (source it for ask-claude-queue.mjs)
 *   node scripts/claude/design-practice.mjs queue --site DIR [--brief ID] [--prompt "..." --mode page|section]
 *       a new page and an Ask Claude request for it (a brief from briefs.json, a random one, or your own words);
 *       prints the request id
 *   node scripts/claude/design-practice.mjs briefs        the practice briefs
 *   node scripts/claude/design-practice.mjs stop --port N  stops the site's PHP server
 *
 * Then: ask-claude-queue.mjs start / brief / preview --shots / result, as in .claude/commands/ask-claude-watch.md.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const BRIEFS = join( ROOT, 'docs/refraction/design-study/briefs.json' );
const argv = process.argv.slice( 2 );
const command = argv[ 0 ];
const flag = ( name, fallback ) => ( argv.includes( `--${ name }` ) ? argv[ argv.indexOf( `--${ name }` ) + 1 ] : fallback );
const DL = process.env.DL_DIR || '/tmp/rsite-dl';

function fail( message ) {
	console.error( `design-practice: ${ message }` );
	process.exit( 1 );
}

const site = () => flag( 'site' ) || fail( 'give --site DIR' );
const wp = ( dir, args ) => execFileSync( 'php', [ '-d', 'memory_limit=512M', join( DL, 'wpcli.phar' ), `--path=${ join( dir, 'wordpress' ) }`, '--allow-root', ...args ], { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ] } ).trim();

function pidOn( port ) {
	try {
		return execFileSync( 'lsof', [ '-ti', `tcp:${ port }`, '-sTCP:LISTEN' ], { encoding: 'utf8' } ).trim().split( '\n' )[ 0 ];
	} catch {
		return '';
	}
}

function stop( port ) {
	const pid = pidOn( port );

	if ( pid ) {
		process.kill( Number( pid ) );
	}
}

if ( 'briefs' === command ) {
	for ( const brief of JSON.parse( readFileSync( BRIEFS, 'utf8' ) ) ) {
		console.log( `${ brief.id } (${ brief.mode }): ${ brief.prompt }` );
	}
} else if ( 'stop' === command ) {
	stop( flag( 'port' ) || fail( 'give --port N' ) );
} else if ( 'site' === command ) {
	const dir = site();
	const port = flag( 'port' ) || fail( 'give --port N' );

	if ( ! existsSync( join( ROOT, 'dist/refraction.zip' ) ) ) {
		fail( 'build the plugin first: node scripts/build-release.mjs' );
	}

	stop( port );
	rmSync( dir, { recursive: true, force: true } );
	execFileSync( 'bash', [ join( ROOT, 'scripts/setup-menu-test-site.sh' ), dir ], { env: { ...process.env, PORT: port }, stdio: [ 'ignore', 'ignore', 'inherit' ] } );
	spawn( 'php', [ '-d', 'upload_max_filesize=20M', '-d', 'post_max_size=25M', '-S', `127.0.0.1:${ port }`, '-t', join( dir, 'wordpress' ) ], { detached: true, stdio: 'ignore', env: { ...process.env, PHP_CLI_SERVER_WORKERS: '4' } } ).unref();

	// Application Passwords over plain http (the practice site has no https).
	mkdirSync( join( dir, 'wordpress/wp-content/mu-plugins' ), { recursive: true } );
	writeFileSync( join( dir, 'wordpress/wp-content/mu-plugins/practice.php' ), "<?php add_filter( 'wp_is_application_passwords_available', '__return_true' );\n" );
	wp( dir, [ 'user', 'create', 'claude-builder', 'claude-builder@example.test', '--role=refraction_claude_builder' ] );
	const password = wp( dir, [ 'user', 'application-password', 'create', 'claude-builder', 'practice', '--porcelain' ] );

	// Abstract pictures (no people, no brands), so designs can place images; titles say what they are.
	const pics = join( dir, 'pics' );
	mkdirSync( pics, { recursive: true } );
	const sources = [
		[ 'warm-gradient-landscape', 'gradients=size=1600x1000:c0=0xf2a93b:c1=0x7b2d26:c2=0x1b2340:n=3:type=radial:seed=4' ],
		[ 'cool-gradient-portrait', 'gradients=size=1000x1400:c0=0x0e1324:c1=0x3a5a8c:c2=0x9fd3c7:n=3:seed=11' ],
		[ 'green-gradient-square', 'gradients=size=1200x1200:c0=0x1f3d2b:c1=0x7fb069:c2=0xf6f2ea:n=3:type=spiral:seed=7' ],
		[ 'soft-noise-texture', 'cellauto=s=1600x900:rule=18,format=gray,colorchannelmixer=.8:.1:.1:0:.7:.2:.1:0:.6:.2:.2' ],
	];
	let images = 0;

	for ( const [ name, filter ] of sources ) {
		try {
			execFileSync( 'ffmpeg', [ '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', filter, '-frames:v', '1', join( pics, `${ name }.jpg` ) ] );
			wp( dir, [ 'media', 'import', join( pics, `${ name }.jpg` ), '--user=admin', `--title=${ name.replace( /-/g, ' ' ) }`, `--alt=${ name.replace( /-/g, ' ' ) }` ] );
			images++;
		} catch {
			// No ffmpeg, or a filter not built in: practise without that picture.
		}
	}

	writeFileSync( join( dir, 'practice.env' ), `export REFRACTION_REST_URL=http://127.0.0.1:${ port } REFRACTION_REST_USER=claude-builder REFRACTION_REST_PASSWORD='${ password }'\n` );
	console.log( `site ready at http://127.0.0.1:${ port } (admin / admin), ${ images } sample pictures; source ${ join( dir, 'practice.env' ) }` );
} else if ( 'queue' === command ) {
	const dir = site();
	const briefs = JSON.parse( readFileSync( BRIEFS, 'utf8' ) );
	let brief = flag( 'prompt' ) ? { id: 'custom', mode: flag( 'mode', 'page' ), prompt: flag( 'prompt' ) } : briefs.find( ( b ) => b.id === flag( 'brief' ) );

	if ( ! brief ) {
		brief = briefs[ Math.floor( Math.random() * briefs.length ) ];
	}

	const page = wp( dir, [ 'post', 'create', '--post_type=page', '--post_status=publish', `--post_title=Practice: ${ brief.id }`, '--porcelain' ] );
	wp( dir, [ 'post', 'meta', 'update', page, '_refraction_edit_mode', 'builder' ] );
	wp( dir, [ 'post', 'meta', 'update', page, '_wp_page_template', 'refraction_canvas' ] );
	const request = { prompt: brief.prompt, mode: brief.mode, context: '', use_styles: false, target: '' };
	const job = wp( dir, [ 'eval', `echo Refraction\\Modules\\AskClaude\\Classes\\Job_Queue::create( ${ Number( page ) }, json_decode( '${ JSON.stringify( request ).replace( /'/g, "\\'" ) }', true ) );`, '--user=admin' ] );
	console.log( `request #${ job } (${ brief.id }, ${ brief.mode }) on page ${ page }: ${ brief.prompt }` );
} else {
	fail( 'usage: site --site DIR --port N | queue --site DIR [--brief ID | --prompt TEXT --mode page|section] | briefs | stop --port N' );
}
