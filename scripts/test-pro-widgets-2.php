<?php
/**
 * Standalone tests for the pure logic of Pro widgets batch 2 (no WordPress needed).
 *
 * Run: php scripts/test-pro-widgets-2.php
 */

define( 'ABSPATH', __DIR__ . '/' );

// Minimal stand-ins for the few WordPress helpers the classes call.
if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( $u ) {
		return filter_var( $u, FILTER_SANITIZE_URL );
	}
}

$root = dirname( __DIR__ ) . '/modules/pro-widgets/classes/';
foreach ( [ 'review-logic', 'code-tokenizer', 'video-url', 'facebook-url' ] as $file ) {
	if ( ! file_exists( $root . $file . '.php' ) ) {
		echo "MISSING class file: $file.php\n";
		exit( 1 );
	}
	require_once $root . $file . '.php';
}

use Refraction\Modules\ProWidgets\Classes\Review_Logic;
use Refraction\Modules\ProWidgets\Classes\Code_Tokenizer;
use Refraction\Modules\ProWidgets\Classes\Video_Url;
use Refraction\Modules\ProWidgets\Classes\Facebook_Url;

$failures = 0;
$total = 0;
function t( string $name, $actual, $expected ): void {
	global $failures, $total;
	++$total;
	if ( $actual === $expected ) {
		echo "ok   $name\n";
		return;
	}
	++$failures;
	echo "FAIL $name\n     expected: " . var_export( $expected, true ) . "\n     actual:   " . var_export( $actual, true ) . "\n";
}

// ---------------------------------------------------------------- Review_Logic
t( 'stars: 4 of 5', Review_Logic::stars( 4 ), [ 'full', 'full', 'full', 'full', 'empty' ] );
t( 'stars: 3.5 shows a half star', Review_Logic::stars( 3.5 ), [ 'full', 'full', 'full', 'half', 'empty' ] );
t( 'stars: 4.8 rounds up to full', Review_Logic::stars( 4.8 ), [ 'full', 'full', 'full', 'full', 'full' ] );
t( 'stars: 4.1 rounds down', Review_Logic::stars( 4.1 ), [ 'full', 'full', 'full', 'full', 'empty' ] );
t( 'stars: above max is clamped', Review_Logic::stars( 9 ), [ 'full', 'full', 'full', 'full', 'full' ] );
t( 'stars: negative or junk is zero', Review_Logic::stars( 'abc' ), [ 'empty', 'empty', 'empty', 'empty', 'empty' ] );
t( 'stars: custom max of 3', Review_Logic::stars( 2, 3 ), [ 'full', 'full', 'empty' ] );
t( 'rating: clamp', [ Review_Logic::clamp( 7 ), Review_Logic::clamp( -2 ), Review_Logic::clamp( '3.5' ) ], [ 5.0, 0.0, 3.5 ] );
t( 'rating: format drops a trailing .0', [ Review_Logic::format( 4.0 ), Review_Logic::format( 4.5 ) ], [ '4', '4.5' ] );

// -------------------------------------------------------------- Code_Tokenizer
$types = function ( string $code, string $lang ): array {
	return array_map( fn( $t ) => $t[0] . ':' . $t[1], array_values( array_filter( Code_Tokenizer::tokenize( $code, $lang ), fn( $t ) => 'plain' !== $t[0] ) ) );
};
t( 'languages', Code_Tokenizer::languages(), [ 'js', 'php', 'css', 'html', 'json', 'bash', 'python' ] );
t( 'js: keyword string comment number', $types( 'const a = "x"; // hi', 'js' ), [ 'keyword:const', 'string:"x"', 'comment:// hi' ] );
t( 'js: number and function call', $types( 'run(42)', 'js' ), [ 'function:run', 'number:42' ] );
t( 'php: variable and keyword', $types( '<?php echo $x;', 'php' ), [ 'keyword:<?php', 'keyword:echo', 'variable:$x' ] );
t( 'php: hash comment', $types( '# note', 'php' ), [ 'comment:# note' ] );
t( 'python: keyword and comment', $types( 'def f(): # c', 'python' ), [ 'keyword:def', 'function:f', 'comment:# c' ] );
t( 'bash: comment keyword variable', $types( 'if [ -n "$HOME" ]; then # go', 'bash' ), [ 'keyword:if', 'string:"$HOME"', 'keyword:then', 'comment:# go' ] );
t( 'json: key, string, number, literal', $types( '{"a": "b", "n": 1.5, "t": true}', 'json' ), [ 'property:"a"', 'string:"b"', 'property:"n"', 'number:1.5', 'property:"t"', 'keyword:true' ] );
t( 'css: selector, property, number', $types( '.a { color: red; margin: 0 }', 'css' ), [ 'selector:.a', 'property:color', 'property:margin', 'number:0' ] );
t( 'html: tag, attribute, string', $types( '<a href="/x">hi</a>', 'html' ), [ 'tag:<a', 'attr:href', 'string:"/x"', 'tag:>', 'tag:</a>' ] );
t( 'unterminated string stops at the end of the line', $types( "\"abc\nlet", 'js' ), [ 'string:"abc', 'keyword:let' ] );
t( 'unknown language is plain', Code_Tokenizer::tokenize( 'a b', 'cobol' ), [ [ 'plain', 'a b' ] ] );
t( 'alias: javascript, py, sh, shell, htm, xml', array_map( [ Code_Tokenizer::class, 'normalize_language' ], [ 'javascript', 'py', 'sh', 'shell', 'htm', 'xml', 'Nope' ] ), [ 'js', 'python', 'bash', 'bash', 'html', 'html', 'plain' ] );

