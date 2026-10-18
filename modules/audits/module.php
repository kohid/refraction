<?php

namespace Refraction\Modules\Audits;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Experiments\Manager as Experiments_Manager;
use Refraction\Modules\Audits\Data\Controller;
use Refraction\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Module extends BaseModule {

	const EXPERIMENT_NAME = 'e_page_audit';

	const REST_NAMESPACE = 'refraction/v1';

	const REQUIRED_CAPABILITY = 'manage_options';

	const PACKAGES = [
		'editor-props',
		'editor-styles',
		'editor-elements',
		'editor-floating-panels',
		'editor-audits',
	];

	public function __construct() {
		parent::__construct();

		if ( ! self::is_active() ) {
			return;
		}

		$this->register_data_controller();

		add_filter( 'refraction/editor/v2/packages', fn( $packages ) => $this->add_packages( $packages ) );
		add_action( 'refraction/editor/v2/scripts/enqueue', fn() => $this->print_inline_config() );
	}

	public function get_name(): string {
		return 'audits';
	}

	public static function get_experimental_data() {
		return [
			'name' => self::EXPERIMENT_NAME,
			'title' => esc_html__( 'Page Audit', 'refraction' ),
			'description' => esc_html__( 'Scan the current page for SEO, accessibility, performance, and best-practice issues directly from the editor.', 'refraction' ),
			'release_status' => Experiments_Manager::RELEASE_STATUS_BETA,
			'default' => Experiments_Manager::STATE_INACTIVE,
			'hidden' => true,
		];
	}

	public static function is_active(): bool {
		return Plugin::$instance->experiments->is_feature_active( self::EXPERIMENT_NAME );
	}

	public static function is_user_allowed(): bool {
		return current_user_can( self::REQUIRED_CAPABILITY );
	}

	public function register_data_controller(): void {
		Plugin::$instance->data_manager_v2->register_controller( new Controller() );
	}

	private function add_packages( array $packages ): array {
		if ( ! self::is_user_allowed() ) {
			return $packages;
		}

		return array_merge( $packages, self::PACKAGES );
	}

	private function print_inline_config(): void {
		if ( ! self::is_user_allowed() ) {
			return;
		}

		wp_add_inline_script(
			'refraction-v2-editor-audits',
			'window.refractionAudits = ' . wp_json_encode( [
				'restNamespace' => self::REST_NAMESPACE,
				'nonce' => wp_create_nonce( 'wp_rest' ),
			] ) . ';',
			'before'
		);
	}
}
