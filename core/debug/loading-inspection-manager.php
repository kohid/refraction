<?php
namespace Refraction\Core\Debug;

use Refraction\Core\Debug\Classes\Inspection_Base;
use Refraction\Core\Debug\Classes\Shop_Page_Edit;
use Refraction\Core\Debug\Classes\Theme_Missing;
use Refraction\Core\Debug\Classes\Htaccess;
use Refraction\Utils;

class Loading_Inspection_Manager {

	public static $_instance = null;

	public static function instance() {
		if ( null === self::$_instance ) {
			self::$_instance = new Loading_Inspection_Manager();
		}
		return self::$_instance;
	}

	/** @var Inspection_Base[] */
	private $inspections = [];

	public function register_inspections() {
		$this->inspections['theme-missing'] = new Theme_Missing();
		$this->inspections['htaccess'] = new Htaccess();

		$is_editing_shop_page = Utils::get_super_global_value( $_GET, 'post' ) == get_option( 'woocommerce_shop_page_id' );
		if ( $is_editing_shop_page ) {
			$this->inspections['shop-page-edit'] = new Shop_Page_Edit();
		}
	}

	/**
	 * @param Inspection_Base $inspection
	 */
	public function register_inspection( $inspection ) {
		$this->inspections[ $inspection->get_name() ] = $inspection;
	}

	public function run_inspections() {
		$debug_data = [
			'message' => esc_html__( "We’re sorry, but something went wrong. Click on 'Learn more' and follow each of the steps to quickly solve it.", 'refraction' ),
			'header' => esc_html__( 'The preview could not be loaded', 'refraction' ),
			'doc_url' => '',
		];
		foreach ( $this->inspections as $inspection ) {
			if ( ! $inspection->run() ) {
				$debug_data = [
					'message' => $inspection->get_message(),
					'header' => $inspection->get_header_message(),
					'doc_url' => $inspection->get_help_doc_url(),
					'error' => true,
				];
				break;
			}
		}

		return $debug_data;
	}
}
