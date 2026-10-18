/* eslint-disable jsdoc/require-returns-check */

/**
 * @typedef {import('refraction/assets/lib/backbone/backbone.marionette')} Marionette
 * @typedef {import('../../../elements/models/base-element-model')} BaseModel
 */

export default class ElementBase {
	/**
	 * @return {string} Element Type.
	 */
	getType() {
		refractionModules.ForceMethodImplementation();
	}

	/**
	 * @return {Marionette.View} Element Marionette View.
	 */
	getView() {
		refractionModules.ForceMethodImplementation();
	}

	/**
	 * @return {React.Component} React Component.
	 */
	getEmptyView() {
		refractionModules.ForceMethodImplementation();
	}

	/**
	 * @return {BaseModel} Element Model.
	 */
	getModel() {
		refractionModules.ForceMethodImplementation();
	}
}
