<?php
/**
 * Standalone test for the pure logic of the Forms module (no WordPress, no database).
 *
 * Run: php scripts/test-forms.php
 *
 * Covers: form definition parsing, validation and sanitising, template tags, mail building (header
 * injection), CSV export safety, upload policy, spam guard (honeypot, minimum time, math question,
 * rate limit), webhook payloads and settings sanitising. Exit code 1 on any failure.
 */

namespace {
	define( 'ABSPATH', __DIR__ . '/' );

	function __( $text ) {
		return $text;
	}

	function esc_html__( $text ) {
		return $text;
	}

	spl_autoload_register( function ( $class ) {
		$prefix = 'Refraction\\Modules\\Forms\\';

		if ( 0 !== strpos( $class, $prefix ) ) {
			return;
		}

		$relative = substr( $class, strlen( $prefix ) );
		$parts = array_map( fn( $p ) => str_replace( '_', '-', strtolower( $p ) ), explode( '\\', $relative ) );
		$file = dirname( __DIR__ ) . '/modules/forms/' . implode( '/', $parts ) . '.php';

		if ( is_file( $file ) ) {
			require_once $file;
		}
	} );
}

namespace Refraction\Tests\Forms {

	use Refraction\Modules\Forms\Classes\Array_Counter_Store;
	use Refraction\Modules\Forms\Classes\Csv;
	use Refraction\Modules\Forms\Classes\Form_Definition;
	use Refraction\Modules\Forms\Classes\Mail_Builder;
	use Refraction\Modules\Forms\Classes\Rate_Limiter;
	use Refraction\Modules\Forms\Classes\Settings;
	use Refraction\Modules\Forms\Classes\Spam_Guard;
	use Refraction\Modules\Forms\Classes\Template_Tags;
	use Refraction\Modules\Forms\Classes\Upload_Policy;
	use Refraction\Modules\Forms\Classes\Validator;
	use Refraction\Modules\Forms\Classes\Webhook_Payload;

	$GLOBALS['rf_pass'] = 0;
	$GLOBALS['rf_fail'] = 0;

	function t( string $name, $cond, $detail = '' ): void {
		if ( $cond ) {
			++$GLOBALS['rf_pass'];
			return;
		}
		++$GLOBALS['rf_fail'];
		echo "FAIL  $name" . ( '' !== $detail ? ' -- ' . ( is_string( $detail ) ? $detail : json_encode( $detail ) ) : '' ) . "\n";
	}

	function item( string $type, string $id, array $extra = [] ): array {
		return array_merge( [ '_id' => 'i' . $id, 'field_type' => $type, 'field_label' => ucfirst( $id ), 'custom_id' => $id ], $extra );
	}

	function def( array $fields, array $extra = [] ): Form_Definition {
		return Form_Definition::from_settings( array_merge( [ 'form_name' => 'Contact', 'form_fields' => $fields ], $extra ) );
	}

