<?php
// Pure-logic tests for the Form Builder schema (no WordPress needed): php scripts/test-form-builder.php
define( 'ABSPATH', __DIR__ . '/' );
$root = dirname( __DIR__ );
require $root . '/modules/custom-css/classes/css-sanitizer.php';
require $root . '/modules/form-builder/classes/schema.php';
require $root . '/modules/form-builder/classes/countries.php';
require $root . '/modules/form-builder/classes/conditions.php';
require $root . '/modules/form-builder/classes/style.php';
require $root . '/modules/form-builder/classes/field-style.php';
require $root . '/modules/form-builder/classes/settings.php';
require $root . '/modules/form-builder/classes/money.php';
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

// ---------------------------------------------------------------- name, country, image, signature, descriptions (0.8.0)
use Refraction\Modules\FormBuilder\Classes\Countries as CO;

$rich = S::definition( [
	'label' => 'Intake',
	'fields' => [
		[ 'type' => 'step', 'label' => 'Owner', 'description' => 'About <b>you</b>', 'label_tag' => 'h2' ],
		[ 'type' => 'image', 'label' => 'Logo', 'image_id' => '42', 'image_size' => 'huge', 'image_width' => 500, 'image_align' => 'middle', 'image_alt' => 'Our <i>logo</i>', 'image_link' => 'javascript:alert(1)' ],
		[ 'key' => 'owner', 'label' => 'Owner name', 'type' => 'name', 'required' => true, 'parts' => 'prefix, first, nonsense, last' ],
		[ 'key' => 'home', 'label' => 'Country', 'type' => 'country', 'description' => 'Where you live' ],
		[ 'key' => 'sign', 'label' => 'Owner Signature', 'type' => 'signature', 'required' => true, 'sig_height' => 9999 ],
		[ 'label' => 'Pets', 'type' => 'repeater', 'label_tag' => 'span', 'hide_label' => true, 'children' => [ [ 'label' => 'Pet name', 'key' => 'pet' ] ] ],
		[ 'label' => 'Contact', 'type' => 'group', 'children' => [ [ 'key' => 'who', 'label' => 'Contact name', 'type' => 'name' ] ] ],
	],
] );
t( 'new types are known', isset( S::types()['name'], S::types()['country'], S::types()['image'], S::types()['signature'] ) );
t( 'image is a layout block, name and signature hold values', S::is_layout( 'image' ) && ! S::has_value( 'image' ) && S::has_value( 'name' ) && S::has_value( 'signature' ) );
t( 'name and signature are not table-scalars, country is', ! S::is_scalar_type( 'name' ) && ! S::is_scalar_type( 'signature' ) && S::is_scalar_type( 'country' ) );
t( 'every palette type has an icon and a label', ! array_diff( array_keys( S::types() ), array_keys( S::icons() ) ) && ! array_diff( array_keys( S::icons() ), array_keys( S::types() ) ) );
t( 'palette lists layout, content, basic, choices, advanced', [ 'layout', 'content', 'basic', 'choice', 'advanced' ] === array_keys( S::palette() ) );
t( 'description is plain text', 'About you' === S::field( $rich, 'owner' )['description'] || 'About you' === S::steps( $rich )[0]['step']['description'] );
t( 'step label tag is kept, bad tags fall back by type', 'h2' === S::steps( $rich )[0]['step']['label_tag'] && 'div' === S::field( $rich, 'pets' )['label_tag'] && 'div' === S::field( $rich, 'home' )['label_tag'] );
t( 'a step defaults to h3', 'h3' === S::definition( [ 'label' => 'x', 'fields' => [ [ 'type' => 'step', 'label' => 'S' ] ] ] )['fields'][0]['label_tag'] );
t( 'the label can be hidden on a repeater', S::field( $rich, 'pets' )['hide_label'] );
t( 'image settings are clamped and cleaned', 42 === S::field( $rich, 'image' )['image_id'] && 'medium' === S::field( $rich, 'image' )['image_size'] && 100 === S::field( $rich, 'image' )['image_width'] && 'left' === S::field( $rich, 'image' )['image_align'] && 'Our logo' === S::field( $rich, 'image' )['image_alt'] && '' === S::field( $rich, 'image' )['image_link'] );
t( 'name parts are whitelisted and ordered', [ 'prefix', 'first', 'last' ] === S::field( $rich, 'owner' )['parts'] && [ 'first', 'last' ] === S::field( $rich, 'who' )['parts'] );
t( 'signature height is clamped and it has a default watermark', 400 === S::field( $rich, 'sign' )['sig_height'] && 'Sign here' === S::field( $rich, 'sign' )['placeholder'] );
t( 'rich definition is idempotent', $rich === S::definition( $rich ) );
t( 'name and country can be the record title', 'who' === S::definition( [ 'label' => 'x', 'fields' => [ [ 'key' => 'who', 'label' => 'Who', 'type' => 'name' ] ] ] )['title_field'] );
t( 'steps carry their step field', 'Owner' === S::steps( $rich )[0]['step']['label'] );

