<?php
namespace Refraction\Modules\FormBuilder\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Starting points for a new collection. Each one is an ordinary definition the owner can change freely. */
class Presets {

	/** @return array<string,array{label:string,description:string,icon:string}> */
	public static function list(): array {
		$list = [];

		foreach ( self::keys() as $key ) {
			$definition = self::get( $key );
			$list[ $key ] = [
				'label' => $definition['label'],
				'description' => $definition['description'],
				'icon' => $definition['icon'],
			];
		}

		return $list;
	}

	public static function keys(): array {
		return [ 'booking', 'listing', 'transaction', 'blank' ];
	}

	public static function get( string $key ): array {
		$presets = [
			'booking' => [
				'label' => Schema::t( 'Bookings' ),
				'singular' => Schema::t( 'Booking' ),
				'description' => Schema::t( 'Appointments, reservations and requests with a date and time.' ),
				'icon' => 'schedule',
				'title_field' => 'guest_name',
				'default_status' => 'pending',
				'public_form' => true,
				'success_message' => Schema::t( 'Thank you. Your booking request was received and we will confirm it soon.' ),
				'statuses' => [
					[ 'key' => 'pending', 'label' => Schema::t( 'Pending' ), 'color' => 'warning' ],
					[ 'key' => 'confirmed', 'label' => Schema::t( 'Confirmed' ), 'color' => 'success' ],
					[ 'key' => 'completed', 'label' => Schema::t( 'Completed' ), 'color' => 'primary' ],
					[ 'key' => 'cancelled', 'label' => Schema::t( 'Cancelled' ), 'color' => 'danger' ],
				],
				'fields' => [
					[ 'key' => 'guest_name', 'label' => Schema::t( 'Name' ), 'type' => 'text', 'required' => true, 'width' => 'half', 'in_table' => true ],
					[ 'key' => 'email', 'label' => Schema::t( 'Email' ), 'type' => 'email', 'required' => true, 'width' => 'half', 'in_table' => true ],
					[ 'key' => 'phone', 'label' => Schema::t( 'Phone' ), 'type' => 'phone', 'width' => 'half' ],
					[ 'key' => 'service', 'label' => Schema::t( 'Service' ), 'type' => 'select', 'required' => true, 'width' => 'half', 'in_table' => true, 'filter' => true, 'options' => "Consultation\nStandard visit\nExtended visit" ],
					[ 'key' => 'date', 'label' => Schema::t( 'Date' ), 'type' => 'date', 'required' => true, 'width' => 'third', 'in_table' => true ],
					[ 'key' => 'time', 'label' => Schema::t( 'Time' ), 'type' => 'time', 'required' => true, 'width' => 'third', 'in_table' => true ],
					[ 'key' => 'guests', 'label' => Schema::t( 'Guests' ), 'type' => 'number', 'width' => 'third', 'min' => 1, 'max' => 50, 'default' => '1' ],
					[ 'key' => 'notes', 'label' => Schema::t( 'Notes' ), 'type' => 'textarea' ],
				],
			],
			'listing' => [
				'label' => Schema::t( 'Listings' ),
				'singular' => Schema::t( 'Listing' ),
				'description' => Schema::t( 'Properties, products, vehicles, jobs or any catalogue you publish.' ),
				'icon' => 'web',
				'title_field' => 'title',
				'default_status' => 'draft',
				'public_list' => true,
				'statuses' => [
					[ 'key' => 'draft', 'label' => Schema::t( 'Draft' ), 'color' => 'secondary' ],
					[ 'key' => 'published', 'label' => Schema::t( 'Published' ), 'color' => 'success' ],
					[ 'key' => 'sold', 'label' => Schema::t( 'Sold' ), 'color' => 'info' ],
					[ 'key' => 'archived', 'label' => Schema::t( 'Archived' ), 'color' => 'dark' ],
				],
				'fields' => [
					[ 'key' => 'title', 'label' => Schema::t( 'Title' ), 'type' => 'text', 'required' => true, 'in_table' => true, 'public' => true ],
					[ 'key' => 'category', 'label' => Schema::t( 'Category' ), 'type' => 'select', 'width' => 'half', 'in_table' => true, 'filter' => true, 'public' => true, 'options' => "Residential\nCommercial\nLand" ],
					[ 'key' => 'price', 'label' => Schema::t( 'Price' ), 'type' => 'currency', 'width' => 'half', 'in_table' => true, 'public' => true, 'min' => 0 ],
					[ 'key' => 'location', 'label' => Schema::t( 'Location' ), 'type' => 'text', 'width' => 'half', 'in_table' => true, 'public' => true ],
					[ 'key' => 'rating', 'label' => Schema::t( 'Rating' ), 'type' => 'rating', 'width' => 'half', 'public' => true ],
					[ 'key' => 'featured', 'label' => Schema::t( 'Featured' ), 'type' => 'toggle', 'width' => 'half' ],
					[ 'key' => 'link', 'label' => Schema::t( 'More info link' ), 'type' => 'url', 'width' => 'half', 'public' => true ],
					[ 'key' => 'description', 'label' => Schema::t( 'Description' ), 'type' => 'textarea', 'public' => true ],
				],
			],
			'transaction' => [
				'label' => Schema::t( 'Transactions' ),
				'singular' => Schema::t( 'Transaction' ),
				'description' => Schema::t( 'Orders, payments, invoices and any record of money or goods changing hands.' ),
				'icon' => 'shopping-bag',
				'title_field' => 'reference',
				'default_status' => 'pending',
				'statuses' => [
					[ 'key' => 'pending', 'label' => Schema::t( 'Pending' ), 'color' => 'warning' ],
					[ 'key' => 'paid', 'label' => Schema::t( 'Paid' ), 'color' => 'success' ],
					[ 'key' => 'refunded', 'label' => Schema::t( 'Refunded' ), 'color' => 'info' ],
					[ 'key' => 'failed', 'label' => Schema::t( 'Failed' ), 'color' => 'danger' ],
				],
				'fields' => [
					[ 'key' => 'reference', 'label' => Schema::t( 'Reference' ), 'type' => 'text', 'required' => true, 'width' => 'half', 'in_table' => true ],
					[ 'key' => 'customer', 'label' => Schema::t( 'Customer' ), 'type' => 'text', 'required' => true, 'width' => 'half', 'in_table' => true ],
					[ 'key' => 'amount', 'label' => Schema::t( 'Amount' ), 'type' => 'currency', 'required' => true, 'width' => 'third', 'in_table' => true ],
					[ 'key' => 'method', 'label' => Schema::t( 'Payment method' ), 'type' => 'select', 'width' => 'third', 'in_table' => true, 'filter' => true, 'options' => "Card\nBank transfer\nCash\nOther" ],
					[ 'key' => 'paid_on', 'label' => Schema::t( 'Date' ), 'type' => 'date', 'width' => 'third', 'in_table' => true ],
					[ 'key' => 'notes', 'label' => Schema::t( 'Notes' ), 'type' => 'textarea' ],
				],
			],
			'blank' => [
				'label' => Schema::t( 'Records' ),
				'singular' => Schema::t( 'Record' ),
				'description' => Schema::t( 'Start empty and add your own fields and statuses.' ),
				'icon' => 'layers',
				'default_status' => 'new',
				'statuses' => [
					[ 'key' => 'new', 'label' => Schema::t( 'New' ), 'color' => 'primary' ],
					[ 'key' => 'done', 'label' => Schema::t( 'Done' ), 'color' => 'success' ],
				],
				'fields' => [
					[ 'key' => 'name', 'label' => Schema::t( 'Name' ), 'type' => 'text', 'required' => true, 'in_table' => true ],
				],
			],
		];

		$definition = $presets[ $key ] ?? $presets['blank'];
		$definition['slug'] = 'blank' === $key ? '' : $key . 's';

		return Schema::definition( $definition );
	}
}
