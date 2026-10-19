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

// ---------------------------------------------------------------- Display conditions evaluator
require $root . '/modules/display-conditions/classes/context.php';
require $root . '/modules/display-conditions/classes/visitor-hints.php';
require $root . '/modules/display-conditions/classes/condition-evaluator.php';
use Refraction\Modules\DisplayConditions\Classes\Context;
use Refraction\Modules\DisplayConditions\Classes\Visitor_Hints as V;
use Refraction\Modules\DisplayConditions\Classes\Condition_Evaluator as E;

class Fake_Context implements Context {
	public $d = [];
	public function __construct( array $d = [] ) { $this->d = $d + [ 'logged_in' => false, 'roles' => [], 'user_id' => 0, 'user_login' => '', 'post_type' => 'page', 'post_id' => 7, 'terms' => [], 'author_id' => 1, 'now' => '2025-03-10 12:00:00', 'tz' => 'UTC', 'query' => [], 'cookies' => [], 'referrer' => '', 'device' => 'desktop', 'languages' => [ 'en-us', 'en' ] ]; }
	public function is_logged_in(): bool { return $this->d['logged_in']; }
	public function user_roles(): array { return $this->d['roles']; }
	public function user_id(): int { return $this->d['user_id']; }
	public function user_login(): string { return $this->d['user_login']; }
	public function post_type(): string { return $this->d['post_type']; }
	public function post_id(): int { return $this->d['post_id']; }
	public function term_keys(): array { return $this->d['terms']; }
	public function author_id(): int { return $this->d['author_id']; }
	public function now(): DateTimeImmutable { return new DateTimeImmutable( $this->d['now'], new DateTimeZone( $this->d['tz'] ) ); }
	public function query_arg( string $name ): ?string { return $this->d['query'][ $name ] ?? null; }
	public function cookie( string $name ): ?string { return $this->d['cookies'][ $name ] ?? null; }
	public function referrer(): string { return $this->d['referrer']; }
	public function device(): string { return $this->d['device']; }
	public function languages(): array { return $this->d['languages']; }
}
function c( $type, $value = '', $op = 'is', $extra = [] ) { return [ 'type' => $type, 'op' => $op, 'value' => $value ] + $extra; }
function ev( array $items, array $ctx = [], string $logic = 'and', string $mode = 'show' ) { return E::is_visible( $items, $logic, $mode, new Fake_Context( $ctx ) ); }

t( 'no conditions means visible', ev( [] ) );
t( 'logged in: visitor sees it hidden', ! ev( [ c( 'logged_in' ) ] ) );
t( 'logged in: member sees it', ev( [ c( 'logged_in' ) ], [ 'logged_in' => true ] ) );
t( 'is not logged in: visitor sees it', ev( [ c( 'logged_in', '', 'is_not' ) ] ) );
t( 'role match', ev( [ c( 'user_role', 'editor, author' ) ], [ 'logged_in' => true, 'roles' => [ 'author' ] ] ) );
t( 'role mismatch', ! ev( [ c( 'user_role', 'editor' ) ], [ 'logged_in' => true, 'roles' => [ 'subscriber' ] ] ) );
t( 'role for a visitor is false', ! ev( [ c( 'user_role', 'editor' ) ] ) );
t( 'role is not', ev( [ c( 'user_role', 'editor', 'is_not' ) ], [ 'logged_in' => true, 'roles' => [ 'subscriber' ] ] ) );
t( 'specific user by id', ev( [ c( 'user', '4, 9' ) ], [ 'logged_in' => true, 'user_id' => 9 ] ) );
t( 'specific user by login', ev( [ c( 'user', 'Ann' ) ], [ 'logged_in' => true, 'user_id' => 2, 'user_login' => 'ann' ] ) );
t( 'user never matches a visitor', ! ev( [ c( 'user', '0' ) ] ) );
t( 'post type', ev( [ c( 'post_type', 'page,post' ) ] ) && ! ev( [ c( 'post_type', 'product' ) ] ) );
t( 'post by id', ev( [ c( 'post', '3,7' ) ] ) && ! ev( [ c( 'post', '3,8' ) ] ) );
t( 'taxonomy term by slug', ev( [ c( 'term', 'category:news' ) ], [ 'terms' => [ 'category:news', 'category:12' ] ] ) );
t( 'taxonomy term by id', ev( [ c( 'term', 'category:12' ) ], [ 'terms' => [ 'category:news', 'category:12' ] ] ) );
t( 'term without taxonomy matches any', ev( [ c( 'term', 'news' ) ], [ 'terms' => [ 'post_tag:news' ] ] ) );
t( 'term mismatch', ! ev( [ c( 'term', 'category:sport' ) ], [ 'terms' => [ 'category:news' ] ] ) );
t( 'author', ev( [ c( 'author', '1' ) ] ) && ! ev( [ c( 'author', '5' ) ] ) );