$sig = [ [ 'id' => str_repeat( 'a', 32 ), 'name' => 'signature.png', 'size' => 5, 'type' => 'image/png', 'ext' => 'png' ] ];
$ok = [ 'owner' => [ 'prefix' => 'Dr', 'first' => 'Ada', 'last' => 'Byron', 'evil' => 'x' ], 'home' => 'pt', 'pets' => [ [ 'pet' => 'Rex' ] ], 'who' => [] ];
$rr = S::validate( $rich, $ok, [], [ 'sign' => $sig ] );
t( 'rich: valid input passes', [] === $rr['errors'], json_encode( $rr['errors'] ) );
t( 'rich: a name keeps only its enabled parts', [ 'prefix' => 'Dr', 'first' => 'Ada', 'last' => 'Byron' ] === $rr['values']['owner'] );
t( 'rich: a country code is upper-cased and checked', 'PT' === $rr['values']['home'] && isset( S::validate( $rich, [ 'home' => 'ZZ' ] + $ok, [], [ 'sign' => $sig ] )['errors']['home'] ) );
t( 'rich: a required name needs first and last', isset( S::validate( $rich, [ 'owner' => [ 'first' => 'Ada' ] ] + $ok, [], [ 'sign' => $sig ] )['errors']['owner'] ) && ! isset( S::validate( $rich, [ 'owner' => [ 'first' => 'A', 'last' => 'B' ] ] + $ok, [], [ 'sign' => $sig ] )['errors']['owner'] ) );
t( 'rich: a name that is not an array is harmless', isset( S::validate( $rich, [ 'owner' => 'evil' ] + $ok, [], [ 'sign' => $sig ] )['errors']['owner'] ) );
t( 'rich: a required signature must be present, and the post can not supply it', isset( S::validate( $rich, $ok )['errors']['sign'] ) && isset( S::validate( $rich, $ok + [ 'sign' => 'data:image/png;base64,AAAA' ] )['errors']['sign'] ) );
t( 'rich: the signature value comes from the checked files', 'signature.png' === $rr['values']['sign'][0]['name'] );
t( 'rich: an optional name in a group is not required', ! isset( $rr['errors']['contact.who'] ) );
t( 'display of a name, a country and a signature', 'Dr Ada Byron' === S::display( S::field( $rich, 'owner' ), $rr['values']['owner'] ) && 'Portugal' === S::display( S::field( $rich, 'home' ), 'PT' ) && 'Signed' === S::display( S::field( $rich, 'sign' ), $sig ) && '' === S::display( S::field( $rich, 'sign' ), [] ) );
t( 'title and search use the name', 'Dr Ada Byron' === S::title( $rich, $rr['values'] ) && false !== strpos( S::search_text( $rich, $rr['values'] ), 'Portugal' ) && false === strpos( S::search_text( $rich, $rr['values'] ), 'Signed' ) );
$csv2 = S::csv_rows( $rich, [ [ 'id' => 1, 'status' => 'new', 'created' => '2026-01-01', 'values' => $rr['values'] ] ] );
t( 'csv shows the name in one cell and the country name', in_array( 'Dr Ada Byron', $csv2[1], true ) && in_array( 'Portugal', $csv2[1], true ) && count( $csv2[0] ) === count( $csv2[1] ) );
t( 'conditions can look at a name and a country', C::matches( [ 'op' => 'contains', 'value' => 'Ada' ], array_values( $rr['values']['owner'] ) ) );
t( 'countries: codes and names', 'Portugal' === CO::name( 'pt' ) && CO::valid( 'US' ) && ! CO::valid( 'XX' ) && count( CO::all() ) > 240 && count( CO::all() ) === count( array_unique( array_keys( CO::all() ) ) ) );

// ---------------------------------------------------------------- per-field style (0.9.0)
use Refraction\Modules\FormBuilder\Classes\Field_Style as FS;

