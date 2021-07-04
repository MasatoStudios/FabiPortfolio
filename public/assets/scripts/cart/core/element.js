import { html, render as litRender } from 'https://unpkg.com/lit-html@1.4.1/lit-html.js';
import jss from 'https://unpkg.com/jss@10.7.1/dist/jss.bundle.js';
import jssPresetDefault from 'https://unpkg.com/jss-preset-default@10.7.1/dist/jss-preset-default.bundle.js';
import { WalkUtility } from '../resources/utilities/walk.utility.js';

jss.setup(jssPresetDefault());

export class Element {
	/**
	 * @typedef {{detail: *, stopPropogation: () => void, preventDefault: () => void}} ElementEventData
	 * @typedef {(event: ElementEventData) => void} ElementEventCallback
	 */

	/** @param {Element} renderTarget */
	constructor(renderTarget) {
		/** @type {HTMLElement} 							*/ 	this.renderTarget = renderTarget;
		/** @type {boolean} 								*/ 	this.isMounted = false;
		/** @type {Map<string, ElementEventCallback[]>} 	*/ 	this.eventStringToCallbacksMap = new Map();
		/** @type {*}									 	*/ 	this.stylesheetInstance = jss.createStyleSheet(this.stylesheet);

		if (!(renderTarget instanceof HTMLElement)) {
			this.renderTarget = document.createElement('div');
			this.renderTarget.style.display = 'contents';
		}

		const { classes } = this.stylesheetInstance.attach();

		this.classes = classes;
	}

	/**
	 * @param {string} eventString
	 * @param {ElementEventCallback} callback
	 */
	onDefault(eventString, callback) {
		let callbacks = this.eventStringToCallbacksMap.get(eventString);

		if (callbacks == null) {
			callbacks = [];
			this.eventStringToCallbacksMap.set(eventString, callbacks);
		}

		callbacks[-1] = callback;
	}

	/**
	 * @param {string} eventString
	 * @param {ElementEventCallback} callback
	 */
	on(eventString, callback) {
		let callbacks = this.eventStringToCallbacksMap.get(eventString);

		if (callbacks == null) {
			callbacks = [];
			this.eventStringToCallbacksMap.set(eventString, callbacks);
		}

		callbacks.push(callback);
	}

	/**
	 * @param {string} eventString
	 * @param {ElementEventCallback} callback
	 */
	once(eventString, callback) {
		this.on(eventString, (event) => {
			callback(event);

			this.off(eventString, callback);
		});
	}

	/**
	 * @param {string} eventString
	 * @param {ElementEventCallback} callback
	 */
	off(eventString, callback) {
		const callbacks = this.eventStringToCallbacksMap.get(eventString);

		if (callbacks == null) {
			return;
		}

		const callbackIndex = callbacks.indexOf(callback);

		if (callbackIndex == null) {
			return;
		}

		callbacks.splice(callbackIndex, 1);
	}

	/**
	 * @param {string} eventString
	 * @param {ElementEventData} data
	 */
	dispatch(eventString, data = {}) {
		const callbacks = this.eventStringToCallbacksMap.get(eventString);

		if (callbacks == null) {
			return;
		}

		let isDefaultPrevented = false;

		for (const callback of callbacks) {
			let isPropogationStopped = false;

			callback({
				stopPropogation: () => {
					isPropogationStopped = true;
				},
				preventDefault: () => {
					isDefaultPrevented = true;
				},
				detail: data.detail,
			});

			if (isPropogationStopped) {
				break;
			}
		}

		if (!isDefaultPrevented
			&& typeof callbacks[-1] === 'function') {
			callbacks[-1]({
				detail: data.detail,
			});
		}
	}

	onAttach() {}
	onMount() {}
	onDestroy() {}

	render() {
		const { template } = this;

		WalkUtility.walk(template.values, (value, key, parent) => {
			if (!value && typeof value !== 'number' && typeof value !== 'string') {
				try {
					parent[key] = '';
				} catch (err) {
					if (err instanceof TypeError) {
						Object.defineProperty(parent, key, {
							value: '',
						});
					}
				}
			}
		});

		litRender(
			template,
			this.renderTarget,
		);

		if (!this.isMounted) {
			this.isMounted = true;
			this.dispatch('mount');
			this.onMount();
		}
	}

	destroy() {
		litRender(
			null,
			this.renderTarget,
		);

		jss.removeStyleSheet(this.stylesheetInstance);

		this.dispatch('destroy');
		this.onDestroy();
	}

	/** @param {HTMLElement} parent */
	attach(parent) {
		parent.appendChild(this.renderTarget);

		this.dispatch('attach');
		this.onAttach();
	}

	get template() {
		return html``;
	}

	get stylesheet() {
		return {};
	}
}
