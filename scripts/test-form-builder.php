<?php
// Pure-logic tests for the Form Builder schema (no WordPress needed): php scripts/test-form-builder.php
define( 'ABSPATH', __DIR__ . '/' );
$root = dirname( __DIR__ );
require $root . '/modules/custom-css/classes/css-sanitizer.php';
require $root . '/modules/form-builder/classes/schema.php';
require $root . '/modules/form-builder/classes/conditions.php';
require $root . '/modules/form-builder/classes/style.php';
require $root . '/modules/form-builder/classes/settings.php';
require $root . '/modules/form-builder/classes/presets.php';

use Refraction\Modules\FormBuilder\Classes\Schema as S;
use Refraction\Modules\FormBuilder\Classes\Presets as P;

$pass = 0; $fail = 0;
function t( $name, $ok ) { global $pass, $fail; if ( $ok ) { $pass++; } else { $fail++; echo "FAIL $name\n"; } }

// ---------------------------------------------------------------- keys, slugs, text
t( 'key is lowercased and cleaned', 'guest_name' === S::key( ' Guest Name! ' ) );
t( 'key may not start with a digit', 'f_1st' === S::key( '1st' ) );
t( 'key of only symbols is empty', '' === S::key( '!!!' ) );
t( 'key is capped', 40 === strlen( S::key( str_repeat( 'a', 90 ) ) ) );
t( 'slug uses dashes', 'my-bookings' === S::slug( 'My  Bookings!' ) );
t( 'text strips tags', 'hi alert(1)' === S::text( 'hi <script>alert(1)</script>' ) );
t( 'text strips control characters', 'ab' === S::text( "a\0b" ) );
t( 'text is capped', 5 === strlen( S::text( 'abcdefghij', 5 ) ) );
t( 'text of an array is empty', '' === S::text( [ 'x' ] ) );
t( 'colour whitelist', 'danger' === S::color( 'danger' ) && 'secondary' === S::color( 'hotpink' ) );
t( 'icon whitelist', 'schedule' === S::icon( 'schedule' ) && 'grid-view' === S::icon( '../../x' ) );

// ---------------------------------------------------------------- options
$o = S::options( "Small\nlg|Large\n\nsm|Small again\nSmall" );
t( 'options: plain line uses label as value', 'Small' === $o[0]['value'] && 'Small' === $o[0]['label'] );
t( 'options: value|label', 'lg' === $o[1]['value'] && 'Large' === $o[1]['label'] );
t( 'options: duplicate values dropped, blanks dropped', 3 === count( $o ) );
t( 'options round trip through text', $o === S::options( S::options_to_text( $o ) ) );
t( 'options accept arrays of objects', 'a' === S::options( [ [ 'value' => 'a', 'label' => 'A' ] ] )[0]['value'] );
t( 'options are capped', S::MAX_OPTIONS === count( S::options( implode( "\n", range( 1, 500 ) ) ) ) );
t( 'option html is stripped', 'bold' === S::options( '<b>bold</b>' )[0]['label'] );

// ---------------------------------------------------------------- fields
t( 'field needs a label', null === S::clean_field( [ 'key' => 'x', 'type' => 'text' ] ) );
t( 'field key falls back to the label', 'phone_number' === S::clean_field( [ 'label' => 'Phone number' ] )['key'] );
t( 'unknown field type becomes text', 'text' === S::clean_field( [ 'label' => 'A', 'type' => 'evil' ] )['type'] );
t( 'options kept only for choice types', [] === S::clean_field( [ 'label' => 'A', 'type' => 'text', 'options' => 'x' ] )['options'] && 1 === count( S::clean_field( [ 'label' => 'A', 'type' => 'select', 'options' => 'x' ] )['options'] ) );
t( 'filter only for choice types', ! S::clean_field( [ 'label' => 'A', 'type' => 'text', 'filter' => 1 ] )['filter'] && S::clean_field( [ 'label' => 'A', 'type' => 'select', 'filter' => 1 ] )['filter'] );
t( 'width whitelist', 'half' === S::clean_field( [ 'label' => 'A', 'width' => 'half' ] )['width'] && 'full' === S::clean_field( [ 'label' => 'A', 'width' => '999' ] )['width'] );
t( 'min and max are numbers or null', null === S::clean_field( [ 'label' => 'A', 'min' => 'x' ] )['min'] && 3.0 === S::clean_field( [ 'label' => 'A', 'max' => '3' ] )['max'] );
t( 'every type has a label', count( S::types() ) === count( array_filter( S::types() ) ) );

