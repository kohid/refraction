<?php
namespace Refraction\Modules\Events\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The Event Calendar's three views for one date: a month grid that fills whole weeks (days of the next and previous
 * month muted), each event as a chip in its category's color with multi-day connectors and a "+N more" expander; a
 * list of the month grouped by day; and a day timeline. The widget prints them for the first view and the REST route
 * refraction/v1/events/calendar prints them again when the visitor moves, so both are the same markup.
 *
 * Adapted from the [cbd_calendar] shortcode of the owner's Community Business Directory plugin.
 */
class Calendar {

	/**
	 * @var array Options: week_start (1 Monday, 0 Sunday), per_day (chips before "+N more"), times (show the start
	 *            time on chips), categories (ids), search.
	 */
	private array $options;

	public function __construct( array $options = [] ) {
		$this->options = self::options( $options );
	}

	/** Cleans the options (they also come from the visitor's request). */
	public static function options( array $raw ): array {
		return [
			'week_start' => 0 === (int) ( $raw['week_start'] ?? 1 ) ? 0 : 1,
			'per_day' => max( 1, min( 10, (int) ( $raw['per_day'] ?? 3 ) ) ),
			'times' => ! isset( $raw['times'] ) || in_array( $raw['times'], [ true, 1, '1', 'yes' ], true ),
			'categories' => array_values( array_filter( array_map( 'absint', is_array( $raw['categories'] ?? null ) ? $raw['categories'] : explode( ',', (string) ( $raw['categories'] ?? '' ) ) ) ) ),
			'types' => array_values( array_filter( array_map( 'sanitize_key', is_array( $raw['types'] ?? null ) ? $raw['types'] : explode( ',', (string) ( $raw['types'] ?? '' ) ) ) ) ),
			'search' => mb_substr( sanitize_text_field( (string) ( $raw['search'] ?? '' ) ), 0, 100 ),
		];
	}

	/** 'Y-m-d' of a requested date, else today. */
	public static function day( string $date ): string {
		$clean = Event_Data::clean_datetime( $date );

		return '' !== $clean ? substr( $clean, 0, 10 ) : current_time( 'Y-m-d' );
	}

	/**
	 * Everything the three views need for one date.
	 *
	 * @return array{date:string,monthTitle:string,dayTitle:string,month:string,list:string,day:string,count:int}
	 */
	public function views( string $date ): array {
		$day = self::day( $date );
		$ts = strtotime( $day . ' UTC' );
		$first = strtotime( gmdate( 'Y-m-01', $ts ) . ' UTC' );
		$last = strtotime( gmdate( 'Y-m-t', $ts ) . ' UTC' );

		// Whole weeks: back to the first weekday on or before the 1st, on to the last one on or after the last day.
		$lead = ( (int) gmdate( 'w', $first ) - $this->options['week_start'] + 7 ) % 7;
		$trail = 6 - ( ( (int) gmdate( 'w', $last ) - $this->options['week_start'] + 7 ) % 7 );
		$grid_start = $first - $lead * DAY_IN_SECONDS;
		$grid_end = $last + $trail * DAY_IN_SECONDS;
		$by_date = $this->events( gmdate( 'Y-m-d', $grid_start ), gmdate( 'Y-m-d', $grid_end ) );
		$month = (int) gmdate( 'n', $ts );

		return [
			'date' => $day,
			'monthTitle' => date_i18n( 'F Y', $first ),
			'dayTitle' => date_i18n( Event_Data::DATE_FORMAT, $ts ),
			'month' => $this->grid( $grid_start, $grid_end, $month, $by_date ),
			'list' => $this->agenda( $first, $last, $by_date ),
			'day' => $this->timeline( $ts, $by_date[ $day ] ?? [] ),
			'count' => count( array_unique( array_merge( [], ...array_map( static fn( $list ) => array_column( $list, 'id' ), array_values( $by_date ) ) ) ) ),
		];
	}

	/** The events of [from, to], placed on every day each one covers inside it: 'Y-m-d' => cards. */
	private function events( string $from, string $to ): array {
		$by_date = [];
		$window_start = strtotime( $from . ' UTC' );
		$window_end = strtotime( $to . ' UTC' );

		foreach ( Event_Data::query( $from, $to, $this->options['search'], $this->options['categories'], -1, $this->options['types'] ) as $id ) {
			$card = Event_Data::card( $id );

			if ( ! $card['start'] ) {
				continue;
			}

			$first_day = strtotime( gmdate( 'Y-m-d', $card['start'] ) . ' UTC' );
			$last_day = strtotime( gmdate( 'Y-m-d', $card['end'] ) . ' UTC' );

			for ( $d = max( $first_day, $window_start ); $d <= min( $last_day, $window_end ); $d += DAY_IN_SECONDS ) {
				$by_date[ gmdate( 'Y-m-d', $d ) ][] = $card + [
					'is_start' => $d === $first_day,
					'is_end' => $d === $last_day,
					'sort' => ( $card['multiday'] || $card['all_day'] ? '0' : '1' ) . $card['data']['start'],
				];
			}
		}

		// Events over several days and all-day events first, then by start time.
		foreach ( $by_date as &$list ) {
			usort( $list, static fn( $a, $b ) => strcmp( $a['sort'], $b['sort'] ) );
		}

		unset( $list );

		return $by_date;
	}

