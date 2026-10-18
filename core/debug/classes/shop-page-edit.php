<?php
namespace Refraction\Core\Debug\Classes;

class Shop_Page_Edit extends Inspection_Base {

	public function run() {
		return false;
	}

	public function get_name() {
		return 'shop-page-edit';
	}

	public function get_message() {
		return esc_html__( 'You are trying to edit the Shop Page although it is a Product Archive. Use the Theme Builder to create your Shop Archive template instead', 'refraction' );
	}

	public function get_help_doc_url() {
		return '';
	}

	public function get_header_message() {
		return esc_html__( 'Sorry, The content area was not been found on your page', 'refraction' );
	}
}
