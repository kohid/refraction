<?php
namespace Refraction\Modules\Woocommerce;

use Refraction\Core\Base\Module as BaseModule;
use Refraction\Core\Documents_Manager;
use Refraction\Modules\ThemeBuilder\Classes\Conditions_Manager;
use Refraction\Modules\Woocommerce\Classes\Conditions\Woocommerce as Woocommerce_Condition;
use Refraction\Modules\Woocommerce\Classes\Preview;
use Refraction\Modules\Woocommerce\Classes\Woo_Locations;
use Refraction\Modules\Woocommerce\Documents\Cart;
use Refraction\Modules\Woocommerce\Documents\Checkout;
use Refraction\Modules\Woocommerce\Documents\My_Account;
use Refraction\Modules\Woocommerce\Documents\Product;
use Refraction\Modules\Woocommerce\Documents\Product_Archive;
use Refraction\Modules\Woocommerce\Documents\Purchase_Summary;
use Refraction\Modules\Woocommerce\Documents\Woo_Document;
use Refraction\Modules\Woocommerce\Widgets\Woo_Widget_Base;
use Refraction\Plugin;
use Refraction\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * WooCommerce builder: Theme Builder templates for the product, shop, cart, checkout, My Account and order
 * received pages, plus the WooCommerce widgets. Nothing is registered unless WooCommerce is active.
 *
 * See docs/refraction/woocommerce.md.
 */
class Module extends BaseModule {

	public function get_name() {
		return 'woocommerce';
	}

	public static function is_active() {
		return class_exists( 'WooCommerce' );
	}

	protected function get_widgets() {
		return [
			'Products',
			'Product_Categories',
			'Product_Title',
			'Product_Images',
			'Product_Price',
			'Product_Rating',
			'Product_Stock',
			'Product_Meta',
			'Product_Short_Description',
			'Product_Content',
			'Product_Data_Tabs',
			'Additional_Information',
			'Upsells',
			'Related_Products',
			'Add_To_Cart',
			'Menu_Cart',
			'Cart',
			'Checkout',
			'My_Account',
			'Purchase_Summary',
			'Order_Tracking',
			'Notices',
			'Woo_Breadcrumb',
		];
	}

	public function __construct() {
		parent::__construct();

		Woo_Locations::register_scopes();
		Conditions_Manager::register( Woocommerce_Condition::class );

		new Preview();

		add_action( 'refraction/documents/register', [ $this, 'register_documents' ] );
		add_action( 'refraction/elements/categories_registered', [ $this, 'register_category' ] );
		add_action( 'refraction/frontend/after_register_styles', [ $this, 'register_styles' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'register_scripts' ], 5 );
		add_filter( 'refraction/theme_builder/locations', [ $this, 'add_locations' ] );
		add_filter( 'refraction/theme_builder/admin_tabs', [ $this, 'add_tabs' ] );
		add_filter( 'refraction/theme_builder/glyph_shapes', [ $this, 'add_glyphs' ] );
		add_filter( 'refraction/theme_builder/location_classes', [ $this, 'add_location_classes' ], 10, 3 );
		add_filter( 'woocommerce_add_to_cart_fragments', [ $this, 'add_cart_data_fragment' ] );
	}

	public function register_documents( Documents_Manager $documents_manager ): void {
		foreach ( [ Product::class, Product_Archive::class, Cart::class, Checkout::class, Purchase_Summary::class, My_Account::class ] as $class ) {
			/** @var class-string<Woo_Document> $class */
			$documents_manager->register_document_type( $class::get_type(), $class::get_class_full_name() );
		}
	}

	public function register_category( $elements_manager ): void {
		$elements_manager->add_category(
			Woo_Widget_Base::CATEGORY,
			[
				'title' => esc_html__( 'WooCommerce', 'refraction' ),
				'icon' => 'rficon-woocommerce',
			]
		);
	}

	public function register_styles(): void {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_register_style(
			Woo_Widget_Base::STYLE_HANDLE,
			REFRACTION_ASSETS_URL . 'css/modules/woocommerce/woocommerce' . $suffix . '.css',
			[ 'refraction-frontend' ],
			REFRACTION_VERSION
		);
	}

	public function register_scripts(): void {
		$suffix = Utils::is_script_debug() ? '' : '.min';

		wp_register_script(
			Woo_Widget_Base::SCRIPT_HANDLE,
			REFRACTION_ASSETS_URL . 'js/woocommerce-frontend' . $suffix . '.js',
			[ 'jquery' ],
			REFRACTION_VERSION,
			true
		);

		wp_localize_script(
			Woo_Widget_Base::SCRIPT_HANDLE,
			'refractionWoo',
			[
				'i18n' => [
					'added' => esc_html__( 'Added to your cart.', 'refraction' ),
					'error' => esc_html__( 'The product could not be added. Please try again.', 'refraction' ),
					'adding' => esc_html__( 'Adding…', 'refraction' ),
				],
			]
		);
	}

	public function add_locations( array $locations ): array {
		$labels = [
			Woo_Locations::PRODUCT => esc_html__( 'Single Product', 'refraction' ),
			Woo_Locations::PRODUCT_ARCHIVE => esc_html__( 'Product Archive', 'refraction' ),
			Woo_Locations::CART => esc_html__( 'Cart', 'refraction' ),
			Woo_Locations::CHECKOUT => esc_html__( 'Checkout', 'refraction' ),
			Woo_Locations::PURCHASE_SUMMARY => esc_html__( 'Purchase Summary', 'refraction' ),
			Woo_Locations::MY_ACCOUNT => esc_html__( 'My Account', 'refraction' ),
		];

		foreach ( $labels as $location => $label ) {
			$locations[ $location ] = [ 'label' => $label, 'tag' => 'main' ];
		}

		return $locations;
	}