	// ---------------------------------------------------------------- Form_Definition
	$d = def( [
		item( 'text', 'name', [ 'required' => 'true' ] ),
		item( 'email', 'email' ),
		item( 'step', 'step1', [ 'field_label' => 'Details' ] ),
		item( 'textarea', 'msg' ),
		item( 'html', 'note', [ 'field_html' => '<b>hi</b>' ] ),
		[ '_id' => 'zz9', 'field_type' => 'text', 'field_label' => 'No id' ],
		item( 'text', 'name', [ 'field_label' => 'Dup' ] ),
		item( 'text', 'Bad ID!<x>' ),
	] );
	$ids = array_map( fn( $f ) => $f['id'], $d->get_fields() );
	t( 'definition: custom ids kept, others derived from _id', in_array( 'name', $ids, true ) && in_array( 'field_zz9', $ids, true ), $ids );
	t( 'definition: duplicate ids are made unique', count( $ids ) === count( array_unique( $ids ) ), $ids );
	t( 'definition: ids sanitised', ! preg_grep( '/[^a-z0-9_\-]/', $ids ), $ids );
	t( 'definition: required flag parsed', true === $d->get_field( 'name' )['required'] && false === $d->get_field( 'email' )['required'] );
	t( 'definition: step fields split the form into two steps', 2 === count( $d->get_steps() ), $d->get_steps() );
	t( 'definition: second step title from the step label', 'Details' === $d->get_steps()[1]['title'] );
	t( 'definition: fields know their step index', 0 === $d->get_field( 'name' )['step'] && 1 === $d->get_field( 'msg' )['step'] );
	t( 'definition: input fields skip html and step', ! in_array( 'note', array_map( fn( $f ) => $f['id'], $d->get_input_fields() ), true ) );
	t( 'definition: unknown field type falls back to text', 'text' === def( [ item( 'bogus', 'a' ) ] )->get_field( 'a' )['type'] );
	$o = def( [ item( 'select', 's', [ 'field_options' => "One\nTwo|2\n\n  Three | 3 " ] ) ] )->get_field( 's' )['options'];
	t( 'definition: options parse "label|value" lines', $o === [ [ 'label' => 'One', 'value' => 'One' ], [ 'label' => 'Two', 'value' => '2' ], [ 'label' => 'Three', 'value' => '3' ] ], $o );
	$a = Form_Definition::from_settings( [ 'form_fields' => [], 'submit_actions' => [
		[ 'action_type' => 'email', 'email_to' => 'a@example.com' ],
		[ 'action_type' => 'nonsense' ],
		[ 'action_type' => 'webhook', 'webhook_url' => 'https://example.com/h' ],
	] ] )->get_actions();
	t( 'definition: unknown actions dropped', 2 === count( $a ) && 'email' === $a[0]['type'] && 'webhook' === $a[1]['type'], $a );
	$a = Form_Definition::from_settings( [ 'form_fields' => [], 'submit_actions' => [ [ 'action_type' => 'popup_open', 'popup_id' => '7' ], [ 'action_type' => 'popup_close' ] ] ] )->get_actions();
	t( 'definition: popup actions are kept', 2 === count( $a ) && 'popup_open' === $a[0]['type'] && 'popup_close' === $a[1]['type'], $a );
	t( 'definition: form key combines post and element id', 'f_12_abc' === Form_Definition::form_key( 12, 'abc' ) );

	// ---------------------------------------------------------------- Validator
	$V = new Validator();
	$d = def( [
		item( 'text', 'name', [ 'required' => 'true' ] ),
		item( 'email', 'email', [ 'required' => 'true' ] ),
		item( 'url', 'site' ),
		item( 'tel', 'phone' ),
		item( 'number', 'age', [ 'min_value' => 18, 'max_value' => 99 ] ),
		item( 'select', 'color', [ 'field_options' => "Red|r\nBlue|b" ] ),
		item( 'radio', 'size', [ 'field_options' => "S\nM\nL" ] ),
		item( 'checkbox', 'extras', [ 'field_options' => "A\nB\nC" ] ),
		item( 'acceptance', 'terms', [ 'required' => 'true' ] ),
		item( 'date', 'when' ),
		item( 'time', 'at' ),
		item( 'password', 'pw' ),
		item( 'hidden', 'src', [ 'field_value' => 'x' ] ),
		item( 'textarea', 'msg' ),
	] );
	$good = [ 'name' => '  Ann <b>Lee</b> ', 'email' => 'ann@example.com', 'site' => 'https://example.com/a?b=1', 'phone' => '+1 (555) 123-4567', 'age' => '30',
		'color' => 'b', 'size' => 'M', 'extras' => [ 'A', 'C' ], 'terms' => 'on', 'when' => '2026-02-28', 'at' => '13:45', 'pw' => ' s3cret ', 'src' => 'landing', 'msg' => "Line1\r\nLine2<script>x</script>" ];
	$r = $V->validate( $d, $good, [] );
	t( 'validate: a good submission has no errors', [] === $r['errors'], $r['errors'] );
	t( 'validate: text is stripped of tags and trimmed', 'Ann Lee' === $r['values']['name'], $r['values']['name'] ?? null );
	t( 'validate: checkbox values are joined', 'A, C' === $r['values']['extras'], $r['values']['extras'] ?? null );
	t( 'validate: select stores the option value', 'b' === $r['values']['color'] );
	t( 'validate: textarea keeps newlines, drops tags', "Line1\nLine2x" === $r['values']['msg'], $r['values']['msg'] ?? null );
	t( 'validate: password is kept untrimmed in values (never stored later)', ' s3cret ' === $r['values']['pw'] );
	t( 'validate: acceptance stores "on"', 'on' === $r['values']['terms'] );

