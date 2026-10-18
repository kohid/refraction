<?php

namespace Refraction\Modules\SiteNavigation;

use Refraction\Core\Base\Module as Module_Base;
use Refraction\Core\Experiments\Exceptions\Dependency_Exception;
use Refraction\Core\Experiments\Manager as Experiments_Manager;
use Refraction\Modules\SiteNavigation\Data\Controller;
use Refraction\Modules\SiteNavigation\Rest_Fields\Page_User_Can;
use Refraction\Plugin;
use Refraction\Utils;


if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Module extends Module_Base {
	const PAGES_PANEL_EXPERIMENT_NAME = 'pages_panel';
	const PACKAGES = [
		'editor-site-navigation',
	];
	/**
	 * Initialize the Site navigation module.
	 *
	 * @return void
	 * @throws \Exception If the experiment registration fails.
	 */
	public function __construct() {
		Plugin::$instance->data_manager_v2->register_controller( new Controller() );

		$this->register_pages_panel_experiment();

		add_filter( 'refraction/editor/v2/packages', fn( $packages ) => $this->add_packages( $packages ) );

		add_filter( 'refraction/editor/v2/scripts/env', function( $env ) {
			$env['@refraction/editor-site-navigation'] = [
				'is_pages_panel_active' => Plugin::$instance->experiments->is_feature_active(
					self::PAGES_PANEL_EXPERIMENT_NAME
				),
			];

			return $env;
		} );

		if ( Plugin::$instance->experiments->is_feature_active( self::PAGES_PANEL_EXPERIMENT_NAME ) ) {
			$this->register_rest_fields();
		}
	}

	/**
	 * Retrieve the module name.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'site-navigation';
	}

	/**
	 * Register Experiment
	 *
	 * @since 3.16.0
	 *
	 * @return void
	 */
	private function register_pages_panel_experiment() {
		Plugin::$instance->experiments->add_feature( [
			'name' => self::PAGES_PANEL_EXPERIMENT_NAME,
			'title' => esc_html__( 'Pages Panel', 'refraction' ),
			'release_status' => Experiments_Manager::RELEASE_STATUS_ALPHA,
			'default' => Experiments_Manager::STATE_INACTIVE,
			'hidden' => true,
		] );
	}

	private function register_rest_fields() {
		add_action( 'rest_api_init', function() {
			( new Page_User_Can() )->register_rest_field();
		} );
	}

	private function add_packages( $packages ) {
		return array_merge( $packages, self::PACKAGES );
	}
}
