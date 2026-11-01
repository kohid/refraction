#!/usr/bin/env node
/**
 * A minimal MCP client for Refraction's MCP server (refraction/v1/mcp), for sessions that can not add the server
 * as an MCP connection, and for tests. Same environment as ask-claude-queue.mjs: REFRACTION_REST_URL, and
 * REFRACTION_REST_USER + REFRACTION_REST_PASSWORD (an Application Password). No dependencies (Node 18+).
 *
 *   node scripts/claude/refraction-mcp.mjs tools                    list the tools
 *   node scripts/claude/refraction-mcp.mjs call <tool> ['{"a":1}']   call one; arguments as JSON, or @file.json
 *
 * Prints the tool's text result; exit code 1 when the tool reports an error.
 */
import { readFileSync } from 'node:fs';

const [ command, tool, raw ] = process.argv.slice( 2 );
const base = ( process.env.REFRACTION_REST_URL || '' ).replace( /\/+$/, '' );
const fail = ( message ) => {
	console.error( `refraction-mcp: ${ message }` );
	process.exit( 1 );
};

if ( ! /^https:\/\//.test( base ) && ! /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test( base ) ) {
	fail( 'set REFRACTION_REST_URL to the site address (https://...)' );
}

let next = 1;

async function rpc( method, params ) {
	const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-06-18' };

	if ( process.env.REFRACTION_REST_USER && process.env.REFRACTION_REST_PASSWORD ) {
		headers.Authorization = 'Basic ' + Buffer.from( `${ process.env.REFRACTION_REST_USER }:${ process.env.REFRACTION_REST_PASSWORD }` ).toString( 'base64' );
	}

	const response = await fetch( `${ base }/?rest_route=/refraction/v1/mcp`, { method: 'POST', headers, body: JSON.stringify( { jsonrpc: '2.0', id: next++, method, params } ) } );
	const text = await response.text();

	if ( ! response.ok ) {
		fail( `${ response.status } ${ text.slice( 0, 300 ) }` );
	}

	const data = JSON.parse( text );

	if ( data.error ) {
		fail( `${ data.error.code } ${ data.error.message }` );
	}

	return data.result;
}

await rpc( 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'refraction-mcp-cli', version: '1' } } );

if ( 'tools' === command ) {
	const { tools } = await rpc( 'tools/list', {} );
	console.log( tools.map( ( t ) => `${ t.name }(${ Object.keys( t.inputSchema.properties || {} ).join( ', ' ) }): ${ t.description }` ).join( '\n' ) );
} else if ( 'call' === command && tool ) {
	let args = {};

	if ( raw ) {
		args = JSON.parse( raw.startsWith( '@' ) ? readFileSync( raw.slice( 1 ), 'utf8' ) : raw );
	}

	const result = await rpc( 'tools/call', { name: tool, arguments: args } );
	console.log( result.content.map( ( c ) => c.text ).join( '\n' ) );
	process.exit( result.isError ? 1 : 0 );
} else {
	fail( 'usage: tools | call <tool> [json|@file]' );
}