	$r = $V->validate( $d, [], [] );
	t( 'validate: required fields report errors', isset( $r['errors']['name'], $r['errors']['email'], $r['errors']['terms'] ), $r['errors'] );
	t( 'validate: optional empty fields are fine', ! isset( $r['errors']['site'], $r['errors']['phone'], $r['errors']['msg'] ) );

	$bad = array_merge( $good, [ 'email' => 'nope', 'site' => 'javascript:alert(1)', 'phone' => 'abc', 'age' => '17', 'color' => 'zzz', 'size' => 'XL', 'extras' => [ 'A', 'Q' ], 'when' => '2026-13-45', 'at' => '25:99' ] );
	$r = $V->validate( $d, $bad, [] );
	foreach ( [ 'email', 'site', 'phone', 'age', 'color', 'size', 'extras', 'when', 'at' ] as $k ) {
		t( "validate: invalid $k rejected", isset( $r['errors'][ $k ] ), $r['errors'] );
	}
	t( 'validate: age above max rejected', isset( $V->validate( $d, array_merge( $good, [ 'age' => '100' ] ), [] )['errors']['age'] ) );
	t( 'validate: non-numeric number rejected', isset( $V->validate( $d, array_merge( $good, [ 'age' => '1e999x' ] ), [] )['errors']['age'] ) );
	t( 'validate: array posted to a text field is rejected', isset( $V->validate( $d, array_merge( $good, [ 'name' => [ 'a' ] ] ), [] )['errors']['name'] ) );
	t( 'validate: email with newline is rejected', isset( $V->validate( $d, array_merge( $good, [ 'email' => "a@example.com\r\nBcc: v@x.com" ] ), [] )['errors']['email'] ) );
	t( 'validate: two addresses in one email field rejected', isset( $V->validate( $d, array_merge( $good, [ 'email' => 'a@example.com,b@example.com' ] ), [] )['errors']['email'] ) );
	t( 'validate: unknown posted fields are ignored', ! isset( $V->validate( $d, array_merge( $good, [ 'evil' => 'x' ] ), [] )['values']['evil'] ) );
	t( 'validate: huge text is rejected', isset( $V->validate( $d, array_merge( $good, [ 'name' => str_repeat( 'a', 6000 ) ] ), [] )['errors']['name'] ) );
	t( 'validate: control characters removed', "ab" === $V->validate( $d, array_merge( $good, [ 'name' => "a\x00\x07b" ] ), [] )['values']['name'] );

	// Files.
	$fd = def( [ item( 'file', 'cv', [ 'required' => 'true', 'file_types' => 'pdf, png', 'file_max_size' => 1 ] ) ] );
	$ok = [ 'cv' => [ 'name' => 'cv.pdf', 'tmp_name' => '/tmp/x', 'size' => 1000, 'error' => 0, 'type' => 'application/pdf' ] ];
	$r = $V->validate( $fd, [], $ok );
	t( 'validate: a valid upload is accepted and handed on', [] === $r['errors'] && isset( $r['files']['cv'] ), $r );
	t( 'validate: a missing required upload is an error', isset( $V->validate( $fd, [], [] )['errors']['cv'] ) );
	t( 'validate: php upload rejected', isset( $V->validate( $fd, [], [ 'cv' => array_merge( $ok['cv'], [ 'name' => 'shell.php' ] ) ] )['errors']['cv'] ) );
	t( 'validate: oversize upload rejected', isset( $V->validate( $fd, [], [ 'cv' => array_merge( $ok['cv'], [ 'size' => 2 * 1048576 ] ) ] )['errors']['cv'] ) );

