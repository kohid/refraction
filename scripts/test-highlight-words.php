<?php
/**
 * Highlight Words (modules/highlight-words/classes/pure-highlight.php): php scripts/test-highlight-words.php
 */
require __DIR__ . '/../modules/highlight-words/classes/pure-highlight.php';

use Refraction\Modules\HighlightWords\Classes\Pure_Highlight as H;

$pass = 0;
$fail = 0;

function check( string $name, $got, $want ) {
	global $pass, $fail;

	if ( $got === $want ) {
		$pass++;
	} else {
		$fail++;
		echo "FAIL $name\n  got:  " . var_export( $got, true ) . "\n  want: " . var_export( $want, true ) . "\n";
	}
}

$s = H::SPAN;

check( 'phrases: one per line, trimmed, no duplicates, longest first', H::phrases( " bank \n\nyour bank\nbank\n" ), [ 'your bank', 'bank' ] );
check( 'one phrase in plain text', H::wrap( 'Payments go straight into your bank. Not ours.', 'your bank' ), "Payments go straight into {$s}your bank</span>. Not ours." );
check( 'many phrases, each wherever it appears', H::wrap( '<p>Fast cars, fast service.</p>', "fast\nservice" ), "<p>{$s}Fast</span> cars, {$s}fast</span> {$s}service</span>.</p>" );
check( 'match case when asked', H::wrap( 'Fast and fast', 'fast', true ), "Fast and {$s}fast</span>" );
check( 'whole words only', H::wrap( 'banking at the bank', 'bank' ), "banking at the {$s}bank</span>" );
check( 'the longest phrase wins where they overlap', H::wrap( 'your bank account', "bank\nyour bank" ), "{$s}your bank</span> account" );
check( 'never inside tags or attributes', H::wrap( '<a href="/bank" title="bank">bank</a>', 'bank' ), "<a href=\"/bank\" title=\"bank\">{$s}bank</span></a>" );
check( 'never inside script, style or textarea', H::wrap( '<script>var bank=1;</script><style>.bank{}</style><textarea>bank</textarea> bank', 'bank' ), "<script>var bank=1;</script><style>.bank{}</style><textarea>bank</textarea> {$s}bank</span>" );
check( 'not again inside a highlighted part (a Dual Heading)', H::wrap( 'Go <span class="refraction-heading-dual">to the bank</span> bank', 'bank' ), "Go <span class=\"refraction-heading-dual\">to the bank</span> {$s}bank</span>" );
check( 'escaped text matches a phrase with an ampersand', H::wrap( 'Fish &amp; chips', 'Fish & chips' ), "{$s}Fish &amp; chips</span>" );
check( 'letters of other scripts are word letters too', H::wrap( 'Café café', 'café' ), "{$s}Café</span> {$s}café</span>" );
check( 'no phrases: unchanged', H::wrap( '<b>x</b>', "\n  \n" ), '<b>x</b>' );
check( 'special characters in a phrase are literal', H::wrap( 'Price (from) £20', '(from)' ), "Price {$s}(from)</span> £20" );

// Title and description words.
check( 'kind: a title class', H::kind( 'refraction-icon-box-title extra' ), 'title' );
check( 'kind: a description class', H::kind( 'refraction-icon-box-description' ), 'desc' );
check( 'kind: a heading wins over content', H::kind( 'rf-dash__head-content rf-dash__heading' ), 'title' );
check( 'kind: neither', H::kind( 'refraction-icon-box-wrapper' ), '' );
$box = '<div class="refraction-icon-box-content"><h3 class="refraction-icon-box-title"><span>Safe transport</span></h3><p class="refraction-icon-box-description">Licensed drivers, safe cars, every journey.</p></div>';
check( 'title words only in the title, description words only in the description', H::wrap_parts( $box, 'Safe', 'every journey' ), "<div class=\"refraction-icon-box-content\"><h3 class=\"refraction-icon-box-title\"><span>{$s}Safe</span> transport</span></h3><p class=\"refraction-icon-box-description\">Licensed drivers, safe cars, {$s}every journey</span>.</p></div>" );
check( 'text in neither part gets both lists', H::wrap_parts( '<div class="box"><span>Safe and every journey</span></div>', 'Safe', 'every journey' ), "<div class=\"box\"><span>{$s}Safe</span> and {$s}every journey</span></span></div>" );
check( 'void tags and self-closing tags do not open a part', H::wrap_parts( '<p class="x-title">A<br>B<img class="y-description" src="a.png"/>C</p>', 'C', 'A' ), "<p class=\"x-title\">A<br>B<img class=\"y-description\" src=\"a.png\"/>{$s}C</span></p>" );
check( 'script stays untouched in parts', H::wrap_parts( '<p class="t-title"><script>var Safe=1</script>Safe</p>', 'Safe', '' ), "<p class=\"t-title\"><script>var Safe=1</script>{$s}Safe</span></p>" );
check( 'no words: unchanged', H::wrap_parts( '<p class="a-title">x</p>', '', "\n" ), '<p class="a-title">x</p>' );

echo "highlight-words: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
