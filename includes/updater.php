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
 * Point it at another repository with the `REFRACTION_UPDATE_REPOSITORY` constant (`owner/repo`)
 * or the `refraction/updater/repository` filter.
 *
 * The release must have an asset named `refraction.zip` whose top-level folder is `refraction/`.
 */
class Updater {

	const DEFAULT_REPOSITORY = 'kohid/refraction';

	const ASSET_NAME = 'refraction.zip';

	const SLUG = 'refraction';

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

	private function __construct() {
		add_filter( 'pre_set_site_transient_update_plugins', [ $this, 'inject_update' ] );
		add_filter( 'plugins_api', [ $this, 'plugin_information' ], 20, 3 );
		add_filter( 'upgrader_source_selection', [ $this, 'fix_source_directory' ], 10, 4 );
	}

	/**
	 * Adds Refraction to the list of plugins that have (or have no) update available.
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

		if ( ! $release ) {
			return $transient;
		}

		$item = (object) [
			'id' => 'github.com/' . self::get_repository(),
			'slug' => self::SLUG,
			'plugin' => REFRACTION_PLUGIN_BASE,
			'new_version' => $release['version'],
			'url' => $release['url'],
			'package' => $release['package'],
			'requires_php' => '7.4',
		];

		if ( version_compare( $release['version'], REFRACTION_VERSION, '>' ) ) {
			if ( ! isset( $transient->response ) || ! is_array( $transient->response ) ) {
				$transient->response = [];
			}

			$transient->response[ REFRACTION_PLUGIN_BASE ] = $item;

			unset( $transient->no_update[ REFRACTION_PLUGIN_BASE ] );
		} else {
			if ( ! isset( $transient->no_update ) || ! is_array( $transient->no_update ) ) {
				$transient->no_update = [];
			}

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

		if ( ! $release ) {
			return $result;
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
	 * The latest published release, normalised, or null when there is none or the lookup failed.
	 *
	 * @return array|null `version`, `package`, `url`, `published`, `changelog`.
	 */
	public function get_release() {
		$force = is_admin() && isset( $_GET['force-check'] ) && current_user_can( 'update_plugins' ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( ! $force ) {
			$cached = get_site_transient( self::CACHE_KEY );

			if ( false !== $cached ) {
				return is_array( $cached ) && isset( $cached['version'] ) ? $cached : null;
			}
		}

		$release = $this->fetch_release();

		if ( $release ) {
			set_site_transient( self::CACHE_KEY, $release, self::CACHE_TTL );

			return $release;
		}

		// Remember the failure for a while ('none' is not an array, so the cache branch above returns null).
		set_site_transient( self::CACHE_KEY, 'none', self::FAILURE_TTL );

		return null;
	}

	private function fetch_release() {
		$response = wp_remote_get(
			'https://api.github.com/repos/' . self::get_repository() . '/releases/latest',
			[
				'timeout' => 10,
				'headers' => [
					'Accept' => 'application/vnd.github+json',
					'X-GitHub-Api-Version' => '2022-11-28',
				],
				'user-agent' => 'Refraction/' . REFRACTION_VERSION . '; ' . home_url( '/' ),
			]
		);

		if ( is_wp_error( $response ) || 200 !== (int) wp_remote_retrieve_response_code( $response ) ) {
			return null;
		}

		$data = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( ! is_array( $data ) || ! empty( $data['draft'] ) || ! empty( $data['prerelease'] ) || empty( $data['tag_name'] ) ) {
			return null;
		}

		$version = ltrim( (string) $data['tag_name'], 'vV' );

		if ( ! preg_match( '/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/', $version ) ) {
			return null;
		}

		$package = '';

		foreach ( (array) ( $data['assets'] ?? [] ) as $asset ) {
			if ( is_array( $asset ) && ( $asset['name'] ?? '' ) === self::ASSET_NAME && ! empty( $asset['browser_download_url'] ) ) {
				$package = (string) $asset['browser_download_url'];
				break;
			}
		}

		if ( 0 !== strpos( $package, 'https://' ) ) {
			return null;
		}

		$url = isset( $data['html_url'] ) && 0 === strpos( (string) $data['html_url'], 'https://' )
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
}
