<?php
// Pure-logic tests for the Ask Claude module: php scripts/test-ask-claude.php
define( 'ABSPATH', __DIR__ . '/' );
$root = dirname( __DIR__ );

// Minimal stand-ins for the WordPress functions the sanitizer calls.
function wp_kses( $text, $allowed ) { return strip_tags( $text, '<' . implode( '><', array_keys( $allowed ) ) . '>' ); }
function wp_kses_post( $text ) { return strip_tags( $text, '<p><a><strong><em><ul><li><h2><h3>' ); } // like WordPress: tags go, their text stays
function sanitize_text_field( $text ) { return trim( strip_tags( $text ) ); }
function sanitize_textarea_field( $text ) { return strip_tags( $text ); }
function esc_url_raw( $url ) { return filter_var( $url, FILTER_SANITIZE_URL ); }
function wp_strip_all_tags( $text ) { return trim( strip_tags( $text ) ); }

require $root . '/modules/ask-claude/classes/layout-sanitizer.php';
require $root . '/modules/ask-claude/classes/claude-builder.php';
require $root . '/modules/ask-claude/classes/prompt-builder.php';

use Refraction\Modules\AskClaude\Classes\Layout_Sanitizer as L;
use Refraction\Modules\AskClaude\Classes\Claude_Builder as B;
use Refraction\Modules\AskClaude\Classes\Prompt_Builder as P;

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

$controls = [
	'container' => [
		'flex_direction' => [ 'type' => 'choose', 'options' => [ 'row' => [], 'column' => [] ] ],
		'padding' => [ 'type' => 'dimensions', 'size_units' => [ 'px', 'em', '%' ] ],
		'flex_gap' => [ 'type' => 'gaps', 'size_units' => [ 'px' ] ],
		'background_background' => [ 'type' => 'choose', 'options' => [ 'classic' => [], 'gradient' => [] ] ],
		'background_color' => [ 'type' => 'color' ],
		'background_image' => [ 'type' => 'media' ],
		'section_layout' => [ 'type' => 'section' ],
	],
	'heading' => [
		'title' => [ 'type' => 'textarea' ],
		'header_size' => [ 'type' => 'select', 'options' => [ 'h1' => 'H1', 'h2' => 'H2' ] ],
		'title_color' => [ 'type' => 'color' ],
		'typography_typography' => [ 'type' => 'popover_toggle' ],
		'typography_font_size' => [ 'type' => 'slider', 'size_units' => [ 'px', 'rem' ] ],
		'link' => [ 'type' => 'url' ],
	],
	'icon-list' => [
		'icon_list' => [ 'type' => 'repeater', 'fields' => [ [ 'name' => 'text', 'type' => 'text' ], [ 'name' => 'selected_icon', 'type' => 'icons' ] ] ],
		'view' => [ 'type' => 'select', 'options' => [ 'traditional' => '', 'inline' => '' ] ],
	],
	'text-editor' => [ 'editor' => [ 'type' => 'wysiwyg' ], 'columns' => [ 'type' => 'number', 'min' => 1, 'max' => 10 ], 'drop_cap' => [ 'type' => 'switcher', 'return_value' => 'yes' ] ],
	'nested-tabs' => [ 'tabs' => [ 'type' => 'repeater', 'fields' => [ [ 'name' => 'tab_title', 'type' => 'text' ] ] ] ],
];
$spec = function ( $el, $widget ) use ( $controls ) {
	$key = 'container' === $el ? 'container' : $widget;

	return isset( $controls[ $key ] ) ? [ 'controls' => $controls[ $key ], 'nested' => in_array( $key, [ 'container', 'nested-tabs' ], true ) ] : null;
};
$images = function ( $id ) { return 7 === $id ? 'https://site.test/wp-content/uploads/hero.jpg' : ''; };
$new = function () use ( $spec, $images ) { return new L( $spec, $images, [ 'colors' => [ 'primary', 'accent' ], 'typography' => [ 'primary' ] ] ); };

