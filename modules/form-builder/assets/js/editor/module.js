import { formNestedTypes } from './nested-fields';

export default class Module {
	constructor() {
		formNestedTypes().forEach( ( type ) => refraction.elementsManager.registerElementType( type ) );
	}
}