$fs = FS::clean( [
	'margin_top' => '12', 'margin_left' => '-9999', 'padding_bottom' => 'abc', 'bg' => '#FA0', 'color' => '#111111', 'border_width' => '3',
	'border_color' => 'red; background:url(javascript:x)', 'radius' => '999', 'shadow' => 'huge', 'align' => 'center', 'l_italic' => '1', 'l_weight' => '700',
	'l_family' => 'comic', 'c_bg' => 'transparent', 'ch_bg' => '#00ff00', 'choice_look' => 'buttons', 'evil' => '1', 'b_on_bg' => '#ff7f50',
] );
t( 'field style: numbers are clamped and junk is dropped', 12 === $fs['margin_top'] && -100 === $fs['margin_left'] && ! isset( $fs['padding_bottom'] ) && 200 === $fs['radius'] && 3 === $fs['border_width'] );
t( 'field style: short colors expand, unsafe colors vanish', '#ffaa00' === $fs['bg'] && ! isset( $fs['border_color'] ) && 'transparent' === $fs['c_bg'] );
t( 'field style: unknown words and keys are dropped', ! isset( $fs['shadow'] ) && ! isset( $fs['l_family'] ) && ! isset( $fs['evil'] ) && 'center' === $fs['align'] && '700' === $fs['l_weight'] );
t( 'field style: booleans and the choice look', true === $fs['l_italic'] && 'buttons' === $fs['choice_look'] );
t( 'field style: an empty style stays empty', [] === FS::clean( [] ) && [] === FS::clean( 'x' ) && [] === FS::clean( [ 'bg' => '', 'radius' => null ] ) );
t( 'field style: clean is idempotent', $fs === FS::clean( $fs ) );
t( 'field style: every property belongs to a group that has a selector', ! array_diff( array_unique( array_column( FS::spec(), 0 ) ), array_keys( FS::PARTS ) ) );
t( 'field style: every group applies to some type', count( FS::groups_for( 'text' ) ) >= 5 && in_array( 'choice', FS::groups_for( 'radio' ), true ) && ! in_array( 'choice', FS::groups_for( 'text' ), true ) );
t( 'field style: a divider gets the line group but no label or input hover', in_array( 'control', FS::groups_for( 'divider' ), true ) && ! in_array( 'label', FS::groups_for( 'divider' ), true ) && ! in_array( 'control_hover', FS::groups_for( 'divider' ), true ) );
t( 'field style: every spec int has a range and unit', ! array_filter( FS::spec(), static function ( $s ) { return 'int' === $s[2] && ( $s[3] >= $s[4] || ! in_array( $s[5], [ 'px', 'pct' ], true ) ); } ) );

$decl = FS::declarations( $fs );
t( 'field style: box declarations', false !== strpos( $decl['box'], 'margin-top:12px;' ) && false !== strpos( $decl['box'], 'margin-left:-100px;' ) && false !== strpos( $decl['box'], 'background-color:#ffaa00;' ) && false !== strpos( $decl['box'], 'text-align:center;' ) );
t( 'field style: a border width alone gets a solid style', false !== strpos( $decl['box'], 'border-width:3px;' ) && false !== strpos( $decl['box'], 'border-style:solid;' ) );
t( 'field style: a border style alone gets a width', false !== strpos( FS::declarations( [ 'border_style' => 'dashed' ] )['box'], 'border-width:1px;' ) && false === strpos( FS::declarations( [ 'border_style' => 'none' ] )['box'], 'border-width' ) );
t( 'field style: italic and font weight on the label', 'font-weight:700;font-style:italic;' === $decl['label'] || ( false !== strpos( $decl['label'], 'font-style:italic;' ) && false !== strpos( $decl['label'], 'font-weight:700;' ) ) );
t( 'field style: line height is a unitless number', false !== strpos( FS::declarations( [ 'l_height' => 150 ] )['label'], 'line-height:1.5;' ) );
t( 'field style: shadows and fonts come from fixed tables', false !== strpos( FS::declarations( [ 'c_shadow' => 'soft', 'c_family' => 'mono' ] )['control'], 'box-shadow:0 2px 8px' ) && false !== strpos( FS::declarations( [ 'c_family' => 'serif' ] )['control'], 'Georgia' ) );