$s = $new();
$out = $s->elements( [
	[ 'elType' => 'container', 'id' => 'fixed', 'settings' => [
		'flex_direction' => 'row',
		'padding' => [ 'unit' => 'px', 'top' => 80, 'right' => '20', 'bottom' => 80, 'left' => 20 ],
		'flex_gap' => 24,
		'background_background' => 'classic',
		'background_color' => '#112233',
		'background_image' => [ 'id' => 7, 'url' => 'https://evil.test/x.jpg' ],
		'section_layout' => 'x',
		'onclick' => 'alert(1)',
	], 'elements' => [
		[ 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [
			'title' => 'Calm <b>rooms</b><script>alert(1)</script>',
			'header_size' => 'h7',
			'title_color' => 'red; background:url(x)',
			'typography_typography' => 'custom',
			'typography_font_size' => [ 'unit' => 'vw', 'size' => 64 ],
			'link' => [ 'url' => 'javascript:alert(1)' ],
			'__globals__' => [ 'title_color' => 'globals/colors?id=accent', 'header_size' => 'globals/colors?id=accent', 'typography_typography' => 'globals/typography?id=nope' ],
		], 'elements' => [ [ 'elType' => 'container' ] ] ],
		[ 'elType' => 'widget', 'widgetType' => 'html', 'settings' => [ 'html' => '<script>x</script>' ] ],
		[ 'elType' => 'section', 'settings' => [] ],
	] ],
] );
$c = $out[0] ?? [];
$h = $c['elements'][0] ?? [];
t( 'a container keeps its real settings', 'row' === $c['settings']['flex_direction'] && 'classic' === $c['settings']['background_background'] && '#112233' === $c['settings']['background_color'] );
t( 'unknown settings and no-value controls are dropped', ! isset( $c['settings']['onclick'] ) && ! isset( $c['settings']['section_layout'] ) );
t( 'ids are fresh, 7 characters', 'fixed' !== $c['id'] && 7 === strlen( $c['id'] ) && $c['id'] !== $h['id'] );
t( 'top-level containers are not inner, nested ones are', false === $c['isInner'] );
t( 'dimensions are normalised', [ 'unit' => 'px', 'top' => '80', 'right' => '20', 'bottom' => '80', 'left' => '20', 'isLinked' => false ] === $c['settings']['padding'] );
t( 'a gap number becomes a linked gap', '24' === $c['settings']['flex_gap']['row'] && '24' === $c['settings']['flex_gap']['column'] && $c['settings']['flex_gap']['isLinked'] );
t( 'media must be a library image; its URL comes from the library', 7 === $c['settings']['background_image']['id'] && 'https://site.test/wp-content/uploads/hero.jpg' === $c['settings']['background_image']['url'] );
t( 'unknown widgets and element types are dropped and reported', 1 === count( $c['elements'] ) && in_array( 'widget "html"', $s->dropped, true ) && in_array( 'element type "section"', $s->dropped, true ) );
t( 'text keeps inline tags, loses scripts with their content', 'Calm <b>rooms</b>' === $h['settings']['title'] );
t( 'a choice outside the options is dropped', ! isset( $h['settings']['header_size'] ) );
t( 'a color that is not a color is dropped', ! isset( $h['settings']['title_color'] ) );
t( 'a slider unit outside the control units falls back to px', [ 'unit' => 'px', 'size' => 64, 'sizes' => [] ] === $h['settings']['typography_font_size'] );
t( 'javascript: links are dropped', ! isset( $h['settings']['link'] ) );
t( 'global references: only existing globals on matching controls', [ 'title_color' => 'globals/colors?id=accent' ] === $h['settings']['__globals__'] );
t( 'a plain widget gets no children', [] === $h['elements'] && 'heading' === $h['widgetType'] && ! isset( $h['isInner'] ) );

$wrapped = $new()->elements( [ [ 'elType' => 'widget', 'widgetType' => 'heading', 'settings' => [ 'title' => 'Hi' ] ] ] );
t( 'a widget at the top level is wrapped in a container', 'container' === $wrapped[0]['elType'] && 'heading' === $wrapped[0]['elements'][0]['widgetType'] );

$list = $new()->elements( [ [ 'elType' => 'container', 'elements' => [ [ 'elType' => 'widget', 'widgetType' => 'icon-list', 'settings' => [ 'icon_list' => [ [ 'text' => 'Oak floors', 'selected_icon' => [ 'value' => 'fas fa-check', 'library' => 'fa-solid' ] ], [ 'text' => 'Bad icon', 'selected_icon' => [ 'value' => 'fas fa-x" onload="x', 'library' => 'fa-solid' ] ], 'junk' ] ] ] ] ] ] );
$items = $list[0]['elements'][0]['settings']['icon_list'];
t( 'repeater items are cleaned with their own fields and get ids', 2 === count( $items ) && 'Oak floors' === $items[0]['text'] && 'fas fa-check' === $items[0]['selected_icon']['value'] && ! isset( $items[1]['selected_icon'] ) && 7 === strlen( $items[0]['_id'] ) );

$tabs = $new()->elements( [ [ 'elType' => 'container', 'elements' => [ [ 'elType' => 'widget', 'widgetType' => 'nested-tabs', 'settings' => [], 'elements' => [ [ 'elType' => 'container', 'elements' => [] ] ] ] ] ] ] );
t( 'nested widgets keep their child containers, marked inner', 1 === count( $tabs[0]['elements'][0]['elements'] ) && true === $tabs[0]['elements'][0]['elements'][0]['isInner'] );

$text = $new()->settings( [ 'editor' => '<p>Hello</p><script>bad()</script>', 'columns' => 40, 'drop_cap' => 'on' ], $controls['text-editor'] );
t( 'wysiwyg keeps markup but not scripts (nor their text), numbers are bounded, switchers are yes or empty', '<p>Hello</p>' === $text['editor'] && 10 === $text['columns'] && '' === $text['drop_cap'] );
t( 'an unclosed script or a style block goes too', '<p>A</p>' === L::without_code( '<p>A</p><style>p{}</style><script>x' ) );