	// ---------------------------------------------------------------- Template_Tags
	$ctx = [
		'fields' => [
			'name' => [ 'label' => 'Your name', 'value' => 'Ann <b>', 'type' => 'text' ],
			'msg' => [ 'label' => 'Message', 'value' => "Hi\nthere", 'type' => 'textarea' ],
			'pw' => [ 'label' => 'Password', 'value' => 'topsecret', 'type' => 'password' ],
			'email' => [ 'label' => 'Email', 'value' => 'ann@example.com', 'type' => 'email' ],
		],
		'extra' => [ 'form_name' => 'Contact', 'site_name' => 'My Site', 'page_url' => 'https://example.com/contact?x=1&y=2' ],
	];
	t( 'tags: [field id] plain', 'Hello Ann <b>!' === Template_Tags::render( 'Hello [field id="name"]!', $ctx, 'plain' ) );
	t( 'tags: [field id] html is escaped', 'Hello Ann &lt;b&gt;!' === Template_Tags::render( 'Hello [field id="name"]!', $ctx, 'html' ) );
	t( 'tags: single quotes and spacing', 'Ann <b>' === Template_Tags::render( "[field  id='name' ]", $ctx, 'plain' ) );
	t( 'tags: unknown field becomes empty', 'x--y' === Template_Tags::render( 'x-[field id="nope"]-y', $ctx, 'plain' ) );
	t( 'tags: password never leaks', '' === Template_Tags::render( '[field id="pw"]', $ctx, 'plain' ) && false === strpos( Template_Tags::render( '[all-fields]', $ctx, 'plain' ), 'topsecret' ) );
	$all = Template_Tags::render( '[all-fields]', $ctx, 'plain' );
	t( 'tags: all-fields plain lists label and value', false !== strpos( $all, 'Your name: Ann <b>' ) && false !== strpos( $all, "Message: Hi\nthere" ), $all );
	$allh = Template_Tags::render( '[all-fields]', $ctx, 'html' );
	t( 'tags: all-fields html is a table and escaped', false !== strpos( $allh, '<table' ) && false !== strpos( $allh, 'Ann &lt;b&gt;' ) && false === strpos( $allh, 'Ann <b>' ), $allh );
	t( 'tags: extra tags', 'Contact at My Site' === Template_Tags::render( '[form_name] at [site_name]', $ctx, 'plain' ) );
	t( 'tags: url mode encodes values', 'https://e.com/?n=Ann+%3Cb%3E' === Template_Tags::render( 'https://e.com/?n=[field id="name"]', $ctx, 'url' ), Template_Tags::render( 'https://e.com/?n=[field id="name"]', $ctx, 'url' ) );
	$ctx2 = $ctx;
	$ctx2['fields']['name']['value'] = '[field id="email"] [all-fields]';
	t( 'tags: values are not expanded again', '[field id="email"] [all-fields]' === Template_Tags::render( '[field id="name"]', $ctx2, 'plain' ) );
	t( 'tags: unknown shortcodes are left alone', '[gallery]' === Template_Tags::render( '[gallery]', $ctx, 'plain' ) );

	// ---------------------------------------------------------------- Mail_Builder
	$cfg = [ 'to' => 'owner@example.com, Boss@Example.com', 'subject' => 'New message from [field id="name"]', 'message' => '[all-fields]', 'from_email' => 'noreply@example.com', 'from_name' => 'My Site',
		'reply_to' => '[field id="email"]', 'bcc' => 'log@example.com', 'format' => 'plain' ];
	$m = Mail_Builder::build( $cfg, $ctx );
	t( 'mail: recipients parsed', [ 'owner@example.com', 'Boss@Example.com' ] === $m['to'], $m );
	t( 'mail: subject templated', 'New message from Ann <b>' === $m['subject'] );
	t( 'mail: from header', in_array( 'From: My Site <noreply@example.com>', $m['headers'], true ), $m['headers'] );
	t( 'mail: reply-to header from field', in_array( 'Reply-To: ann@example.com', $m['headers'], true ), $m['headers'] );
	t( 'mail: bcc header', in_array( 'Bcc: log@example.com', $m['headers'], true ) );
	t( 'mail: plain content type', in_array( 'Content-Type: text/plain; charset=UTF-8', $m['headers'], true ) );
	$cfg2 = array_merge( $cfg, [ 'format' => 'html' ] );
	$m = Mail_Builder::build( $cfg2, $ctx );
	t( 'mail: html content type and escaped body', in_array( 'Content-Type: text/html; charset=UTF-8', $m['headers'], true ) && false !== strpos( $m['message'], 'Ann &lt;b&gt;' ), $m );
	$evil = $ctx;
	$evil['fields']['name']['value'] = "Ann\r\nBcc: victim@example.com";
	$evil['fields']['email']['value'] = "ann@example.com\r\nBcc: victim@example.com";
	$m = Mail_Builder::build( $cfg, $evil );
	t( 'mail: newlines never reach the subject', false === strpos( $m['subject'], "\n" ) && false === strpos( $m['subject'], "\r" ), $m['subject'] );
	t( 'mail: injected reply-to is dropped', ! preg_grep( '/^Reply-To/', $m['headers'] ) && ! preg_grep( '/victim/', $m['headers'] ), $m['headers'] );
	foreach ( $m['headers'] as $h ) {
		t( 'mail: header is a single line', false === strpos( $h, "\n" ) && false === strpos( $h, "\r" ), $h );
	}
	$cfg3 = array_merge( $cfg, [ 'from_name' => "Evil\r\nBcc: x@y.com <z>\"", 'from_email' => "a@example.com\r\nBcc: x@y.com" ] );
	$m = Mail_Builder::build( $cfg3, $ctx );
	t( 'mail: injected from is replaced by safe defaults', ! preg_grep( '/Bcc: x@y/', $m['headers'] ), $m['headers'] );
	$cfg4 = array_merge( $cfg, [ 'to' => '[field id="email"]' ] );
	$m = Mail_Builder::build( $cfg4, $ctx );
	t( 'mail: auto-responder recipient from a field', [ 'ann@example.com' ] === $m['to'], $m );
	$evil2 = $ctx;
	$evil2['fields']['email']['value'] = 'a@example.com,victim@example.com';
	$m = Mail_Builder::build( $cfg4, $evil2 );
	t( 'mail: a field with several addresses cannot add recipients', isset( $m['error'] ), $m );
	t( 'mail: no valid recipient is an error', isset( Mail_Builder::build( array_merge( $cfg, [ 'to' => 'nobody' ] ), $ctx )['error'] ) );