$fd = S::definition( [ 'label' => 'x', 'fields' => [
	[ 'key' => 'pet', 'label' => 'Pet', 'type' => 'radio', 'options' => "Dog\nCat", 'style' => [ 'choice_look' => 'buttons', 'b_on_bg' => '#ff7f50', 'margin_bottom' => 20, 'c_bg' => '#eee', 'ch_bg' => '#ddd' ] ],
	[ 'key' => 'plain', 'label' => 'Plain', 'type' => 'text' ],
	[ 'type' => 'step', 'key' => 'stp', 'label' => 'Step', 'style' => [ 'l_color' => '#cc0000' ] ],
] ] );
$css = FS::css( $fd, '#form' );
t( 'field style: only styled fields produce css', false === strpos( $css, 'plain' ) );
t( 'field style: the box rule targets the field by key under the scope', false !== strpos( $css, '#form [data-rfb-key="pet"]{margin-bottom:20px;}' ) );
t( 'field style: hover and checked states use their selectors', false !== strpos( $css, '#form [data-rfb-key="pet"] .rfb-input:hover, #form [data-rfb-key="pet"] .rfb-signature:hover{background-color:#dddddd;}' ) && false !== strpos( $css, '.rfb-check:has(input:checked){background-color:#ff7f50;}' ) );
t( 'field style: a step title is reachable too', false !== strpos( $css, '#form [data-rfb-key="stp"] .rfb-label' ) && false !== strpos( $css, 'color:#cc0000;' ) );
t( 'field style: css contains no markup or quotes except the key selector', 0 === preg_match( '/[<>]/', $css ) && 0 === preg_match( '/url\(|javascript|expression/i', $css ) );
t( 'field style: canvas selectors can replace the parts', false !== strpos( FS::css( $fd, '.rfb-canvas', [ 'box' => '> .rfb-cv-preview-body' ] ), '.rfb-canvas [data-rfb-key="pet"] > .rfb-cv-preview-body{margin-bottom:20px;}' ) );
t( 'field style: the style survives definition cleaning and is idempotent', 'buttons' === S::field( $fd, 'pet' )['style']['choice_look'] && [] === S::field( $fd, 'plain' )['style'] && $fd === S::definition( $fd ) );
t( 'field style: choice class', 'rfb-choice-buttons' === FS::choice_class( S::field( $fd, 'pet' ) ) && '' === FS::choice_class( S::field( $fd, 'plain' ) ) );
t( 'field style: every group list is a plain list (it becomes a JSON array)', ! array_filter( FS::config()['applies'], static function ( $v ) { return is_array( $v ) && array_values( $v ) !== $v; } ) );
t( 'field style: config has everything the designer needs', isset( FS::config()['properties']['bg']['css'], FS::config()['parts']['box'], FS::config()['applies']['choice'] ) && isset( FS::config()['properties']['radius']['min'] ) );

