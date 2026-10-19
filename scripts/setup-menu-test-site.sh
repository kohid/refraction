#!/usr/bin/env bash
# Builds a throw-away WordPress test site (SQLite, no MySQL needed) and installs dist/refraction.zip.
# Usage: scripts/setup-menu-test-site.sh [SITE_DIR=/tmp/refraction-site] [ZIP=dist/refraction.zip]
# Env: PORT (default 8766), DL_DIR, WP_ZIP (path of a WordPress zip, e.g. to test an older core), WP_URL (download URL when WP_ZIP is missing).
# Needs: php (sqlite3/pdo_sqlite), curl, unzip. Downloads WordPress, the SQLite Database Integration
# plugin and wp-cli once into $DL_DIR (default /tmp/rsite-dl). Admin: admin / admin, editor: editor / editor.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="${1:-/tmp/refraction-site}"
ZIP="${2:-$ROOT/dist/refraction.zip}"
DL="${DL_DIR:-/tmp/rsite-dl}"
PORT="${PORT:-8766}"
mkdir -p "$DL"
WPZIP="${WP_ZIP:-$DL/wp.zip}"
[ -f "$WPZIP" ] || curl -fsSL "${WP_URL:-https://wordpress.org/latest.zip}" -o "$WPZIP"
[ -f "$DL/sqlite.zip" ] || curl -fsSL https://downloads.wordpress.org/plugin/sqlite-database-integration.zip -o "$DL/sqlite.zip"
[ -f "$DL/wpcli.phar" ] || curl -fsSL https://github.com/wp-cli/wp-cli/releases/download/v2.12.0/wp-cli-2.12.0.phar -o "$DL/wpcli.phar"
WP() { php -d memory_limit=512M "$DL/wpcli.phar" --path="$SITE/wordpress" --allow-root "$@"; }

if [ ! -f "$SITE/wordpress/wp-config.php" ]; then
	rm -rf "$SITE"; mkdir -p "$SITE"
	unzip -q "$WPZIP" -d "$SITE"
	unzip -q "$DL/sqlite.zip" -d "$SITE/wordpress/wp-content/plugins"
	P="$SITE/wordpress/wp-content/plugins/sqlite-database-integration"
	sed "s#{SQLITE_IMPLEMENTATION_FOLDER_PATH}#$P#; s#{SQLITE_PLUGIN}#sqlite-database-integration/load.php#" "$P/db.copy" > "$SITE/wordpress/wp-content/db.php"
	cat > "$SITE/wordpress/wp-config.php" <<PHP
<?php
define( 'DB_NAME', 'wordpress' ); define( 'DB_USER', '' ); define( 'DB_PASSWORD', '' ); define( 'DB_HOST', '' );
define( 'DB_CHARSET', 'utf8' ); define( 'DB_COLLATE', '' );
define( 'AUTH_KEY', 'a' ); define( 'SECURE_AUTH_KEY', 'b' ); define( 'LOGGED_IN_KEY', 'c' ); define( 'NONCE_KEY', 'd' );
define( 'AUTH_SALT', 'e' ); define( 'SECURE_AUTH_SALT', 'f' ); define( 'LOGGED_IN_SALT', 'g' ); define( 'NONCE_SALT', 'h' );
\$table_prefix = 'wp_';
define( 'WP_DEBUG', true ); define( 'WP_DEBUG_LOG', '$SITE/php-error.log' ); define( 'WP_DEBUG_DISPLAY', false );
define( 'WP_HOME', 'http://127.0.0.1:$PORT' ); define( 'WP_SITEURL', 'http://127.0.0.1:$PORT' );
define( 'DISABLE_WP_CRON', true );
if ( ! defined( 'ABSPATH' ) ) { define( 'ABSPATH', __DIR__ . '/' ); }
require_once ABSPATH . 'wp-settings.php';
PHP
	WP core install --url="http://127.0.0.1:$PORT" --title=RefractionTest --admin_user=admin --admin_password=admin --admin_email=a@example.com --skip-email
	WP user create editor editor@example.com --role=editor --user_pass=editor
fi

# (Re)install the plugin from the zip exactly as a user would.
WP plugin deactivate refraction >/dev/null 2>&1 || true
rm -rf "$SITE/wordpress/wp-content/plugins/refraction"
unzip -q "$ZIP" -d "$SITE/wordpress/wp-content/plugins"
WP plugin activate refraction
: > "$SITE/php-error.log"
echo "site ready: $SITE (port $PORT)"
