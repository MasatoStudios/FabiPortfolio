/*

export class StoreExtendable<T = unknown> extends Store<T> {
	constructor(value: T) {
		super(value);

		const valueDescriptors = Object.getOwnPropertyDescriptors(this.value);
		const prototypeDescriptors = Object.getOwnPropertyDescriptors(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			(this.value as any)
				?.constructor
				?.prototype
			?? {},
		);
		const descriptors = {
			...prototypeDescriptors,
			...valueDescriptors,
		};

		Object.keys(descriptors).forEach((descriptorKey) => {
			// @ts-expect-error
			if (this[descriptorKey] != null) {
				return;
			}

			const descriptor = descriptors[descriptorKey];

			if (descriptor.get == null && descriptor.set == null) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				descriptor.value = typeof descriptor.value === 'function'
					// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
					? descriptor.value.bind(this.value)
					: descriptor.value;
			}

			if (descriptor.get != null || descriptor.set != null) {
				delete descriptor.value;

				descriptor.set &&= descriptor.set.bind(this.value);
				descriptor.get &&= descriptor.get.bind(this.value);
			}

			Object.defineProperty(this, descriptorKey, descriptors[descriptorKey]);
		});
	}
}

*/

import { Store } from '../store.js';

export class StoreExtendable extends Store {
	constructor(value) {
		let _a;
		let _b;
		let _c;
		super(value);
		const valueDescriptors = Object.getOwnPropertyDescriptors(this.value);
		const prototypeDescriptors = Object.getOwnPropertyDescriptors(
			(_c = (_b = (_a = this.value) === null || _a === undefined ? undefined : _a.constructor) === null || _b === undefined ? undefined : _b.prototype) !== null && _c !== undefined ? _c : {});
		const descriptors = { ...prototypeDescriptors, ...valueDescriptors };
		Object.keys(descriptors).forEach((descriptorKey) => {
			// @ts-expect-error
			if (this[descriptorKey] != null) {
				return;
			}

			const descriptor = descriptors[descriptorKey];
			if (descriptor.get == null && descriptor.set == null) {
				descriptor.value = typeof descriptor.value === 'function'
					? descriptor.value.bind(this.value)
					: descriptor.value;
			}

			if (descriptor.get != null || descriptor.set != null) {
				delete descriptor.value;
				// eslint-disable-next-line no-unused-expressions
				descriptor.set && (descriptor.set = descriptor.set.bind(this.value));
				// eslint-disable-next-line no-unused-expressions
				descriptor.get && (descriptor.get = descriptor.get.bind(this.value));
			}

			Object.defineProperty(this, descriptorKey, descriptors[descriptorKey]);
		});
	}
}
