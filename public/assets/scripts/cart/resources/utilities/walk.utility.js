export class WalkUtility {
	static object(object, callback) {
		if (typeof object !== 'object') {
			return callback(object);
		}

		const keys = Object.keys(object);
		const result = {};
		for (let i = 0, l = keys.length; i < l; ++i) {
			const key = keys[i];
			const value = object[key];
			result[key] = this.object(value, callback);
		}

		return result;
	}

	static void(object, callback) {
		if (typeof object !== 'object') {
			callback(object);
			return;
		}

		const keys = Object.keys(object);
		for (let i = 0, l = keys.length; i < l; ++i) {
			const key = keys[i];
			const value = object[key];
			this.object(value, callback);
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
