<?php
namespace Refraction\Modules\Events\Classes;

use Refraction\Modules\Events\Module;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Bookings for events with "Book now" (pay in cash): a visitor books places on the event page (name, email, phone,
 * how many), keeping to the event's Ticket limit and Tickets per person (counted by email), and pays in cash at the
 * event. A booking is a private post (refraction_booking) listed under Refraction > Events > Bookings, where it can be
 * marked as paid or cancelled. The visitor and the site get an email.
 *
 * The form has no nonce (event pages are often served from a page cache); it is protected by a hidden field, a minimum
 * time on the page, a signed event id and an hourly limit per visitor.
 */
class Bookings {

	const CPT = 'refraction_booking';
	const ACTION = 'refraction_event_book';
	const META = '_rfe_booking';
	const STATUSES = [ 'booked', 'paid', 'cancelled' ];

	public static function register(): void {
		add_action( 'init', [ __CLASS__, 'register_type' ], 6 );
		add_action( 'admin_post_nopriv_' . self::ACTION, [ __CLASS__, 'handle' ] );
		add_action( 'admin_post_' . self::ACTION, [ __CLASS__, 'handle' ] );
		add_action( 'admin_post_refraction_booking_status', [ __CLASS__, 'set_status' ] );

		if ( is_admin() ) {
			add_filter( 'manage_' . self::CPT . '_posts_columns', [ __CLASS__, 'columns' ] );
			add_action( 'manage_' . self::CPT . '_posts_custom_column', [ __CLASS__, 'column' ], 10, 2 );
			add_action( 'pre_get_posts', [ __CLASS__, 'admin_filter' ] );
		}
	}

	public static function register_type(): void {
		register_post_type( self::CPT, [
			'labels' => [
				'name' => esc_html__( 'Bookings', 'refraction' ),
				'singular_name' => esc_html__( 'Booking', 'refraction' ),
				'all_items' => esc_html__( 'Bookings', 'refraction' ),
				'not_found' => esc_html__( 'No bookings yet.', 'refraction' ),
			],
			'public' => false,
			'show_ui' => true,
			'show_in_menu' => false,
			'supports' => [ 'title' ],
			'capability_type' => 'post',
			'capabilities' => [ 'create_posts' => 'do_not_allow' ],
			'map_meta_cap' => true,
		] );
	}

	// ---------------------------------------------------------------- counts

	/** Places booked for an event (cancelled bookings do not count), optionally by one email address. */
	public static function booked( int $event_id, string $email = '' ): int {
		$query = [
			'post_type' => self::CPT,
			'post_status' => 'private',
			'posts_per_page' => -1,
			'fields' => 'ids',
			'meta_query' => [ [ 'key' => self::META . '_event', 'value' => $event_id ] ],
		];

		if ( '' !== $email ) {
			$query['meta_query'][] = [ 'key' => self::META . '_email', 'value' => strtolower( $email ) ];
		}

		$total = 0;

		foreach ( get_posts( $query ) as $id ) {
			if ( 'cancelled' !== get_post_meta( $id, self::META . '_status', true ) ) {
				$total += (int) get_post_meta( $id, self::META . '_tickets', true );
			}
		}

		return $total;
	}

	/** Places left, or null when the event has no ticket limit. */
	public static function left( int $event_id ): ?int {
		$limit = (int) Event_Data::get( $event_id )['ticket_limit'];

		return $limit > 0 ? max( 0, $limit - self::booked( $event_id ) ) : null;
	}

	/** The most one person may book now: the per-person limit and the places left. */
	public static function most( int $event_id ): int {
		$data = Event_Data::get( $event_id );
		$per = (int) $data['tickets_per_person'];
		$left = self::left( $event_id );
		$most = $per > 0 ? $per : 20;

		return null === $left ? $most : min( $most, $left );
	}

	public static function enabled( int $event_id ): bool {
		return 'yes' === Event_Data::get( $event_id )['booking'];
	}

	// ---------------------------------------------------------------- the form

	private static function signature( int $event_id, int $time ): string {
		return substr( wp_hash( 'rfe-book|' . $event_id . '|' . $time ), 0, 20 );
	}

	/** What the visitor pays in cash: the total amount, else the price. */
	public static function cash_text( array $data ): string {
		return '' !== $data['total_amount'] ? $data['total_amount'] : $data['price'];
	}

