<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Custom tables for form submissions, created and upgraded with dbDelta().
 *
 * Bump DB_VERSION when a column or index changes; maybe_upgrade() runs dbDelta() once for each new
 * version. dbDelta() only adds or alters, it never drops data, so an upgrade is safe to repeat.
 */
final class Schema {

	const DB_VERSION = '1';
	const VERSION_OPTION = 'refraction_forms_db_version';

	public static function table( string $name ): string {
		global $wpdb;

		return $wpdb->prefix . 'refraction_' . $name;
	}

	public static function maybe_upgrade(): void {
		if ( get_option( self::VERSION_OPTION ) === self::DB_VERSION ) {
			return;
		}

		self::install();
	}

	public static function install(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset = $wpdb->get_charset_collate();
		$submissions = self::table( 'submissions' );
		$values = self::table( 'submission_values' );
		$log = self::table( 'submission_log' );

		dbDelta( "CREATE TABLE {$submissions} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  form_key varchar(80) NOT NULL DEFAULT '',
  form_name varchar(200) NOT NULL DEFAULT '',
  post_id bigint(20) unsigned NOT NULL DEFAULT 0,
  element_id varchar(40) NOT NULL DEFAULT '',
  status varchar(10) NOT NULL DEFAULT 'unread',
  user_id bigint(20) unsigned NOT NULL DEFAULT 0,
  ip varchar(64) NOT NULL DEFAULT '',
  user_agent varchar(255) NOT NULL DEFAULT '',
  page_url varchar(500) NOT NULL DEFAULT '',
  created_gmt datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY  (id),
  KEY form_key (form_key),
  KEY status (status),
  KEY created_gmt (created_gmt)
) {$charset};" );

		dbDelta( "CREATE TABLE {$values} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  submission_id bigint(20) unsigned NOT NULL DEFAULT 0,
  field_id varchar(100) NOT NULL DEFAULT '',
  field_label varchar(255) NOT NULL DEFAULT '',
  field_type varchar(20) NOT NULL DEFAULT '',
  value longtext NOT NULL,
  PRIMARY KEY  (id),
  KEY submission_id (submission_id)
) {$charset};" );

		dbDelta( "CREATE TABLE {$log} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  submission_id bigint(20) unsigned NOT NULL DEFAULT 0,
  action varchar(40) NOT NULL DEFAULT '',
  status varchar(10) NOT NULL DEFAULT '',
  message text NOT NULL,
  created_gmt datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY  (id),
  KEY submission_id (submission_id)
) {$charset};" );

		update_option( self::VERSION_OPTION, self::DB_VERSION, true );
	}
}