$samples = [
	'js' => "const s = 'a<b>' + \"</script>\"; /* c */\nfunction f(){ return 1 }",
	'php' => "<?php\n\$a = ['k' => \"<i>\"]; // x\n?>",
	'css' => "a > b { background: url(\"x.png\") } /* y */",
	'html' => "<!-- c --><div class=\"a\" onclick='x()'>&amp; <b>t</b></div>",
	'json' => '{"<script>": [1, 2, null]}',
	'bash' => "echo \"\$X\" | grep 'a<' # <b>",
	'python' => "x = f'<{a}>'  # <c>\n\"\"\"doc\"\"\"",
];
foreach ( $samples as $lang => $code ) {
	$html = Code_Tokenizer::highlight( $code, $lang );
	t( "highlight $lang: round trip equals the source", html_entity_decode( strip_tags( $html ), ENT_QUOTES, 'UTF-8' ), $code );
	t( "highlight $lang: no raw angle bracket from the source survives", (bool) preg_match( '/<(?!\/?span\b)/', $html ), false );
}
t( 'highlight: spans carry the rf-tok classes', Code_Tokenizer::highlight( 'let a', 'js' ), '<span class="rf-tok rf-tok--keyword">let</span> a' );
$big = str_repeat( "const a = \"x\" + 'y'; // comment\n", 6000 );
$start = microtime( true );
Code_Tokenizer::highlight( $big, 'js' );
t( 'highlight: 200KB of code finishes in under 2 seconds', ( microtime( true ) - $start ) < 2.0, true );
$start = microtime( true );
Code_Tokenizer::highlight( str_repeat( '"', 50000 ) . str_repeat( '/*', 20000 ), 'js' );
t( 'highlight: pathological quotes and comments stay linear', ( microtime( true ) - $start ) < 2.0, true );