	/**
	 * The "Book now" button and its booking form (a <details> element: it opens without a script), with the answer to
	 * the last booking above it.
	 *
	 * @param int    $event_id
	 * @param string $class   Classes of the button (summary).
	 * @param string $text    The button's text ('' for the event's own).
	 * @param string $method  'cash' (Book now, pay at the event) or 'online' (Pay: pay the total amount as the event's
	 *                        instructions say and send the payment's reference; for events without a payment link).
	 */
	public static function form( int $event_id, string $class = 'rf-ed-tickets rf-ed-book', string $text = '', string $method = 'cash' ): string {
		$online = 'online' === $method;

		if ( ! $event_id || ! ( $online ? self::pays_online( $event_id ) : self::enabled( $event_id ) ) ) {
			return '';
		}

		$data = Event_Data::get( $event_id );
		$text = '' !== $text ? $text : ( $online ? Event_Data::payment_text( $data ) : ( '' !== $data['booking_label'] ? $data['booking_label'] : __( 'Book now', 'refraction' ) ) );
		$most = self::most( $event_id );
		$left = self::left( $event_id );
		$ended = '' !== $data['end'] && $data['end'] < current_time( 'Y-m-d H:i' );
		$time = time();
		$anchor = self::anchor( $event_id, $method );
		$notice = self::notice( $event_id, $method );
		$cash = self::cash_text( $data );

		ob_start();
		?>
		<div class="rfe-book<?php echo $online ? ' rfe-book--online' : ''; ?>" id="<?php echo esc_attr( $anchor ); ?>">
			<?php echo $notice; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Built from escaped parts. ?>
			<?php if ( $ended || 0 === $most ) : ?>
				<span class="<?php echo esc_attr( $class ); ?> is-disabled" aria-disabled="true"><?php echo esc_html( $ended ? __( 'Booking closed', 'refraction' ) : __( 'Fully booked', 'refraction' ) ); ?></span>
			<?php else : ?>
				<details class="rfe-book__details"<?php echo '' !== $notice && false !== strpos( $notice, 'is-error' ) ? ' open' : ''; ?>>
					<summary class="<?php echo esc_attr( $class ); ?>"><?php echo esc_html( $text ); ?></summary>
					<form class="rfe-book__form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<input type="hidden" name="action" value="<?php echo esc_attr( self::ACTION ); ?>">
						<input type="hidden" name="event" value="<?php echo esc_attr( (string) $event_id ); ?>">
						<input type="hidden" name="method" value="<?php echo esc_attr( $online ? 'online' : 'cash' ); ?>">
						<?php if ( $online ) : ?>
							<div class="rfe-book__pay">
								<p class="rfe-book__amount"><?php esc_html_e( 'Total amount', 'refraction' ); ?> <strong><?php echo esc_html( $data['total_amount'] ); ?></strong></p>
								<?php if ( '' !== $data['payment_note'] ) : ?>
									<p class="rfe-book__instructions"><?php echo nl2br( esc_html( $data['payment_note'] ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped, then line breaks. ?></p>
								<?php endif; ?>
								<?php if ( (int) $data['payment_qr'] ) : ?>
									<?php echo wp_get_attachment_image( (int) $data['payment_qr'], 'medium', false, [ 'class' => 'rfe-book__qr', 'alt' => esc_attr__( 'Payment QR code', 'refraction' ) ] ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped by WordPress. ?>
								<?php endif; ?>
							</div>
						<?php endif; ?>
						<input type="hidden" name="t" value="<?php echo esc_attr( $time . '.' . self::signature( $event_id, $time ) ); ?>">
						<div class="rfe-book__hp" aria-hidden="true"><label><?php esc_html_e( 'Leave this empty', 'refraction' ); ?><input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
						<p class="rfe-book__row"><label for="<?php echo esc_attr( $anchor ); ?>-name"><?php esc_html_e( 'Your name', 'refraction' ); ?></label><input id="<?php echo esc_attr( $anchor ); ?>-name" type="text" name="name" required maxlength="100" autocomplete="name"></p>
						<p class="rfe-book__row"><label for="<?php echo esc_attr( $anchor ); ?>-email"><?php esc_html_e( 'Email', 'refraction' ); ?></label><input id="<?php echo esc_attr( $anchor ); ?>-email" type="email" name="email" required maxlength="150" autocomplete="email"></p>
						<p class="rfe-book__row"><label for="<?php echo esc_attr( $anchor ); ?>-phone"><?php esc_html_e( 'Phone (optional)', 'refraction' ); ?></label><input id="<?php echo esc_attr( $anchor ); ?>-phone" type="tel" name="phone" maxlength="40" autocomplete="tel"></p>
						<p class="rfe-book__row"><label for="<?php echo esc_attr( $anchor ); ?>-tickets"><?php esc_html_e( 'Tickets', 'refraction' ); ?></label><input id="<?php echo esc_attr( $anchor ); ?>-tickets" type="number" name="tickets" value="1" min="1" max="<?php echo esc_attr( (string) $most ); ?>" required></p>
						<?php if ( $online ) : ?>
							<p class="rfe-book__row"><label for="<?php echo esc_attr( $anchor ); ?>-reference"><?php esc_html_e( 'Payment reference number', 'refraction' ); ?></label><input id="<?php echo esc_attr( $anchor ); ?>-reference" type="text" name="reference" required maxlength="80" autocomplete="off"></p>
						<?php endif; ?>
						<p class="rfe-book__note">
							<?php
							$notes = [];

							if ( $online ) {
								$notes[] = __( 'Your places are confirmed once the payment is checked.', 'refraction' );
							} elseif ( '' !== $cash ) {
								/* translators: %s: amount. */
								$notes[] = sprintf( __( 'Pay %s in cash at the event.', 'refraction' ), $cash );
							} else {
								$notes[] = __( 'Pay in cash at the event.', 'refraction' );
							}

							if ( (int) $data['tickets_per_person'] > 0 ) {
								/* translators: %d: number of tickets. */
								$notes[] = sprintf( _n( 'Up to %d ticket per person.', 'Up to %d tickets per person.', (int) $data['tickets_per_person'], 'refraction' ), (int) $data['tickets_per_person'] );
							}

							if ( null !== $left ) {
								/* translators: %d: places left. */
								$notes[] = sprintf( _n( '%d place left.', '%d places left.', $left, 'refraction' ), $left );
							}

							echo esc_html( implode( ' ', $notes ) );
							?>
						</p>
						<button type="submit" class="rfe-book__submit"><?php echo esc_html( $online ? __( 'Send payment', 'refraction' ) : __( 'Confirm booking', 'refraction' ) ); ?></button>
					</form>
				</details>
			<?php endif; ?>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	private static function anchor( int $event_id, string $method ): string {
		return ( 'online' === $method ? 'rfe-pay-' : 'rfe-book-' ) . $event_id;
	}

	/** Pay with the form: no payment link, but a total amount to pay. */
	public static function pays_online( int $event_id ): bool {
		return 'form' === Event_Data::payment_mode( Event_Data::get( $event_id ) );
	}

	/** The answer to a booking just sent from this page. */
	private static function notice( int $event_id, string $method = 'cash' ): string {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- Messages only; the booking is checked by its key.
		$error = isset( $_GET['rfe_book_error'] ) ? sanitize_key( wp_unslash( $_GET['rfe_book_error'] ) ) : '';
		$for = isset( $_GET['rfe_event'] ) ? absint( $_GET['rfe_event'] ) : 0;
		$booking = isset( $_GET['rfe_booked'] ) ? absint( $_GET['rfe_booked'] ) : 0;
		$key = isset( $_GET['rfe_key'] ) ? sanitize_text_field( wp_unslash( $_GET['rfe_key'] ) ) : '';
		// phpcs:enable

		$sent = isset( $_GET['rfe_method'] ) && 'online' === $_GET['rfe_method'] ? 'online' : 'cash'; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		if ( $for !== $event_id || $sent !== $method ) {
			return '';
		}

		if ( '' !== $error ) {
			$messages = [
				'missing' => 'online' === $method ? __( 'Please give your name, a valid email address, how many tickets and your payment\'s reference number.', 'refraction' ) : __( 'Please give your name, a valid email address and how many tickets.', 'refraction' ),
				'full' => __( 'Sorry, there are not enough places left for that many tickets.', 'refraction' ),
				'person' => __( 'That is more tickets than one person may book for this event.', 'refraction' ),
				'closed' => __( 'Booking for this event is closed.', 'refraction' ),
				'again' => __( 'Please try again in a moment.', 'refraction' ),
			];

			return '<p class="rfe-book__notice is-error" role="alert">' . esc_html( $messages[ $error ] ?? $messages['again'] ) . '</p>';
		}

		if ( $booking && self::CPT === get_post_type( $booking ) && hash_equals( self::key( $booking ), $key ) ) {
			$tickets = (int) get_post_meta( $booking, self::META . '_tickets', true );
			$cash = self::cash_text( Event_Data::get( $event_id ) );

			if ( 'online' === $method ) {
				/* translators: 1: reference, 2: number of tickets. */
				$text = sprintf( _n( 'Thank you: we received your payment reference %1$s for %2$d ticket. We will confirm it by email once the payment is checked.', 'Thank you: we received your payment reference %1$s for %2$d tickets. We will confirm it by email once the payment is checked.', $tickets, 'refraction' ), (string) get_post_meta( $booking, self::META . '_reference', true ), $tickets );

				return '<p class="rfe-book__notice is-done" role="status">' . esc_html( $text ) . '</p>';
			}

			/* translators: %d: number of tickets. */
			$text = sprintf( _n( 'Booked: %d ticket.', 'Booked: %d tickets.', $tickets, 'refraction' ), $tickets );
			/* translators: %s: amount. */
			$text .= ' ' . ( '' !== $cash ? sprintf( __( 'Please pay %s in cash at the event.', 'refraction' ), $cash ) : __( 'Please pay in cash at the event.', 'refraction' ) );
			$text .= ' ' . __( 'We sent the details to your email.', 'refraction' );

			return '<p class="rfe-book__notice is-done" role="status">' . esc_html( $text ) . '</p>';
		}

		return '';
	}

	private static function key( int $booking ): string {
		return substr( wp_hash( 'rfe-booking|' . $booking ), 0, 16 );
	}

	// ---------------------------------------------------------------- sending it

	public static function handle(): void {
		// phpcs:disable WordPress.Security.NonceVerification.Missing -- Public form, see the class note.
		$event_id = isset( $_POST['event'] ) ? absint( $_POST['event'] ) : 0;
		$method = isset( $_POST['method'] ) && 'online' === $_POST['method'] ? 'online' : 'cash';
		$back = wp_validate_redirect( (string) wp_get_referer(), $event_id ? (string) get_permalink( $event_id ) : home_url( '/' ) );
		$back = remove_query_arg( [ 'rfe_book_error', 'rfe_booked', 'rfe_key', 'rfe_event', 'rfe_method' ], $back );
		$fail = static function ( string $code ) use ( $back, $event_id, $method ): void {
			wp_safe_redirect( add_query_arg( [ 'rfe_book_error' => $code, 'rfe_event' => $event_id, 'rfe_method' => $method ], $back ) . '#' . self::anchor( $event_id, $method ) );
			exit;
		};

		if ( ! $event_id || Module::CPT !== get_post_type( $event_id ) || 'publish' !== get_post_status( $event_id ) || ! ( 'online' === $method ? self::pays_online( $event_id ) : self::enabled( $event_id ) ) ) {
			wp_safe_redirect( home_url( '/' ) );
			exit;
		}

		$token = explode( '.', isset( $_POST['t'] ) ? sanitize_text_field( wp_unslash( $_POST['t'] ) ) : '', 2 );
		$age = time() - (int) $token[0];

		if ( ! empty( $_POST['website'] ) || 2 !== count( $token ) || ! hash_equals( self::signature( $event_id, (int) $token[0] ), (string) $token[1] ) || $age < 2 || $age > 2 * DAY_IN_SECONDS ) {
			$fail( 'again' );
		}

		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		$rate = 'rfe_book_' . substr( wp_hash( $ip ), 0, 20 );

		if ( (int) get_transient( $rate ) >= 10 ) {
			$fail( 'again' );
		}

		$name = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
		$email = isset( $_POST['email'] ) ? strtolower( sanitize_email( wp_unslash( $_POST['email'] ) ) ) : '';
		$phone = isset( $_POST['phone'] ) ? preg_replace( '/[^0-9+()\-.\s]/', '', sanitize_text_field( wp_unslash( $_POST['phone'] ) ) ) : '';
		$tickets = isset( $_POST['tickets'] ) ? absint( $_POST['tickets'] ) : 0;
		$reference = isset( $_POST['reference'] ) ? mb_substr( sanitize_text_field( wp_unslash( $_POST['reference'] ) ), 0, 80 ) : '';
		// phpcs:enable

		if ( '' === $name || ! is_email( $email ) || $tickets < 1 || ( 'online' === $method && '' === $reference ) ) {
			$fail( 'missing' );
		}

		$data = Event_Data::get( $event_id );

		if ( '' !== $data['end'] && $data['end'] < current_time( 'Y-m-d H:i' ) ) {
			$fail( 'closed' );
		}

		$per = (int) $data['tickets_per_person'];

		if ( $per > 0 && self::booked( $event_id, $email ) + $tickets > $per ) {
			$fail( 'person' );
		}

		$left = self::left( $event_id );

		if ( null !== $left && $tickets > $left ) {
			$fail( 'full' );
		}

		$booking = wp_insert_post( [
			'post_type' => self::CPT,
			'post_status' => 'private',
			'post_title' => $name . ' – ' . get_the_title( $event_id ),
			'post_author' => get_current_user_id(),
		], true );

		if ( is_wp_error( $booking ) ) {
			$fail( 'again' );
		}

		foreach ( [ 'event' => $event_id, 'name' => $name, 'email' => $email, 'phone' => $phone, 'tickets' => $tickets, 'status' => 'booked', 'method' => $method, 'reference' => $reference, 'amount' => Event_Data::get( $event_id )['total_amount'] ] as $key => $value ) {
			update_post_meta( $booking, self::META . '_' . $key, $value );
		}

		set_transient( $rate, (int) get_transient( $rate ) + 1, HOUR_IN_SECONDS );
		self::emails( (int) $booking, $event_id );

		/**
		 * Fires after a visitor booked places on an event (pay in cash).
		 *
		 * @param int $booking  Booking id.
		 * @param int $event_id
		 */
		do_action( 'refraction/events/booked', (int) $booking, $event_id );

		wp_safe_redirect( add_query_arg( [ 'rfe_booked' => $booking, 'rfe_key' => self::key( (int) $booking ), 'rfe_event' => $event_id, 'rfe_method' => $method ], $back ) . '#' . self::anchor( $event_id, $method ) );
		exit;
	}

	private static function emails( int $booking, int $event_id ): void {
		$card = Event_Data::card( $event_id );
		$meta = static fn( string $key ) => (string) get_post_meta( $booking, self::META . '_' . $key, true );
		$cash = self::cash_text( $card['data'] );
		$lines = [
			/* translators: %s: event title. */
			sprintf( __( 'Event: %s', 'refraction' ), $card['title'] ),
			/* translators: %s: date and time. */
			sprintf( __( 'When: %s', 'refraction' ), trim( $card['date'] . ' · ' . $card['time'], ' ·' ) ),
			/* translators: %s: venue. */
			'' !== $card['venue'] ? sprintf( __( 'Where: %s', 'refraction' ), $card['venue'] ) : '',
			/* translators: %d: number of tickets. */
			sprintf( __( 'Tickets: %d', 'refraction' ), (int) $meta( 'tickets' ) ),
			'online' === $meta( 'method' )
				/* translators: 1: amount, 2: reference. */
				? sprintf( __( 'Paid online: %1$s, reference %2$s (to be checked).', 'refraction' ), $meta( 'amount' ), $meta( 'reference' ) )
				/* translators: %s: amount. */
				: ( '' !== $cash ? sprintf( __( 'To pay in cash at the event: %s', 'refraction' ), $cash ) : __( 'To pay in cash at the event.', 'refraction' ) ),
			$card['url'],
		];
		$body = implode( "\n", array_filter( $lines ) );

		/* translators: %s: event title. */
		wp_mail( $meta( 'email' ), sprintf( __( 'Your booking: %s', 'refraction' ), $card['title'] ), sprintf( __( 'Hello %s,', 'refraction' ), $meta( 'name' ) ) . "\n\n" . $body );
		/* translators: 1: name, 2: event title. */
		wp_mail( get_option( 'admin_email' ), sprintf( __( 'New booking: %1$s for %2$s', 'refraction' ), $meta( 'name' ), $card['title'] ), $body . "\n\n" . $meta( 'name' ) . ' <' . $meta( 'email' ) . '> ' . $meta( 'phone' ) . "\n" . admin_url( 'edit.php?post_type=' . self::CPT . '&rfe_event=' . $event_id ) );
	}

	// ---------------------------------------------------------------- admin

	public static function admin_url( int $event_id = 0 ): string {
		return admin_url( 'edit.php?post_type=' . self::CPT . ( $event_id ? '&rfe_event=' . $event_id : '' ) );
	}

	public static function columns( array $columns ): array {
		return [
			'cb' => $columns['cb'] ?? '',
			'title' => esc_html__( 'Booking', 'refraction' ),
			'rfe_event' => esc_html__( 'Event', 'refraction' ),
			'rfe_contact' => esc_html__( 'Contact', 'refraction' ),
			'rfe_tickets' => esc_html__( 'Tickets', 'refraction' ),
			'rfe_status' => esc_html__( 'Payment', 'refraction' ),
			'date' => $columns['date'] ?? esc_html__( 'Date', 'refraction' ),
		];
	}

	public static function column( string $column, int $id ): void {
		$meta = static fn( string $key ) => (string) get_post_meta( $id, self::META . '_' . $key, true );

		switch ( $column ) {
			case 'rfe_event':
				$event = (int) $meta( 'event' );
				echo '<a href="' . esc_url( self::admin_url( $event ) ) . '">' . esc_html( get_the_title( $event ) ) . '</a>';
				break;
			case 'rfe_contact':
				echo esc_html( $meta( 'email' ) ) . ( '' !== $meta( 'phone' ) ? '<br>' . esc_html( $meta( 'phone' ) ) : '' );
				break;
			case 'rfe_tickets':
				echo esc_html( $meta( 'tickets' ) );
				break;
			case 'rfe_status':
				$status = in_array( $meta( 'status' ), self::STATUSES, true ) ? $meta( 'status' ) : 'booked';
				$online = 'online' === $meta( 'method' );
				$labels = [ 'booked' => $online ? __( 'To check', 'refraction' ) : __( 'To pay', 'refraction' ), 'paid' => __( 'Paid', 'refraction' ), 'cancelled' => __( 'Cancelled', 'refraction' ) ];
				/* translators: 1: amount, 2: reference. */
				$how = $online ? sprintf( __( 'Online %1$s · ref. %2$s', 'refraction' ), $meta( 'amount' ), $meta( 'reference' ) ) : __( 'Cash at the event', 'refraction' );
				echo '<strong class="rfe-booking-' . esc_attr( $status ) . '">' . esc_html( $labels[ $status ] ) . '</strong> <span class="description">' . esc_html( $how ) . '</span><br>';

				foreach ( $labels as $to => $label ) {
					if ( $to !== $status && current_user_can( 'edit_post', $id ) ) {
						$url = wp_nonce_url( admin_url( 'admin-post.php?action=refraction_booking_status&booking=' . $id . '&to=' . $to ), 'rfe-booking-' . $id );
						/* translators: %s: status. */
						echo '<a href="' . esc_url( $url ) . '">' . esc_html( sprintf( __( 'Mark: %s', 'refraction' ), $label ) ) . '</a> ';
					}
				}
				break;
		}
	}

	public static function set_status(): void {
		$id = isset( $_GET['booking'] ) ? absint( $_GET['booking'] ) : 0;
		check_admin_referer( 'rfe-booking-' . $id );
		$to = isset( $_GET['to'] ) ? sanitize_key( wp_unslash( $_GET['to'] ) ) : '';

		if ( self::CPT === get_post_type( $id ) && current_user_can( 'edit_post', $id ) && in_array( $to, self::STATUSES, true ) ) {
			update_post_meta( $id, self::META . '_status', $to );
		}

		wp_safe_redirect( wp_get_referer() ?: self::admin_url() );
		exit;
	}

	/** The bookings table can be narrowed to one event (?rfe_event=). */
	public static function admin_filter( \WP_Query $query ): void {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- A list filter.
		$event = isset( $_GET['rfe_event'] ) ? absint( $_GET['rfe_event'] ) : 0;

		if ( $event && $query->is_main_query() && self::CPT === $query->get( 'post_type' ) ) {
			$query->set( 'meta_query', [ [ 'key' => self::META . '_event', 'value' => $event ] ] );
		}
	}
}
