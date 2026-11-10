#!/usr/bin/env node
/**
 * The Claude Code side of Ask Claude's "Claude Code" mode: watch a Refraction site's queue and answer requests,
 * over REST (refraction/v1/ask-claude/jobs). No dependencies (Node 18+).
 *
 *   node scripts/claude/ask-claude-queue.mjs watch [--max-runtime 1740]   one JSON line per newly waiting request
 *   node scripts/claude/ask-claude-queue.mjs list                          what waits now
 *   node scripts/claude/ask-claude-queue.mjs brief <id> [--out file]       the full brief (prompt) as text
 *   node scripts/claude/ask-claude-queue.mjs start <id>                    marks it "Claude is building"
 *   node scripts/claude/ask-claude-queue.mjs preview <id> --file answer.json [--shots DIR]
 *       saves the answer into a hidden draft copy of the page and prints its link; with --shots, also screenshots
 *       of it at desktop (1440px) and phone (390px) width (needs Playwright), to look at before sending the result
 *   node scripts/claude/ask-claude-queue.mjs result <id> --file answer.json
 *   node scripts/claude/ask-claude-queue.mjs decline <id> --note "why, and what to ask instead"
 *
 * Environment: REFRACTION_REST_URL (the site, https; http only for localhost), and REFRACTION_REST_USER +
 * REFRACTION_REST_PASSWORD (an Application Password of a user with the role "Claude Code builder (Refraction)").
 * Without the user and password no credentials are sent, for a proxy that adds them. Exit code 1 on any failure.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const argv = process.argv.slice( 2 );
const [ command, id ] = argv;
const flag = ( name, fallback ) => ( argv.includes( `--${ name }` ) ? argv[ argv.indexOf( `--${ name }` ) + 1 ] : fallback );
const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

function fail( message ) {
	console.error( `ask-claude-queue: ${ message }` );
	process.exit( 1 );
}

const base = ( process.env.REFRACTION_REST_URL || '' ).replace( /\/+$/, '' );

if ( ! command ) {
	fail( 'usage: watch | list | brief <id> | start <id> | preview <id> --file F [--shots DIR] | result <id> --file F | decline <id> --note N' );
}

if ( ! /^https:\/\//.test( base ) && ! /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test( base ) ) {
	fail( 'set REFRACTION_REST_URL to the site address (https://...)' );
}

async function call( method, route, body ) {
	const headers = { Accept: 'application/json' };

	if ( process.env.REFRACTION_REST_USER && process.env.REFRACTION_REST_PASSWORD ) {
		headers.Authorization = 'Basic ' + Buffer.from( `${ process.env.REFRACTION_REST_USER }:${ process.env.REFRACTION_REST_PASSWORD }` ).toString( 'base64' );
	}

	if ( body ) {
		headers[ 'Content-Type' ] = 'application/json';
	}

	// ?rest_route= works with every permalink setting.
	const response = await fetch( `${ base }/?rest_route=/refraction/v1/ask-claude/jobs${ route }`, { method, headers, body: body ? JSON.stringify( body ) : undefined } );
	const text = await response.text();
	let data;

	try {
		data = JSON.parse( text );
	} catch {
		data = { message: text.slice( 0, 300 ) };
	}

	if ( ! response.ok ) {
		const dropped = data.data && data.data.dropped && data.data.dropped.length ? ` Dropped: ${ data.data.dropped.join( '; ' ) }` : '';
		throw new Error( `${ response.status } ${ data.message || '' }${ dropped }${ ignoredNote( data.data ) }` );
	}

	return data;
}

/** The settings the site left out (unknown names or values that do not fit), to correct before sending. */
function ignoredNote( data ) {
	return data && data.ignored_settings && data.ignored_settings.length ? `\nsettings left out (fix the names or values): ${ data.ignored_settings.join( ', ' ) }` : '';
}

/**
 * Full-page screenshots of a link at desktop and phone width. The page is scrolled through first, so reveal
 * animations and counters have played; the phone shot also reports a page wider than the screen.
 */
