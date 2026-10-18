import Base from '../types/base/element-base';
import Model from 'refraction-elements/models/section';
import { default as View } from 'refraction-elements/views/section';

export default class Section extends Base {
	getType() {
		return 'section';
	}

	getView() {
		return View;
	}

	getModel() {
		return Model;
	}
}