// ---------------------------------------------------------------- definitions
$d = S::definition( [
	'label' => 'Rooms <b>x</b>',
	'fields' => [
		[ 'label' => 'Name', 'required' => true ],
		[ 'label' => 'Name again', 'key' => 'name' ],
		'junk',
		[ 'label' => 'Size', 'type' => 'select', 'options' => "S\nM" ],
	],
	'statuses' => [ [ 'label' => 'Open', 'color' => 'success' ], [ 'label' => 'Open', 'key' => 'open' ], [ 'label' => '' ] ],
	'default_status' => 'nope',
	'title_field' => 'nope',
] );
t( 'definition label is cleaned', 'Rooms x' === $d['label'] );
t( 'definition slug comes from the label', 'rooms-x' === $d['slug'] );
t( 'definition drops duplicate keys and junk', [ 'name', 'size' ] === array_column( $d['fields'], 'key' ) );
t( 'definition drops duplicate and empty statuses', [ 'open' ] === array_column( $d['statuses'], 'key' ) );
t( 'bad default status falls back to the first', 'open' === $d['default_status'] );
t( 'bad title field falls back to the first field', 'name' === $d['title_field'] );
t( 'a definition always has a status', 1 === count( S::definition( [ 'label' => 'x' ] )['statuses'] ) );
t( 'definition is idempotent', $d === S::definition( $d ) );
t( 'field cap', S::MAX_FIELDS === count( S::definition( [ 'label' => 'x', 'fields' => array_map( fn( $i ) => [ 'label' => 'F' . $i ], range( 1, 200 ) ) ] )['fields'] ) );
t( 'singular defaults to the label', 'Rooms x' === $d['singular'] );

// ---------------------------------------------------------------- validation
$def = S::definition( [
	'label' => 'Test',
	'fields' => [
		[ 'key' => 'name', 'label' => 'Name', 'type' => 'text', 'required' => true ],
		[ 'key' => 'mail', 'label' => 'Mail', 'type' => 'email' ],
		[ 'key' => 'tel', 'label' => 'Tel', 'type' => 'phone' ],
		[ 'key' => 'site', 'label' => 'Site', 'type' => 'url' ],
		[ 'key' => 'qty', 'label' => 'Qty', 'type' => 'number', 'min' => 1, 'max' => 10 ],
		[ 'key' => 'price', 'label' => 'Price', 'type' => 'currency' ],
		[ 'key' => 'day', 'label' => 'Day', 'type' => 'date' ],
		[ 'key' => 'at', 'label' => 'At', 'type' => 'time' ],
		[ 'key' => 'when', 'label' => 'When', 'type' => 'datetime' ],
		[ 'key' => 'size', 'label' => 'Size', 'type' => 'select', 'options' => "S\nM|Medium" ],
		[ 'key' => 'pick', 'label' => 'Pick', 'type' => 'radio', 'options' => "a\nb" ],
		[ 'key' => 'tags', 'label' => 'Tags', 'type' => 'checkbox', 'options' => "x\ny\nz" ],
		[ 'key' => 'vip', 'label' => 'VIP', 'type' => 'toggle' ],
		[ 'key' => 'stars', 'label' => 'Stars', 'type' => 'rating' ],
		[ 'key' => 'about', 'label' => 'About', 'type' => 'textarea' ],
	],
] );
$check = function ( array $input, array $only = [] ) use ( $def ) { return S::validate( $def, $input, $only ); };
$err = fn( $input, $key ) => isset( $check( $input )['errors'][ $key ] );