$many = $new();
$tree = array_fill( 0, 300, [ 'elType' => 'container', 'settings' => [] ] );
t( 'at most 250 elements', L::MAX_ELEMENTS === count( $many->elements( $tree ) ) );
$deep = [ 'elType' => 'container', 'elements' => [] ];
for ( $i = 0; $i < 20; $i++ ) { $deep = [ 'elType' => 'container', 'elements' => [ $deep ] ]; }
$depth = 0; $node = $new()->elements( [ $deep ] )[0];
while ( ! empty( $node['elements'] ) ) { $node = $node['elements'][0]; $depth++; }
t( 'nesting is limited', L::MAX_DEPTH === $depth );
t( 'colors: hex, rgb(a), hsl and transparent', L::is_color( '#abc' ) && L::is_color( 'rgba(10, 20, 30, 0.5)' ) && L::is_color( 'hsl(200, 40%, 30%)' ) && L::is_color( 'transparent' ) && ! L::is_color( 'url(x)' ) && ! L::is_color( '#12345g' ) );
t( 'anchor and mail links are kept', '#contact' === $new()->value( [ 'url' => '#contact' ], [ 'type' => 'url' ] )['url'] && 'mailto:a@b.test' === $new()->value( 'mailto:a@b.test', [ 'type' => 'url' ] )['url'] );

// Sending an assistant turn back: thinking with its signature, text and tool calls; after a fallback, only earlier text.
$block = function ( array $props ) { return (object) $props; };
$echo = B::echo_content( [
	$block( [ 'type' => 'thinking', 'thinking' => '', 'signature' => 'sig1' ] ),
	$block( [ 'type' => 'text', 'text' => 'Looking up widgets.' ] ),
	$block( [ 'type' => 'tool_use', 'id' => 'tu1', 'name' => 'list_images', 'input' => [] ] ),
] );
t( 'echo: thinking (with signature), text and tool calls are sent back', 'sig1' === $echo[0]['signature'] && 'text' === $echo[1]['type'] && 'tu1' === $echo[2]['id'] && '{}' === json_encode( $echo[2]['input'] ) );
$echo = B::echo_content( [
	$block( [ 'type' => 'thinking', 'thinking' => '', 'signature' => 'old' ] ),
	$block( [ 'type' => 'text', 'text' => 'Partial.' ] ),
	$block( [ 'type' => 'tool_use', 'id' => 'old', 'name' => 'x', 'input' => [] ] ),
	$block( [ 'type' => 'fallback' ] ),
	$block( [ 'type' => 'tool_use', 'id' => 'new', 'name' => 'list_images', 'input' => [ 'search' => 'oak' ] ] ),
] );
t( 'echo: after a fallback, only text from before it, the marker dropped', 2 === count( $echo ) && 'Partial.' === $echo[0]['text'] && 'new' === $echo[1]['id'] );

t( 'api message: Anthropic\'s one line, not the JSON', 'Your credit balance is too low.' === B::api_message( [ 'type' => 'error', 'error' => [ 'type' => 'invalid_request_error', 'message' => 'Your credit balance is too low.' ] ] ) && '' === B::api_message( 'oops' ) && '' === B::api_message( null ) );

// Answers pasted from a Claude.ai chat.
$el = '{"elType":"container","settings":{},"elements":[]}';
$a = P::parse_answer( "Here is your page:\n\n```json\n{\"elements\": [$el], \"summary\": \"A hero.\"}\n```\n\nLet me know!" );
t( 'chat answer: the json block inside prose', $a && 1 === count( $a['elements'] ) && 'A hero.' === $a['summary'] );
$a = P::parse_answer( "```\n{\"x\":1}\n```\n```json\n{\"elements\": [$el, $el], \"summary\": \"\"}\n```" );
t( 'chat answer: the longest block wins', $a && 2 === count( $a['elements'] ) );
$a = P::parse_answer( "[$el]" );
t( 'chat answer: a bare list of elements', $a && 1 === count( $a['elements'] ) && '' === $a['summary'] );
$a = P::parse_answer( "Sure: $el" );
t( 'chat answer: one bare element without a fence', $a && 'container' === $a['elements'][0]['elType'] );
t( 'chat answer: cut off halfway is refused', null === P::parse_answer( "```json\n{\"elements\": [{\"elType\":\"container\",\"settings\":{" ) );
t( 'chat answer: no JSON at all', null === P::parse_answer( 'I cannot help with that.' ) && null === P::parse_answer( '' ) );
t( 'chat request: task, images note, description and the selected element', false !== strpos( P::request( 'selected', 'Shorter.', '{"id":"a"}', 'Note.' ), "exactly one element (the replacement for it), keeping what the request does not ask to change. The selected element is shown as JSON after the request. Note.\n\nREQUEST:\nShorter.\n\nCURRENT SELECTED ELEMENT:\n{\"id\":\"a\"}" ) );

echo "ask-claude: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
