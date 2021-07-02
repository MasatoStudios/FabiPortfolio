// transpiled from TS
// copied from svelte's implementation
export class Store {
	constructor(value) {
		this.value = value;
		this.subscribers = [];
		this.subscriberQueue = [];
		this.stop = null;
	}

	static neq(a, b) {
		// eslint-disable-next-line no-self-compare, eqeqeq, no-negated-condition
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	set(newValue) {
		if (Store.neq(this.value, newValue)) {
			this.value = newValue;
			this.trigger();
		}
	}

	trigger() {
		if (!this.stop) {
			return;
		}

		// store is ready
		const runQueue = !this.subscriberQueue.length;
		for (let i = 0; i < this.subscribers.length; i += 1) {
			const s = this.subscribers[i];
			s[1]();
			this.subscriberQueue.push(s, this.value);
		}

		if (runQueue) {
			for (let i = 0; i < this.subscriberQueue.length; i += 2) {
				this.subscriberQueue[i][0](this.subscriberQueue[i + 1]);
			}

			this.subscriberQueue.length = 0;
		}
	}

	update(fn) {
		this.set(fn(this.value));
	}

	subscribe(run, invalidate = () => {}) {
		const result = this.subscribeLazy(run, invalidate);

		run(this.value);

		return result;
	}

	subscribeLazy(run, invalidate = () => {}) {
		const subscriber = [run, invalidate];
		this.subscribers.push(subscriber);
		if (this.subscribers.length === 1) {
			this.stop = () => {};
		}

		return () => {
			this.unsubscribe(subscriber);
		};
	}

	unsubscribe(subscriber) {
		let _a;
		const index = this.subscribers.indexOf(subscriber);
		if (index !== -1) {
			this.subscribers.splice(index, 1);
		}

		if (this.subscribers.length === 0) {
			// artefact of `this.stop?.();`
			// eslint-disable-next-line no-unused-expressions
			(_a = this.stop) === null || _a === undefined ? undefined : _a.call(this);
			this.stop = null;
		}
	}
}
