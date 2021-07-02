export class WalkUtility {
	static walk(object, callback) {
		const keys = Object.keys(object);
		for (let i = 0, l = keys.length; i < l; ++i) {
			const key = keys[i];
			const value = object[key];

			const result = callback(value, key, object);

			if (result === WalkUtility.STOP) {
				continue;
			}

			if (value !== null
				&& typeof value === 'object') {
				this.walk(value, callback);
			}
		}
	}

	static mirror(from, to) {
		const keys = Object.keys(from);
		for (let i = 0, l = keys.length; i < l; ++i) {
			const key = keys[i];
			const fromValue = from[key];
			if (fromValue === null
                || typeof fromValue !== 'object') {
				to[key] = fromValue;
				continue;
			}

			if (to[key] === null
                || typeof to[key] !== 'object') {
				to[key] = Number.isNaN(Number(key)) ? {} : [];
			}

			this.mirror(fromValue, to[key]);
		}
	}
}
WalkUtility.STOP = Symbol('Stop traversal');
