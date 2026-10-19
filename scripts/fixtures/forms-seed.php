<?php
/**
 * Test fixture for scripts/check-forms.mjs (run with `wp eval-file`, test sites only).
 *
 * Env FM_ACTION:
 *   site     create the pages with forms and the login widget; prints their IDs as JSON
 *   reset    empty the submissions tables and uploaded files, reset settings and rate limits
 *   mail     print the captured mails (JSON list)
 *   set      FM_SETTINGS = JSON merged into the module settings
 *   backdate FM_ID, FM_DAYS: move a submission's date into the past
 *   count    print the number of submissions
 *   privacy  FM_EMAIL: run the exporter and the eraser; prints { exported, erased }
 *   purge    run the retention clean-up; prints how many went
 */
wp_set_current_user( 1 );

$action = getenv( 'FM_ACTION' );
$docs = \Refraction\Plugin::$instance->documents;

function fm_field( $id, $type, $label, $extra = [] ) {
	return array_merge( [ '_id' => 'f' . substr( md5( $id ), 0, 6 ), 'custom_id' => $id, 'field_type' => $type, 'field_label' => $label, 'placeholder' => '', 'required' => '', 'field_width' => '100', 'field_options' => '', 'field_value' => '' ], $extra );
}

function fm_widget( $id, $fields, $actions, $settings = [] ) {
	return [
		'id' => $id,
		'elType' => 'widget',
		'widgetType' => 'refraction-form',
		'settings' => array_merge( [
			'form_name' => 'Form ' . $id,
			'form_fields' => $fields,
			'submit_actions' => $actions,
			'min_submit_time' => 0,
			'rate_limit_max' => 0,
			'success_message' => 'Thanks, sent OK.',
		], $settings ),
		'elements' => [],
	];
}

function fm_container( $widget ) {
	return [ [ 'id' => 'c' . substr( md5( $widget['id'] ), 0, 6 ), 'elType' => 'container', 'settings' => [], 'elements' => [ $widget ] ] ];
}

function fm_page( $slug, $title, $widget ) {
	$docs = \Refraction\Plugin::$instance->documents;

	$existing = get_page_by_path( $slug );

	if ( $existing ) {
		wp_delete_post( $existing->ID, true );
	}

	$doc = $docs->create( 'wp-page', [ 'post_title' => $title, 'post_name' => $slug, 'post_status' => 'publish' ] );
	$doc->save( [ 'elements' => fm_container( $widget ), 'settings' => [ 'post_status' => 'publish' ] ] );
	$id = $doc->get_main_id();
	wp_update_post( [ 'ID' => $id, 'post_name' => $slug, 'post_status' => 'publish' ] );

	return $id;
}

$email_action = fn( $id, $extra = [] ) => array_merge( [ '_id' => $id, 'action_type' => 'email', 'email_to' => 'owner@example.com, boss@example.com', 'email_subject' => 'Mail from [field id="name"]', 'email_content' => 'Hello [field id="name"]' . "\n" . '[all-fields]', 'email_from' => 'site@example.com', 'email_from_name' => 'My Site', 'email_reply_to' => '[field id="email"]', 'email_bcc' => 'log@example.com', 'email_format' => 'plain' ], $extra );

