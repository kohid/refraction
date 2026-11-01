<?php
namespace Refraction\Modules\AskClaude\Classes;

use Refraction\Vendor\Http\Discovery\Strategy\DiscoveryStrategy;
use Refraction\Vendor\Psr\Http\Client\ClientInterface;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/** Makes the SDK's client discovery find Wp_Http_Client (registered first; PSR-17 factories come from Nyholm). */
class Discovery_Strategy implements DiscoveryStrategy {

	public static function getCandidates( $type ) {
		return ClientInterface::class === $type ? [ [ 'class' => Wp_Http_Client::class, 'condition' => Wp_Http_Client::class ] ] : [];
	}
}
