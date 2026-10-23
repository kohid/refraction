<?php
/**
 * Standalone test for the WooCommerce builder logic (no WordPress, no WooCommerce, no database): product
 * conditions, which request each WooCommerce template location may serve, Preview Settings kinds and the
 * settings sanitising helpers.
 *
 * Run: php scripts/test-woocommerce.php
 */

namespace {
	putenv( 'TB_TEST_LIB=1' );
	require __DIR__ . '/test-theme-builder-engine.php';

	function esc_html( $text ) {
		return $text;
	}

	function apply_filters( $hook, $value ) {
		return $value;
	}

	function sanitize_text_field( $text ) {
		return trim( strip_tags( (string) $text ) );
	}

	spl_autoload_register( function ( $class ) {
		$prefix = 'Refraction\\Modules\\Woocommerce\\';

		if ( 0 !== strpos( $class, $prefix ) ) {
			return;
		}

		$parts = array_map( fn( $p ) => str_replace( '_', '-', strtolower( $p ) ), explode( '\\', substr( $class, strlen( $prefix ) ) ) );
		$file = dirname( __DIR__ ) . '/modules/woocommerce/' . implode( '/', $parts ) . '.php';

		if ( is_file( $file ) ) {
			require_once $file;
		}
	} );
}

namespace Refraction\Tests\Woocommerce {

	use Refraction\Modules\ThemeBuilder\Classes\Conditions_Manager;
	use Refraction\Modules\ThemeBuilder\Classes\Location_Scope;
	use Refraction\Modules\ThemeBuilder\Classes\Preview_Target;
	use Refraction\Modules\ThemeBuilder\Classes\Resolver;
	use Refraction\Modules\ThemeBuilder\Classes\Rule;
	use Refraction\Modules\Woocommerce\Classes\Conditions\Woocommerce;
	use Refraction\Modules\Woocommerce\Classes\Settings;
	use Refraction\Modules\Woocommerce\Classes\Woo_Environment;
	use Refraction\Modules\Woocommerce\Classes\Woo_Locations;
	use Refraction\Tests\ThemeBuilder\Fake_Environment;

	use function Refraction\Tests\ThemeBuilder\check;

	class Fake_Woo_Environment extends Fake_Environment implements Woo_Environment {
		public array $w = [];

		public function __construct( array $facts = [] ) {
			parent::__construct( $facts );
			$this->w = ( $facts['woo'] ?? [] ) + [
				'product' => false, 'product_id' => 0, 'terms' => [], 'type' => 'simple', 'on_sale' => false, 'in_stock' => true,
				'shop' => false, 'archive' => false, 'tax' => [ '', 0 ], 'cart' => false, 'checkout' => false, 'received' => false,
				'account' => false, 'endpoint' => '',
			];
		}

		public function is_product(): bool {
			return $this->w['product'];
		}

		public function product_id(): int {
			return $this->w['product_id'];
		}

		public function product_in_term( string $taxonomy, int $term_id ): bool {
			return in_array( $taxonomy . ':' . $term_id, $this->w['terms'], true );
		}

		public function product_type(): string {
			return $this->w['type'];
		}

		public function product_on_sale(): bool {
			return $this->w['on_sale'];
		}

		public function product_in_stock(): bool {
			return $this->w['in_stock'];
		}

		public function is_shop(): bool {
			return $this->w['shop'];
		}

		public function is_product_archive(): bool {
			return $this->w['archive'];
		}

		public function is_product_tax_archive( string $taxonomy, int $term_id = 0 ): bool {
			[ $tax, $term ] = $this->w['tax'];

			return '' !== $tax && $tax === $taxonomy && ( 0 === $term_id || $term === $term_id );
		}

		public function is_cart(): bool {
			return $this->w['cart'];
		}

		public function is_checkout(): bool {
			return $this->w['checkout'] && ! $this->w['received'];
		}

		public function is_order_received(): bool {
			return $this->w['received'];
		}

		public function is_account(): bool {
			return $this->w['account'];
		}

		public function account_endpoint(): string {
			return $this->w['endpoint'];
		}
	}

