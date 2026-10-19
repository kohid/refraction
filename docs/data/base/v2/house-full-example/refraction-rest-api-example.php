<?php
/**
 * @package Refraction
 * Plugin Name: Refraction REST API example.
 * Plugin URI: https://github.com/kohid/refraction#readme
 * Description: Demo of using Refraction REST API.
 */

add_action( 'plugins_loaded', function () {
	// Load the controller.
	require 'house/controller.php';
	require 'house/keys/controller.php';
	require 'house/rooms/controller.php';
	require 'house/rooms/doors/controller.php';

	// Register the controllers.
	\Refraction\Data\V2\Manager::instance()->register_controller( House\Controller::class );
	\Refraction\Data\V2\Manager::instance()->register_controller( House\Keys\Controller::class );
	\Refraction\Data\V2\Manager::instance()->register_controller( House\Rooms\Controller::class );
	\Refraction\Data\V2\Manager::instance()->register_controller( House\Rooms\Doors\Controller::class );
} );
