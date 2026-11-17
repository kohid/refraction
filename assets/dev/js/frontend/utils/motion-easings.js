/**
 * The easings offered by Focus Stack and Showcase Wheel (0.116.0), by the names their Easing setting saves. The PHP
 * list of labels is modules/pro-widgets/classes/motion-easings.php. Bounce and elastic are linear() curves; a browser
 * without linear() gets a springy curve instead.
 */
const BOUNCE = 'linear(0, 0.0047, 0.0189, 0.0425, 0.0756, 0.1182, 0.1702, 0.2316, 0.3025, 0.3829, 0.4727, 0.5719, 0.6806, 0.7988, 0.9264, 0.9697, 0.91, 0.8597, 0.8189, 0.7875, 0.7656, 0.7532, 0.7502, 0.7566, 0.7725, 0.7979, 0.8327, 0.8769, 0.9306, 0.9938, 0.9727, 0.9516, 0.94, 0.9379, 0.9452, 0.9619, 0.9881, 0.991, 0.9845, 0.9875, 1)';
const ELASTIC = 'linear(0, 0.2718, 0.6464, 1, 1.25, 1.3641, 1.3536, 1.2575, 1.125, 1, 0.9116, 0.8713, 0.875, 0.909, 0.9558, 1, 1.0312, 1.0455, 1.0442, 1.0322, 1.0156, 1, 0.989, 0.9839, 0.9844, 0.9886, 0.9945, 1, 1.0039, 1.0057, 1.0055, 1.004, 1.002, 1, 0.9986, 0.998, 0.998, 0.9986, 0.9993, 1, 1)';
const SPRING = 'cubic-bezier(0.34, 1.4, 0.64, 1)';

export const EASINGS = {
	smooth: 'cubic-bezier(0.65, 0, 0.35, 1)',
	snappy: 'cubic-bezier(0.2, 0.9, 0.1, 1)',
	gentle: 'cubic-bezier(0.4, 0, 0.2, 1)',
	spring: SPRING,
	linear: 'linear',
	soft: 'cubic-bezier(0.37, 0, 0.63, 1)',
	glide: 'cubic-bezier(0.16, 1, 0.3, 1)',
	'speed-up': 'cubic-bezier(0.7, 0, 0.84, 0)',
	sharp: 'cubic-bezier(0.85, 0, 0.15, 1)',
	anticipate: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
	bounce: BOUNCE,
	elastic: ELASTIC,
};

let linearWorks = null;

/**
 * The CSS easing for a saved name (Smooth when unknown).
 *
 * @param {string} name
 * @return {string} A CSS easing function.
 */
export function easing( name ) {
	const value = EASINGS[ name ] || EASINGS.smooth;

	if ( 0 === value.indexOf( 'linear(' ) ) {
		if ( null === linearWorks ) {
			linearWorks = !! ( window.CSS && window.CSS.supports && window.CSS.supports( 'transition-timing-function', 'linear(0, 1)' ) );
		}

		return linearWorks ? value : SPRING;
	}

	return value;
}
