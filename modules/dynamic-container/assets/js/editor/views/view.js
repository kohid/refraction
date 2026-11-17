/**
 * Every item container goes straight into the list (.rf-dc, from the widget's template): the grid or the scrolling
 * row lays them out, in Edit Mode as on the site.
 */
export default class View extends $e.components.get( 'nested-elements' ).exports.NestedView {
	filter( child, index ) {
		child.attributes.dataIndex = index + 1;

		return true;
	}
}