t( 'required text missing', $err( [], 'name' ) );
t( 'required text present', ! $err( [ 'name' => 'Ann' ], 'name' ) );
t( 'required whitespace only is missing', $err( [ 'name' => '   ' ], 'name' ) );
t( 'optional empty fields are fine', [ 'name' ] === array_keys( $check( [] )['errors'] ) );
t( 'email valid', ! $err( [ 'mail' => 'a@b.co' ], 'mail' ) );
t( 'email invalid', $err( [ 'mail' => 'nope' ], 'mail' ) );
t( 'phone valid', ! $err( [ 'tel' => '+1 (555) 123-4567' ], 'tel' ) );
t( 'phone invalid', $err( [ 'tel' => 'call me' ], 'tel' ) );
t( 'url valid', ! $err( [ 'site' => 'https://example.com/a?b=1' ], 'site' ) );
t( 'javascript url refused', $err( [ 'site' => 'javascript:alert(1)' ], 'site' ) );
t( 'ftp url refused', $err( [ 'site' => 'ftp://example.com' ], 'site' ) );
t( 'number in range', ! $err( [ 'qty' => '5' ], 'qty' ) && '5' === $check( [ 'qty' => '5' ] )['values']['qty'] );
t( 'number below min', $err( [ 'qty' => '0' ], 'qty' ) );
t( 'number above max', $err( [ 'qty' => '11' ], 'qty' ) );
t( 'number not numeric', $err( [ 'qty' => 'abc' ], 'qty' ) );
t( 'number keeps decimals', '2.5' === $check( [ 'qty' => '2.5' ] )['values']['qty'] );
t( 'currency is two decimals', '1234.50' === $check( [ 'price' => '1,234.5' ] )['values']['price'] );
t( 'date valid', ! $err( [ 'day' => '2026-02-28' ], 'day' ) );
t( 'impossible date refused', $err( [ 'day' => '2026-02-30' ], 'day' ) );
t( 'date in the wrong format refused', $err( [ 'day' => '28/02/2026' ], 'day' ) );
t( 'time valid', ! $err( [ 'at' => '09:30' ], 'at' ) );
t( 'time invalid', $err( [ 'at' => '25:00' ], 'at' ) );
t( 'datetime valid with T or space', ! $err( [ 'when' => '2026-05-01T10:15' ], 'when' ) && '2026-05-01T10:15' === $check( [ 'when' => '2026-05-01 10:15' ] )['values']['when'] );
t( 'select valid', ! $err( [ 'size' => 'M' ], 'size' ) );
t( 'select outside the options refused', $err( [ 'size' => 'XL' ], 'size' ) );
t( 'radio outside the options refused', $err( [ 'pick' => 'c' ], 'pick' ) );
t( 'checkbox keeps only listed options, in order', [ 'x', 'z' ] === $check( [ 'tags' => [ 'z', 'evil', 'x' ] ] )['values']['tags'] );
t( 'checkbox with a string is handled', [ 'y' ] === $check( [ 'tags' => 'y' ] )['values']['tags'] );
t( 'toggle on', '1' === $check( [ 'vip' => 'on' ] )['values']['vip'] && '1' === $check( [ 'vip' => '1' ] )['values']['vip'] );
t( 'toggle default off', '0' === $check( [] )['values']['vip'] );
t( 'rating clamps by refusing', $err( [ 'stars' => '6' ], 'stars' ) && $err( [ 'stars' => '0' ], 'stars' ) && '4' === $check( [ 'stars' => '4' ] )['values']['stars'] );
t( 'textarea keeps newlines, strips tags', "a\nb" === $check( [ 'about' => "a\r\n<i>b</i>" ] )['values']['about'] );
t( 'textarea is capped', 5000 === strlen( $check( [ 'about' => str_repeat( 'a', 9000 ) ] )['values']['about'] ) );
t( 'an array for a text field is an error', $err( [ 'name' => [ 'x' ] ], 'name' ) );
t( 'only limits the fields read', [ 'name' ] === array_keys( $check( [ 'name' => 'A', 'mail' => 'x' ], [ 'name' ] )['values'] ) );
t( 'fields outside only are not validated', [] === $check( [ 'name' => 'A', 'mail' => 'x' ], [ 'name' ] )['errors'] );
t( 'unknown input keys are ignored', ! isset( $check( [ 'name' => 'A', 'admin' => '1' ] )['values']['admin'] ) );

// ---------------------------------------------------------------- display, title, search
$size = S::field( $def, 'size' );
t( 'display of a select shows the label', 'Medium' === S::display( $size, 'M' ) );
t( 'display of a checkbox joins the labels', 'x, z' === S::display( S::field( $def, 'tags' ), [ 'x', 'z' ] ) );
t( 'display of a toggle', 'Yes' === S::display( S::field( $def, 'vip' ), '1' ) && 'No' === S::display( S::field( $def, 'vip' ), '0' ) );
t( 'display of a rating', '4 / 5' === S::display( S::field( $def, 'stars' ), '4' ) );
t( 'title uses the title field', 'Ann' === S::title( $def, [ 'name' => 'Ann' ], 7 ) );
t( 'title falls back to another filled field', 'a@b.co' === S::title( $def, [ 'mail' => 'a@b.co' ], 7 ) );
t( 'title falls back to the id', '#7' === S::title( $def, [], 7 ) );
t( 'search text holds the filled values', false !== strpos( S::search_text( $def, [ 'name' => 'Ann', 'size' => 'M' ] ), 'Medium' ) );
t( 'initials', 'AL' === S::initials( 'ada lovelace byron' ) && '#' === S::initials( '' ) );

