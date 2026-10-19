<?php
namespace Refraction\Modules\Forms\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Validates and sanitises one submission against a Form_Definition.
 *
 * Returns ['values' => [id => string], 'errors' => [id => message], 'files' => [id => $_FILES entry]].
 */
final class Validator {

	const MAX_TEXT = 5000;
	const MAX_TEXTAREA = 50000;

	public function validate( Form_Definition $def, array $post, array $files ): array {
		$values = [];
		$errors = [];
		$uploads = [];

		foreach ( $def->get_input_fields() as $field ) {
			$id = $field['id'];

			if ( 'honeypot' === $field['type'] ) {
				continue;
			}

			if ( 'file' === $field['type'] ) {
				$this->validate_file( $field, $files[ $id ] ?? null, $values, $errors, $uploads );
				continue;
			}

			$raw = $post[ $id ] ?? '';
			$required_message = __( 'This field is required.', 'refraction' );

			if ( 'checkbox' === $field['type'] ) {
				$list = is_array( $raw ) ? $raw : ( '' === (string) $raw ? [] : [ $raw ] );
				$list = array_values( array_filter( array_map( fn( $v ) => is_scalar( $v ) ? (string) $v : '', $list ), 'strlen' ) );
				$allowed = array_column( $field['options'], 'value' );

				foreach ( $list as $v ) {
					if ( ! in_array( $v, $allowed, true ) ) {
						$errors[ $id ] = __( 'Please choose a valid option.', 'refraction' );
					}
				}

				if ( ! $list && $field['required'] ) {
					$errors[ $id ] = $required_message;
				}

				$values[ $id ] = implode( ', ', $list );
				continue;
			}

			if ( ! is_scalar( $raw ) ) {
				$errors[ $id ] = __( 'Please enter a valid value.', 'refraction' );
				$values[ $id ] = '';
				continue;
			}

			$value = $this->clean( $field['type'], (string) $raw );
			$values[ $id ] = $value;

			if ( 'acceptance' === $field['type'] ) {
				$checked = Form_Definition::is_truthy( $value );
				$values[ $id ] = $checked ? 'on' : '';

				if ( ! $checked && $field['required'] ) {
					$errors[ $id ] = __( 'Please accept to continue.', 'refraction' );
				}

				continue;
			}

			if ( '' === $value ) {
				if ( $field['required'] ) {
					$errors[ $id ] = $required_message;
				}

				continue;
			}

			$message = $this->check_value( $field, $value );

			if ( null !== $message ) {
				$errors[ $id ] = $message;
			}
		}

		return [ 'values' => $values, 'errors' => $errors, 'files' => $uploads ];
	}

	private function clean( string $type, string $value ): string {
		if ( 'password' === $type ) {
			return preg_replace( '/[\x00-\x1f\x7f]/', '', $value );
		}

		if ( 'textarea' === $type ) {
			$value = str_replace( [ "\r\n", "\r" ], "\n", strip_tags( $value ) );

			return trim( preg_replace( '/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', '', $value ) );
		}

		if ( in_array( $type, [ 'email', 'url', 'tel', 'number', 'date', 'time' ], true ) ) {
			// Control characters stay so that the format checks below reject them.
			return trim( $value );
		}

		return trim( preg_replace( '/[\x00-\x1f\x7f]/', '', strip_tags( $value ) ) );
	}

	private function check_value( array $field, string $value ): ?string {
		$type = $field['type'];
		$invalid = __( 'Please enter a valid value.', 'refraction' );

		if ( preg_match( '/[\x00-\x08\x0a-\x1f\x7f]/', $value ) && 'textarea' !== $type ) {
			return $invalid;
		}

		$limit = 'textarea' === $type ? self::MAX_TEXTAREA : self::MAX_TEXT;

		if ( strlen( $value ) > $limit ) {
			return __( 'This value is too long.', 'refraction' );
		}

		switch ( $type ) {
			case 'email':
				return false === filter_var( $value, FILTER_VALIDATE_EMAIL ) ? __( 'Please enter a valid email address.', 'refraction' ) : null;

			case 'url':
				$scheme = strtolower( (string) parse_url( $value, PHP_URL_SCHEME ) );

				return false === filter_var( $value, FILTER_VALIDATE_URL ) || ! in_array( $scheme, [ 'http', 'https' ], true ) ? __( 'Please enter a valid URL.', 'refraction' ) : null;

			case 'tel':
				return ! preg_match( '/^[0-9+().\-\s#*x]{3,30}$/i', $value ) ? __( 'Please enter a valid phone number.', 'refraction' ) : null;

			case 'number':
				if ( ! preg_match( '/^-?\d+(\.\d+)?$/', $value ) ) {
					return __( 'Please enter a number.', 'refraction' );
				}

				if ( '' !== (string) $field['min'] && (float) $value < (float) $field['min'] ) {
					/* translators: %s: minimum value. */
					return sprintf( __( 'The value must be at least %s.', 'refraction' ), $field['min'] );
				}

				if ( '' !== (string) $field['max'] && (float) $value > (float) $field['max'] ) {
					/* translators: %s: maximum value. */
					return sprintf( __( 'The value must be at most %s.', 'refraction' ), $field['max'] );
				}

				return null;

			case 'date':
				$date = \DateTime::createFromFormat( '!Y-m-d', $value );

				return ! $date || $date->format( 'Y-m-d' ) !== $value ? __( 'Please enter a valid date.', 'refraction' ) : null;

			case 'time':
				return ! preg_match( '/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $value ) ? __( 'Please enter a valid time.', 'refraction' ) : null;

			case 'select':
			case 'radio':
				return ! in_array( $value, array_column( $field['options'], 'value' ), true ) ? __( 'Please choose a valid option.', 'refraction' ) : null;
		}

		return null;
	}

	private function validate_file( array $field, $file, array &$values, array &$errors, array &$uploads ): void {
		$id = $field['id'];
		$values[ $id ] = '';
		$empty = ! is_array( $file ) || '' === (string) ( $file['name'] ?? '' ) || UPLOAD_ERR_NO_FILE === (int) ( $file['error'] ?? UPLOAD_ERR_NO_FILE );

		if ( $empty ) {
			if ( $field['required'] ) {
				$errors[ $id ] = __( 'Please choose a file.', 'refraction' );
			}

			return;
		}

		$tmp = (string) ( $file['tmp_name'] ?? '' );
		$head = '' !== $tmp && is_readable( $tmp ) ? (string) file_get_contents( $tmp, false, null, 0, 2048 ) : '';
		$error = Upload_Policy::check( $file, [
			'allowed' => Upload_Policy::parse_types( $field['file_types'] ),
			'max_bytes' => (int) ( $field['file_max_size'] * 1048576 ),
			'head' => $head,
		] );

		if ( null !== $error ) {
			$errors[ $id ] = $error;

			return;
		}

		$values[ $id ] = Upload_Policy::safe_name( (string) $file['name'] );
		$uploads[ $id ] = $file;
	}
}