	/** The data an event link carries for the preview card the script shows on hover and focus. */
	private static function attributes( array $ev, string $class, string $extra = '' ): string {
		return sprintf(
			'href="%1$s" class="%2$s" style="--ev:%3$s" aria-label="%4$s" data-time="%5$s" data-date="%6$s" data-venue="%7$s" data-thumb="%8$s" data-excerpt="%9$s" data-cal="%10$s"%11$s',
			esc_url( $ev['url'] ),
			esc_attr( $class ),
			esc_attr( $ev['color'] ),
			esc_attr( trim( $ev['time'] . ' · ' . $ev['title'], ' ·' ) ),
			esc_attr( $ev['time'] ),
			esc_attr( $ev['date'] ),
			esc_attr( $ev['venue'] ),
			esc_url( $ev['thumb'] ),
			esc_attr( $ev['excerpt'] ),
			esc_attr( (string) wp_json_encode( $ev['links'] ) ),
			$extra
		);
	}

	private function weekdays(): array {
		$days = [];

		// 2023-01-01 was a Sunday.
		for ( $i = 0; $i < 7; $i++ ) {
			$ts = strtotime( '2023-01-0' . ( 1 + ( $i + $this->options['week_start'] ) % 7 ) . ' UTC' );
			$days[] = [ date_i18n( 'D', $ts ), date_i18n( 'l', $ts ) ];
		}

		return $days;
	}