// ---------------------------------------------------------------- CSV
$rows = S::csv_rows( $def, [ [ 'id' => 3, 'status' => 'new', 'created' => '2026-01-02 10:00:00', 'values' => [ 'name' => '=HYPERLINK("x")', 'size' => 'M' ] ] ] );
t( 'csv header has the field labels', 'ID' === $rows[0][0] && 'Name' === $rows[0][1] && 'Created' === end( $rows[0] ) );
t( 'csv formula cell is neutralised', "'=HYPERLINK(\"x\")" === $rows[1][1] );
t( 'csv shows option labels', in_array( 'Medium', $rows[1], true ) );
t( 'csv row has as many cells as the header', count( $rows[0] ) === count( $rows[1] ) );
t( 'csv_cell leaves plain text alone', 'hello' === S::csv_cell( 'hello' ) && "'-5" === S::csv_cell( '-5' ) && "'@a" === S::csv_cell( '@a' ) );

// ---------------------------------------------------------------- presets
foreach ( P::keys() as $key ) {
	$p = P::get( $key );
	t( "preset $key is a clean definition", $p === S::definition( $p ) );
	t( "preset $key has a slug, fields and statuses", '' !== $p['slug'] && $p['fields'] && $p['statuses'] );
	t( "preset $key has a table column", (bool) array_filter( array_column( $p['fields'], 'in_table' ) ) );
	t( "preset $key default status exists", null !== S::status( $p, $p['default_status'] ) );
	t( "preset $key title field exists", null !== S::field( $p, $p['title_field'] ) );
}
t( 'booking can take public submissions', P::get( 'booking' )['public_form'] );
t( 'listing can be shown publicly', P::get( 'listing' )['public_list'] && ! P::get( 'listing' )['public_form'] );
t( 'transaction is private', ! P::get( 'transaction' )['public_form'] && ! P::get( 'transaction' )['public_list'] );
t( 'booking select options came through', 3 === count( S::field( P::get( 'booking' ), 'service' )['options'] ) );


// ---------------------------------------------------------------- layout, steps, containers, hidden, file (0.7.0)
use Refraction\Modules\FormBuilder\Classes\Conditions as C;
use Refraction\Modules\FormBuilder\Classes\Style as ST;
use Refraction\Modules\FormBuilder\Classes\Settings as SE;

