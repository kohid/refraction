<?php
// Pure-logic tests for the "extras A" modules (no WordPress needed): php scripts/test-extras-a.php
define( 'ABSPATH', __DIR__ . '/' );
$root = dirname( __DIR__ );

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

// ---------------------------------------------------------------- Custom CSS sanitiser
require $root . '/modules/custom-css/classes/css-sanitizer.php';
use Refraction\Modules\CustomCss\Classes\Css_Sanitizer as S;

t( 'plain css is untouched', 'a{color:red;margin:0 auto}' === S::sanitize( 'a{color:red;margin:0 auto}' ) );
t( 'child combinator survives', 'ul > li{color:red}' === S::sanitize( 'ul > li{color:red}' ) );
t( 'content escapes survive', 'a::before{content:"\201C"}' === S::sanitize( 'a::before{content:"\201C"}' ) );
t( 'data image urls survive', false !== strpos( S::sanitize( 'a{background:url(data:image/png;base64,AAA)}' ), 'data:image/png' ) );
t( 'closing style tag is removed', false === stripos( S::sanitize( 'a{color:red}</style><script>alert(1)</script>' ), '<' ) );
t( 'script tag is removed', false === stripos( S::sanitize( '<script>alert(1)</script>a{color:red}' ), 'script>' ) );
t( 'import of external url is removed', false === stripos( S::sanitize( '@import url(https://evil.test/x.css); a{color:red}' ), 'import' ) );
t( 'import keeps other rules', false !== strpos( S::sanitize( '@import "//evil.test/x.css"; a{color:red}' ), 'a{color:red}' ) );
t( 'expression() declaration is removed', false === stripos( S::sanitize( 'a{width:expression(alert(1));color:red}' ), 'expression' ) );
t( 'expression() keeps neighbour declaration', false !== strpos( S::sanitize( 'a{width:expression(alert(1));color:red}' ), 'color:red' ) );
t( 'javascript url is removed', false === stripos( S::sanitize( 'a{background:url(javascript:alert(1))}' ), 'javascript' ) );
t( 'javascript url with control chars is removed', false === preg_match( '~j\s*a\s*v\s*a~i', S::sanitize( "a{background:url(java\tscript:alert(1))}" ) ) || 0 === preg_match( '~script\s*:~i', S::sanitize( "a{background:url(java\tscript:alert(1))}" ) ) );
t( 'css escaped javascript is removed', 0 === preg_match( '~script\s*:~i', S::sanitize( 'a{background:url(\6a avascript:alert(1))}' ) ) );
t( 'comment split expression is removed', false === stripos( S::sanitize( 'a{width:expr/**/ession(alert(1))}' ), 'expression' ) );
t( 'nested bypass is removed', false === stripos( S::sanitize( 'a{width:exprexpression(ession(alert(1))}' ), 'expression(' ) );
t( 'vbscript url is removed', false === stripos( S::sanitize( 'a{background:url(vbscript:x)}' ), 'vbscript' ) );
t( 'data html url is removed', false === stripos( S::sanitize( 'a{background:url(data:text/html,<b>)}' ), 'text/html' ) );
t( 'behavior is removed', false === stripos( S::sanitize( 'a{behavior:url(x.htc);color:red}' ), 'behavior' ) );
t( '-moz-binding is removed', false === stripos( S::sanitize( 'a{-moz-binding:url(x.xml#y)}' ), 'binding' ) );
t( 'null bytes are removed', false === strpos( S::sanitize( "a{color:re\0d}" ), "\0" ) );
t( 'empty stays empty', '' === S::sanitize( '' ) );
t( 'is_risky detects', S::is_risky( 'a{width:expression(1)}' ) && ! S::is_risky( 'a{color:red}' ) );

t( 'selector keyword is replaced', '.refraction-element-ab12 a{color:red}' === S::scope( 'selector a{color:red}', '.refraction-element-ab12' ) );
t( 'selector keyword replaced several times', '.x{a:b}.x:hover{a:c}' === S::scope( 'selector{a:b}selector:hover{a:c}', '.x' ) );
t( 'selector inside other words is kept', '.x .my-selector{a:b}' === S::scope( 'selector .my-selector{a:b}', '.x' ) );
t( 'no selector keyword scopes nothing', 'a{color:red}' === S::scope( 'a{color:red}', '.x' ) );

// ---------------------------------------------------------------- Custom Code snippet format
require $root . '/modules/custom-code/classes/snippet-format.php';
use Refraction\Modules\CustomCode\Classes\Snippet_Format as F;

t( 'location whitelist', 'head' === F::location( 'head' ) && 'body_start' === F::location( 'body_start' ) && 'body_end' === F::location( 'body_end' ) && 'head' === F::location( 'evil' ) );
t( 'type whitelist', 'js' === F::type( 'js' ) && 'css' === F::type( 'css' ) && 'html' === F::type( 'x' ) );
t( 'priority is clamped', 10 === F::priority( 'abc' ) && 1 === F::priority( -5 ) && 999 === F::priority( 5000 ) && 20 === F::priority( '20' ) );
t( 'html is printed as written', '<meta name="x">' === F::render( 'html', '<meta name="x">', 3 ) );
t( 'css is wrapped in a style tag', '<style id="refraction-snippet-3">a{color:red}</style>' === F::render( 'css', 'a{color:red}', 3 ) );
t( 'css can not close its style tag', 1 === substr_count( F::render( 'css', 'a{} </style><script>x()</script>', 4 ), '</style>' ) );
t( 'js is wrapped in a script tag', '<script id="refraction-snippet-5">alert(1)</script>' === F::render( 'js', 'alert(1)', 5 ) );
t( 'js can not close its script tag', 1 === substr_count( F::render( 'js', 'var a="</script><b>";', 6 ), '</script>' ) );
t( 'empty code prints nothing', '' === F::render( 'js', "  \n", 7 ) );
$list = [ [ 'id' => 9, 'priority' => 10 ], [ 'id' => 2, 'priority' => 20 ], [ 'id' => 5, 'priority' => 10 ], [ 'id' => 1, 'priority' => 5 ] ];
t( 'snippets sort by priority then id', [ 1, 5, 9, 2 ] === array_column( F::sort( $list ), 'id' ) );

echo "$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
