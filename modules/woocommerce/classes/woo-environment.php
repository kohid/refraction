<?php
namespace Refraction\Modules\Woocommerce\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * What the WooCommerce conditions need to know about the current request. Wp_Woo_Environment answers from
 * WooCommerce; tests script the answers with a fake that also implements the Theme Builder Environment.
 */
interface Woo_Environment {

	/** A single product page. */
	public function is_product(): bool;

	public function product_id(): int;

	/** Whether the current product has the term (product_cat, product_tag...). */
	public function product_in_term( string $taxonomy, int $term_id ): bool;

	/** `simple`, `variable`, `grouped`, `external`... */
	public function product_type(): string;

	public function product_on_sale(): bool;

	public function product_in_stock(): bool;

	public function is_shop(): bool;

	/** The shop, a product category or tag archive, or a product search. */
	public function is_product_archive(): bool;

	/** An archive of the product taxonomy; with a term id only when it is that term. */
	public function is_product_tax_archive( string $taxonomy, int $term_id = 0 ): bool;

	public function is_cart(): bool;

	/** The checkout form, not the order received page. */
	public function is_checkout(): bool;

	public function is_order_received(): bool;

	public function is_account(): bool;

	/** The My Account endpoint being shown: `orders`, `edit-account`..., an empty string for the dashboard. */
	public function account_endpoint(): string;
}