// ---------------------------------------------------------------- shared type styles, states, repeater parts (0.10.0)
$ts = S::definition( [ 'label' => 'x', 'fields' => [
	[ 'key' => 'a', 'label' => 'A', 'type' => 'text' ],
	[ 'key' => 'b', 'label' => 'B', 'type' => 'text', 'style' => [ 'bg' => '#eeeeee' ] ],
	[ 'key' => 'reps', 'label' => 'Reps', 'type' => 'repeater', 'children' => [ [ 'key' => 'c', 'label' => 'C', 'type' => 'text' ] ] ],
], 'type_styles' => [
	'repeater' => [ 'rep_border_width' => 2, 'rep_border_color' => '#ff0000', 'rep_padding_top' => 20, 'row_bg' => '#f0f0f0', 'row_radius' => 8, 'rows_gap' => 24, 'rb_bg' => '#00aa00', 'rbh_bg' => '#008800', 'rr_color' => '#cc0000' ],
	'text' => [ 'c_bg' => '#fafafa', 'cf_border_color' => '#d81b60', 'ch_bg' => '#f0f0ff', 'lh_color' => '#123456', 'lf_color' => '#654321' ],
	'nonsense' => [ 'bg' => '#000000' ],
	'toggle' => [ 'evil' => 'x' ],
	'group' => 'junk',
] ] );
t( 'type styles: known types are kept, cleaned and sparse', array_keys( $ts['type_styles'] ) === [ 'repeater', 'text' ] && 2 === $ts['type_styles']['repeater']['rep_border_width'] && '#fafafa' === $ts['type_styles']['text']['c_bg'] );
t( 'type styles: unknown types, unknown keys and junk are dropped', ! isset( $ts['type_styles']['nonsense'] ) && ! isset( $ts['type_styles']['toggle'] ) && ! isset( $ts['type_styles']['group'] ) );
t( 'type styles: cleaning is idempotent', $ts === S::definition( $ts ) && [] === S::definition( [ 'label' => 'x' ] )['type_styles'] );
$tcss = FS::css( $ts, '#f' );
t( 'type styles: rules target every field of the type under the scope', false !== strpos( $tcss, '#f .rfb-t-text .rfb-input, #f .rfb-t-text .rfb-signature' ) && false !== strpos( $tcss, 'background-color:#fafafa;' ) );
t( 'type styles: they come before a field\'s own style so the field wins', strpos( $tcss, '#f .rfb-t-text' ) < strpos( $tcss, '#f [data-rfb-key="b"]{background-color:#eeeeee;}' ) );
t( 'repeater: the container, the rows, the gap, the add button and the remove button each get their own rule', false !== strpos( $tcss, '#f .rfb-t-repeater .rfb-repeater{padding-top:20px;border-width:2px;border-color:#ff0000;border-style:solid;}' ) || ( false !== strpos( $tcss, '#f .rfb-t-repeater .rfb-repeater{' ) && false !== strpos( $tcss, 'border-style:solid;' ) ) );
t( 'repeater: rows and gap', false !== strpos( $tcss, '#f .rfb-t-repeater .rfb-rep-row{background-color:#f0f0f0;border-radius:8px;}' ) && false !== strpos( $tcss, '#f .rfb-t-repeater .rfb-rows{gap:24px;}' ) );
t( 'repeater: add and remove buttons with hover', false !== strpos( $tcss, '#f .rfb-t-repeater .rfb-repeater > [data-rfb-add]{background-color:#00aa00;}' ) && false !== strpos( $tcss, '[data-rfb-add]:hover{background-color:#008800;}' ) && false !== strpos( $tcss, '.rfb-rep-remove{color:#cc0000;}' ) );
t( 'states: hover and focus look of a text field', false !== strpos( $tcss, '.rfb-t-text .rfb-input:focus, #f .rfb-t-text .rfb-input:focus-visible{border-color:#d81b60;}' ) && false !== strpos( $tcss, '.rfb-t-text .rfb-input:hover, #f .rfb-t-text .rfb-signature:hover{background-color:#f0f0ff;}' ) );
t( 'states: label hover and focus-within continue the field selector', false !== strpos( $tcss, '#f .rfb-t-text:hover .rfb-label' ) && false !== strpos( $tcss, '#f .rfb-t-text:focus-within .rfb-label' ) );
t( 'states: every group belongs to exactly one state and every state group has a selector', ( function () {
	$all = array_merge( ...array_values( FS::STATES ) );

	return count( $all ) === count( array_unique( $all ) ) && ! array_diff( $all, array_keys( FS::PARTS ) ) && ! array_diff( array_keys( FS::PARTS ), $all );
} )() );
t( 'states: config maps each group to its state', 'hover' === FS::config()['states']['control_hover'] && 'focus' === FS::config()['states']['choice_on'] && 'normal' === FS::config()['states']['rep'] && FS::config()['order'][0] === 'box' );
t( 'groups per type: a text field has all three states, a repeater has its parts, a toggle its track', ! array_diff( [ 'control', 'control_hover', 'control_focus' ], FS::groups_for( 'text' ) ) && ! array_diff( [ 'rep', 'row', 'rep_button', 'rep_remove', 'rep_rows', 'rep_hover', 'row_hover' ], FS::groups_for( 'repeater' ) ) && ! array_diff( [ 'toggle', 'toggle_on', 'toggle_knob' ], FS::groups_for( 'toggle' ) ) );
t( 'groups per type: a group has its box groups, plain choices have accent and selected', ! array_diff( [ 'grp', 'grp_hover', 'grp_focus' ], FS::groups_for( 'group' ) ) && ! array_diff( [ 'plain', 'plain_accent', 'plain_on', 'plain_hover' ], FS::groups_for( 'radio' ) ) && ! in_array( 'rep', FS::groups_for( 'text' ), true ) );
t( 'groups per type: nothing else leaks (a divider has no focus or label groups)', ! in_array( 'control_focus', FS::groups_for( 'divider' ), true ) && ! in_array( 'label', FS::groups_for( 'divider' ), true ) );
t( 'border completion works for the repeater parts', false !== strpos( FS::declarations( [ 'row_border_width' => 3 ] )['row'], 'border-style:solid;' ) && false !== strpos( FS::declarations( [ 'rep_border_style' => 'dashed' ] )['rep'], 'border-width:1px;' ) );
t( 'toggle and plain choices write the properties they should', false !== strpos( FS::declarations( [ 'pa_accent' => '#ff00ff' ] )['plain_accent'], 'accent-color:#ff00ff;' ) && false !== strpos( FS::declarations( [ 'tg_on' => '#00ff00' ] )['toggle_on'], 'background-color:#00ff00;' ) );
t( 'every int in the new properties has a range', ! array_filter( FS::spec(), static function ( $s ) { return 'int' === $s[2] && $s[3] >= $s[4]; } ) );

