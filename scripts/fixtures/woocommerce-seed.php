<?php
/**
 * Seeds a throw-away test site for scripts/check-woocommerce.mjs: products of every type, categories, tags,
 * a customer with an order, Cash on Delivery, no WooCommerce tracking or marketplace suggestions.
 * Run: wp eval-file scripts/fixtures/woocommerce-seed.php (prints one JSON line with the IDs).
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$ids = [];

// WooCommerce's own network features off, so the debug log and the network stay clean.
update_option( 'woocommerce_allow_tracking', 'no' );
update_option( 'woocommerce_show_marketplace_suggestions', 'no' );
update_option( 'woocommerce_task_list_hidden', 'yes' );
update_option( 'woocommerce_task_list_complete', 'yes' );
update_option( 'woocommerce_onboarding_profile', [ 'skipped' => true ] );
update_option( 'woocommerce_default_country', 'US:CA' );
update_option( 'woocommerce_currency', 'USD' );
update_option( 'woocommerce_calc_taxes', 'no' );
update_option( 'woocommerce_ship_to_countries', 'disabled' );
update_option( 'woocommerce_enable_signup_and_login_from_checkout', 'no' );
update_option( 'woocommerce_enable_guest_checkout', 'yes' );
update_option( 'woocommerce_coming_soon', 'no' );
update_option( 'woocommerce_store_pages_only', 'no' );
update_option( 'woocommerce_cod_settings', [ 'enabled' => 'yes', 'title' => 'Cash on delivery', 'enable_for_methods' => [], 'enable_for_virtual' => 'yes' ] );
update_option( 'woocommerce_cheque_settings', [ 'enabled' => 'no' ] );
update_option( 'woocommerce_bacs_settings', [ 'enabled' => 'no' ] );
update_option( 'woocommerce_paypal_settings', [ 'enabled' => 'no' ] );
update_option( 'woocommerce_cart_redirect_after_add', 'no' );
update_option( 'woocommerce_enable_ajax_add_to_cart', 'yes' );
update_option( 'woocommerce_hide_out_of_stock_items', 'no' );
update_option( 'blog_public', 0 );

$term = static function ( string $name, string $taxonomy, int $parent = 0 ): int {
	$existing = term_exists( $name, $taxonomy );

	if ( $existing ) {
		return (int) ( is_array( $existing ) ? $existing['term_id'] : $existing );
	}

	$made = wp_insert_term( $name, $taxonomy, [ 'parent' => $parent ] );

	return (int) $made['term_id'];
};

$ids['cat_clothing'] = $term( 'Clothing', 'product_cat' );
$ids['cat_hoodies'] = $term( 'Hoodies', 'product_cat', $ids['cat_clothing'] );
$ids['cat_accessories'] = $term( 'Accessories', 'product_cat' );
$ids['tag_new'] = $term( 'New', 'product_tag' );
$ids['tag_gift'] = $term( 'Gift', 'product_tag' );

// Three tiny images for the gallery.
$png = base64_decode( 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' );
$upload = wp_upload_dir();
$images = [];

foreach ( [ 'tee-front', 'tee-back', 'tee-detail' ] as $slug ) {
	$file = $upload['path'] . '/' . $slug . '.png';
	file_put_contents( $file, $png );
	$images[] = wp_insert_attachment( [ 'post_mime_type' => 'image/png', 'post_title' => $slug, 'post_status' => 'inherit' ], $file );
}

$make = static function ( \WC_Product $product, array $args ) {
	$product->set_name( $args['name'] );
	$product->set_status( $args['status'] ?? 'publish' );
	$product->set_catalog_visibility( $args['visibility'] ?? 'visible' );
	$product->set_description( $args['content'] ?? '<p>Long description of ' . $args['name'] . '.</p>' );
	$product->set_short_description( $args['short'] ?? 'Short description of ' . $args['name'] . '.' );
	$product->set_sku( $args['sku'] ?? '' );

	if ( isset( $args['price'] ) ) {
		$product->set_regular_price( (string) $args['price'] );
	}

	if ( isset( $args['sale'] ) ) {
		$product->set_sale_price( (string) $args['sale'] );
	}

	if ( isset( $args['stock'] ) ) {
		$product->set_manage_stock( true );
		$product->set_stock_quantity( $args['stock'] );
		$product->set_stock_status( $args['stock'] > 0 ? 'instock' : 'outofstock' );
	}

	$product->set_category_ids( $args['cats'] ?? [] );
	$product->set_tag_ids( $args['tags'] ?? [] );
	$product->set_featured( ! empty( $args['featured'] ) );

	if ( isset( $args['weight'] ) ) {
		$product->set_weight( (string) $args['weight'] );
		$product->set_length( '10' );
		$product->set_width( '5' );
		$product->set_height( '2' );
	}

	if ( ! empty( $args['image'] ) ) {
		$product->set_image_id( $args['image'] );
		$product->set_gallery_image_ids( $args['gallery'] ?? [] );
	}

	return $product->save();
};

$ids['tee'] = $make( new \WC_Product_Simple(), [ 'name' => 'Basic Tee', 'sku' => 'TEE-1', 'price' => 20, 'sale' => 15, 'stock' => 10, 'cats' => [ $ids['cat_clothing'] ], 'tags' => [ $ids['tag_new'] ], 'weight' => 0.4, 'image' => $images[0], 'gallery' => [ $images[1], $images[2] ] ] );
$ids['hoodie'] = $make( new \WC_Product_Simple(), [ 'name' => 'Zip Hoodie', 'sku' => 'HOOD-1', 'price' => 45, 'stock' => 5, 'cats' => [ $ids['cat_hoodies'] ], 'featured' => true ] );
$ids['cap'] = $make( new \WC_Product_Simple(), [ 'name' => 'Canvas Cap', 'sku' => 'CAP-1', 'price' => 12, 'stock' => 0, 'cats' => [ $ids['cat_accessories'] ], 'tags' => [ $ids['tag_gift'] ] ] );
$ids['scarf'] = $make( new \WC_Product_Simple(), [ 'name' => 'Wool Scarf', 'sku' => 'SCARF-1', 'price' => 30, 'stock' => 8, 'cats' => [ $ids['cat_accessories'] ], 'tags' => [ $ids['tag_gift'], $ids['tag_new'] ] ] );

// Variable product with a Size attribute.
$variable = new \WC_Product_Variable();
$attribute = new \WC_Product_Attribute();
$attribute->set_name( 'Size' );
$attribute->set_options( [ 'S', 'M', 'L' ] );
$attribute->set_position( 0 );
$attribute->set_visible( true );
$attribute->set_variation( true );
$variable->set_attributes( [ $attribute ] );
$ids['variable'] = $make( $variable, [ 'name' => 'Logo Shirt', 'sku' => 'SHIRT', 'cats' => [ $ids['cat_clothing'] ] ] );

foreach ( [ 'S' => 25, 'M' => 27, 'L' => 30 ] as $size => $price ) {
	$variation = new \WC_Product_Variation();
	$variation->set_parent_id( $ids['variable'] );
	$variation->set_attributes( [ 'size' => $size ] );
	$variation->set_regular_price( (string) $price );
	$variation->set_manage_stock( true );
	$variation->set_stock_quantity( 20 );
	$variation->set_stock_status( 'instock' );
	$variation->set_sku( 'SHIRT-' . $size );
	$variation->save();
}

\WC_Product_Variable::sync( $ids['variable'] );

$ids['external'] = $make( new \WC_Product_External(), [ 'name' => 'Partner Mug', 'sku' => 'MUG', 'price' => 9, 'cats' => [ $ids['cat_accessories'] ] ] );
$external = wc_get_product( $ids['external'] );
$external->set_product_url( 'https://example.com/mug' );
$external->set_button_text( 'Buy at partner' );
$external->save();

$grouped = new \WC_Product_Grouped();
$ids['grouped'] = $make( $grouped, [ 'name' => 'Starter Bundle', 'sku' => 'BUNDLE', 'cats' => [ $ids['cat_clothing'] ] ] );
$grouped = wc_get_product( $ids['grouped'] );
$grouped->set_children( [ $ids['tee'], $ids['hoodie'] ] );
$grouped->save();

// Draft and private products must never show to visitors.
$ids['draft'] = $make( new \WC_Product_Simple(), [ 'name' => 'Secret Draft', 'sku' => 'DRAFT', 'price' => 1, 'status' => 'draft', 'cats' => [ $ids['cat_clothing'] ] ] );
$ids['private'] = $make( new \WC_Product_Simple(), [ 'name' => 'Private Item', 'sku' => 'PRIV', 'price' => 1, 'status' => 'private', 'cats' => [ $ids['cat_clothing'] ] ] );
$ids['hidden'] = $make( new \WC_Product_Simple(), [ 'name' => 'Hidden From Catalog', 'sku' => 'HIDE', 'price' => 3, 'visibility' => 'hidden', 'cats' => [ $ids['cat_clothing'] ] ] );

// Linked products and a review.
$tee = wc_get_product( $ids['tee'] );
$tee->set_upsell_ids( [ $ids['hoodie'] ] );
$tee->save();

$comment = wp_insert_comment( [ 'comment_post_ID' => $ids['tee'], 'comment_author' => 'Reviewer', 'comment_author_email' => 'r@example.com', 'comment_content' => 'Great tee, fits well.', 'comment_type' => 'review', 'comment_approved' => 1 ] );
add_comment_meta( $comment, 'rating', 5 );
$ids['review'] = $comment;
\WC_Comments::get_rating_counts_for_product( wc_get_product( $ids['tee'] ) );
$tee = wc_get_product( $ids['tee'] );
$tee->set_average_rating( 5 );
$tee->set_review_count( 1 );
$tee->set_rating_counts( [ 5 => 1 ] );
$tee->save();

// A customer with an order, so My Account and Purchase Summary have data.
$customer = get_user_by( 'login', 'customer' );
$customer_id = $customer ? $customer->ID : wp_insert_user( [ 'user_login' => 'customer', 'user_pass' => 'customer', 'user_email' => 'customer@example.com', 'role' => 'customer', 'first_name' => 'Casey', 'last_name' => 'Customer' ] );
$ids['customer'] = (int) $customer_id;

$address = [ 'first_name' => 'Casey', 'last_name' => 'Customer', 'address_1' => '1 Test Street', 'city' => 'Springfield', 'state' => 'CA', 'postcode' => '90001', 'country' => 'US', 'email' => 'customer@example.com', 'phone' => '5551234567' ];
$order = wc_create_order( [ 'customer_id' => $customer_id ] );
$order->add_product( wc_get_product( $ids['hoodie'] ), 2 );
$order->set_address( $address, 'billing' );
$order->set_address( $address, 'shipping' );
$order->set_payment_method( 'cod' );
$order->calculate_totals();
$order->set_status( 'processing' );
$order->save();
$ids['order'] = $order->get_id();
$ids['order_key'] = $order->get_order_key();

// Pages that exist after WooCommerce's install.
foreach ( [ 'shop', 'cart', 'checkout', 'myaccount' ] as $page ) {
	$ids[ 'page_' . $page ] = (int) wc_get_page_id( $page );
}

$ids['sample_page'] = wp_insert_post( [ 'post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Plain Page', 'post_content' => '<p>An ordinary page.</p>' ] );

$wp_rewrite = $GLOBALS['wp_rewrite'];
$wp_rewrite->set_permalink_structure( '/%postname%/' );
update_option( 'woocommerce_permalinks', [ 'product_base' => '/product', 'category_base' => 'product-category', 'tag_base' => 'product-tag', 'attribute_base' => '' ] );
flush_rewrite_rules( false );

echo "\n" . wp_json_encode( $ids ) . "\n";
