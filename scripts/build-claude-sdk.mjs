#!/usr/bin/env node
/**
 * Builds vendor-prefixed/claude-sdk: Anthropic's official PHP SDK (and Nyholm PSR-7) with every namespace moved under
 * Refraction\Vendor\ (Strauss), so it can never clash with another plugin that bundles the same libraries. Used by the
 * Ask Claude module on PHP 8.1+. Prefixing takes several minutes, so the result is reused while
 * scripts/claude-sdk/composer.lock and composer.json are unchanged (a stamp file records their hash).
 *
 * Usage: node scripts/build-claude-sdk.mjs [--force]
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const SRC = join( ROOT, 'scripts/claude-sdk' );
const OUT = join( ROOT, 'vendor-prefixed/claude-sdk' );
const STAMP = join( OUT, '.build-stamp' );

const hash = createHash( 'sha256' )
	.update( readFileSync( join( SRC, 'composer.json' ) ) )
	.update( readFileSync( join( SRC, 'composer.lock' ) ) )
	.digest( 'hex' );

if ( ! process.argv.includes( '--force' ) && existsSync( STAMP ) && readFileSync( STAMP, 'utf8' ).trim() === hash && existsSync( join( OUT, 'autoload.php' ) ) ) {
	console.log( '[claude-sdk] up to date' );
	process.exit( 0 );
}

const run = ( command, args ) => execFileSync( command, args, { cwd: SRC, stdio: 'inherit', env: { ...process.env, COMPOSER_ALLOW_SUPERUSER: '1' } } );

console.log( '[claude-sdk] installing and prefixing (takes several minutes)' );
rmSync( OUT, { recursive: true, force: true } );
run( 'composer', [ 'install', '--no-interaction', '--no-progress' ] );
run( join( SRC, 'vendor/bin/strauss' ), [] );

if ( ! existsSync( join( OUT, 'autoload.php' ) ) ) {
	console.error( '[claude-sdk] Strauss did not write vendor-prefixed/claude-sdk/autoload.php' );
	process.exit( 1 );
}

writeFileSync( STAMP, hash + '\n' );
console.log( '[claude-sdk] done' );
