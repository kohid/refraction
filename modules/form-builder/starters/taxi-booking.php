<?php
/**
 * Starter: Taxi and tour booking (0.90.0), made for Inverness Taxis' services and tours:
 * airport transfers, corporate travel, golf transfers, wedding cars, minibus hire and the five Inverness tours.
 *
 * Returns [ 'elements' => editor elements, 'settings' => Form page settings ]. Tour hours, times and prices come from
 * the tour pages (car tour £55 an hour for 1 to 4 people, minibus tour £65 an hour for 5 to 8; Isle of Skye £600 / £700).
 * Transfers are priced when the office confirms them, so their total shows "price on request".
 *
 * @var callable $id Gives a new element id.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

$t = static function ( string $text ): string {
	return __( $text, 'refraction' ); // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText
};
$rule = static function ( string $field, string $op, string $value = '' ) use ( $id ): array {
	return [ '_id' => $id(), 'field' => $field, 'op' => $op, 'value' => $value ];
};
$when = static function ( array $rules, string $match = 'all' ): array {
	return [ 'cond_enabled' => 'yes', 'cond_action' => 'show', 'cond_match' => $match, 'cond_rules' => $rules ];
};
$field = static function ( string $type, array $settings ) use ( $id ): array {
	return [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => 'rfb-field-' . $type, 'settings' => $settings, 'elements' => [] ];
};
$widget = static function ( string $type, array $settings ) use ( $id ): array {
	return [ 'id' => $id(), 'elType' => 'widget', 'widgetType' => $type, 'settings' => $settings, 'elements' => [] ];
};
$box = static function ( array $elements, array $settings = [] ) use ( $id ): array {
	return [ 'id' => $id(), 'elType' => 'container', 'isInner' => true, 'settings' => $settings + [ 'content_width' => 'full', 'flex_gap' => [ 'size' => 18, 'column' => '18', 'row' => '18', 'unit' => 'px' ] ], 'elements' => $elements ];
};
$row = static function ( array $elements ) use ( $box ): array {
	// Fields side by side share the row; on phones they stack.
	foreach ( $elements as &$element ) {
		$element['settings']['_flex_size'] = 'grow';
	}

	return $box( $elements, [ 'flex_direction' => 'row', 'flex_wrap' => 'nowrap', 'flex_direction_mobile' => 'column' ] );
};
$not_tour = $rule( 'service', 'not_equals', 'tour' );
$places = implode( "\n", [ '55 Church Street, Inverness (our booking office)', 'Inverness Airport (INV)', 'Inverness Railway Station', 'Inverness Bus Station', 'Inverness city centre' ] );

// ---------------------------------------------------------------- step 1: the trip
$trip = [
	$field( 'radio', [
		'field_label' => $t( 'What do you need?' ),
		'field_key' => 'service',
		'field_required' => 'yes',
		'field_options' => implode( "\n", [ 'airport|' . $t( 'Airport transfer' ), 'corporate|' . $t( 'Corporate travel' ), 'golf|' . $t( 'Golf transfer' ), 'wedding|' . $t( 'Wedding cars' ), 'minibus|' . $t( 'Minibus hire' ), 'tour|' . $t( 'Inverness tour' ) ] ),
		'in_table' => 'yes',
		'add_filter' => 'yes',
	] ),
	$field( 'radio', [
		'field_label' => $t( 'Going to or coming from the airport?' ),
		'field_key' => 'airport_direction',
		'field_required' => 'yes',
		'field_options' => 'to|' . $t( 'To Inverness Airport (I am flying out)' ) . "\nfrom|" . $t( 'From Inverness Airport (I am landing)' ),
	] + $when( [ $rule( 'service', 'equals', 'airport' ) ] ) ),
	$field( 'text', [
		'field_label' => $t( 'Flight number' ),
		'field_key' => 'flight',
		'placeholder' => 'BA1488',
		'field_help' => $t( 'We follow arriving flights, so a late landing is not a problem.' ),
	] + $when( [ $rule( 'service', 'equals', 'airport' ) ] ) ),
	$field( 'select', [
		'field_label' => $t( 'Which tour?' ),
		'field_key' => 'tour',
		'field_required' => 'yes',
		'placeholder' => $t( 'Choose a tour' ),
		'field_options' => implode( "\n", [
			'loch-ness-urquhart-castle|' . $t( 'Loch Ness & Urquhart Castle (4 hours, leaves 10:00)' ) . '|4',
			'culloden-clava-cawdor|' . $t( 'Culloden Battlefield, Clava Cairns & Cawdor Castle (5 hours, leaves 9:00)' ) . '|5',
			'dunrobin-northern-highlands|' . $t( 'Dunrobin Castle & Northern Highlands (6 hours, leaves 9:00)' ) . '|6',
			'isle-of-skye|' . $t( 'Isle of Skye full day (12 hours, leaves 8:00)' ) . '|12',
			'short-loch-ness|' . $t( 'Short Loch Ness tour (1 hour 30 minutes)' ) . '|1.5',
		] ),
		'field_help' => $t( 'Tours leave from 55 Church Street, Inverness, or we collect you from your address.' ),
		'in_table' => 'yes',
	] + $when( [ $rule( 'service', 'equals', 'tour' ) ] ) ),
	$field( 'select', [
		'field_label' => $t( 'How long do you need the minibus?' ),
		'field_key' => 'hire_length',
		'field_required' => 'yes',
		'field_options' => 'hours|' . $t( 'A few hours' ) . "\nday|" . $t( 'A full day' ) . "\nweekend|" . $t( 'A weekend' ) . "\nweek|" . $t( 'A week' ),
	] + $when( [ $rule( 'service', 'equals', 'minibus' ) ] ) ),
	$row( [
		$field( 'text', [ 'field_label' => $t( 'Company' ), 'field_key' => 'company', 'field_required' => 'yes' ] + $when( [ $rule( 'service', 'equals', 'corporate' ) ] ) ),
		$field( 'text', [ 'field_label' => $t( 'Account number (if you have one)' ), 'field_key' => 'account' ] + $when( [ $rule( 'service', 'equals', 'corporate' ) ] ) ),
	] ),
	$field( 'text', [
		'field_label' => $t( 'Pickup address' ),
		'field_key' => 'pickup',
		'field_required' => 'yes',
		'placeholder' => $t( 'Street, town or postcode' ),
		'suggestions' => $places,
		'in_table' => 'yes',
	] ),
	[
		'id' => $id(),
		'elType' => 'widget',
		'widgetType' => 'rfb-field-repeater',
		'settings' => [ 'field_label' => $t( 'Stops on the way' ), 'field_key' => 'via', 'min_rows' => 0, 'max_rows' => 5, 'add_label' => $t( 'Add a stop' ) ] + $when( [ $not_tour ] ),
		'elements' => [ $box( [ $field( 'text', [ 'field_label' => $t( 'Stop' ), 'field_key' => 'stop', 'placeholder' => $t( 'Address of the stop' ), 'suggestions' => $places ] ) ] ) ],
	],
	$field( 'text', [
		'field_label' => $t( 'Drop-off address' ),
		'field_key' => 'dropoff',
		'field_required' => 'yes',
		'placeholder' => $t( 'Street, town, postcode, venue or golf course' ),
		'suggestions' => $places,
		'in_table' => 'yes',
	] + $when( [ $not_tour ] ) ),
	$row( [
		$field( 'datetime', [ 'field_label' => $t( 'Pickup date and time' ), 'field_key' => 'pickup_at', 'field_required' => 'yes', 'notice_hours' => 2, 'max_days' => 365, 'time_step' => 15, 'in_table' => 'yes' ] ),
		$field( 'toggle', [ 'field_label' => $t( 'I also need a return journey' ), 'field_key' => 'return_trip' ] + $when( [ $not_tour ] ) ),
	] ),
	$field( 'datetime', [ 'field_label' => $t( 'Return date and time' ), 'field_key' => 'return_at', 'field_required' => 'yes', 'notice_hours' => 2, 'max_days' => 365, 'time_step' => 15 ] + $when( [ $rule( 'return_trip', 'equals', '1' ), $not_tour ] ) ),
];

// ---------------------------------------------------------------- step 2: passengers and vehicle
$card = static function ( string $title, string $key, string $text, array $rules ) use ( $id ): array {
	$item = [ '_id' => $id(), 'card_title' => $title, 'card_key' => $key ];

	foreach ( array_values( $rules ) as $i => $r ) {
		$n = $i ? '2' : '';
		$item[ 'card_when_field' . $n ] = $r[0];
		$item[ 'card_when_op' . $n ] = $r[1];
		$item[ 'card_when_value' . $n ] = $r[2];
	}

	return [ $item, $text ];
};
$small = [ 'passengers', 'less', '5' ];
$no_minibus = [ 'service', 'not_equals', 'minibus' ];
$cards = [
	$card( $t( 'Saloon car' ), 'saloon', $t( 'Up to 4 passengers and 2 suitcases.' ), [ $small, $no_minibus ] ),
	$card( $t( 'Executive car' ), 'executive', $t( 'Up to 4 passengers and 2 suitcases, in more comfort.' ), [ $small, $no_minibus ] ),
	$card( $t( 'Estate car' ), 'estate', $t( 'Room for 3 suitcases, golf bags or equipment.' ), [ [ 'passengers', 'less', '7' ], $no_minibus ] ),
	$card( $t( 'Wheelchair accessible' ), 'wheelchair', $t( 'Ramp access; the driver helps you in.' ), [ [ 'passengers', 'less', '7' ] ] ),
	$card( $t( '6-seater' ), 'six_seater', $t( 'Up to 6 passengers.' ), [ [ 'passengers', 'less', '7' ] ] ),
	$card( $t( '8-seater' ), 'eight_seater', $t( 'Up to 8 passengers.' ), [ [ 'passengers', 'less', '9' ] ] ),
	$card( $t( '16-seater minibus' ), 'sixteen_seater', $t( 'Up to 16 passengers.' ), [ [ 'passengers', 'less', '17' ] ] ),
];

$party = [
	$row( [
		$field( 'number', [ 'field_label' => $t( 'Passengers' ), 'field_key' => 'passengers', 'field_required' => 'yes', 'stepper' => 'yes', 'field_min' => 1, 'field_max' => 16, 'default_value' => '1', 'in_table' => 'yes' ] ),
		$field( 'number', [ 'field_label' => $t( 'Suitcases' ), 'field_key' => 'suitcases', 'stepper' => 'yes', 'field_min' => 0, 'field_max' => 30, 'default_value' => '0' ] + $when( [ $not_tour ] ) ),
		$field( 'number', [ 'field_label' => $t( 'Carry-on bags' ), 'field_key' => 'carry_on', 'stepper' => 'yes', 'field_min' => 0, 'field_max' => 30, 'default_value' => '0' ] + $when( [ $not_tour ] ) ),
	] ),
	[
		'id' => $id(),
		'elType' => 'widget',
		'widgetType' => 'rfb-field-choice_set',
		'settings' => [
			'field_label' => $t( 'Vehicle' ),
			'field_key' => 'vehicle',
			'field_required' => 'yes',
			'card_columns' => 3,
			'card_gap' => 12,
			'marker_pos' => 'top-right',
			'marker_look' => 'tick',
			'field_description' => $t( 'Only vehicles that seat everyone are shown.' ),
			'cards' => array_column( $cards, 0 ),
		] + $when( [ $not_tour ] ),
		'elements' => array_map( static function ( $c ) use ( $box, $widget ) {
			return $box( [
				$widget( 'heading', [ 'title' => $c[0]['card_title'], 'header_size' => 'h4', 'title_color' => '#101820', 'typography_typography' => 'custom', 'typography_font_size' => [ 'unit' => 'px', 'size' => 16 ], 'typography_font_weight' => '700' ] ),
				$widget( 'text-editor', [ 'editor' => '<p>' . esc_html( $c[1] ) . '</p>' ] ),
			], [ 'flex_gap' => [ 'size' => 4, 'column' => '4', 'row' => '4', 'unit' => 'px' ] ] );
		}, $cards ),
	],
	$field( 'radio', [
		'field_label' => $t( 'Tour vehicle' ),
		'field_key' => 'tour_vehicle',
		'field_required' => 'yes',
		'field_options' => 'car|' . $t( 'Car tour, 1 to 4 people' ) . "|55\nbus|" . $t( 'Minibus tour, 5 to 8 people' ) . '|65',
		'field_help' => $t( 'Car tours are £55 an hour and minibus tours £65 an hour; the Isle of Skye tour is £600 by car or £700 by minibus.' ),
	] + $when( [ $rule( 'service', 'equals', 'tour' ) ] ) ),
];

// ---------------------------------------------------------------- step 3: details, price and review
$details = [
	$field( 'name', [ 'field_label' => $t( 'Your name' ), 'field_key' => 'name', 'field_required' => 'yes', 'name_parts' => [ 'first', 'last' ], 'in_table' => 'yes' ] ),
	$row( [
		$field( 'email', [ 'field_label' => $t( 'Email' ), 'field_key' => 'email', 'field_required' => 'yes', 'in_table' => 'yes' ] ),
		$field( 'phone', [ 'field_label' => $t( 'Mobile phone' ), 'field_key' => 'phone', 'field_required' => 'yes', 'in_table' => 'yes' ] ),
	] ),
	$field( 'textarea', [ 'field_label' => $t( 'Anything we should know?' ), 'field_key' => 'notes', 'placeholder' => $t( 'Child seats, a wheelchair, golf clubs, a sign at arrivals...' ) ] ),
	$field( 'radio', [ 'field_label' => $t( 'How will you pay the driver?' ), 'field_key' => 'payment', 'field_required' => 'yes', 'field_options' => 'cash|' . $t( 'Cash' ) . "\ncard|" . $t( 'Card' ) ] ),
	$field( 'total', [
		'field_label' => $t( 'Price' ),
		'field_key' => 'price',
		'total_formula' => '{tour} * {tour_vehicle}',
		'total_rules' => [
			[ '_id' => $id(), 'field' => 'service', 'op' => 'not_equals', 'value' => 'tour', 'formula' => '' ],
			[ '_id' => $id(), 'field' => 'tour', 'op' => 'equals', 'value' => 'isle-of-skye', 'field2' => 'tour_vehicle', 'op2' => 'equals', 'value2' => 'car', 'formula' => '600' ],
			[ '_id' => $id(), 'field' => 'tour', 'op' => 'equals', 'value' => 'isle-of-skye', 'field2' => 'tour_vehicle', 'op2' => 'equals', 'value2' => 'bus', 'formula' => '700' ],
		],
		'total_none' => $t( 'We confirm the fare with your booking.' ),
		'in_table' => 'yes',
	] ),
	$widget( 'rfb-summary', [ 'title' => $t( 'Your booking' ), 'empty' => $t( 'Your answers will show here.' ) ] ),
	$field( 'checkbox', [ 'field_label' => $t( 'Terms' ), 'hide_label' => 'yes', 'field_key' => 'consent', 'field_required' => 'yes', 'field_options' => 'yes|' . $t( 'I agree to the terms and conditions and the privacy policy.' ) ] ),
	$widget( 'rfb-submit', [ 'text' => $t( 'Send my booking' ) ] ),
];

$steps = [
	[ '_id' => $id(), 'step_title' => $t( 'Your trip' ), 'step_description' => $t( 'Where, when and what kind of journey.' ) ],
	[ '_id' => $id(), 'step_title' => $t( 'Passengers and vehicle' ), 'step_description' => $t( 'Who is travelling and what they bring.' ) ],
	[ '_id' => $id(), 'step_title' => $t( 'Your details' ), 'step_description' => $t( 'How we reach you, the price and a last look.' ) ],
];

$step_box = static function ( int $n, array $elements ) use ( $box, $t ): array {
	return $box( $elements, [ '_title' => sprintf( $t( 'Step %d' ), $n ), 'flex_direction' => 'column' ] );
};

return [
	'elements' => [
		[
			'id' => $id(),
			'elType' => 'container',
			'isInner' => false,
			'settings' => [ 'content_width' => 'full', 'flex_direction' => 'column' ],
			'elements' => [
				[
					'id' => $id(),
					'elType' => 'widget',
					'widgetType' => 'rfb-steps',
					'settings' => [ 'steps' => $steps ],
					'elements' => [ $step_box( 1, $trip ), $step_box( 2, $party ), $step_box( 3, $details ) ],
				],
			],
		],
	],
	'settings' => [
		'rfb_singular' => $t( 'Booking' ),
		'rfb_description' => $t( 'Transfers, corporate travel, golf, weddings, minibus hire and Inverness tours.' ),
		'rfb_success_message' => $t( 'Thank you. Your booking request {reference} is with us. We will confirm it by email or phone shortly.' ),
		'rfb_public_form' => 'yes',
		'rfb_statuses' => [
			[ '_id' => $id(), 'label' => $t( 'Requested' ), 'color' => 'warning' ],
			[ '_id' => $id(), 'label' => $t( 'Confirmed' ), 'color' => 'primary' ],
			[ '_id' => $id(), 'label' => $t( 'Completed' ), 'color' => 'success' ],
			[ '_id' => $id(), 'label' => $t( 'Cancelled' ), 'color' => 'danger' ],
		],
		'rfb_submit_text' => $t( 'Send my booking' ),
		'rfb_next_text' => $t( 'Next' ),
		'rfb_back_text' => $t( 'Back' ),
		'rfb_progress' => 'steps',
		'rfb_notify_enabled' => 'yes',
		'rfb_notify_to' => (string) get_option( 'admin_email' ),
		'rfb_notify_subject' => $t( 'New booking {reference}' ),
		'rfb_reply_to_field' => 'email',
		'rfb_reference_prefix' => 'IT',
		'rfb_confirm_enabled' => 'yes',
		'rfb_confirm_field' => 'email',
		'rfb_confirm_subject' => $t( 'Your booking request {reference}' ),
		'rfb_confirm_message' => $t( "Hello {name},\n\nThank you for booking with us. Your reference is {reference}.\n\n{summary}\n\nWe will confirm your booking shortly. To change it, reply to this email or call us, quoting your reference." ),
		'rfb_currency_symbol' => '£',
		'rfb_currency_position' => 'before',
		'rfb_thousands_sep' => ',',
		'rfb_decimal_sep' => '.',
		'rfb_decimals' => 2,
		'rfb_c_primary' => '#E20A17',
		'rfb_c_button_bg' => '#E20A17',
		'rfb_c_button_text' => '#FFFFFF',
	],
];