// lines(): one balanced HTML string per source line
t( 'lines: a multi-line comment is closed and reopened on every line', Code_Tokenizer::lines( "/* a\nb */ x", 'js' ), [ '<span class="rf-tok rf-tok--comment">/* a</span>', '<span class="rf-tok rf-tok--comment">b */</span> x' ] );
t( 'lines: plain text and blank lines', Code_Tokenizer::lines( "a\n\nb", 'plain' ), [ 'a', '', 'b' ] );
t( 'lines: a trailing newline does not add an empty line', count( Code_Tokenizer::lines( "let a\n", 'js' ) ), 1 );
t( 'lines: CRLF is normalised', Code_Tokenizer::lines( "a\r\nb", 'js' ), [ 'a', 'b' ] );
t( 'lines: ranges parse', Code_Tokenizer::parse_line_ranges( '2, 4-6,x,9-8,0' ), [ 2, 4, 5, 6 ] );
t( 'lines: ranges are capped', count( Code_Tokenizer::parse_line_ranges( '1-100000' ) ), 2000 );
t( 'video: youtube embed with api for the playlist', Video_Url::embed_src( [ 'provider' => 'youtube', 'id' => 'dQw4w9WgXcQ' ], [ 'autoplay' => true, 'api' => true ] ), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1&enablejsapi=1' );

// -------------------------------------------------------------------- Video_Url
t( 'video: youtube watch', Video_Url::parse( 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s' ), [ 'provider' => 'youtube', 'id' => 'dQw4w9WgXcQ' ] );
t( 'video: youtu.be', Video_Url::parse( 'https://youtu.be/dQw4w9WgXcQ?si=abc' ), [ 'provider' => 'youtube', 'id' => 'dQw4w9WgXcQ' ] );
t( 'video: youtube shorts and embed', [ Video_Url::parse( 'https://www.youtube.com/shorts/dQw4w9WgXcQ' )['id'], Video_Url::parse( 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' )['id'] ], [ 'dQw4w9WgXcQ', 'dQw4w9WgXcQ' ] );
t( 'video: vimeo', Video_Url::parse( 'https://vimeo.com/76979871' ), [ 'provider' => 'vimeo', 'id' => '76979871', 'hash' => '' ] );
t( 'video: vimeo unlisted hash', Video_Url::parse( 'https://vimeo.com/76979871/abcdef1234' ), [ 'provider' => 'vimeo', 'id' => '76979871', 'hash' => 'abcdef1234' ] );
t( 'video: vimeo player url', Video_Url::parse( 'https://player.vimeo.com/video/76979871' )['id'], '76979871' );
t( 'video: self hosted file', Video_Url::parse( 'https://example.com/a/clip.mp4?x=1' ), [ 'provider' => 'hosted', 'url' => 'https://example.com/a/clip.mp4?x=1' ] );
t( 'video: lookalike host is rejected', Video_Url::parse( 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ' ), null );
t( 'video: javascript url is rejected', Video_Url::parse( 'javascript:alert(1)' ), null );
t( 'video: junk is rejected', Video_Url::parse( 'not a url' ), null );
t( 'video: short youtube id is rejected', Video_Url::parse( 'https://youtu.be/short' ), null );
t( 'video: youtube embed src is privacy-enhanced', Video_Url::embed_src( [ 'provider' => 'youtube', 'id' => 'dQw4w9WgXcQ' ], [ 'autoplay' => true, 'mute' => false ] ), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1' );
t( 'video: youtube embed with mute and no autoplay', Video_Url::embed_src( [ 'provider' => 'youtube', 'id' => 'dQw4w9WgXcQ' ], [ 'autoplay' => false, 'mute' => true ] ), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1&mute=1' );
t( 'video: vimeo embed uses do-not-track', Video_Url::embed_src( [ 'provider' => 'vimeo', 'id' => '76979871', 'hash' => 'abc' ], [ 'autoplay' => true ] ), 'https://player.vimeo.com/video/76979871?dnt=1&autoplay=1&h=abc' );
t( 'video: hosted has no embed src', Video_Url::embed_src( [ 'provider' => 'hosted', 'url' => 'https://example.com/a.mp4' ], [] ), '' );

// ----------------------------------------------------------------- Facebook_Url
t( 'facebook: hosts', array_map( [ Facebook_Url::class, 'is_facebook_url' ], [ 'https://www.facebook.com/x', 'https://facebook.com/x', 'https://m.facebook.com/x', 'https://fb.watch/abc', 'https://facebook.com.evil.test/x', 'http://example.com/facebook.com', 'javascript:alert(1)', '' ] ), [ true, true, true, true, false, false, false, false ] );
t( 'facebook: page src', Facebook_Url::page_src( 'https://www.facebook.com/Meta', [ 'tabs' => 'timeline', 'width' => 340, 'height' => 500, 'small_header' => false, 'hide_cover' => false, 'show_facepile' => true ] ), 'https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FMeta&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true' );
t( 'facebook: page width is clamped to Facebook limits (180-500)', [ preg_match( '/width=(\d+)/', Facebook_Url::page_src( 'https://www.facebook.com/Meta', [ 'width' => 900 ] ), $m1 ) ? $m1[1] : null, preg_match( '/width=(\d+)/', Facebook_Url::page_src( 'https://www.facebook.com/Meta', [ 'width' => 10 ] ), $m2 ) ? $m2[1] : null ], [ '500', '180' ] );
t( 'facebook: post src', Facebook_Url::post_src( 'https://www.facebook.com/Meta/posts/123', [ 'width' => 500 ] ), 'https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2FMeta%2Fposts%2F123&width=500&show_text=true' );
t( 'facebook: video src', Facebook_Url::video_src( 'https://www.facebook.com/Meta/videos/123', [ 'width' => 500, 'show_text' => false ] ), 'https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FMeta%2Fvideos%2F123&width=500&show_text=false' );
t( 'facebook: like button src', Facebook_Url::like_src( 'https://example.com/page', [ 'action' => 'recommend', 'layout' => 'button_count', 'size' => 'large', 'share' => true ] ), 'https://www.facebook.com/plugins/like.php?href=https%3A%2F%2Fexample.com%2Fpage&layout=button_count&action=recommend&size=large&share=true&show_faces=false' );
t( 'facebook: like action falls back to like', preg_match( '/action=like&/', Facebook_Url::like_src( 'https://example.com/', [ 'action' => 'hax' ] ) ), 1 );
t( 'facebook: comments src', Facebook_Url::comments_src( 'https://example.com/post', [ 'numposts' => 5, 'width' => 550 ] ), 'https://www.facebook.com/plugins/comments.php?href=https%3A%2F%2Fexample.com%2Fpost&numposts=5&width=550' );
t( 'facebook: non-facebook url gives no page src', Facebook_Url::page_src( 'https://evil.test/Meta', [] ), '' );
t( 'facebook: like/comments accept any http(s) url, not javascript', [ Facebook_Url::like_src( 'javascript:alert(1)', [] ), Facebook_Url::comments_src( 'ftp://x/y', [] ) ], [ '', '' ] );

echo "\n$total tests, $failures failed\n";
exit( $failures ? 1 : 0 );