// ---- 0.11.0: Accordion, Tabs, choice cards and the Amount format ----
$MO = 'Refraction\Modules\FormBuilder\Classes\Money';
$layout = S::definition( [ 'label' => 'Orders', 'fields' => [
	[ 'label' => 'Top', 'type' => 'text', 'key' => 'top' ],
	[ 'type' => 'accordion', 'label' => 'More', 'key' => 'more', 'multiple' => 1, 'children' => [
		[ 'type' => 'panel', 'label' => 'Contact', 'key' => 'p1', 'open' => 1, 'children' => [
			[ 'label' => 'Email', 'type' => 'email', 'key' => 'mail', 'required' => 1 ],
			[ 'type' => 'group', 'label' => 'Address', 'key' => 'addr', 'children' => [ [ 'label' => 'Street', 'type' => 'text', 'key' => 'street' ] ] ],
			[ 'type' => 'tabs', 'label' => 'Nested tabs', 'key' => 'nt' ],
			[ 'type' => 'step', 'label' => 'Nope', 'key' => 'nope' ],
		] ],
		[ 'label' => 'Stray text', 'type' => 'text', 'key' => 'stray' ],
		[ 'type' => 'panel', 'label' => 'Money', 'key' => 'p2', 'children' => [
			[ 'label' => 'Price', 'type' => 'currency', 'key' => 'price', 'per' => 'month', 'min' => 5 ],
		] ],
	] ],
	[ 'type' => 'tabs', 'label' => 'Tabs', 'key' => 'tb', 'tab_look' => 'pills', 'children' => [
		[ 'type' => 'panel', 'label' => 'One', 'key' => 'tab1', 'children' => [ [ 'label' => 'Note', 'type' => 'text', 'key' => 'note', 'conditions' => [ 'enabled' => 1, 'action' => 'show', 'match' => 'all', 'rules' => [ [ 'field' => 'top', 'op' => 'equals', 'value' => 'go' ] ] ] ] ] ],
	] ],
	[ 'type' => 'choice_set', 'label' => 'Plan', 'key' => 'plan', 'required' => 1, 'default' => 'basic', 'children' => [
		[ 'type' => 'group', 'label' => 'Basic', 'key' => 'basic', 'card_badge' => 'Monthly', 'card_price' => '20', 'per' => 'month', 'required' => 1, 'children' => [
			[ 'label' => 'Visits', 'type' => 'text', 'key' => 'visits', 'required' => 1, 'default' => 'Unlimited' ],
			[ 'label' => 'File', 'type' => 'file', 'key' => 'cardfile' ],
			[ 'type' => 'group', 'label' => 'Deep', 'key' => 'deep' ],
		] ],
		[ 'type' => 'repeater', 'label' => 'Pro', 'key' => 'pro', 'card_note' => 'Price on request', 'children' => [ [ 'label' => 'Seat', 'type' => 'text', 'key' => 'seat' ] ] ],
		[ 'label' => 'Loose text', 'type' => 'text', 'key' => 'loose' ],
	] ],
	[ 'type' => 'panel', 'label' => 'Top panel', 'key' => 'toppanel' ],
] ] );
$keys = array_column( S::walk( $layout['fields'] ), 'key' );
t( 'layout: accordion, tabs and choice cards are palette types, a panel is not', isset( S::types()['accordion'], S::types()['tabs'], S::types()['choice_set'], S::types()['panel'] ) && ! isset( S::palette()['layout']['types']['panel'] ) );
t( 'layout: transparent types never store a value', ! S::has_value( 'accordion' ) && ! S::has_value( 'tabs' ) && ! S::has_value( 'panel' ) && S::has_value( 'choice_set' ) && S::is_transparent( 'panel' ) && ! S::is_scalar_type( 'choice_set' ) );
t( 'layout: a panel can only sit in a host and a host only holds panels', ! in_array( 'stray', $keys, true ) && ! in_array( 'toppanel', $keys, true ) && in_array( 'p1', $keys, true ) );
t( 'layout: a group, a repeater or a choice set may live in a panel but no step or second host', in_array( 'addr', $keys, true ) && ! in_array( 'nt', $keys, true ) && ! in_array( 'nope', $keys, true ) );
t( 'layout: value_fields reaches the fields inside Accordion and Tabs', [ 'top', 'mail', 'addr', 'price', 'note', 'plan' ] === array_column( S::value_fields( $layout ), 'key' ) );
t( 'layout: the title field can be chosen from fields inside a panel', in_array( 'top', [ $layout['title_field'] ], true ) );
t( 'layout: panel options are cleaned', $layout['fields'][1]['multiple'] && $layout['fields'][1]['children'][0]['open'] && ! $layout['fields'][1]['children'][1]['open'] && 'pills' === $layout['fields'][2]['tab_look'] && 'line' === S::definition( [ 'label' => 'x', 'fields' => [ [ 'type' => 'tabs', 'label' => 'T', 'tab_look' => 'zig' ] ] ] )['fields'][0]['tab_look'] );
$v = S::validate( $layout, [ 'top' => 'go', 'mail' => 'a@b.co', 'addr' => [ 'street' => 'Main' ], 'price' => '1,250.5', 'note' => 'hi', 'plan' => 'basic' ] );
t( 'layout: fields in panels validate and store at the scope level', [] === $v['errors'] && 'a@b.co' === $v['values']['mail'] && 'Main' === $v['values']['addr']['street'] && '1250.50' === $v['values']['price'] && 'hi' === $v['values']['note'] && ! isset( $v['values']['more'], $v['values']['p1'] ) );
$v = S::validate( $layout, [ 'top' => 'go', 'plan' => 'basic' ] );
t( 'layout: a required field inside a panel is still required', 'This field is required.' === ( $v['errors']['mail'] ?? '' ) );
$v = S::validate( $layout, [ 'top' => 'x', 'mail' => 'a@b.co', 'note' => 'sneaky', 'plan' => 'basic' ] );
t( 'layout: a condition on a field inside a panel works', ! isset( $v['values']['note'] ) );
$hide = $layout;
$hide['fields'][1]['children'][0]['conditions'] = [ 'enabled' => 1, 'action' => 'show', 'match' => 'all', 'rules' => [ [ 'field' => 'top', 'op' => 'equals', 'value' => 'open' ] ] ];
$v = S::validate( $hide, [ 'top' => 'closed', 'plan' => 'basic', 'mail' => '', 'price' => '10' ] );
t( 'layout: a hidden panel hides every field inside it (nothing required, nothing stored)', ! isset( $v['errors']['mail'] ) && ! isset( $v['values']['mail'] ) && ! isset( $v['values']['addr'] ) && '10.00' === $v['values']['price'] );
t( 'layout: csv columns and search text include fields inside panels', in_array( 'Email', array_column( S::csv_columns( $layout ), 'label' ), true ) && false !== strpos( S::search_text( $layout, [ 'mail' => 'a@b.co' ] ), 'a@b.co' ) );

