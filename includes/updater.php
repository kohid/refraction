<?php
namespace Refraction;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Refraction self-hosted updater.
 *
 * Lets the WordPress plugins screen offer updates for Refraction by reading the latest
 * release of a public GitHub repository. This is the only network request the plugin makes
 * on its own: one unauthenticated `GET https://api.github.com/repos/{owner}/{repo}/releases/latest`,
 * cached for 12 hours. No site data is sent besides the standard HTTP user agent.
 *
 * Switch it off with `define( 'REFRACTION_DISABLE_UPDATE_CHECK', true );` in wp-config.php.
 * Test against another API host (for example a fake GitHub on localhost) with the
 * `REFRACTION_UPDATE_API_BASE` constant or the `refraction/updater/api_base` filter; the default is
 * `https://api.github.com`.
 * Point it at another repository with the `REFRACTION_UPDATE_REPOSITORY` constant (`owner/repo`)
 * or the `refraction/updater/repository` filter.
 *
 * The Plugins screen gets a "Check for updates" row action that bypasses the cache and reports the
 * result (up to date, update available, or why the check failed) in an admin notice.
 *
 * The release must have an asset named `refraction.zip` whose top-level folder is `refraction/`.
 */
class Updater {

	const DEFAULT_REPOSITORY = 'kohid/refraction';

	const ASSET_NAME = 'refraction.zip';

	const SLUG = 'refraction';

	const DEFAULT_API_BASE = 'https://api.github.com';

	/**
	 * Query argument and nonce action of the "Check for updates" row action.
	 */
	const CHECK_ARG = 'refraction-check-update';

	/**
	 * Per-user transient that carries the result of a manual check to the next Plugins screen load.
	 */
	const NOTICE_KEY = 'refraction_update_notice_';

	/**
	 * How long a rate-limit failure is remembered: until GitHub says the limit resets, but never
	 * shorter than 5 or longer than 60 minutes.
	 */
	const RATE_LIMIT_MIN_TTL = 5 * MINUTE_IN_SECONDS;

	const CACHE_KEY = 'refraction_update_release';

	const CACHE_TTL = 12 * HOUR_IN_SECONDS;

	/**
	 * A failed lookup (rate limit, no network, missing repository) is remembered for a shorter
	 * time so that a broken lookup does not retry on every admin page load.
	 */
	const FAILURE_TTL = HOUR_IN_SECONDS;

	/**
	 * @var Updater|null
	 */
	private static $instance = null;

