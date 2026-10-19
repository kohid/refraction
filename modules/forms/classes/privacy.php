<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * WordPress privacy tools: personal data exporter, eraser and a suggested policy text.
 * Submissions are matched by the email address in an email field and by the logged-in user.
 */
class Privacy {

	const PER_PAGE = 25;

	private Submissions_Repository $repo;

	public function __construct( Submissions_Repository $repo ) {
		$this->repo = $repo;

		add_filter( 'wp_privacy_personal_data_exporters', [ $this, 'register_exporter' ] );
		add_filter( 'wp_privacy_personal_data_erasers', [ $this, 'register_eraser' ] );
		add_action( 'admin_init', [ $this, 'add_policy_text' ] );
	}

	public function register_exporter( array $exporters ): array {
		$exporters['refraction-forms'] = [ 'exporter_friendly_name' => __( 'Refraction form submissions', 'refraction' ), 'callback' => [ $this, 'export' ] ];

		return $exporters;
	}

	public function register_eraser( array $erasers ): array {
		$erasers['refraction-forms'] = [ 'eraser_friendly_name' => __( 'Refraction form submissions', 'refraction' ), 'callback' => [ $this, 'erase' ] ];

		return $erasers;
	}

	public function export( string $email, int $page = 1 ): array {
		$ids = $this->repo->find_ids_by_email( $email, self::PER_PAGE, ( max( 1, $page ) - 1 ) * self::PER_PAGE );
		$values = $this->repo->get_values_for( $ids );
		$items = [];

		foreach ( $ids as $id ) {
			$row = $this->repo->get( $id );

			if ( ! $row ) {
				continue;
			}

			$data = [
				[ 'name' => __( 'Form', 'refraction' ), 'value' => $row['form_name'] ],
				[ 'name' => __( 'Date (UTC)', 'refraction' ), 'value' => $row['created_gmt'] ],
			];

			foreach ( $row['ip'] ? [ [ __( 'IP address', 'refraction' ), $row['ip'] ] ] : [] as $pair ) {
				$data[] = [ 'name' => $pair[0], 'value' => $pair[1] ];
			}

			foreach ( $values[ $id ] ?? [] as $value ) {
				$text = 'file' === $value['field_type'] ? (string) ( json_decode( $value['value'], true )['name'] ?? '' ) : $value['value'];
				$data[] = [ 'name' => $value['field_label'], 'value' => $text ];
			}

			$items[] = [ 'group_id' => 'refraction-form-submissions', 'group_label' => __( 'Form submissions', 'refraction' ), 'group_description' => '', 'item_id' => 'refraction-submission-' . $id, 'data' => $data ];
		}

		return [ 'data' => $items, 'done' => count( $ids ) < self::PER_PAGE ];
	}

	public function erase( string $email, int $page = 1 ): array {
		// Always the first page: erased rows drop out of the result set.
		$ids = $this->repo->find_ids_by_email( $email, self::PER_PAGE, 0 );
		$removed = $ids ? $this->repo->delete( $ids ) : 0;

		return [ 'items_removed' => $removed > 0, 'items_retained' => false, 'messages' => [], 'done' => count( $ids ) < self::PER_PAGE ];
	}

	public function add_policy_text(): void {
		if ( ! function_exists( 'wp_add_privacy_policy_content' ) ) {
			return;
		}

		wp_add_privacy_policy_content(
			__( 'Refraction Forms', 'refraction' ),
			wp_kses_post( '<p class="privacy-policy-tutorial">' . __( 'Suggested text: forms on this site can store what you type in the database of this site so that we can answer you. Uploaded files are kept in a protected folder. IP addresses and browser details are only stored if the site owner turned that on, and submissions can be deleted automatically after a set number of days. Some forms may send your submission to a service chosen by the site owner (a webhook), or use a captcha service (reCAPTCHA, hCaptcha or Cloudflare Turnstile) if the site owner enabled one.', 'refraction' ) . '</p>' )
		);
	}
}