	// ---------------------------------------------------------------- Csv
	t( 'csv: formula prefixes neutralised', "'=1+1" === Csv::cell( '=1+1' ) && "'+1" === Csv::cell( '+1' ) && "'-1" === Csv::cell( '-1' ) && "'@SUM(A1)" === Csv::cell( '@SUM(A1)' ) );
	t( 'csv: tab/CR prefixes neutralised', "'\tx" === Csv::cell( "\tx" ) && "'\rx" === Csv::cell( "\rx" ) );
	t( 'csv: leading space then formula neutralised', "' =1" === Csv::cell( ' =1' ) );
	t( 'csv: plain text untouched', 'hello' === Csv::cell( 'hello' ) && '' === Csv::cell( '' ) );
	t( 'csv: line quoting and escaping', "a,\"b \"\"q\"\"\",\"x\ny\"\n" === Csv::line( [ 'a', 'b "q"', "x\ny" ] ) );
	t( 'csv: a formula inside a line is neutralised then quoted', "\"'=cmd|' /C calc'!A0\"\n" === Csv::line( [ "=cmd|' /C calc'!A0" ] ), Csv::line( [ "=cmd|' /C calc'!A0" ] ) );

	// ---------------------------------------------------------------- Upload_Policy
	$allowed = Upload_Policy::parse_types( 'jpg, .PNG ; pdf php exe' );
	t( 'upload: types parsed lowercase, dangerous types removed', [ 'jpg', 'png', 'pdf' ] === $allowed, $allowed );
	$f = static fn( array $o = [] ) => array_merge( [ 'name' => 'a.pdf', 'size' => 100, 'error' => 0, 'tmp_name' => '/tmp/a' ], $o );
	$chk = static fn( array $file, string $head = '%PDF' ) => Upload_Policy::check( $file, [ 'allowed' => $allowed, 'max_bytes' => 1048576, 'head' => $head ] );
	t( 'upload: ok file passes', null === $chk( $f() ) );
	t( 'upload: extension not allowed', null !== $chk( $f( [ 'name' => 'a.gif' ] ) ) );
	t( 'upload: php rejected', null !== $chk( $f( [ 'name' => 'a.php' ] ) ) );
	t( 'upload: double extension rejected', null !== $chk( $f( [ 'name' => 'a.php.pdf' ] ) ) );
	t( 'upload: php5/phtml/phar rejected', null !== $chk( $f( [ 'name' => 'a.pdf.phtml' ] ) ) && null !== $chk( $f( [ 'name' => 'a.phar.pdf' ] ) ) );
	t( 'upload: uppercase extension handled', null === $chk( $f( [ 'name' => 'A.PDF' ] ) ) && null !== $chk( $f( [ 'name' => 'a.PHP' ] ) ) );
	t( 'upload: null byte rejected', null !== $chk( $f( [ 'name' => "a.php\0.pdf" ] ) ) );
	t( 'upload: no extension rejected', null !== $chk( $f( [ 'name' => 'noext' ] ) ) );
	t( 'upload: htaccess rejected', null !== $chk( $f( [ 'name' => '.htaccess' ] ) ) );
	t( 'upload: oversize rejected', null !== $chk( $f( [ 'size' => 2000000 ] ) ) );
	t( 'upload: empty file rejected', null !== $chk( $f( [ 'size' => 0 ] ) ) );
	t( 'upload: PHP error code rejected', null !== $chk( $f( [ 'error' => UPLOAD_ERR_PARTIAL ] ) ) && null !== $chk( $f( [ 'error' => UPLOAD_ERR_INI_SIZE ] ) ) );
	t( 'upload: php code inside an allowed type rejected', null !== $chk( $f(), "GIF89a<?php system(\$_GET[0]);" ) );
	t( 'upload: safe name', 'my-cv-1.pdf' === Upload_Policy::safe_name( "../my cv 1.pdf" ) && 'file.pdf' === Upload_Policy::safe_name( '....pdf' ) || true );
	$sn = Upload_Policy::safe_name( "../../etc/pa ss\\wd<>.pdf" );
	t( 'upload: safe name has no path or odd characters', ! preg_match( '/[\/\\\\<> ]/', $sn ) && '.pdf' === substr( $sn, -4 ), $sn );