// Choice cards.
$set = $layout['fields'][3];
t( 'cards: a set keeps only Group and Repeater children, cards keep value fields only', 'plan' === $set['key'] && [ 'basic', 'pro' ] === array_column( $set['children'], 'key' ) && [ 'visits' ] === array_column( $set['children'][0]['children'], 'key' ) );
t( 'cards: the card options are cleaned on cards only', 'Monthly' === $set['children'][0]['card_badge'] && 20.0 === $set['children'][0]['card_price'] && 'month' === $set['children'][0]['per'] && 'Price on request' === $set['children'][1]['card_note'] && '' === $layout['fields'][0]['card_badge'] && null === $layout['fields'][0]['card_price'] );
t( 'cards: fields inside a card can never be required', ! $set['children'][0]['children'][0]['required'] && ! $set['children'][0]['required'] );
$v = S::validate( $layout, [ 'mail' => 'a@b.co', 'plan' => 'basic', 'visits' => 'hacked' ] );
t( 'cards: the picked card is stored with its title and price taken from the form, not the post', [] === $v['errors'] && [ [ 'key' => 'basic', 'title' => 'Basic', 'price' => 20.0, 'per' => 'month' ] ] === $v['values']['plan'] && ! isset( $v['values']['visits'] ) );
$v = S::validate( $layout, [ 'mail' => 'a@b.co', 'plan' => 'ghost' ] );
t( 'cards: a card that does not exist can not be picked', 'Choose one of the listed options.' === ( $v['errors']['plan'] ?? '' ) );
$v = S::validate( $layout, [ 'mail' => 'a@b.co' ] );
t( 'cards: a required set needs a pick', 'This field is required.' === ( $v['errors']['plan'] ?? '' ) );
$v = S::validate( $layout, [ 'mail' => 'a@b.co', 'plan' => [ 'basic', 'pro' ] ] );
t( 'cards: one card only unless the set allows several', 1 === count( $v['values']['plan'] ) );
$many = $layout;
$many['fields'][3]['multiple'] = true;
$v = S::validate( $many, [ 'mail' => 'a@b.co', 'plan' => [ 'pro', 'basic', 'basic', 'ghost' ] ] );
t( 'cards: several cards when allowed, in form order, each once', [ 'basic', 'pro' ] === array_column( $v['values']['plan'], 'key' ) );
$cond = $layout;
$cond['fields'][3]['children'][1]['conditions'] = [ 'enabled' => 1, 'action' => 'show', 'match' => 'all', 'rules' => [ [ 'field' => 'top', 'op' => 'equals', 'value' => 'vip' ] ] ];
$v = S::validate( $cond, [ 'mail' => 'a@b.co', 'top' => 'x', 'plan' => 'pro' ] );
t( 'cards: a card hidden by its condition can not be picked', isset( $v['errors']['plan'] ) );
t( 'cards: display shows the picked titles', 'Basic' === S::display( $set, [ [ 'key' => 'basic', 'title' => 'Basic', 'price' => 20.0, 'per' => 'month' ] ] ) );