	/**
	 * @return Updater|null The updater, or null when update checks are disabled.
	 */
	public static function init() {
		if ( self::is_disabled() ) {
			return null;
		}

		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public static function is_disabled(): bool {
		$disabled = defined( 'REFRACTION_DISABLE_UPDATE_CHECK' ) && REFRACTION_DISABLE_UPDATE_CHECK;

		/**
		 * Filters whether the Refraction update check is disabled.
		 *
		 * @param bool $disabled True when the check is disabled.
		 */
		return (bool) apply_filters( 'refraction/updater/disabled', $disabled );
	}

	/**
	 * The GitHub repository (`owner/repo`) releases are read from.
	 */
	public static function get_repository(): string {
		$repository = defined( 'REFRACTION_UPDATE_REPOSITORY' ) ? (string) REFRACTION_UPDATE_REPOSITORY : self::DEFAULT_REPOSITORY;

		/**
		 * Filters the GitHub repository (`owner/repo`) that Refraction updates are read from.
		 *
		 * @param string $repository Repository slug.
		 */
		$repository = (string) apply_filters( 'refraction/updater/repository', $repository );

		return preg_match( '#^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$#', $repository ) ? $repository : self::DEFAULT_REPOSITORY;
	}

	/**
	 * The GitHub API base URL, without a trailing slash. Defaults to https://api.github.com.
	 */
	public static function get_api_base(): string {
		$base = defined( 'REFRACTION_UPDATE_API_BASE' ) ? (string) REFRACTION_UPDATE_API_BASE : self::DEFAULT_API_BASE;

		/**
		 * Filters the GitHub API base URL the updater talks to (for tests or a GitHub Enterprise host).
		 *
		 * @param string $base API base URL, for example `https://api.github.com`.
		 */
		$base = untrailingslashit( (string) apply_filters( 'refraction/updater/api_base', $base ) );

		return preg_match( '#^https?://[^\s/?\#]+(?::\d+)?(?:/[^\s?\#]*)?$#', $base ) ? $base : self::DEFAULT_API_BASE;
	}

	private static function uses_default_api_base(): bool {
		return self::DEFAULT_API_BASE === self::get_api_base();
	}

	private function __construct() {
		add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'inject_update' ] );
		add_filter( 'plugin_action_links_' . REFRACTION_PLUGIN_BASE, [ $this, 'add_check_link' ] );
		add_action( 'load-plugins.php', [ $this, 'handle_manual_check' ] );
		add_action( 'admin_notices', [ $this, 'render_check_notice' ] );
		add_action( 'network_admin_notices', [ $this, 'render_check_notice' ] );
		add_filter( 'plugins_api', [ $this, 'plugin_information' ], 20, 3 );
		add_filter( 'upgrader_source_selection', [ $this, 'fix_source_directory' ], 10, 4 );
	}

	/**
	 * Adds Refraction to the list of plugins that have (or have no) update available.
	 *
	 * The plugin is always listed, in `response` when a newer release exists and in `no_update`
	 * otherwise (also when the lookup failed), because WordPress only shows the "View details"
	 * link and the auto-update toggle for plugins that appear in one of the two lists.
	 *
	 * @param mixed $transient The `update_plugins` site transient value.
	 *
	 * @return mixed
	 */
	public function inject_update( $transient ) {
		if ( ! is_object( $transient ) ) {
			return $transient;
		}

		$release = $this->get_release();

		$item = (object) [
			'id' => 'github.com/' . self::get_repository(),
			'slug' => self::SLUG,
			'plugin' => REFRACTION_PLUGIN_BASE,
			'new_version' => REFRACTION_VERSION,
			'url' => 'https://github.com/' . self::get_repository(),
			'package' => '',
			'requires_php' => '7.4',
		];

		if ( is_array( $release ) ) {
			$item->new_version = $release['version'];
			$item->url = $release['url'];
			$item->package = $release['package'];
		}

		if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) {
			$transient->response = [];
		}

		if ( ! isset( $transient->no_update ) || ! is_array( $transient->no_update ) ) {
			$transient->no_update = [];
		}

		if ( is_array( $release ) && version_compare( $release['version'], REFRACTION_VERSION, '>' ) ) {
			$transient->response[ REFRACTION_PLUGIN_BASE ] = $item;

			unset( $transient->no_update[ REFRACTION_PLUGIN_BASE ] );
		} else {
			$transient->no_update[ REFRACTION_PLUGIN_BASE ] = $item;

			unset( $transient->response[ REFRACTION_PLUGIN_BASE ] );
		}

		return $transient;
	}

	/**
	 * Fills the "View details" modal on the plugins screen.
	 *
	 * @param false|object|array $result The result object or array. Default false.
	 * @param string             $action The type of information being requested.
	 * @param object             $args   Plugin API arguments.
	 *
	 * @return false|object|array
	 */
	public function plugin_information( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || ! is_object( $args ) || ! isset( $args->slug ) || self::SLUG !== $args->slug ) {
			return $result;
		}

		$release = $this->get_release();

		if ( is_wp_error( $release ) ) {
			// Answer for the slug ourselves so WordPress.org is never asked about a plugin called "refraction".
			return new \WP_Error( 'plugins_api_failed', $release->get_error_message() );
		}

		return (object) [
			'name' => 'Refraction',
			'slug' => self::SLUG,
			'version' => $release['version'],
			'author' => '<a href="https://github.com/' . esc_attr( self::get_repository() ) . '">Refraction contributors</a> (based on Elementor by Elementor.com)',
			'homepage' => $release['url'],
			'requires' => '6.8',
			'requires_php' => '7.4',
			'last_updated' => $release['published'],
			'download_link' => $release['package'],
			'sections' => [
				'description' => '<p>' . esc_html__( 'Refraction is a drag-and-drop page builder for WordPress, a community fork of Elementor. This update is delivered from its GitHub releases page.', 'refraction' ) . '</p>',
				'changelog' => $release['changelog'],
			],
		];
	}

	/**
	 * Makes sure the unpacked update folder is named `refraction`, so the plugin stays at
	 * `wp-content/plugins/refraction/refraction.php` (otherwise WordPress would install it next
	 * to the old copy and deactivate it).
	 *
	 * @param string|\WP_Error $source        File source location.
	 * @param string           $remote_source Remote file source location.
	 * @param \WP_Upgrader     $upgrader      WP_Upgrader instance.
	 * @param array            $hook_extra    Extra arguments passed to hooked filters.
	 *
	 * @return string|\WP_Error
	 */
	public function fix_source_directory( $source, $remote_source, $upgrader, $hook_extra ) {
		if ( is_wp_error( $source ) || ! $this->is_refraction_update( $hook_extra ) ) {
			return $source;
		}

		global $wp_filesystem;

		$source = trailingslashit( $source );

		if ( ! $wp_filesystem || ! $wp_filesystem->exists( $source . 'refraction.php' ) ) {
			return new \WP_Error(
				'refraction_bad_package',
				esc_html__( 'The Refraction update package does not contain refraction.php.', 'refraction' )
			);
		}

		if ( self::SLUG === basename( $source ) ) {
			return $source;
		}

		$corrected = trailingslashit( $remote_source ) . self::SLUG . '/';

		if ( $wp_filesystem->exists( $corrected ) ) {
			$wp_filesystem->delete( $corrected, true );
		}

		if ( ! $wp_filesystem->move( untrailingslashit( $source ), untrailingslashit( $corrected ), true ) ) {
			return new \WP_Error(
				'refraction_rename_failed',
				esc_html__( 'Could not rename the Refraction update folder.', 'refraction' )
			);
		}

		return $corrected;
	}

	/**
	 * @param mixed $hook_extra
	 */
	private function is_refraction_update( $hook_extra ): bool {
		if ( ! is_array( $hook_extra ) ) {
			return false;
		}

		if ( isset( $hook_extra['plugin'] ) && REFRACTION_PLUGIN_BASE === $hook_extra['plugin'] ) {
			return true;
		}

		return isset( $hook_extra['plugins'] ) && is_array( $hook_extra['plugins'] ) && in_array( REFRACTION_PLUGIN_BASE, $hook_extra['plugins'], true );
	}

	/**
	 * The latest published release, normalised, or a WP_Error that says why there is none.
	 * Results (including failures) are cached; pass `$force` to bypass the cache.
	 *
	 * @param bool $force Skip the cache and ask GitHub now.
	 *
	 * @return array|\WP_Error Array with `version`, `package`, `url`, `published`, `changelog`.
	 */
	public function get_release( bool $force = false ) {
		$force = $force || ( is_admin() && isset( $_GET['force-check'] ) && current_user_can( 'update_plugins' ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( ! $force ) {
			$cached = get_site_transient( self::CACHE_KEY );

			if ( is_array( $cached ) && isset( $cached['version'] ) ) {
				return $cached;
			}

			if ( is_array( $cached ) && isset( $cached['error_code'] ) ) {
				return new \WP_Error( (string) $cached['error_code'], (string) ( $cached['error_message'] ?? '' ) );
			}
		}

		$release = $this->fetch_release();

		if ( is_wp_error( $release ) ) {
			$ttl = (int) $release->get_error_data();

			set_site_transient(
				self::CACHE_KEY,
				[
					'error_code' => $release->get_error_code(),
					'error_message' => $release->get_error_message(),
				],
				$ttl > 0 ? $ttl : self::FAILURE_TTL
			);

			return $release;
		}

		set_site_transient( self::CACHE_KEY, $release, self::CACHE_TTL );

		return $release;
	}

	/**
	 * @return array|\WP_Error The error data holds the number of seconds the failure may be cached.
	 */
	private function fetch_release() {
		$repository = self::get_repository();
		$response = wp_remote_get(
			self::get_api_base() . '/repos/' . $repository . '/releases/latest',
			[
				'timeout' => 10,
				'headers' => [
					'Accept' => 'application/vnd.github+json',
					'X-GitHub-Api-Version' => '2022-11-28',
				],
				'user-agent' => 'Refraction/' . REFRACTION_VERSION . '; ' . home_url( '/' ),
			]
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_Error(
				'refraction_unreachable',
				sprintf(
					/* translators: %s: error message */
					__( 'Could not reach GitHub to check for updates (%s).', 'refraction' ),
					$response->get_error_message()
				),
				self::FAILURE_TTL
			);
		}

		$code = (int) wp_remote_retrieve_response_code( $response );

		if ( 404 === $code ) {
			return new \WP_Error(
				'refraction_no_release',
				sprintf(
					/* translators: %s: GitHub repository, owner/repo */
					__( 'GitHub has no published release for %s yet (it replied "not found"). Publish a release with a refraction.zip asset.', 'refraction' ),
					$repository
				),
				self::FAILURE_TTL
			);
		}

		if ( 429 === $code || ( 403 === $code && ( '0' === (string) wp_remote_retrieve_header( $response, 'x-ratelimit-remaining' ) || false !== stripos( (string) wp_remote_retrieve_body( $response ), 'rate limit' ) ) ) ) {
			$reset = (int) wp_remote_retrieve_header( $response, 'x-ratelimit-reset' );
			$wait = $reset > time() ? $reset - time() : 15 * MINUTE_IN_SECONDS;
			$wait = max( self::RATE_LIMIT_MIN_TTL, min( HOUR_IN_SECONDS, $wait ) );

			return new \WP_Error(
				'refraction_rate_limited',
				sprintf(
					/* translators: %d: minutes */
					__( 'GitHub rate limit reached (60 anonymous requests per hour per IP address). Try again in about %d minutes.', 'refraction' ),
					(int) ceil( $wait / MINUTE_IN_SECONDS )
				),
				$wait
			);
		}

		if ( 200 !== $code ) {
			return new \WP_Error(
				'refraction_http_error',
				sprintf(
					/* translators: %d: HTTP status code */
					__( 'GitHub answered the update check with HTTP %d.', 'refraction' ),
					$code
				),
				self::FAILURE_TTL
			);
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $data ) || empty( $data['tag_name'] ) ) {
			return new \WP_Error( 'refraction_bad_response', __( 'GitHub returned a release that Refraction could not read.', 'refraction' ), self::FAILURE_TTL );
		}

		if ( ! empty( $data['draft'] ) || ! empty( $data['prerelease'] ) ) {
			return new \WP_Error( 'refraction_no_release', __( 'The latest GitHub release is a draft or pre-release, so it is ignored.', 'refraction' ), self::FAILURE_TTL );
		}

		$version = ltrim( (string) $data['tag_name'], 'vV' );

		if ( ! preg_match( '/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/', $version ) ) {
			return new \WP_Error(
				'refraction_bad_version',
				sprintf(
					/* translators: %s: release tag */
					__( 'The latest release tag "%s" is not a version number like v1.2.3.', 'refraction' ),
					(string) $data['tag_name']
				),
				self::FAILURE_TTL
			);
		}

		$package = '';

		foreach ( (array) ( $data['assets'] ?? [] ) as $asset ) {
			if ( is_array( $asset ) && ( $asset['name'] ?? '' ) === self::ASSET_NAME && ! empty( $asset['browser_download_url'] ) ) {
				$package = (string) $asset['browser_download_url'];
				break;
			}
		}

		// Plain http is only accepted when the API base was overridden on purpose (tests, local mirrors).
		if ( 0 !== strpos( $package, 'https://' ) && ! ( ! self::uses_default_api_base() && 0 === strpos( $package, 'http://' ) ) ) {
			return new \WP_Error(
				'refraction_no_asset',
				sprintf(
					/* translators: 1: release version, 2: asset file name */
					__( 'Release %1$s has no %2$s asset to install. Attach the zip to the release.', 'refraction' ),
					$version,
					self::ASSET_NAME
				),
				self::FAILURE_TTL
			);
		}

		$url = isset( $data['html_url'] ) && 0 === strpos( (string) $data['html_url'], self::uses_default_api_base() ? 'https://' : 'http' )
			? (string) $data['html_url']
			: 'https://github.com/' . self::get_repository();

		$notes = isset( $data['body'] ) ? trim( (string) $data['body'] ) : '';

		return [
			'version' => $version,
			'package' => $package,
			'url' => $url,
			'published' => isset( $data['published_at'] ) ? (string) $data['published_at'] : '',
			'changelog' => '' === $notes ? '<p>' . esc_html__( 'No release notes.', 'refraction' ) . '</p>' : wpautop( esc_html( $notes ) ),
		];
	}

	/**
	 * Adds "Check for updates" to the row actions of the Refraction row on the Plugins screen.
	 *
	 * @param mixed $links Existing action links.
	 *
	 * @return mixed
	 */
	public function add_check_link( $links ) {
		if ( ! is_array( $links ) || ! current_user_can( 'update_plugins' ) ) {
			return $links;
		}

		$url = wp_nonce_url( add_query_arg( self::CHECK_ARG, '1', self_admin_url( 'plugins.php' ) ), self::CHECK_ARG );

		$links['refraction-check-update'] = sprintf(
			'<a href="%s">%s</a>',
			esc_url( $url ),
			esc_html__( 'Check for updates', 'refraction' )
		);

		return $links;
	}

	/**
	 * Runs on `load-plugins.php`: forces a fresh lookup, refreshes the `update_plugins` transient,
	 * stores the outcome for the notice and redirects back to the Plugins screen.
	 */
	public function handle_manual_check() {
		if ( ! isset( $_GET[ self::CHECK_ARG ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		if ( ! current_user_can( 'update_plugins' ) ) {
			wp_die( esc_html__( 'Sorry, you are not allowed to update plugins on this site.', 'refraction' ), 403 );
		}

		check_admin_referer( self::CHECK_ARG );

		set_site_transient( self::NOTICE_KEY . get_current_user_id(), $this->run_check(), MINUTE_IN_SECONDS );

		wp_safe_redirect( self_admin_url( 'plugins.php' ) );
		exit;
	}

	/**
	 * Forgets everything cached about Refraction updates, asks GitHub now and rebuilds the
	 * Refraction entry of the `update_plugins` transient (what `wp_update_plugins()` does for
	 * plugins, without also polling WordPress.org).
	 *
	 * @return array `type` (success|info|error) and `message` (plain text), `update_url` when an update exists.
	 */
	public function run_check(): array {
		delete_site_transient( self::CACHE_KEY );

		$release = $this->get_release( true );

		$transient = get_site_transient( 'update_plugins' );

		if ( ! is_object( $transient ) ) {
			$transient = new \stdClass();
		}

		$transient->last_checked = time();

		// Saving the transient runs inject_update(), which reads the result cached just above.
		set_site_transient( 'update_plugins', $transient );

		if ( is_wp_error( $release ) ) {
			return [
				'type' => 'error',
				'message' => $release->get_error_message(),
			];
		}

		if ( version_compare( $release['version'], REFRACTION_VERSION, '>' ) ) {
			return [
				'type' => 'info',
				/* translators: %s: version number */
				'message' => sprintf( __( 'Version %s is available.', 'refraction' ), $release['version'] ),
				'update_url' => wp_nonce_url( self_admin_url( 'update.php?action=upgrade-plugin&plugin=' . rawurlencode( REFRACTION_PLUGIN_BASE ) ), 'upgrade-plugin_' . REFRACTION_PLUGIN_BASE ),
				'details_url' => $release['url'],
			];
		}

		return [
			'type' => 'success',
			/* translators: %s: version number */
			'message' => sprintf( __( 'Refraction is up to date (%s).', 'refraction' ), REFRACTION_VERSION ),
		];
	}

	/**
	 * Shows the outcome of the last manual check (once) at the top of the Plugins screen.
	 */
	public function render_check_notice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		if ( ! $screen || 0 !== strpos( $screen->id, 'plugins' ) || ! current_user_can( 'update_plugins' ) ) {
			return;
		}

		$key = self::NOTICE_KEY . get_current_user_id();
		$result = get_site_transient( $key );

		if ( ! is_array( $result ) || empty( $result['message'] ) ) {
			return;
		}

		delete_site_transient( $key );

		$class = [
			'success' => 'notice-success',
			'info' => 'notice-info',
		][ $result['type'] ?? '' ] ?? 'notice-error';

		$extra = '';

		if ( ! empty( $result['update_url'] ) ) {
			$extra = ' <a href="' . esc_url( $result['update_url'] ) . '">' . esc_html__( 'Update now', 'refraction' ) . '</a>';

			if ( ! empty( $result['details_url'] ) ) {
				$extra .= ' | <a href="' . esc_url( $result['details_url'] ) . '" target="_blank" rel="noopener noreferrer">' . esc_html__( 'Release notes on GitHub', 'refraction' ) . '</a>';
			}
		}

		printf(
			'<div id="refraction-update-notice" class="notice %1$s is-dismissible"><p><strong>%2$s</strong> %3$s%4$s</p></div>',
			esc_attr( $class ),
			esc_html__( 'Refraction update check:', 'refraction' ),
			esc_html( (string) $result['message'] ),
			$extra // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts above.
		);
	}
}
