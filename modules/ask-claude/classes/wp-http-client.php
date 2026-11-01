<?php
namespace Refraction\Modules\AskClaude\Classes;

use Refraction\Vendor\Nyholm\Psr7\Response;
use Refraction\Vendor\Psr\Http\Client\ClientInterface;
use Refraction\Vendor\Psr\Http\Client\NetworkExceptionInterface;
use Refraction\Vendor\Psr\Http\Message\RequestInterface;
use Refraction\Vendor\Psr\Http\Message\ResponseInterface;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The HTTP client the Anthropic SDK uses here: WordPress's own HTTP API (so the site's proxy, SSL certificates and
 * timeouts settings apply), wrapped in the standard PSR-18 interface. PHP 8.1+ (loaded only there).
 */
class Wp_Http_Client implements ClientInterface {

	public function sendRequest( RequestInterface $request ): ResponseInterface {
		$headers = [];

		foreach ( $request->getHeaders() as $name => $values ) {
			$headers[ $name ] = implode( ', ', $values );
		}

		$result = wp_remote_request( (string) $request->getUri(), [
			'method' => $request->getMethod(),
			'headers' => $headers,
			'body' => (string) $request->getBody(),
			'timeout' => 600,
			'redirection' => 0,
		] );

		if ( is_wp_error( $result ) ) {
			throw new class( $result->get_error_message(), $request ) extends \RuntimeException implements NetworkExceptionInterface {
				private RequestInterface $request;

				public function __construct( string $message, RequestInterface $request ) {
					parent::__construct( $message );
					$this->request = $request;
				}

				public function getRequest(): RequestInterface {
					return $this->request;
				}
			};
		}

		// WordPress returns the headers as a case-insensitive dictionary object; take its plain array.
		$headers = wp_remote_retrieve_headers( $result );
		$out = [];

		foreach ( is_object( $headers ) && method_exists( $headers, 'getAll' ) ? $headers->getAll() : (array) $headers as $name => $value ) {
			if ( is_string( $name ) && 1 === preg_match( '/^[A-Za-z0-9!#$%&\'*+.^_`|~-]+$/', $name ) ) {
				$out[ $name ] = $value;
			}
		}

		return new Response( (int) wp_remote_retrieve_response_code( $result ), $out, (string) wp_remote_retrieve_body( $result ) );
	}
}
