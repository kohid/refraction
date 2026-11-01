<?php
namespace Refraction\Modules\AskClaude;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Modules\AskClaude\Classes\Key_Store;
use Refraction\Modules\AskClaude\Classes\Rest;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Ask Claude: a panel in the editor that builds a page, a section, or a new version of the selected element from a
 * prompt (and reference images), using Refraction's own widgets. It calls Anthropic's API with the site's own API key,
 * only when someone presses Generate; nothing else in Refraction makes such calls. Needs PHP 8.1+ (the official SDK);
 * on older PHP the panel explains that and nothing is called.
 */
class Module extends BaseModule {

	const SCRIPT = 'refraction-ask-claude';

	public function get_name() {
		return 'ask-claude';
	}

	public static function php_ok(): bool {
		return version_compare( PHP_VERSION, '8.1', '>=' ) && function_exists( 'sodium_crypto_secretbox' );
	}

	/** Anyone who can edit pages may ask; only administrators manage the key. */
	public static function can_use(): bool {
		return current_user_can( 'edit_posts' );
	}

	public function __construct() {
		parent::__construct();

		add_action( 'rest_api_init', [ new Rest(), 'register' ] );
		add_action( 'refraction/editor/before_enqueue_scripts', [ $this, 'enqueue' ] );
	}

	public function enqueue(): void {
		if ( ! self::can_use() ) {
			return;
		}

		$min = \Refraction\Utils::is_script_debug() ? '' : '.min';
		wp_enqueue_media();
		wp_enqueue_style( self::SCRIPT, REFRACTION_ASSETS_URL . 'css/modules/ask-claude/editor' . $min . '.css', [], REFRACTION_VERSION );
		wp_enqueue_script( self::SCRIPT, REFRACTION_ASSETS_URL . 'js/ask-claude-editor' . $min . '.js', [ 'react', 'react-dom', 'refraction-v2-ui', 'refraction-v2-icons', 'refraction-v2-editor-app-bar', 'wp-api-fetch', 'wp-i18n' ], REFRACTION_VERSION, true );
		wp_localize_script( self::SCRIPT, 'refractionAskClaude', [
			'phpOk' => self::php_ok(),
			'hasKey' => self::php_ok() && Key_Store::has_key(),
			'masked' => self::php_ok() ? Key_Store::masked() : '',
			'canManage' => current_user_can( 'manage_options' ),
			'model' => Key_Store::model(),
			'models' => [
				'claude-opus-5-5' => __( 'Claude Opus 5.5 (best design, slower)', 'refraction' ),
				'claude-sonnet-5-5' => __( 'Claude Sonnet 5.5 (fast)', 'refraction' ),
				'claude-haiku-5-5' => __( 'Claude Haiku 5.5 (fastest, simple pages)', 'refraction' ),
			],
			'route' => 'refraction/v1/ask-claude',
			'maxPrompt' => \Refraction\Modules\AskClaude\Classes\Rest::MAX_PROMPT,
		] );
	}
}
