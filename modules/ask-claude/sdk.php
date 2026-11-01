<?php
/**
 * Loads the bundled, prefixed Anthropic SDK and the classes that use it. Included only on PHP 8.1+, right before a
 * request to Claude; nothing else in Refraction loads it.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

require_once REFRACTION_PATH . 'vendor-prefixed/claude-sdk/autoload.php';
