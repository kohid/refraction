<?php

/**
 * The file shouldn't be changed, it's attached for readability about the zip file
 */

/**
 * Plugin Name: Enqueue Media on Front
 * Description: Enqueue media on front to avoid issues like upstream issue #27689
 */

add_action( 'template_redirect', function () {
    wp_enqueue_media();
} );