	private function grid( int $grid_start, int $grid_end, int $month, array $by_date ): string {
		$today = current_time( 'Y-m-d' );
		$per_day = $this->options['per_day'];

		ob_start();
		?>
		<div class="rf-cal-grid" role="grid">
			<div class="rf-cal-week rf-cal-dows" role="row">
				<?php foreach ( $this->weekdays() as [ $short, $long ] ) : ?>
					<div class="rf-cal-dow" role="columnheader"><abbr title="<?php echo esc_attr( $long ); ?>"><?php echo esc_html( $short ); ?></abbr></div>
				<?php endforeach; ?>
			</div>
			<?php
			$col = 0;
			echo '<div class="rf-cal-week" role="row">';

			for ( $ts = $grid_start; $ts <= $grid_end; $ts += DAY_IN_SECONDS ) :
				if ( 7 === $col ) {
					echo '</div><div class="rf-cal-week" role="row">';
					$col = 0;
				}

				++$col;
				$key = gmdate( 'Y-m-d', $ts );
				$events = $by_date[ $key ] ?? [];
				$classes = 'rf-cal-cell' . ( (int) gmdate( 'n', $ts ) !== $month ? ' is-other' : '' ) . ( $key === $today ? ' is-today' : '' ) . ( $events ? ' has-events' : '' );
				?>
				<div class="<?php echo esc_attr( $classes ); ?>" role="gridcell" data-date="<?php echo esc_attr( $key ); ?>">
					<div class="rf-cal-cell-head"><span class="rf-cal-daynum"><?php echo esc_html( gmdate( 'j', $ts ) ); ?></span></div>
					<?php if ( $events ) : ?>
						<div class="rf-cal-cell-events">
							<?php
							foreach ( $events as $n => $ev ) :
								$long = $ev['multiday'];
								$class = 'rf-cal-ev' . ( $long ? ' is-multi' . ( $ev['is_start'] ? ' is-mstart' : '' ) . ( $ev['is_end'] ? ' is-mend' : '' ) : '' ) . ( $n >= $per_day ? ' is-extra' : '' );
								?>
								<a <?php echo self::attributes( $ev, $class, $n >= $per_day ? ' hidden' : '' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in attributes(). ?>>
									<?php if ( ! $long && $this->options['times'] && ! $ev['all_day'] ) : ?>
										<span class="rf-cal-ev-time"><?php echo esc_html( date_i18n( get_option( 'time_format', 'H:i' ), $ev['start'] ) ); ?></span>
									<?php endif; ?>
									<span class="rf-cal-ev-title"><?php echo esc_html( $ev['title'] ); ?></span>
								</a>
							<?php endforeach; ?>
							<?php if ( count( $events ) > $per_day ) : ?>
								<button type="button" class="rf-cal-more" aria-expanded="false">
									<?php /* translators: %d: number of hidden events. */ ?>
									<span class="rf-cal-more-show"><?php echo esc_html( sprintf( __( '+ %d more', 'refraction' ), count( $events ) - $per_day ) ); ?></span>
									<span class="rf-cal-more-hide" hidden><?php esc_html_e( 'Show less', 'refraction' ); ?></span>
								</button>
							<?php endif; ?>
						</div>
					<?php endif; ?>
				</div>
			<?php endfor; ?>
			</div>
		</div>
		<?php
		return (string) ob_get_clean();
	}

	private function empty_state( string $message ): string {
		return '<div class="rf-cal-empty"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><p>' . esc_html( $message ) . '</p></div>';
	}

	private function agenda( int $first, int $last, array $by_date ): string {
		$days = array_filter( $by_date, static fn( $key ) => strtotime( $key . ' UTC' ) >= $first && strtotime( $key . ' UTC' ) <= $last, ARRAY_FILTER_USE_KEY );
		ksort( $days );

		if ( ! $days ) {
			return $this->empty_state( '' !== $this->options['search']
				/* translators: %s: the words searched for. */
				? sprintf( __( 'No events match “%s” this month.', 'refraction' ), $this->options['search'] )
				: __( 'No events this month.', 'refraction' ) );
		}

		ob_start();
		?>
		<ul class="rf-cal-agenda-list">
			<?php foreach ( $days as $key => $events ) : $ts = strtotime( $key . ' UTC' ); ?>
				<li class="rf-cal-agenda-day<?php echo current_time( 'Y-m-d' ) === $key ? ' is-today' : ''; ?>">
					<div class="rf-cal-agenda-date">
						<span class="rf-cal-agenda-dnum"><?php echo esc_html( gmdate( 'j', $ts ) ); ?></span>
						<span class="rf-cal-agenda-dow"><?php echo esc_html( date_i18n( 'D', $ts ) ); ?></span>
					</div>
					<ul class="rf-cal-agenda-events">
						<?php foreach ( $events as $ev ) : ?>
							<li>
								<a <?php echo self::attributes( $ev, 'rf-cal-agenda-ev' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in attributes(). ?>>
									<span class="rf-cal-agenda-time"><?php echo esc_html( $ev['time'] ); ?></span>
									<span class="rf-cal-agenda-info">
										<span class="rf-cal-agenda-title"><?php echo esc_html( $ev['title'] ); ?></span>
										<?php if ( '' !== $ev['venue'] ) : ?>
											<span class="rf-cal-agenda-venue"><?php echo self::pin(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?><?php echo esc_html( $ev['venue'] ); ?></span>
										<?php endif; ?>
									</span>
								</a>
							</li>
						<?php endforeach; ?>
					</ul>
				</li>
			<?php endforeach; ?>
		</ul>
		<?php
		return (string) ob_get_clean();
	}

	private function timeline( int $ts, array $events ): string {
		if ( ! $events ) {
			/* translators: %s: a date. */
			return $this->empty_state( sprintf( __( 'No events on %s.', 'refraction' ), date_i18n( 'l, ' . Event_Data::DATE_FORMAT, $ts ) ) );
		}

		ob_start();
		?>
		<ul class="rf-cal-day-list">
			<?php foreach ( $events as $ev ) : ?>
				<li class="rf-cal-day-item">
					<div class="rf-cal-day-rail">
						<span class="rf-cal-day-time"><?php echo esc_html( $ev['multiday'] || $ev['all_day'] ? __( 'All day', 'refraction' ) : date_i18n( get_option( 'time_format', 'H:i' ), $ev['start'] ) ); ?></span>
						<span class="rf-cal-day-dot" style="--ev:<?php echo esc_attr( $ev['color'] ); ?>"></span>
					</div>
					<a <?php echo self::attributes( $ev, 'rf-cal-day-card' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Escaped in attributes(). ?>>
						<span class="rf-cal-day-info">
							<span class="rf-cal-day-range"><?php echo esc_html( $ev['time'] ); ?></span>
							<span class="rf-cal-day-title"><?php echo esc_html( $ev['title'] ); ?></span>
							<?php if ( '' !== $ev['venue'] ) : ?>
								<span class="rf-cal-day-venue"><?php echo self::pin(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Static SVG. ?><?php echo esc_html( $ev['venue'] ); ?></span>
							<?php endif; ?>
							<?php if ( '' !== $ev['excerpt'] ) : ?>
								<span class="rf-cal-day-ex"><?php echo esc_html( $ev['excerpt'] ); ?></span>
							<?php endif; ?>
						</span>
						<?php if ( '' !== $ev['thumb'] ) : ?>
							<span class="rf-cal-day-thumb" style="background-image:url('<?php echo esc_url( $ev['thumb'] ); ?>')"></span>
						<?php endif; ?>
					</a>
				</li>
			<?php endforeach; ?>
		</ul>
		<?php
		return (string) ob_get_clean();
	}

	public static function pin(): string {
		return '<svg class="rf-cal-pin" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
	}
}