async function shoot( url, dir ) {
	let chromium;

	try {
		( { chromium } = await import( 'playwright' ) );
	} catch {
		fail( 'screenshots need Playwright (npm i -D playwright), or open the preview link yourself' );
	}

	const browser = await chromium.launch();
	const out = [];

	try {
		for ( const [ name, width, height ] of [ [ 'desktop', 1440, 900 ], [ 'phone', 390, 844 ] ] ) {
			const page = await browser.newPage( { viewport: { width, height }, deviceScaleFactor: 1 } );
			await page.goto( url, { waitUntil: 'networkidle', timeout: 60000 } );

			for ( let y = 0, total = await page.evaluate( () => document.body.scrollHeight ); y < total; y += height / 2 ) {
				await page.evaluate( ( top ) => window.scrollTo( 0, top ), y );
				await page.waitForTimeout( 250 );
			}

			await page.evaluate( () => window.scrollTo( 0, 0 ) );
			await page.waitForTimeout( 1200 );

			const file = join( dir, `${ name }.png` );
			await page.screenshot( { path: file, fullPage: true } );

			const wide = await page.evaluate( () => document.documentElement.scrollWidth - window.innerWidth );
			out.push( `${ file }${ wide > 1 ? ` (the page is ${ wide }px wider than the screen: fix the overflow)` : '' }` );
			await page.close();
		}
	} finally {
		await browser.close();
	}

	return out;
}

const needId = () => ( /^\d+$/.test( id || '' ) ? id : fail( 'give the request id' ) );

try {
	if ( 'watch' === command ) {
		const end = Date.now() + ( Number( flag( 'max-runtime', '1740' ) ) * 1000 );
		let announced = new Set();
		let errors = 0;

		while ( Date.now() < end ) {
			try {
				const { waiting } = await call( 'POST', '/watch' );
				const now = new Set( waiting.map( ( job ) => job.id ) );

				for ( const job of waiting ) {
					if ( ! announced.has( job.id ) ) {
						console.log( JSON.stringify( job ) );
					}
				}

				// A request that leaves the queue and comes back (stalled, requeued) is announced again.
				announced = now;
				errors = 0;
			} catch ( e ) {
				if ( /^(401|403|404) /.test( e.message ) || ++errors >= 6 ) {
					fail( `watch stopped: ${ e.message }` );
				}
			}

			await sleep( 5000 );
		}
	} else if ( 'list' === command ) {
		const { waiting } = await call( 'POST', '/watch' );
		console.log( waiting.length ? waiting.map( ( job ) => `#${ job.id } ${ job.mode }: ${ job.title }` ).join( '\n' ) : 'nothing waiting' );
	} else if ( 'brief' === command ) {
		const data = await call( 'GET', `/${ needId() }/brief` );
		const out = flag( 'out', join( tmpdir(), `refraction-brief-${ data.id }.md` ) );
		writeFileSync( out, data.prompt );
		console.log( `#${ data.id } (${ data.mode }, ${ data.state }): brief written to ${ out } (${ data.prompt.length } characters)` );
	} else if ( 'start' === command ) {
		const data = await call( 'POST', `/${ needId() }/start` );
		console.log( `#${ data.id } is now ${ data.state }` );
	} else if ( 'preview' === command ) {
		const file = flag( 'file' ) || fail( 'give --file with the answer' );
		const data = await call( 'POST', `/${ needId() }/preview`, { answer: readFileSync( file, 'utf8' ) } );
		console.log( `#${ data.id } preview: ${ data.preview }${ data.dropped && data.dropped.length ? `\nleft out: ${ data.dropped.join( '; ' ) }` : '' }${ ignoredNote( data ) }` );

		if ( flag( 'shots' ) ) {
			mkdirSync( flag( 'shots' ), { recursive: true } );
			console.log( ( await shoot( data.preview, flag( 'shots' ) ) ).join( '\n' ) );
		}
	} else if ( 'result' === command ) {
		const file = flag( 'file' ) || fail( 'give --file with the answer' );
		const data = await call( 'POST', `/${ needId() }/result`, { answer: readFileSync( file, 'utf8' ) } );
		console.log( `#${ data.id } is now ${ data.state }${ data.dropped && data.dropped.length ? `; left out: ${ data.dropped.join( '; ' ) }` : '' }${ ignoredNote( data ) }` );
	} else if ( 'decline' === command ) {
		const data = await call( 'POST', `/${ needId() }/decline`, { note: flag( 'note', '' ) } );
		console.log( `#${ data.id } is now ${ data.state }` );
	} else {
		fail( `unknown command ${ command }` );
	}
} catch ( e ) {
	fail( e.message );
}