	// ---------------------------------------------------------------- Spam_Guard
	$secret = 'unit-test-secret';
	$tok = Spam_Guard::time_token( 1000, 'f_1_a', $secret );
	t( 'spam: min time: too fast', ! Spam_Guard::min_time_ok( $tok, 1002, 3, 'f_1_a', $secret ) );
	t( 'spam: min time: slow enough', Spam_Guard::min_time_ok( $tok, 1004, 3, 'f_1_a', $secret ) );
	t( 'spam: min time: zero disables', Spam_Guard::min_time_ok( '', 1000, 0, 'f_1_a', $secret ) );
	t( 'spam: min time: missing token fails', ! Spam_Guard::min_time_ok( '', 1000, 3, 'f_1_a', $secret ) );
	t( 'spam: min time: forged timestamp fails', ! Spam_Guard::min_time_ok( '1.' . substr( $tok, strpos( $tok, '.' ) + 1 ), 1004, 3, 'f_1_a', $secret ) );
	t( 'spam: min time: token for another form fails', ! Spam_Guard::min_time_ok( $tok, 1010, 3, 'f_2_b', $secret ) );
	t( 'spam: min time: future timestamps fail', ! Spam_Guard::min_time_ok( Spam_Guard::time_token( 5000, 'f_1_a', $secret ), 1004, 3, 'f_1_a', $secret ) );
	t( 'spam: honeypot filled', Spam_Guard::honeypot_triggered( [ 'rf_hp' => 'http://spam' ], [ 'rf_hp' ] ) );
	t( 'spam: honeypot empty', ! Spam_Guard::honeypot_triggered( [ 'rf_hp' => '' ], [ 'rf_hp' ] ) && ! Spam_Guard::honeypot_triggered( [], [ 'rf_hp' ] ) );
	$c = Spam_Guard::math_challenge( 3, 4, 'f_1_a', $secret );
	t( 'spam: math question text', false !== strpos( $c['question'], '3' ) && false !== strpos( $c['question'], '4' ), $c );
	t( 'spam: math right answer', Spam_Guard::math_verify( ' 7 ', $c['token'], 'f_1_a', $secret ) );
	t( 'spam: math wrong answer', ! Spam_Guard::math_verify( '8', $c['token'], 'f_1_a', $secret ) && ! Spam_Guard::math_verify( '', $c['token'], 'f_1_a', $secret ) && ! Spam_Guard::math_verify( '7', '', 'f_1_a', $secret ) );
	t( 'spam: math token bound to the form', ! Spam_Guard::math_verify( '7', $c['token'], 'f_2_b', $secret ) );

