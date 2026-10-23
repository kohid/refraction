<?php
namespace Refraction\Modules\CustomIcons\Classes;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * Whitelist sanitiser for uploaded SVG icons. Anything not known to be a plain drawing element or attribute is
 * dropped: scripts, foreignObject, styles, images, links, event handlers, external references, doctype/entities,
 * processing instructions and comments. No WordPress calls.
 */
class Pure_Svg_Sanitizer {

	const MAX_BYTES = 100000;
	const NS = 'http://www.w3.org/2000/svg';

	const ELEMENTS = [ 'svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath', 'mask', 'use', 'symbol', 'title', 'desc' ];

	const ATTRIBUTES = [
		'id', 'class', 'viewbox', 'width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'd', 'points',
		'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'clip-path', 'mask', 'stroke', 'stroke-width', 'stroke-linecap',
		'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity', 'opacity', 'transform',
		'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform', 'spreadmethod', 'fx', 'fy', 'clippathunits',
		'maskunits', 'maskcontentunits', 'preserveaspectratio', 'version', 'xmlns', 'href', 'xlink:href', 'style', 'display',
		'visibility', 'color', 'transform-origin', 'xmlns:xlink', 'x-height',
	];

	public static function sanitize( string $svg ): string {
		$svg = trim( $svg );

		if ( '' === $svg || strlen( $svg ) > self::MAX_BYTES || false !== stripos( $svg, '<!doctype' ) || false !== stripos( $svg, '<!entity' ) ) {
			return '';
		}

		$previous = libxml_use_internal_errors( true );
		$dom = new \DOMDocument();
		$loaded = $dom->loadXML( $svg, LIBXML_NONET | LIBXML_NOBLANKS );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );

		if ( ! $loaded || ! $dom->documentElement || 'svg' !== strtolower( $dom->documentElement->localName ) ) {
			return '';
		}

		$root = $dom->documentElement;

		if ( $root->namespaceURI && self::NS !== $root->namespaceURI ) {
			return '';
		}

		self::clean_attributes( $root );
		self::clean( $root );

		if ( ! $root->hasAttribute( 'xmlns' ) ) {
			$root->setAttribute( 'xmlns', self::NS );
		}

		$out = $dom->saveXML( $root );

		return is_string( $out ) && strlen( $out ) <= self::MAX_BYTES ? $out : '';
	}

	private static function clean( \DOMElement $el ): void {
		foreach ( iterator_to_array( $el->childNodes ) as $child ) {
			if ( $child instanceof \DOMElement ) {
				$name = strtolower( $child->localName );

				// A link wrapper is dropped but its drawing is kept.
				if ( 'a' === $name && ( ! $child->namespaceURI || self::NS === $child->namespaceURI ) ) {
					while ( $child->firstChild ) {
						$el->insertBefore( $child->firstChild, $child );
					}

					$el->removeChild( $child );
					self::clean( $el );

					return;
				}

				$ns_ok = ! $child->namespaceURI || self::NS === $child->namespaceURI;

				if ( ! $ns_ok || ! in_array( $name, self::ELEMENTS, true ) ) {
					$el->removeChild( $child );
					continue;
				}

				self::clean_attributes( $child );

				if ( 'use' === $name && ! $child->hasAttribute( 'href' ) && ! $child->hasAttribute( 'xlink:href' ) ) {
					$el->removeChild( $child ); // Its only legal target was an external file.
					continue;
				}

				self::clean( $child );
			} elseif ( $child instanceof \DOMText ) {
				// Text is only meaningful inside title/desc; keep it there as plain text.
				if ( ! in_array( strtolower( $el->localName ), [ 'title', 'desc' ], true ) ) {
					$el->removeChild( $child );
				}
			} else {
				$el->removeChild( $child ); // Comments, CDATA, processing instructions.
			}
		}
	}

	private static function clean_attributes( \DOMElement $el ): void {
		foreach ( iterator_to_array( $el->attributes ) as $attr ) {
			$name = strtolower( $attr->nodeName );
			$value = $attr->value;

			if ( 0 === strpos( $name, 'on' ) || ! in_array( $name, self::ATTRIBUTES, true ) || ! self::value_is_safe( $name, $value ) ) {
				$el->removeAttributeNode( $attr );
			}
		}
	}

	private static function value_is_safe( string $name, string $value ): bool {
		$flat = strtolower( (string) preg_replace( '/[\s\x00-\x1f]+/', '', html_entity_decode( $value, ENT_QUOTES | ENT_HTML5 ) ) );

		if ( preg_match( '/javascript:|data:|vbscript:|expression\(|@import|<|>|&#/', $flat ) ) {
			return false;
		}

		if ( 'href' === $name || 'xlink:href' === $name ) {
			return 0 === strpos( $flat, '#' ) && strlen( $flat ) > 1;
		}

		if ( 'xmlns' === $name ) {
			return self::NS === $value;
		}

		if ( 'xmlns:xlink' === $name ) {
			return 'http://www.w3.org/1999/xlink' === $value;
		}

		if ( false !== strpos( $flat, 'url(' ) ) {
			if ( ! preg_match_all( '/url\(([^)]*)\)/', $flat, $m ) ) {
				return false;
			}

			foreach ( $m[1] as $ref ) {
				if ( 0 !== strpos( trim( $ref, '\'"' ), '#' ) ) {
					return false;
				}
			}
		}

		return true;
	}
}
