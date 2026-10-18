<?php
/**
 * Fake GitHub API + release download server for scripts/check-updater.mjs.
 *
 *   FAKE_GH_DIR=/tmp/refraction-updater-test php -S 127.0.0.1:8767 scripts/fixtures/fake-github.php
 *
 * $FAKE_GH_DIR/state.json   {"scenario": "ok|noasset|ratelimit|norelease|servererror", "version": "9.9.9"}
 * $FAKE_GH_DIR/refraction.zip   served at /download/refraction.zip
 * $FAKE_GH_DIR/requests.log     one line per request, so tests can prove whether a request was made
 */
$dir   = getenv( 'FAKE_GH_DIR' ) ?: sys_get_temp_dir() . '/refraction-updater-test';
$state = json_decode( (string) @file_get_contents( $dir . '/state.json' ), true ) ?: [];
$scenario = $state['scenario'] ?? 'ok';
$version  = $state['version'] ?? '9.9.9';
$path     = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH );
$origin   = 'http://' . $_SERVER['HTTP_HOST'];

file_put_contents( $dir . '/requests.log', $_SERVER['REQUEST_METHOD'] . ' ' . $path . ' [' . $scenario . "]\n", FILE_APPEND );

if ( '/download/refraction.zip' === $path ) {
	header( 'Content-Type: application/zip' );
	header( 'Content-Length: ' . filesize( $dir . '/refraction.zip' ) );
	readfile( $dir . '/refraction.zip' );
	return;
}

if ( '/repos/kohid/refraction/releases/latest' !== $path ) {
	http_response_code( 404 );
	header( 'Content-Type: application/json' );
	echo '{"message":"Not Found"}';
	return;
}

header( 'Content-Type: application/json; charset=utf-8' );

switch ( $scenario ) {
	case 'ratelimit':
		http_response_code( 403 );
		header( 'x-ratelimit-limit: 60' );
		header( 'x-ratelimit-remaining: 0' );
		header( 'x-ratelimit-reset: ' . ( time() + 1800 ) );
		echo '{"message":"API rate limit exceeded for 203.0.113.9.","documentation_url":"https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting"}';
		return;
	case 'norelease':
		http_response_code( 404 );
		echo '{"message":"Not Found"}';
		return;
	case 'servererror':
		http_response_code( 502 );
		echo '{"message":"Bad gateway"}';
		return;
}

$assets = [
	[
		'name' => 'refraction.zip.sha256',
		'browser_download_url' => $origin . '/download/refraction.zip.sha256',
	],
];

if ( 'noasset' !== $scenario ) {
	array_unshift( $assets, [
		'name' => 'refraction.zip',
		'content_type' => 'application/zip',
		'browser_download_url' => $origin . '/download/refraction.zip',
	] );
}

echo json_encode( [
	'tag_name' => 'v' . $version,
	'name' => 'v' . $version,
	'draft' => false,
	'prerelease' => false,
	'html_url' => $origin . '/kohid/refraction/releases/tag/v' . $version,
	'published_at' => '2026-10-18T12:00:00Z',
	'body' => "## What's new\n\n- Fake release notes for the updater test.\n- <script>alert(1)</script> must be escaped.",
	'assets' => $assets,
] );