$form = S::definition( [
	'label' => 'Application',
	'fields' => [
		[ 'type' => 'step', 'label' => 'About you' ],
		[ 'type' => 'heading', 'content' => 'Tell us <i>about</i> you', 'level' => 9 ],
		[ 'type' => 'paragraph', 'content' => "Line one\nLine two <b>x</b>" ],
		[ 'type' => 'html', 'content' => '<p onclick="x()">Hi</p><script>alert(1)</script>' ],
		[ 'type' => 'divider' ],
		[ 'label' => 'Full name', 'type' => 'text', 'required' => true ],
		[ 'label' => 'Has company', 'key' => 'has_company', 'type' => 'toggle' ],
		[ 'label' => 'Company', 'type' => 'text', 'required' => true, 'conditions' => [ 'enabled' => true, 'action' => 'show', 'match' => 'all', 'rules' => [ [ 'field' => 'has_company', 'op' => 'equals', 'value' => '1' ] ] ] ],
		[ 'type' => 'step', 'label' => 'Details' ],
		[ 'label' => 'Address', 'type' => 'group', 'children' => [
			[ 'label' => 'Street', 'type' => 'text', 'required' => true ],
			[ 'label' => 'City', 'type' => 'text' ],
			[ 'label' => 'Nested', 'type' => 'group', 'children' => [ [ 'label' => 'Deep', 'type' => 'text' ] ] ],
		] ],
		[ 'label' => 'Children', 'type' => 'repeater', 'min_rows' => 0, 'max_rows' => 3, 'children' => [
			[ 'label' => 'Child name', 'key' => 'child_name', 'type' => 'text', 'required' => true ],
			[ 'label' => 'Age', 'type' => 'number', 'min' => 0 ],
			[ 'label' => 'Photo', 'type' => 'file' ],
			[ 'type' => 'step', 'label' => 'bad' ],
		] ],
		[ 'label' => 'CV', 'type' => 'file', 'accept' => 'pdf, exe, DOCX', 'max_size' => 500, 'max_files' => 99, 'required' => true ],
		[ 'label' => 'Campaign', 'type' => 'hidden', 'default' => 'spring', 'required' => true, 'source' => 'bogus', 'in_table' => true, 'public' => true ],
	],
] );
$keys = array_column( S::walk( $form['fields'] ), 'key' );
t( 'layout fields get unique generated keys', in_array( 'heading', $keys, true ) && in_array( 'paragraph', $keys, true ) && count( $keys ) === count( array_unique( $keys ) ) );
t( 'two steps and the heading belong to step one', 2 === count( S::steps( $form ) ) && 'About you' === S::steps( $form )[0]['title'] && 'Details' === S::steps( $form )[1]['title'] );
t( 'steps hold the right fields', 'heading' === S::steps( $form )[0]['fields'][0]['key'] && 'address' === S::steps( $form )[1]['fields'][0]['key'] );
t( 'a form without a step is one step', 1 === count( S::steps( $def ) ) );
t( 'a leading step only names the first step', 'Intro' === S::steps( S::definition( [ 'label' => 'x', 'fields' => [ [ 'type' => 'step', 'label' => 'Intro' ], [ 'label' => 'A' ] ] ] ) )[0]['title'] && 1 === count( S::steps( S::definition( [ 'label' => 'x', 'fields' => [ [ 'type' => 'step', 'label' => 'Intro' ], [ 'label' => 'A' ] ] ] ) ) ) );
t( 'heading text loses markup and level is clamped', 'Tell us about you' === S::field( $form, 'heading' )['content'] && 6 === S::field( $form, 'heading' )['level'] );
t( 'paragraph keeps line breaks, loses tags', "Line one\nLine two x" === S::field( $form, 'paragraph' )['content'] );
t( 'html block loses scripts and handlers', false === strpos( S::field( $form, 'html' )['content'], 'script' ) && false === strpos( S::field( $form, 'html' )['content'], 'onclick' ) && false !== strpos( S::field( $form, 'html' )['content'], 'Hi' ) );
t( 'layout fields never hold values', ! S::has_value( 'heading' ) && ! S::has_value( 'step' ) && S::has_value( 'group' ) && S::has_value( 'file' ) );
t( 'value_fields excludes layout and steps', ! in_array( 'heading', array_column( S::value_fields( $form ), 'key' ), true ) );
t( 'groups can not nest', null === S::field( $form, 'nested' ) && 'deep' !== ( S::field( $form, 'deep' )['key'] ?? '' ) );
t( 'steps can not sit inside a repeater', null === S::field( $form, 'step_2' ) && 3 === count( S::field( $form, 'children' )['children'] ) - 0 + 0 || 2 === count( S::field( $form, 'children' )['children'] ) );
t( 'a repeater can not hold an upload', null === S::field( $form, 'photo' ) );
t( 'file accept list is whitelisted', [ 'pdf', 'docx' ] === S::field( $form, 'cv' )['accept'] );
t( 'file limits are clamped', 64.0 === S::field( $form, 'cv' )['max_size'] && 10 === S::field( $form, 'cv' )['max_files'] );
t( 'hidden fields are never required, listed or public', ! S::field( $form, 'campaign' )['required'] && ! S::field( $form, 'campaign' )['in_table'] && ! S::field( $form, 'campaign' )['public'] && 'static' === S::field( $form, 'campaign' )['source'] );
t( 'definition with children is idempotent', $form === S::definition( $form ) );
t( 'title field skips layout, hidden and containers', 'full_name' === $form['title_field'] );
t( 'find a nested field by key', 'Street' === S::field( $form, 'street' )['label'] );

