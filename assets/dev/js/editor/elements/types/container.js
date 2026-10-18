// TODO: Is this file in use?
// eslint-disable-next-line import/no-unresolved
import Base from '../types/base/element-base';
import EmptyComponent from 'refraction-elements/views/container/empty-component';
import Model from 'refraction-elements/models/container';
import { default as View } from 'refraction-elements/views/container';

export default class Container extends Base {
	getType() {
		return 'container';
	}

	getView() {
		return View;
	}

	getEmptyView() {
		return EmptyComponent;
	}

	getModel() {
		return Model;
	}
}
