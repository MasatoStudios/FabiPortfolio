import { html, render as litRender } from 'https://unpkg.com/lit-html@1.4.1/lit-html.js';
import jss from 'https://unpkg.com/jss@10.7.1/dist/jss.bundle.js';
import jssPresetDefault from 'https://unpkg.com/jss-preset-default@10.7.1/dist/jss-preset-default.bundle.js';

export class Element {
	/**
	 * @typedef {{detail: *}} ElementEventData
	 * @typedef {(event: ElementEventData) => void} ElementEventCallback
	 */

	/** @param {Element} renderTarget */
	constructor(renderTarget) {
		/** @type {HTMLElement} 							*/ 	this.renderTarget = renderTarget;
		/** @type {boolean} 								*/ 	this.isMounted = false;
		/** @type {Map<string, ElementEventCallback[]>} 	*/ 	this.eventStringToCallbacksMap = new Map();

		if (!(renderTarget instanceof HTMLElement)) {
			this.renderTarget = document.createElement('div');
			this.renderTarget.style.display = 'contents';
		}

		const { classes } = jss
			.setup(jssPresetDefault())
			.createStyleSheet(this.stylesheet)
			.attach();

		this.classes = classes;
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

		callbacks.forEach((callback) => {
			callback({ detail: data.detail });
		});
	}

	onAttach() {}
	onMount() {}
	onDestroy() {}

	render() {
		litRender(
			this.template,
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
