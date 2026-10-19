<?php
/**
 * Standalone test for the dynamic tag helpers (no WordPress).
 *
 * Run: php scripts/test-dynamic-tags.php
 * Covers Contact_Url (mailto/tel/sms/whatsapp/skype) and the loop stack of Context.
 */

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	spl_autoload_register( function ( $class ) {
		$prefix = 'Refraction\\Modules\\DynamicTags\\';

		if ( 0 !== strpos( $class, $prefix ) ) {
			return;
		}

		$parts = array_map( fn( $p ) => str_replace( '_', '-', strtolower( $p ) ), explode( '\\', substr( $class, strlen( $prefix ) ) ) );
		$file = dirname( __DIR__ ) . '/modules/dynamic-tags/' . implode( '/', $parts ) . '.php';

		if ( is_file( $file ) ) {
			require_once $file;
		}
	} );
}

namespace Refraction\Tests\DynamicTags {

	use Refraction\Modules\DynamicTags\Classes\Contact_Url;
	use Refraction\Modules\DynamicTags\Classes\Context;
	use Refraction\Modules\DynamicTags\Classes\Value;

	$fail = 0;
	$total = 0;

	function check( string $name, $actual, $expected ): void {
		global $fail, $total;
		++$total;

		if ( $actual === $expected ) {
			echo "ok    $name\n";
			return;
		}

		++$fail;
		echo "FAIL  $name\n      expected: " . json_encode( $expected ) . "\n      actual:   " . json_encode( $actual ) . "\n";
	}

	check( 'email', Contact_Url::build( 'email', [ 'to' => 'a@example.com' ] ), 'mailto:a@example.com' );
	check( 'email with subject and body', Contact_Url::build( 'email', [ 'to' => 'a@example.com', 'subject' => 'Hi there', 'body' => "A&B\nC" ] ), 'mailto:a@example.com?subject=Hi%20there&body=A%26B%0AC' );
	check( 'invalid email is empty', Contact_Url::build( 'email', [ 'to' => 'not an email' ] ), '' );
	check( 'email header injection is empty', Contact_Url::build( 'email', [ 'to' => "a@example.com\r\nBcc: x@y.z" ] ), '' );
	check( 'tel keeps plus and digits', Contact_Url::build( 'tel', [ 'number' => '+1 (555) 010-2030' ] ), 'tel:+15550102030' );
	check( 'tel with letters only is empty', Contact_Url::build( 'tel', [ 'number' => 'call me' ] ), '' );
	check( 'tel plus only at the start', Contact_Url::build( 'tel', [ 'number' => '1+2' ] ), 'tel:12' );
	check( 'sms', Contact_Url::build( 'sms', [ 'number' => '+44 20 7946 0958', 'body' => 'Hello you' ] ), 'sms:+442079460958?body=Hello%20you' );
	check( 'sms without body', Contact_Url::build( 'sms', [ 'number' => '555' ] ), 'sms:555' );
	check( 'whatsapp drops plus and spaces', Contact_Url::build( 'whatsapp', [ 'number' => '+44 20 7946 0958', 'body' => 'Hi' ] ), 'https://wa.me/442079460958?text=Hi' );
	check( 'whatsapp without number is empty', Contact_Url::build( 'whatsapp', [ 'number' => '' ] ), '' );
	check( 'skype call', Contact_Url::build( 'skype', [ 'username' => 'live:john.doe', 'action' => 'call' ] ), 'skype:live:john.doe?call' );
	check( 'skype chat default', Contact_Url::build( 'skype', [ 'username' => 'john.doe' ] ), 'skype:john.doe?chat' );
	check( 'skype bad action falls back to chat', Contact_Url::build( 'skype', [ 'username' => 'john', 'action' => 'x"><script>' ] ), 'skype:john?chat' );
	check( 'skype username with markup is empty', Contact_Url::build( 'skype', [ 'username' => 'a b<c>' ] ), '' );
	check( 'unknown type is empty', Contact_Url::build( 'javascript', [ 'number' => '1' ] ), '' );

	check( 'no loop item by default', Context::loop_post_id(), 0 );
	Context::push_post( 7 );
	check( 'loop item after push', Context::loop_post_id(), 7 );
	Context::push_post( 9 );
	check( 'nested loop item', Context::loop_post_id(), 9 );
	Context::pop_post();
	check( 'back to the outer item', Context::loop_post_id(), 7 );
	Context::pop_post();
	check( 'empty again', Context::loop_post_id(), 0 );
	Context::pop_post();
	check( 'popping an empty stack is harmless', Context::loop_post_id(), 0 );

