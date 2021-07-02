import { html, render as litRender } from 'https://unpkg.com/lit-html@1.4.1/lit-html.js';
import jss from 'https://unpkg.com/jss@10.7.1/dist/jss.bundle.js';
import jssPresetDefault from 'https://unpkg.com/jss-preset-default@10.7.1/dist/jss-preset-default.bundle.js';

export class Element {
	/** @param {Element} renderTarget */
	constructor(renderTarget) {
		/** @type {HTMLElement} */ 	this.renderTarget = renderTarget;
		/** @type {boolean} 	*/ 	this.isMounted = false;

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

	onMount() {}
	onDestroy() {}

	render() {
		litRender(
			this.template,
			this.renderTarget,
		);

		if (!this.isMounted) {
			this.isMounted = true;
			this.onMount();
		}
	}

	destroy() {
		litRender(
			null,
			this.renderTarget,
		);

		this.onDestroy();
	}

	/** @param {HTMLElement} parent */
	attach(parent) {
		parent.appendChild(this.renderTarget);
	}

	get template() {
		return html``;
	}

	get stylesheet() {
		return {};
	}
}