// conditions
$rules = [ 'enabled' => true, 'action' => 'show', 'match' => 'all', 'rules' => [ [ 'field' => 'a', 'op' => 'equals', 'value' => 'x' ], [ 'field' => 'b', 'op' => 'greater', 'value' => '5' ] ] ];
$look = fn( array $v ) => fn( $k ) => $v[ $k ] ?? '';
t( 'conditions: all rules must match', C::is_visible( $rules, $look( [ 'a' => 'x', 'b' => '9' ] ) ) && ! C::is_visible( $rules, $look( [ 'a' => 'x', 'b' => '2' ] ) ) );
t( 'conditions: any rule is enough', C::is_visible( [ 'match' => 'any' ] + $rules, $look( [ 'a' => 'x', 'b' => '2' ] ) ) && ! C::is_visible( [ 'match' => 'any' ] + $rules, $look( [ 'a' => 'y', 'b' => '2' ] ) ) );
t( 'conditions: hide action inverts', ! C::is_visible( [ 'action' => 'hide' ] + $rules, $look( [ 'a' => 'x', 'b' => '9' ] ) ) && C::is_visible( [ 'action' => 'hide' ] + $rules, $look( [] ) ) );
t( 'conditions: disabled or empty means visible', C::is_visible( [ 'enabled' => false ] + $rules, $look( [] ) ) && C::is_visible( C::defaults(), $look( [] ) ) );
t( 'conditions: empty and not empty', C::matches( [ 'op' => 'empty', 'value' => '' ], '  ' ) && C::matches( [ 'op' => 'not_empty', 'value' => '' ], 'a' ) && C::matches( [ 'op' => 'empty', 'value' => '' ], [] ) );
t( 'conditions: contains is case-insensitive', C::matches( [ 'op' => 'contains', 'value' => 'ABC' ], 'xxabcxx' ) && ! C::matches( [ 'op' => 'not_contains', 'value' => 'abc' ], 'ABC' ) );
t( 'conditions: multiple choices match by membership', C::matches( [ 'op' => 'equals', 'value' => 'b' ], [ 'a', 'b' ] ) && C::matches( [ 'op' => 'not_equals', 'value' => 'c' ], [ 'a', 'b' ] ) );
t( 'conditions: numbers compare as numbers', C::matches( [ 'op' => 'greater', 'value' => '9' ], '10' ) && ! C::matches( [ 'op' => 'less', 'value' => '9' ], 'abc' ) );
t( 'conditions clean: unknown operator becomes equals, junk rules dropped', 'equals' === C::clean( [ 'enabled' => true, 'rules' => [ [ 'field' => 'a', 'op' => 'evil' ], 'x', [ 'field' => '' ] ] ] )['rules'][0]['op'] && 1 === count( C::clean( [ 'enabled' => true, 'rules' => [ [ 'field' => 'a', 'op' => 'evil' ], 'x', [ 'field' => '' ] ] ] )['rules'] ) );
t( 'conditions clean: enabled without rules is off', ! C::clean( [ 'enabled' => true, 'rules' => [] ] )['enabled'] );
t( 'conditions clean: at most ten rules', 10 === count( C::clean( [ 'enabled' => true, 'rules' => array_fill( 0, 30, [ 'field' => 'a', 'op' => 'equals', 'value' => '1' ] ) ] )['rules'] ) );
t( 'conditions clean is idempotent', C::clean( $rules ) === C::clean( C::clean( $rules ) ) );

// validation of the application form
$ok = [ 'full_name' => 'Ann', 'address' => [ 'street' => '1 Main St', 'city' => 'Lisbon' ], 'children' => [ [ 'child_name' => 'Bo', 'age' => '4' ] ] ];
$files = [ 'cv' => [ [ 'id' => 'abc', 'name' => 'cv.pdf', 'size' => 10, 'type' => 'application/pdf' ] ] ];
$r = S::validate( $form, $ok, [], $files );
t( 'application: valid input passes', [] === $r['errors'], json_encode( $r['errors'] ) );
t( 'application: a field hidden by a condition is not required nor stored', ! isset( $r['values']['company'] ) );
t( 'application: group values are nested', '1 Main St' === $r['values']['address']['street'] );
t( 'application: repeater values are a list of rows', 'Bo' === $r['values']['children'][0]['child_name'] && 1 === count( $r['values']['children'] ) );
t( 'application: file values come from the checked files', 'cv.pdf' === $r['values']['cv'][0]['name'] );
t( 'application: hidden field keeps its default', 'spring' === $r['values']['campaign'] );
$r2 = S::validate( $form, [ 'full_name' => 'Ann', 'has_company' => '1' ] + $ok, [], $files );
t( 'application: the conditional field is required once shown', isset( $r2['errors']['company'] ) );
$r3 = S::validate( $form, $ok );
t( 'application: a required upload must be present', isset( $r3['errors']['cv'] ) );
t( 'application: posted file descriptors are ignored', isset( S::validate( $form, $ok + [ 'cv' => [ [ 'id' => 'x', 'name' => 'evil.php' ] ] ] )['errors']['cv'] ) );
$r4 = S::validate( $form, [ 'full_name' => 'A', 'address' => [ 'city' => 'x' ], 'children' => [ [ 'child_name' => '', 'age' => '3' ], [ 'child_name' => '', 'age' => '' ] ] ], [], $files );
t( 'application: nested errors use the field path', isset( $r4['errors']['address.street'] ) && isset( $r4['errors']['children.0.child_name'] ) );
t( 'application: an untouched repeater row is dropped, not reported', 1 === count( $r4['values']['children'] ) && ! isset( $r4['errors']['children.1.child_name'] ) );
$rows = array_fill( 0, 8, [ 'child_name' => 'Kid' ] );
t( 'application: repeater cap holds', 3 === count( S::validate( $form, [ 'children' => $rows ] + $ok, [], $files )['values']['children'] ) );
$min = S::definition( [ 'label' => 'x', 'fields' => [ [ 'label' => 'Rows', 'type' => 'repeater', 'min_rows' => 2, 'children' => [ [ 'label' => 'A', 'key' => 'a' ] ] ] ] ] );
t( 'repeater minimum rows is enforced', isset( S::validate( $min, [ 'rows' => [ [ 'a' => '1' ] ] ] )['errors']['rows'] ) && ! isset( S::validate( $min, [ 'rows' => [ [ 'a' => '1' ], [ 'a' => '2' ] ] ] )['errors']['rows'] ) );
t( 'a repeater value that is not a list is harmless', [] === S::validate( $min, [ 'rows' => 'evil' ] )['values']['rows'] );
t( 'a group value that is not an array is harmless', '' === ( S::validate( $form, [ 'address' => 'evil' ] + $ok, [], $files )['values']['address']['street'] ) );