	Conditions_Manager::register( Woocommerce::class );
	Woo_Locations::register_scopes();

	$score = fn( array $rules, array $facts ) => ( new Conditions_Manager( new Fake_Woo_Environment( $facts ) ) )->match( $rules );
	$scope = fn( string $loc, array $facts ) => Location_Scope::applies( $loc, new Fake_Woo_Environment( $facts ) );

	$product = [ 'singular' => true, 'post_type' => 'product', 'post_id' => 31, 'woo' => [ 'product' => true, 'product_id' => 31, 'terms' => [ 'product_cat:9', 'product_tag:4' ], 'type' => 'variable', 'on_sale' => true ] ];
	$shop = [ 'archive' => true, 'pt_archive' => 'product', 'woo' => [ 'shop' => true, 'archive' => true ] ];
	$cat = [ 'archive' => true, 'tax_archive' => [ 'product_cat', 9 ], 'woo' => [ 'archive' => true, 'tax' => [ 'product_cat', 9 ] ] ];
	$cart = [ 'singular' => true, 'post_type' => 'page', 'post_id' => 5, 'woo' => [ 'cart' => true ] ];
	$checkout = [ 'singular' => true, 'post_type' => 'page', 'post_id' => 6, 'woo' => [ 'checkout' => true ] ];
	$received = [ 'singular' => true, 'post_type' => 'page', 'post_id' => 6, 'woo' => [ 'checkout' => true, 'received' => true ] ];
	$account = [ 'singular' => true, 'post_type' => 'page', 'post_id' => 7, 'woo' => [ 'account' => true, 'endpoint' => 'orders' ] ];
	$page = [ 'singular' => true, 'post_type' => 'page', 'post_id' => 8 ];

	// --- Rule parsing --------------------------------------------------------------------------------
	check( 'parse product rule', Rule::parse( 'include/woocommerce/product' )->to_string(), 'include/woocommerce/product' );
	check( 'parse product by id', Rule::parse( 'include/woocommerce/product/31' )->to_string(), 'include/woocommerce/product/31' );
	check( 'parse category rule', Rule::parse( 'exclude/woocommerce/product_cat/9' )->to_string(), 'exclude/woocommerce/product_cat/9' );
	check( 'parse type rule', Rule::parse( 'include/woocommerce/type/variable' )->to_string(), 'include/woocommerce/type/variable' );
	check( 'parse account endpoint', Rule::parse( 'include/woocommerce/account/orders' )->to_string(), 'include/woocommerce/account/orders' );
	check( 'reject non numeric product id', Rule::parse( 'include/woocommerce/product/abc' ), null );
	check( 'reject category without id', Rule::parse( 'include/woocommerce/product_cat' ), null );
	check( 'reject type without slug', Rule::parse( 'include/woocommerce/type' ), null );
	check( 'reject unknown type', Rule::parse( 'include/woocommerce/type/<b>' ), null );
	check( 'reject cart with args', Rule::parse( 'include/woocommerce/cart/1' ), null );
	check( 'reject unknown woocommerce word', Rule::parse( 'include/woocommerce/everything' ), null );
	check( 'reject zero id', Rule::parse( 'include/woocommerce/product/0' ), null );