if ( 'site' === $action ) {
	$hook = getenv( 'FM_HOOK_URL' ) ?: 'http://127.0.0.1:18823/hook';
	$ids = [];

	$all = [
		fm_field( 'name', 'text', 'Your name', [ 'required' => 'true', 'placeholder' => 'Jane' ] ),
		fm_field( 'email', 'email', 'Email', [ 'required' => 'true', 'field_width' => '50' ] ),
		fm_field( 'phone', 'tel', 'Phone', [ 'field_width' => '50' ] ),
		fm_field( 'msg', 'textarea', 'Message', [ 'required' => 'true' ] ),
		fm_field( 'site', 'url', 'Website' ),
		fm_field( 'age', 'number', 'Age', [ 'min_value' => 18, 'max_value' => 99 ] ),
		fm_field( 'color', 'select', 'Colour', [ 'field_options' => "Red|r\nBlue|b" ] ),
		fm_field( 'size', 'radio', 'Size', [ 'field_options' => "S\nM\nL" ] ),
		fm_field( 'extras', 'checkbox', 'Extras', [ 'field_options' => "A\nB\nC", 'inline_list' => 'true' ] ),
		fm_field( 'when', 'date', 'Date' ),
		fm_field( 'at', 'time', 'Time' ),
		fm_field( 'src', 'hidden', 'Source', [ 'field_value' => 'landing' ] ),
		fm_field( 'pw', 'password', 'Password' ),
		fm_field( 'note', 'html', '', [ 'field_html' => '<p class="fm-note">Some <strong>html</strong></p>' ] ),
		fm_field( 'trap', 'honeypot', 'Leave empty' ),
		fm_field( 'terms', 'acceptance', 'I accept the <a href="/terms/">terms</a>', [ 'required' => 'true' ] ),
	];

	$ids['basic'] = fm_page( 'form-basic', 'Form Basic', fm_widget( 'frmbasic', $all, [
		[ '_id' => 'a1', 'action_type' => 'collect' ],
		$email_action( 'a2' ),
		[ '_id' => 'a3', 'action_type' => 'email2', 'email2_to' => '[field id="email"]', 'email2_subject' => 'Thanks [field id="name"]', 'email2_content' => 'We got it: [field id="msg"]', 'email2_from' => '', 'email2_from_name' => '', 'email2_reply_to' => '', 'email2_cc' => '', 'email2_bcc' => '', 'email2_format' => 'html' ],
		[ '_id' => 'a4', 'action_type' => 'webhook', 'webhook_url' => $hook, 'webhook_format' => 'json', 'webhook_timeout' => 5 ],
		[ '_id' => 'a5', 'action_type' => 'webhook', 'webhook_url' => 'http://127.0.0.1:1/dead', 'webhook_format' => 'json', 'webhook_timeout' => 2 ],
		[ '_id' => 'a6', 'action_type' => 'discord', 'webhook_url' => $hook . '?kind=discord', 'webhook_message' => 'Discord: [field id="name"]', 'webhook_timeout' => 5 ],
		[ '_id' => 'a7', 'action_type' => 'slack', 'webhook_url' => $hook . '?kind=slack', 'webhook_message' => 'Slack: [field id="name"]', 'webhook_timeout' => 5 ],
	] ) );

	$steps = [
		fm_field( 's1', 'step', 'Who are you' ),
		fm_field( 'name', 'text', 'Name', [ 'required' => 'true' ] ),
		fm_field( 'email', 'email', 'Email', [ 'required' => 'true' ] ),
		fm_field( 's2', 'step', 'What do you need' ),
		fm_field( 'topic', 'select', 'Topic', [ 'required' => 'true', 'placeholder' => 'Choose a topic', 'field_options' => "Sales\nSupport" ] ),
		fm_field( 's3', 'step', 'Details' ),
		fm_field( 'msg', 'textarea', 'Message', [ 'required' => 'true' ] ),
	];
	$ids['steps'] = fm_page( 'form-steps', 'Form Steps', fm_widget( 'frmsteps', $steps, [ [ '_id' => 'a1', 'action_type' => 'collect' ] ], [ 'step_type' => 'number_text' ] ) );

	$ids['bar'] = fm_page( 'form-bar', 'Form Bar', fm_widget( 'frmbar', $steps, [ [ '_id' => 'a1', 'action_type' => 'collect' ] ], [ 'step_type' => 'bar' ] ) );

	$spam = [ fm_field( 'name', 'text', 'Name', [ 'required' => 'true' ] ) ];
	$ids['spam'] = fm_page( 'form-spam', 'Form Spam', fm_widget( 'frmspam', $spam, [ [ '_id' => 'a1', 'action_type' => 'collect' ] ], [ 'min_submit_time' => 2, 'rate_limit_max' => 3, 'rate_limit_window' => 10, 'math_question' => 'true' ] ) );

	$ids['rate'] = fm_page( 'form-rate', 'Form Rate', fm_widget( 'frmrate', $spam, [ [ '_id' => 'a1', 'action_type' => 'collect' ] ], [ 'min_submit_time' => 0, 'rate_limit_max' => 3, 'rate_limit_window' => 10 ] ) );

	$ids['upload'] = fm_page( 'form-upload', 'Form Upload', fm_widget( 'frmupload', [
		fm_field( 'name', 'text', 'Name' ),
		fm_field( 'cv', 'file', 'CV', [ 'required' => 'true', 'file_types' => 'pdf, png, php', 'file_max_size' => 0.1 ] ),
	], [ [ '_id' => 'a1', 'action_type' => 'collect' ] ] ) );

	$ids['redirect'] = fm_page( 'form-redirect', 'Form Redirect', fm_widget( 'frmredirect', [ fm_field( 'name', 'text', 'Name', [ 'required' => 'true' ] ) ], [
		[ '_id' => 'a1', 'action_type' => 'collect' ],
		[ '_id' => 'a2', 'action_type' => 'redirect', 'redirect_url' => '/?redirected=1&who=[field id="name"]' ],
	] ) );

	$ids['captcha'] = fm_page( 'form-captcha', 'Form Captcha', fm_widget( 'frmcaptcha', $spam, [ [ '_id' => 'a1', 'action_type' => 'collect' ] ], [ 'captcha' => 'true' ] ) );

	$ids['inject'] = fm_page( 'form-inject', 'Form Inject', fm_widget( 'frminject', [
		fm_field( 'name', 'text', 'Name', [ 'required' => 'true' ] ),
		fm_field( 'email', 'email', 'Email', [ 'required' => 'true' ] ),
	], [
		[ '_id' => 'a1', 'action_type' => 'collect' ],
		$email_action( 'a2', [ 'email_to' => 'owner@example.com', 'email_bcc' => '' ] ),
		[ '_id' => 'a3', 'action_type' => 'email2', 'email2_to' => '[field id="email"]', 'email2_subject' => 'Re: [field id="name"]', 'email2_content' => 'x', 'email2_from' => '', 'email2_from_name' => '', 'email2_reply_to' => '', 'email2_cc' => '', 'email2_bcc' => '', 'email2_format' => 'plain' ],
	] ) );

	$login = [ 'id' => 'lgnone', 'elType' => 'widget', 'widgetType' => 'refraction-login', 'settings' => [ 'redirect_url' => '/?logged-in=1', 'register_link' => 'true' ], 'elements' => [] ];
	$ids['login'] = fm_page( 'login-page', 'Login Page', $login );

	$login2 = [ 'id' => 'lgntwo', 'elType' => 'widget', 'widgetType' => 'refraction-login', 'settings' => [ 'show_logged_in' => '', 'remember_me' => '', 'lost_password' => '' ], 'elements' => [] ];
	$ids['login2'] = fm_page( 'login-hidden', 'Login Hidden', $login2 );

	$login3 = [ 'id' => 'lgnthree', 'elType' => 'widget', 'widgetType' => 'refraction-login', 'settings' => [ 'redirect_url' => 'https://evil.example.com/steal' ], 'elements' => [] ];
	$ids['login3'] = fm_page( 'login-evil', 'Login Evil', $login3 );

	echo wp_json_encode( $ids );
} elseif ( 'reset' === $action ) {
	global $wpdb;

	foreach ( [ 'submissions', 'submission_values', 'submission_log' ] as $t ) {
		$wpdb->query( 'DELETE FROM ' . $wpdb->prefix . 'refraction_' . $t ); // phpcs:ignore
	}

	$dir = \Refraction\Modules\Forms\Classes\Upload_Store::base_dir();

	if ( is_dir( $dir ) ) {
		foreach ( new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ), RecursiveIteratorIterator::CHILD_FIRST ) as $f ) {
			$f->isDir() ? @rmdir( $f->getPathname() ) : @unlink( $f->getPathname() ); // phpcs:ignore
		}
	}

	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\_transient\_rf\_rl\_%' OR option_name LIKE '\_transient\_timeout\_rf\_rl\_%'" ); // phpcs:ignore
	delete_option( 'refraction_forms_settings' );
	@unlink( WP_CONTENT_DIR . '/rf-mail.log' ); // phpcs:ignore
	echo '{}';
} elseif ( 'mail' === $action ) {
	$file = WP_CONTENT_DIR . '/rf-mail.log';
	$lines = is_file( $file ) ? array_filter( explode( "\n", file_get_contents( $file ) ) ) : [];
	echo '[' . implode( ',', $lines ) . ']';
} elseif ( 'set' === $action ) {
	$current = \Refraction\Modules\Forms\Classes\Settings::get();
	update_option( 'refraction_forms_settings', \Refraction\Modules\Forms\Classes\Settings::sanitize( array_merge( $current, json_decode( getenv( 'FM_SETTINGS' ), true ) ) ), false );
	echo wp_json_encode( get_option( 'refraction_forms_settings' ) );
} elseif ( 'backdate' === $action ) {
	global $wpdb;

	$wpdb->update( $wpdb->prefix . 'refraction_submissions', [ 'created_gmt' => gmdate( 'Y-m-d H:i:s', time() - (int) getenv( 'FM_DAYS' ) * DAY_IN_SECONDS ) ], [ 'id' => (int) getenv( 'FM_ID' ) ] );
	echo '{}';
} elseif ( 'count' === $action ) {
	global $wpdb;

	echo (int) $wpdb->get_var( 'SELECT COUNT(*) FROM ' . $wpdb->prefix . 'refraction_submissions' ); // phpcs:ignore
} elseif ( 'privacy' === $action ) {
	$repo = new \Refraction\Modules\Forms\Classes\Submissions_Repository();
	$p = new \Refraction\Modules\Forms\Classes\Privacy( $repo );
	$email = getenv( 'FM_EMAIL' );
	$out = [ 'exported' => $p->export( $email, 1 ) ];
	$out['erased'] = $p->erase( $email, 1 );
	$out['after'] = $p->export( $email, 1 );
	echo wp_json_encode( $out );
} elseif ( 'purge' === $action ) {
	echo (int) \Refraction\Modules\Forms\Module::instance()->get_repository()->purge_older_than( \Refraction\Modules\Forms\Classes\Settings::get()['retention_days'] );
}