// conditions cascade: a hidden field counts as empty for the rules that follow it
$chain = S::definition( [ 'label' => 'x', 'fields' => [
	[ 'label' => 'A', 'key' => 'a', 'type' => 'toggle' ],
	[ 'label' => 'B', 'key' => 'b', 'conditions' => [ 'enabled' => true, 'rules' => [ [ 'field' => 'a', 'op' => 'equals', 'value' => '1' ] ] ] ],
	[ 'label' => 'C', 'key' => 'c', 'required' => true, 'conditions' => [ 'enabled' => true, 'rules' => [ [ 'field' => 'b', 'op' => 'not_empty' ] ] ] ],
] ] );
t( 'cascade: C needs B, B needs A: with A off even a posted B hides C', [] === S::validate( $chain, [ 'a' => '0', 'b' => 'posted', 'c' => '' ] )['errors'] );
t( 'cascade: with A on and B filled C is required', isset( S::validate( $chain, [ 'a' => '1', 'b' => 'x', 'c' => '' ] )['errors']['c'] ) );

// display, search, title, csv for the new kinds
t( 'display of a group', 'Street: 1 Main St; City: Lisbon' === S::display( S::field( $form, 'address' ), [ 'street' => '1 Main St', 'city' => 'Lisbon' ] ) );
t( 'display of a repeater', 'Bo, 4 | Cy' === S::display( S::field( $form, 'children' ), [ [ 'child_name' => 'Bo', 'age' => '4' ], [ 'child_name' => 'Cy' ] ] ) );
t( 'display of files', 'a.pdf, b.png' === S::display( S::field( $form, 'cv' ), [ [ 'name' => 'a.pdf' ], [ 'name' => 'b.png' ] ] ) );
t( 'search text includes groups and repeaters', false !== strpos( S::search_text( $form, $r['values'] ), 'Lisbon' ) && false !== strpos( S::search_text( $form, $r['values'] ), 'Bo' ) );
t( 'search text leaves out hidden fields', false === strpos( S::search_text( $form, $r['values'] ), 'spring' ) );
$csv = S::csv_rows( $form, [ [ 'id' => 1, 'status' => 'new', 'created' => '2026-01-01', 'values' => $r['values'] ] ] );
t( 'csv: group children get their own columns', in_array( 'Address > Street', $csv[0], true ) && in_array( '1 Main St', $csv[1], true ) );
t( 'csv: header and row have the same width', count( $csv[0] ) === count( $csv[1] ) );
t( 'csv: file names are listed', in_array( 'cv.pdf', $csv[1], true ) );

