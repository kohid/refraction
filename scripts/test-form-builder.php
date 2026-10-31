<?php
// Pure-logic tests for the Form Builder schema (no WordPress needed): php scripts/test-form-builder.php
define( 'ABSPATH', __DIR__ . '/' );
$root = dirname( __DIR__ );
require $root . '/modules/form-builder/classes/schema.php';
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

echo "form-builder: $pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