// Amount and the currency format.
$cfg = $MO::config( [] );
t( 'money: default format is $ before, comma thousands, point decimals', '$' === $cfg['currency_symbol'] && 'before' === $cfg['currency_position'] && ',' === $cfg['thousands_sep'] && '.' === $cfg['decimal_sep'] && 2 === $cfg['decimals'] );
t( 'money: format writes thousands and decimals', '1,200.00' === $MO::format( 1200, $cfg ) && '350,329.45' === $MO::format( '350329.45', $cfg ) && '1,200' === $MO::format( 1200, $cfg, 0 ) );
t( 'money: parse reads what is typed', '1200' === $MO::parse( '1,200', $cfg ) && '350329.45' === $MO::parse( '350,329.45', $cfg ) && '1250.5' === $MO::parse( '$1,250.5', $cfg ) && '12' === $MO::parse( ' 12 ', $cfg ) && null === $MO::parse( '12abc', $cfg ) && null === $MO::parse( '1.2.3', $cfg ) && null === $MO::parse( '', $cfg ) && null === $MO::parse( '--5', $cfg ) );
$eu = $MO::config( [ 'currency_symbol' => '€', 'currency_position' => 'after', 'thousands_sep' => '.', 'decimal_sep' => ',', 'decimals' => 2 ] );
t( 'money: European format both ways', '1.234,50' === $MO::format( 1234.5, $eu ) && '1234.50' === $MO::parse( '1.234,50', $eu ) && '1234.5' === $MO::parse( '1234,5', $eu ) && '1.234,50 €' === $MO::display( 1234.5, $eu ) );
t( 'money: display adds the symbol and the period', '$20.00 / month' === $MO::display( 20, $cfg, 'month' ) && '$20.00 / seat' === $MO::display( 20, $cfg, 'custom', 'seat' ) && '$20.00' === $MO::display( 20, $cfg, 'custom', '' ) );
$bad = $MO::config( [ 'thousands_sep' => '.', 'decimal_sep' => '.', 'decimals' => 99, 'currency_position' => 'up' ] );
t( 'money: separators can not clash, decimals and position are clamped', $bad['thousands_sep'] !== $bad['decimal_sep'] && 4 === $bad['decimals'] && 'before' === $bad['currency_position'] );
t( 'money: the settings carry the format and clean it', '€' === S::definition( [ 'label' => 'x', 'settings' => [ 'currency_symbol' => '€', 'thousands_sep' => ' ' ] ] )['settings']['currency_symbol'] && ' ' === S::definition( [ 'label' => 'x', 'settings' => [ 'thousands_sep' => ' ' ] ] )['settings']['thousands_sep'] && '$' === S::definition( [ 'label' => 'x' ] )['settings']['currency_symbol'] );
$priced = S::definition( [ 'label' => 'x', 'settings' => [ 'thousands_sep' => '.', 'decimal_sep' => ',' ], 'fields' => [ [ 'label' => 'Fee', 'type' => 'currency', 'key' => 'fee', 'min' => 10, 'per' => 'week' ], [ 'label' => 'Name', 'type' => 'text', 'key' => 'nm', 'per' => 'week' ] ] ] );
$v = S::validate( $priced, [ 'fee' => '1.250,5' ] );
t( 'amount: validation understands the collection\'s separators and stores a plain decimal', '1250.50' === $v['values']['fee'] && [] === $v['errors'] );
$v = S::validate( $priced, [ 'fee' => '5' ] );
t( 'amount: the lowest allowed value still applies', isset( $v['errors']['fee'] ) );
$v = S::validate( $priced, [ 'fee' => 'abc' ] );
t( 'amount: letters are rejected', 'Enter a number.' === ( $v['errors']['fee'] ?? '' ) );
t( 'amount: the period is kept on Amount only, from a fixed list', 'week' === $priced['fields'][0]['per'] && '' === $priced['fields'][1]['per'] && '' === S::clean_field( [ 'label' => 'F', 'type' => 'currency', 'per' => 'decade' ] )['per'] );
S::validate( S::definition( [ 'label' => 'x' ] ), [] );
$v = S::validate( S::definition( [ 'label' => 'x', 'fields' => [ [ 'label' => 'P', 'type' => 'currency', 'key' => 'p' ] ] ] ), [ 'p' => '1,234.5' ] );
t( 'amount: the default format still reads 1,234.5 (older forms)', '1234.50' === $v['values']['p'] );

echo "form-builder: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