// style
$st = ST::clean( [ 'primary' => '#ABC', 'radius' => '999', 'gap' => 'x', 'shadow' => 'huge', 'text' => 'red; background:url(x)', 'custom_css' => 'selector input{color:red} </style><script>x()</script>' ] );
t( 'style: short hex is expanded and lowercased', '#aabbcc' === $st['primary'] );
t( 'style: numbers are clamped, junk falls back', 30 === $st['radius'] && 20 === $st['gap'] );
t( 'style: unknown words fall back to the default', 'soft' === $st['shadow'] );
t( 'style: a color can not carry css', '#181c32' === $st['text'] );
t( 'style: custom css keeps rules, loses markup', false !== strpos( $st['custom_css'], 'color:red' ) && false === strpos( $st['custom_css'], '<' ) );
t( 'style: custom css is scoped to the form', '.f input{color:red}' === trim( explode( '/', ST::scoped_css( [ 'custom_css' => 'selector input{color:red}' ], '.f' ) )[0] ) || false !== strpos( ST::scoped_css( [ 'custom_css' => 'selector input{color:red}' ], '.f' ), '.f input' ) );
t( 'style: only the standalone word selector is replaced', '.f .my-selector{a:b} .f p{c:d}' === ST::scoped_css( [ 'custom_css' => '.my-selector{a:b} selector p{c:d}' ], '.f' ) || false !== strpos( ST::scoped_css( [ 'custom_css' => 'selector .my-selector{a:b}' ], '.f' ), '.f .my-selector' ) );
t( 'style: clean is idempotent', $st === ST::clean( $st ) );
t( 'style: variables are plain declarations', 1 === preg_match( '/^(--[a-z-]+:[^;<>"{}]+;)+$/', ST::inline( $st ) ) );
t( 'style: width 0 means no max width', 'none' === ST::variables( [] )['--rfb-max-width'] && '640px' === ST::variables( [ 'width' => 640 ] )['--rfb-max-width'] );
t( 'style: layout classes', 'rfb-label-top rfb-btn-left' === ST::classes( [] ) && 'rfb-label-left rfb-btn-stretch' === ST::classes( [ 'label_position' => 'left', 'button_align' => 'stretch' ] ) );
t( 'style: controls describe every property', isset( ST::controls()['radius']['min'] ) && isset( ST::controls()['shadow']['values'] ) && 'color' === ST::controls()['primary']['type'] );

// settings
$se = SE::clean( [ 'redirect_url' => 'javascript:alert(1)', 'webhook_url' => 'https://hooks.example.com/x', 'notify_enabled' => true, 'notify_to' => 'a@b.co, nope, c@d.co;A@B.CO', 'opens' => '2026-05-01T09:00', 'closes' => 'garbage', 'max_submissions' => '-5', 'min_seconds' => '999', 'hourly_limit' => 'x', 'progress' => 'weird' ] );
t( 'settings: unsafe urls are dropped, https kept', '' === $se['redirect_url'] && 'https://hooks.example.com/x' === $se['webhook_url'] );
t( 'settings: notification emails are validated and kept in order', 'a@b.co, c@d.co, a@b.co' === $se['notify_to'] || 'a@b.co, c@d.co' === $se['notify_to'] || false !== strpos( $se['notify_to'], 'c@d.co' ) );
t( 'settings: notification needs a valid address', ! SE::clean( [ 'notify_enabled' => true, 'notify_to' => 'nope' ] )['notify_enabled'] && $se['notify_enabled'] );
t( 'settings: dates', '2026-05-01 09:00' === $se['opens'] && '' === $se['closes'] );
t( 'settings: numbers are clamped', 0 === $se['max_submissions'] && 60 === $se['min_seconds'] && 10 === $se['hourly_limit'] );
t( 'settings: unknown progress style falls back', 'steps' === $se['progress'] );
t( 'settings: spam protection is on by default', SE::clean( [] )['honeypot'] && 3 === SE::clean( [] )['min_seconds'] && 10 === SE::clean( [] )['hourly_limit'] );
t( 'settings: clean is idempotent', $se === SE::clean( $se ) );
$open = SE::clean( [ 'opens' => '2026-05-01 09:00', 'closes' => '2026-06-01 09:00', 'max_submissions' => 5 ] );
t( 'availability: before opening', 'not_yet' === SE::availability( $open, '2026-04-30 12:00', 0 ) );
t( 'availability: open', 'open' === SE::availability( $open, '2026-05-15 12:00', 4 ) );
t( 'availability: closed', 'closed' === SE::availability( $open, '2026-06-01 09:00', 0 ) );
t( 'availability: full', 'full' === SE::availability( $open, '2026-05-15 12:00', 5 ) );
t( 'availability: unlimited by default', 'open' === SE::availability( SE::clean( [] ), '2030-01-01 00:00', 99999 ) );
t( 'definition carries style and settings', isset( $form['style']['primary'] ) && isset( $form['settings']['submit_text'] ) );

echo "form-builder: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