	// --- Product conditions ----------------------------------------------------------------------------
	check( 'all woocommerce matches a product', $score( [ 'include/woocommerce' ], $product ), 10.0 );
	check( 'all woocommerce skips ordinary pages', $score( [ 'include/woocommerce' ], $page ), null );
	check( 'all woocommerce matches the shop', $score( [ 'include/woocommerce' ], $shop ), 10.0 );
	check( 'all products', $score( [ 'include/woocommerce/product' ], $product ), 30.0 );
	check( 'products do not match a page', $score( [ 'include/woocommerce/product' ], $page ), null );
	check( 'one product by id', $score( [ 'include/woocommerce/product/31' ], $product ), 100.0 );
	check( 'other product id', $score( [ 'include/woocommerce/product/32' ], $product ), null );
	check( 'product in category', $score( [ 'include/woocommerce/product_cat/9' ], $product ), 60.0 );
	check( 'product not in category', $score( [ 'include/woocommerce/product_cat/10' ], $product ), null );
	check( 'product with tag', $score( [ 'include/woocommerce/product_tag/4' ], $product ), 60.0 );
	check( 'product type', $score( [ 'include/woocommerce/type/variable' ], $product ), 60.0 );
	check( 'wrong product type', $score( [ 'include/woocommerce/type/simple' ], $product ), null );
	check( 'on sale', $score( [ 'include/woocommerce/on_sale' ], $product ), 50.0 );
	check( 'not on sale', $score( [ 'include/woocommerce/on_sale' ], [ 'woo' => [ 'on_sale' => false ] ] + $product ), null );
	check( 'in stock', $score( [ 'include/woocommerce/in_stock' ], $product ), 50.0 );
	check( 'out of stock', $score( [ 'include/woocommerce/in_stock' ], [ 'woo' => [ 'product' => true, 'in_stock' => false ] ] + $product ), null );
	check( 'exclude by category beats include', $score( [ 'include/woocommerce/product', 'exclude/woocommerce/product_cat/9' ], $product ), null );
	check( 'exclude of another category keeps it', $score( [ 'include/woocommerce/product', 'exclude/woocommerce/product_cat/10' ], $product ), 30.0 );
	check( 'exclude by id', $score( [ 'include/woocommerce/product', 'exclude/woocommerce/product/31' ], $product ), null );
	check( 'most specific rule wins', $score( [ 'include/woocommerce/product', 'include/woocommerce/product/31' ], $product ), 100.0 );

	// --- Archives and pages -----------------------------------------------------------------------------
	check( 'shop', $score( [ 'include/woocommerce/shop' ], $shop ), 30.0 );
	check( 'shop skips a category archive', $score( [ 'include/woocommerce/shop' ], $cat ), null );
	check( 'any product archive matches the shop', $score( [ 'include/woocommerce/archive' ], $shop ), 30.0 );
	check( 'any product archive matches a category', $score( [ 'include/woocommerce/archive' ], $cat ), 30.0 );
	check( 'category archive any', $score( [ 'include/woocommerce/cat_archive' ], $cat ), 40.0 );
	check( 'category archive by id', $score( [ 'include/woocommerce/cat_archive/9' ], $cat ), 60.0 );
	check( 'category archive other id', $score( [ 'include/woocommerce/cat_archive/3' ], $cat ), null );
	check( 'cart', $score( [ 'include/woocommerce/cart' ], $cart ), 30.0 );
	check( 'cart skips the checkout', $score( [ 'include/woocommerce/cart' ], $checkout ), null );
	check( 'checkout', $score( [ 'include/woocommerce/checkout' ], $checkout ), 30.0 );
	check( 'checkout rule skips order received', $score( [ 'include/woocommerce/checkout' ], $received ), null );
	check( 'order received', $score( [ 'include/woocommerce/order_received' ], $received ), 30.0 );
	check( 'account', $score( [ 'include/woocommerce/account' ], $account ), 30.0 );
	check( 'account endpoint', $score( [ 'include/woocommerce/account/orders' ], $account ), 60.0 );
	check( 'other account endpoint', $score( [ 'include/woocommerce/account/downloads' ], $account ), null );

	// --- Plain environment (no Woo facts) is never a Woo page ---------------------------------------------
	check( 'a plain environment is not a product page', ( new Conditions_Manager( new Fake_Environment( $page ) ) )->match( [ 'include/woocommerce/product' ] ), null );