	// --- Value helpers -------------------------------------------------------------------------------------
	check( 'plain meta key allowed', Value::allowed_key( 'price' ), true );
	check( 'key with dots and dashes allowed', Value::allowed_key( 'my-field.v2' ), true );
	check( 'underscore (protected) key blocked', Value::allowed_key( '_edit_lock' ), false );
	check( 'empty key blocked', Value::allowed_key( '' ), false );
	check( 'key with markup blocked', Value::allowed_key( 'a<b>' ), false );
	check( 'user meta description allowed', Value::allowed_user_key( 'description' ), true );
	check( 'user meta password blocked', Value::allowed_user_key( 'user_pass' ), false );
	check( 'user meta session tokens blocked', Value::allowed_user_key( 'session_tokens' ), false );
	check( 'user meta capabilities blocked', Value::allowed_user_key( 'wp_capabilities' ), false );
	check( 'user meta activation key blocked', Value::allowed_user_key( 'user_activation_key' ), false );
	check( 'user meta protected blocked', Value::allowed_user_key( '_secret' ), false );

	check( 'text of a string', Value::to_text( 'Hello' ), 'Hello' );
	check( 'text of a number', Value::to_text( 12.5 ), '12.5' );
	check( 'text of true', Value::to_text( true ), '1' );
	check( 'text of false', Value::to_text( false ), '' );
	check( 'text of null', Value::to_text( null ), '' );
	check( 'text of a list', Value::to_text( [ 'a', 'b', 3 ] ), 'a, b, 3' );
	check( 'text of nested array is empty', Value::to_text( [ [ 'x' ] ] ), '' );
	check( 'text of an object is empty', Value::to_text( new \stdClass() ), '' );

	check( 'image from id', Value::to_image( 15 ), [ 'id' => 15, 'url' => '' ] );
	check( 'image from numeric string', Value::to_image( '15' ), [ 'id' => 15, 'url' => '' ] );
	check( 'image from url', Value::to_image( 'https://example.com/a.png' ), [ 'id' => 0, 'url' => 'https://example.com/a.png' ] );
	check( 'image from acf array', Value::to_image( [ 'ID' => 4, 'url' => 'https://example.com/b.png' ] ), [ 'id' => 4, 'url' => 'https://example.com/b.png' ] );
	check( 'image from lowercase id array', Value::to_image( [ 'id' => 4 ] ), [ 'id' => 4, 'url' => '' ] );
	check( 'image from junk', Value::to_image( 'javascript:alert(1)' ), null );
	check( 'image from empty', Value::to_image( '' ), null );
	check( 'gallery from ids list', Value::to_gallery( [ 3, '4', 'x' ] ), [ [ 'id' => 3, 'url' => '' ], [ 'id' => 4, 'url' => '' ] ] );
	check( 'gallery from comma string', Value::to_gallery( '3, 4' ), [ [ 'id' => 3, 'url' => '' ], [ 'id' => 4, 'url' => '' ] ] );
	check( 'gallery from acf arrays', Value::to_gallery( [ [ 'ID' => 3, 'url' => 'https://e.com/1.jpg' ] ] ), [ [ 'id' => 3, 'url' => 'https://e.com/1.jpg' ] ] );

	check( 'color hex', Value::to_color( '#1a2B3c' ), '#1a2B3c' );
	check( 'color short hex', Value::to_color( '#fff' ), '#fff' );
	check( 'color rgba', Value::to_color( 'rgba(10, 20, 30, 0.5)' ), 'rgba(10, 20, 30, 0.5)' );
	check( 'color rejects css injection', Value::to_color( 'red; background:url(x)' ), '' );
	check( 'color rejects named colors', Value::to_color( 'red' ), '' );

	check( 'safe param name', Value::allowed_param( 'utm_source' ), true );
	check( 'param name with brackets blocked', Value::allowed_param( 'a[b]' ), false );
	check( 'empty param blocked', Value::allowed_param( '' ), false );

	check( 'timestamp from ACF Ymd', Value::to_timestamp( '20250131' ), gmmktime( 0, 0, 0, 1, 31, 2025 ) );
	check( 'timestamp from ISO date', Value::to_timestamp( '2025-02-03' ), gmmktime( 0, 0, 0, 2, 3, 2025 ) );
	check( 'timestamp from ISO date time', Value::to_timestamp( '2025-02-03 10:30:00' ), gmmktime( 10, 30, 0, 2, 3, 2025 ) );
	check( 'timestamp from unix number', Value::to_timestamp( 1700000000 ), 1700000000 );
	check( 'timestamp from junk', Value::to_timestamp( 'someday' ), null );
	check( 'timestamp from empty', Value::to_timestamp( '' ), null );

	echo "\n$total checks, $fail failed\n";
	exit( $fail ? 1 : 0 );
}