$range = fn( $from, $to ) => c( 'date_range', '', 'is', [ 'from' => $from, 'to' => $to ] );
t( 'date range inside', ev( [ $range( '2025-03-01 00:00', '2025-03-31 23:59' ) ] ) );
t( 'date range before start', ! ev( [ $range( '2025-04-01 00:00', '' ) ] ) );
t( 'date range open start', ev( [ $range( '', '2025-12-31 00:00' ) ] ) );
t( 'date range after end', ! ev( [ $range( '2024-01-01 00:00', '2025-03-10 11:59' ) ] ) );
t( 'date range uses the site timezone', ! ev( [ $range( '2025-03-10 00:00', '2025-03-10 09:00' ) ], [ 'now' => '2025-03-10 12:00:00', 'tz' => 'Europe/Berlin' ] ) && ev( [ $range( '2025-03-10 00:00', '2025-03-10 13:00' ) ], [ 'now' => '2025-03-10 12:00:00', 'tz' => 'Europe/Berlin' ] ) );
t( 'invalid date is ignored as open', ev( [ $range( 'garbage', '' ) ] ) );
$tod = fn( $from, $to ) => c( 'time_of_day', '', 'is', [ 'from' => $from, 'to' => $to ] );
t( 'time of day inside', ev( [ $tod( '09:00', '17:00' ) ] ) && ! ev( [ $tod( '13:00', '17:00' ) ] ) );
t( 'time of day across midnight', ev( [ $tod( '22:00', '06:00' ) ], [ 'now' => '2025-03-10 23:30:00' ] ) && ev( [ $tod( '22:00', '06:00' ) ], [ 'now' => '2025-03-10 05:00:00' ] ) && ! ev( [ $tod( '22:00', '06:00' ) ] ) );
t( 'day of week (2025-03-10 is a Monday)', ev( [ c( 'day_of_week', 'mon,tue' ) ] ) && ! ev( [ c( 'day_of_week', 'sat,sun' ) ] ) );
t( 'day of week by number', ev( [ c( 'day_of_week', '1' ) ] ) && ev( [ c( 'day_of_week', '7' ) ], [ 'now' => '2025-03-09 12:00:00' ] ) );
t( 'day of week is read in the site timezone', ev( [ c( 'day_of_week', 'mon' ) ], [ 'now' => '2025-03-10 23:00:00', 'tz' => 'Asia/Tokyo' ] ) && ! ev( [ c( 'day_of_week', 'tue' ) ], [ 'now' => '2025-03-10 23:00:00', 'tz' => 'Asia/Tokyo' ] ) );
t( 'url param equals', ev( [ c( 'url_param', 'ref=news' ) ], [ 'query' => [ 'ref' => 'news' ] ] ) && ! ev( [ c( 'url_param', 'ref=news' ) ], [ 'query' => [ 'ref' => 'x' ] ] ) );
t( 'url param exists', ev( [ c( 'url_param', 'promo' ) ], [ 'query' => [ 'promo' => '' ] ] ) && ! ev( [ c( 'url_param', 'promo' ) ] ) );
t( 'cookie contains', ev( [ c( 'cookie', 'seen=yes' ) ], [ 'cookies' => [ 'seen' => 'maybe-yes-1' ] ] ) && ! ev( [ c( 'cookie', 'seen=no' ) ], [ 'cookies' => [ 'seen' => 'yes' ] ] ) );
t( 'cookie exists', ev( [ c( 'cookie', 'seen' ) ], [ 'cookies' => [ 'seen' => '1' ] ] ) );
t( 'referrer contains', ev( [ c( 'referrer', 'google.' ) ], [ 'referrer' => 'https://www.google.com/search' ] ) && ! ev( [ c( 'referrer', 'google.' ) ] ) );
t( 'device', ev( [ c( 'device', 'mobile,tablet' ) ], [ 'device' => 'tablet' ] ) && ! ev( [ c( 'device', 'mobile' ) ] ) );
t( 'browser language by prefix', ev( [ c( 'language', 'de' ) ], [ 'languages' => [ 'de-AT', 'en' ] ] ) && ! ev( [ c( 'language', 'fr' ) ] ) );
t( 'browser language exact region', ev( [ c( 'language', 'en-US' ) ] ) && ! ev( [ c( 'language', 'en-GB' ) ] ) );
t( 'unknown type never matches', ! ev( [ c( 'nonsense', 'x' ) ] ) );
t( 'unknown type with is not matches', ev( [ c( 'nonsense', 'x', 'is_not' ) ] ) );

$yes = c( 'post_type', 'page' ); $no = c( 'post_type', 'product' );
t( 'AND needs all', ! ev( [ $yes, $no ], [], 'and' ) && ev( [ $yes, $yes ], [], 'and' ) );
t( 'OR needs one', ev( [ $yes, $no ], [], 'or' ) && ! ev( [ $no, $no ], [], 'or' ) );
t( 'hide mode inverts', ! ev( [ $yes ], [], 'and', 'hide' ) && ev( [ $no ], [], 'and', 'hide' ) );
t( 'hide mode with no conditions stays visible', ev( [], [], 'and', 'hide' ) );
t( 'bad logic falls back to AND', ! ev( [ $yes, $no ], [], 'xor' ) );
t( 'incomplete rows are skipped', ev( [ c( 'post_type', '' ), $yes ] ) );
t( 'only incomplete rows means visible', ev( [ c( 'post_type', '' ) ] ) );

t( 'device: iPhone', 'mobile' === V::device( 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit', '' ) );
t( 'device: iPad', 'tablet' === V::device( 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', '' ) );
t( 'device: Android phone', 'mobile' === V::device( 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36', '' ) );
t( 'device: Android tablet', 'tablet' === V::device( 'Mozilla/5.0 (Linux; Android 13; SM-X700) Safari/537.36', '' ) );
t( 'device: desktop', 'desktop' === V::device( 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120', '' ) );
t( 'device: client hint wins', 'mobile' === V::device( 'Mozilla/5.0 (X11; Linux x86_64)', '?1' ) );
t( 'device: empty agent is desktop', 'desktop' === V::device( '', '' ) );
t( 'accept-language is ordered by quality', [ 'fr-ch', 'en' ] === V::languages( 'en;q=0.5, fr-CH;q=0.9' ) );
t( 'accept-language drops junk', [ 'de' ] === V::languages( 'de, *;q=0.1, <script>' ) );
t( 'accept-language empty', [] === V::languages( '' ) );

echo "$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