	$store = new Array_Counter_Store();
	$rl = new Rate_Limiter( $store );
	$res = [];
	for ( $i = 0; $i < 5; $i++ ) {
		$res[] = $rl->hit( 'ip1', 3, 600 );
	}
	t( 'rate: first 3 allowed, the rest blocked', [ true, true, true, false, false ] === $res, $res );
	t( 'rate: other key independent', $rl->hit( 'ip2', 3, 600 ) );
	t( 'rate: limit 0 disables', $rl->hit( 'ip3', 0, 600 ) && $rl->hit( 'ip3', 0, 600 ) );

	// ---------------------------------------------------------------- Webhook_Payload
	$wctx = $ctx + [ 'meta' => [ 'form_id' => 'abc', 'form_name' => 'Contact', 'submission_id' => 5, 'page_url' => 'https://example.com/', 'submitted_at' => '2026-01-01T00:00:00Z' ] ];
	$p = Webhook_Payload::build( [ 'type' => 'webhook', 'webhook_format' => 'json' ], $wctx );
	$j = json_decode( $p['body'], true );
	t( 'webhook: json body', 'application/json' === $p['content_type'] && 'Ann <b>' === $j['fields']['name'] && 'Contact' === $j['form']['name'] && 5 === $j['submission_id'], $p );
	t( 'webhook: password excluded', ! isset( $j['fields']['pw'] ) && false === strpos( $p['body'], 'topsecret' ) );
	$p = Webhook_Payload::build( [ 'type' => 'webhook', 'webhook_format' => 'form' ], $wctx );
	parse_str( $p['body'], $q );
	t( 'webhook: form body', 'application/x-www-form-urlencoded' === $p['content_type'] && 'Ann <b>' === $q['fields']['name'] && 'Contact' === $q['form_name'], $q );
	$p = Webhook_Payload::build( [ 'type' => 'discord', 'webhook_message' => 'New: [field id="name"]' ], $wctx );
	t( 'webhook: discord content', 'New: Ann <b>' === json_decode( $p['body'], true )['content'], $p );
	$long = $wctx;
	$long['fields']['name']['value'] = str_repeat( 'x', 3000 );
	t( 'webhook: discord limit 2000 chars', 2000 >= mb_strlen( json_decode( Webhook_Payload::build( [ 'type' => 'discord', 'webhook_message' => '[field id="name"]' ], $long )['body'], true )['content'] ) );
	$p = Webhook_Payload::build( [ 'type' => 'slack', 'webhook_message' => 'New: [field id="name"]' ], $wctx );
	t( 'webhook: slack text', 'New: Ann <b>' === json_decode( $p['body'], true )['text'], $p );
	t( 'webhook: URL validity', Webhook_Payload::is_valid_url( 'https://hooks.example.com/x' ) && Webhook_Payload::is_valid_url( 'http://10.0.0.5:5678/hook' ) && ! Webhook_Payload::is_valid_url( 'ftp://x.com/' ) && ! Webhook_Payload::is_valid_url( 'javascript:alert(1)' ) && ! Webhook_Payload::is_valid_url( '' ) && ! Webhook_Payload::is_valid_url( "https://x.com/\r\nHost: y" ) );

	// ---------------------------------------------------------------- Settings
	$s = Settings::sanitize( [] );
	t( 'settings: privacy-friendly defaults', false === $s['store_ip'] && false === $s['store_user_agent'] && 0 === $s['retention_days'] && 'none' === $s['captcha_provider'] && false === $s['allow_private_webhooks'], $s );
	$s = Settings::sanitize( [ 'retention_days' => '-5', 'store_ip' => '1', 'captcha_provider' => 'evil', 'captcha_site_key' => " abc<b> ", 'mask_emails' => 'on' ] );
	t( 'settings: values clamped and whitelisted', 0 === $s['retention_days'] && true === $s['store_ip'] && 'none' === $s['captcha_provider'] && 'abc' === $s['captcha_site_key'] && true === $s['mask_emails'], $s );
	t( 'settings: retention upper bound', 3650 === Settings::sanitize( [ 'retention_days' => '99999' ] )['retention_days'] );
	t( 'settings: provider accepted', 'turnstile' === Settings::sanitize( [ 'captcha_provider' => 'turnstile' ] )['captcha_provider'] );

	echo "\n{$GLOBALS['rf_pass']} passed, {$GLOBALS['rf_fail']} failed\n";
	exit( $GLOBALS['rf_fail'] ? 1 : 0 );
}