	public function add_tabs( array $tabs ): array {
		$tabs[ Woo_Locations::PRODUCT ] = [
			'label' => esc_html__( 'Products', 'refraction' ),
			'singular' => esc_html__( 'Single Product', 'refraction' ),
			'empty' => esc_html__( 'No product template yet. Design how a product page looks, then choose which products use it.', 'refraction' ),
		];
		$tabs[ Woo_Locations::PRODUCT_ARCHIVE ] = [
			'label' => esc_html__( 'Product Archive', 'refraction' ),
			'singular' => esc_html__( 'Product Archive', 'refraction' ),
			'empty' => esc_html__( 'No product archive template yet. Design the shop page and the category, tag and search pages.', 'refraction' ),
		];
		$tabs[ Woo_Locations::CART ] = [
			'label' => esc_html__( 'Cart', 'refraction' ),
			'singular' => esc_html__( 'Cart', 'refraction' ),
			'empty' => esc_html__( 'No cart template yet. Design the page where customers review their basket.', 'refraction' ),
		];
		$tabs[ Woo_Locations::CHECKOUT ] = [
			'label' => esc_html__( 'Checkout', 'refraction' ),
			'singular' => esc_html__( 'Checkout', 'refraction' ),
			'empty' => esc_html__( 'No checkout template yet. Design the page where customers pay.', 'refraction' ),
		];
		$tabs[ Woo_Locations::PURCHASE_SUMMARY ] = [
			'label' => esc_html__( 'Purchase Summary', 'refraction' ),
			'singular' => esc_html__( 'Purchase Summary', 'refraction' ),
			'empty' => esc_html__( 'No purchase summary template yet. Design the thank you page customers see after an order.', 'refraction' ),
		];
		$tabs[ Woo_Locations::MY_ACCOUNT ] = [
			'label' => esc_html__( 'My Account', 'refraction' ),
			'singular' => esc_html__( 'My Account', 'refraction' ),
			'empty' => esc_html__( 'No My Account template yet. Design the customer account pages.', 'refraction' ),
		];

		return $tabs;
	}

	public function add_glyphs( array $shapes ): array {
		$shapes[ Woo_Locations::PRODUCT ] = '<rect class="band" x="5" y="5" width="10" height="10" rx="1.5"/><path class="lines" d="M19 7h6M19 11h4M5 20h20M5 24h12"/>';
		$shapes[ Woo_Locations::PRODUCT_ARCHIVE ] = '<rect class="band" x="5" y="5" width="9" height="7" rx="1.5"/><rect class="band" x="16" y="5" width="9" height="7" rx="1.5"/><path class="lines" d="M5 16h9M16 16h9M5 20h6M16 20h6M5 24h9M16 24h9"/>';
		$shapes[ Woo_Locations::CART ] = '<path class="lines" d="M5 6h3l2.5 11h11L24 10H9.5"/><circle class="band" cx="12" cy="22" r="1.6"/><circle class="band" cx="20" cy="22" r="1.6"/>';
		$shapes[ Woo_Locations::CHECKOUT ] = '<rect class="band" x="5" y="7" width="20" height="5" rx="1.5"/><path class="lines" d="M5 17h20M5 21h9M19 21h6"/>';
		$shapes[ Woo_Locations::PURCHASE_SUMMARY ] = '<circle class="band" cx="15" cy="12" r="6"/><path class="lines" d="M12 12l2.2 2.2L18.5 10M7 23h16"/>';
		$shapes[ Woo_Locations::MY_ACCOUNT ] = '<circle class="band" cx="15" cy="11" r="4.5"/><path class="lines" d="M6 24c1-5 4-7 9-7s8 2 9 7"/>';

		return $shapes;
	}

	/** The classes of a WooCommerce product page: WooCommerce's variation script looks for the closest `.product`. */
	public function add_location_classes( $classes, $location, $template_id ) {
		if ( Woo_Locations::PRODUCT === $location && is_singular( 'product' ) && function_exists( 'wc_get_product_class' ) ) {
			return trim( implode( ' ', array_merge( [ (string) $classes ], wc_get_product_class( '', (int) get_queried_object_id() ) ) ) );
		}

		return $classes;
	}

	/**
	 * The Menu Cart widgets read the item count and total from this hidden element, which WooCommerce's cart
	 * fragments script replaces after every change of the cart.
	 */
	public function add_cart_data_fragment( $fragments ) {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return $fragments;
		}

		$fragments['div.refraction-cart-data'] = self::get_cart_data_html();

		return $fragments;
	}

	public static function get_cart_data_html(): string {
		$cart = function_exists( 'WC' ) ? WC()->cart : null;

		if ( ! $cart ) {
			return '';
		}

		return sprintf(
			'<div class="refraction-cart-data" hidden data-count="%1$d" data-total="%2$s"></div>',
			(int) $cart->get_cart_contents_count(),
			esc_attr( wp_kses_post( $cart->get_cart_subtotal() ) )
		);
	}
}