	// --- Locations: which request each template type may serve --------------------------------------------
	check( 'product location on a product', $scope( 'product', $product ), true );
	check( 'product location not on a page', $scope( 'product', $page ), false );
	check( 'product location not on the shop', $scope( 'product', $shop ), false );
	check( 'product archive on the shop', $scope( 'product-archive', $shop ), true );
	check( 'product archive on a category', $scope( 'product-archive', $cat ), true );
	check( 'product archive not on a product', $scope( 'product-archive', $product ), false );
	check( 'cart location', $scope( 'cart', $cart ), true );
	check( 'cart location not on checkout', $scope( 'cart', $checkout ), false );
	check( 'checkout location', $scope( 'checkout', $checkout ), true );
	check( 'checkout location not on order received', $scope( 'checkout', $received ), false );
	check( 'purchase summary on order received', $scope( 'purchase-summary', $received ), true );
	check( 'purchase summary not on checkout', $scope( 'purchase-summary', $checkout ), false );
	check( 'my account location', $scope( 'my-account', $account ), true );
	check( 'my account not on cart', $scope( 'my-account', $cart ), false );
	check( 'existing single location still works', $scope( 'single', $page ), true );
	check( 'woo locations come first in the body order', array_slice( Location_Scope::body_locations(), 0, 6 ), [ 'product', 'product-archive', 'cart', 'checkout', 'purchase-summary', 'my-account' ] );
	check( 'woo locations are body locations', Location_Scope::is_body_location( 'cart' ), true );

	$resolver = new Resolver( new Conditions_Manager( new Fake_Woo_Environment( $product ) ) );
	check( 'resolver picks the category template over the general one', $resolver->pick( [ 10 => [ 'rules' => [ 'include/woocommerce/product' ], 'modified' => 1 ], 11 => [ 'rules' => [ 'include/woocommerce/product_cat/9' ], 'modified' => 1 ] ], 'product' ), 11 );
	check( 'resolver returns nothing for a page', ( new Resolver( new Conditions_Manager( new Fake_Woo_Environment( $page ) ) ) )->pick( [ 10 => [ 'rules' => [ 'include/woocommerce/product' ], 'modified' => 1 ] ], 'product' ), 0 );

	// --- Preview Settings -----------------------------------------------------------------------------------
	check( 'product preview kinds', Preview_Target::allowed_kinds( 'product' ), [ 'post' ] );
	check( 'product archive preview kinds', Preview_Target::allowed_kinds( 'product-archive' ), [ 'term', 'postype' ] );
	check( 'purchase summary preview kinds', Preview_Target::allowed_kinds( 'purchase-summary' ), [ 'order' ] );
	check( 'cart preview kinds', Preview_Target::allowed_kinds( 'cart' ), [ 'post' ] );
	check( 'product default source', Preview_Target::default_source( 'product' ), 'post:product' );
	check( 'archive default source', Preview_Target::default_source( 'product-archive' ), 'postype:product' );
	check( 'summary default source', Preview_Target::default_source( 'purchase-summary' ), 'order:shop_order' );
	check( 'order source parses', Preview_Target::parse_source( 'order:shop_order' ), [ 'kind' => 'order', 'sub' => 'shop_order' ] );
	check( 'order source sanitised', Preview_Target::sanitize( 'purchase-summary', [ 'source' => 'order:shop_order', 'id' => '12' ] )['id'], 12 );
	check( 'a page source is refused for a summary', Preview_Target::sanitize( 'purchase-summary', [ 'source' => 'post:page' ] )['source'], 'order:shop_order' );

	// --- Settings sanitising -------------------------------------------------------------------------------------
	check( 'columns are clamped', Settings::columns( 12 ), 6 );
	check( 'columns minimum', Settings::columns( 0 ), 1 );
	check( 'columns from text', Settings::columns( '3' ), 3 );
	check( 'orderby whitelist', Settings::orderby( 'popularity' ), 'popularity' );
	check( 'orderby rejects junk', Settings::orderby( 'ID; DROP' ), 'date' );
	check( 'order direction', Settings::order( 'asc' ), 'ASC' );
	check( 'order direction junk', Settings::order( 'sideways' ), 'DESC' );
	check( 'limit is clamped', Settings::limit( 5000 ), 100 );
	check( 'limit minimum', Settings::limit( -3 ), 1 );
	check( 'ids are cleaned', Settings::ids( [ '4', 'x', 0, 7, '7' ] ), [ 4, 7 ] );
	check( 'mini cart mode whitelist', Settings::cart_mode( 'offcanvas' ), 'offcanvas' );
	check( 'mini cart mode junk', Settings::cart_mode( 'x' ), 'dropdown' );

	echo "\n$passes passed, $failures failed\n";
	exit( $failures ? 1 : 0 );
}
