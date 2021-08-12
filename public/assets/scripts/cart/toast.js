import { html } from 'https://unpkg.com/lit-html@1.4.1/lit-html.js';
import { Item } from './core/blocks/item.js';
import { Element } from './core/element.js';
import { StoreArray } from './core/store/extended/array.js';
import { Breakpoints, Vars } from './core/style.js';

export class ToastItem extends Item {
	constructor() {
		super();

		/** @type {ToastType} 	*/ 	this.type = 'info';
		/** @type {string} 		*/	this.text = '';
		/** @type {number} 		*/	this.time = 3000;
	}
}

export class ToastElement extends Element {
	/**
	 * @param {Element} renderTarget
	 * @param {ToastItem} item
	 * */
	constructor(renderTarget) {
		super(renderTarget);

		/** @type {StoreArray} 			*/	this.itemsW = new StoreArray();
		/** @type {ToastItemElement[]} 	*/	this.toastItemElements = [];

		let lastItems = [];
		this.itemsW.subscribe((items) => {
			const itemsDiffRemoved = items.length < lastItems.length
				? lastItems.map((item) => !items.includes(item) && item)
				: [];
			const itemsDiffAdded = items.length > lastItems.length
				? items.map((item) => !lastItems.includes(item) && item)
				: [];

			let lastItemIndexOffset = 0;
			itemsDiffRemoved.forEach((lastItem, lastItemIndex) => {
				if (!lastItem) {
					return;
				}

				this.toastItemElements.splice(lastItemIndex + lastItemIndexOffset, 1);
				--lastItemIndexOffset;
			});

			itemsDiffAdded.forEach((item) => {
				if (!item) {
					return;
				}

				const toastItemElement = new ToastItemElement(null, item);
				toastItemElement.render();

				this.toastItemElements.push(toastItemElement);

				toastItemElement.once('destroy', () => {
					this.itemsW.splice(this.itemsW.findIndex((item) => item === toastItemElement.item), 1);
				});
			});

			lastItems = [...items];

			this.render();
		});
	}

	get store() {
		return this.itemsW;
	}

	/** @override */
	get template() {
		const { classes } = this;

		return html`
			<div class='${classes.toasts}'>
				${this.toastItemElements.map((toastItemElement) => toastItemElement.renderTarget)}
			</div>
		`;
	}

	/** @override */
	get stylesheet() {
		return {
			toasts: {
				position: 'fixed',
				right: 0,
				bottom: 0,
				zIndex: 1000,
				pointerEvents: 'none',
				// padding: Vars.PADDING,
				width: '100%',
				minWidth: Breakpoints.MOBILE,
				maxWidth: '50vw',
				[`@media (max-width: ${Breakpoints.MOBILE * 2}px)`]: {
					maxWidth: '75vw',
				},
				[`@media (max-width: ${Breakpoints.MOBILE * 1.5}px)`]: {
					minWidth: 'unset',
					maxWidth: 'unset',
				},
			},
		};
	}
}

export class ToastItemElement extends Element {
	/**
	 * @typedef {'info'|'warn'|'error'|'success'} ToastType
	 * */
	/**
	 * @param {Element | null} renderTarget
	 * @param {ToastItem} item
	 */
	constructor(renderTarget, item) {
		super(renderTarget);

		/** @type {ToastItem}	*/	this.item = item;
		/** @type {boolean} 	*/ 	this.isOpen = false;

		this.onDefault('click', () => {
			this.dismiss();
		});
	}

	/**
	 * @param {ToastType} type
	 */
	getIconClass(type) {
		switch (type) {
			case 'success':
				return 'fa-check';
			case 'info':
				return 'fa-info';
			case 'error':
			case 'warn':
				return 'fa-exclamation';
			default:
				return 'fa-question';
		}
	}

	activate() {
		this.isOpen = true;
		this.render();

		this.dispatch('activate');
	}

	deactivate() {
		this.isOpen = false;
		this.render();

		this.dispatch('deactivate');
	}

	/** @override */
	onMount() {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				this.activate();
			});
		});

		if (this.item.time >= 0) {
			this.scheduleDismiss(this.item.time);
		}
	}

	/**
	 * @param {number} ms
	 */
	scheduleDismiss(ms) {
		setTimeout(() => this.dismiss(), ms);
	}

	dismiss() {
		this.deactivate();

		setTimeout(() => {
			this.destroy();
		}, 100);
	}

	get template() {
		const { classes } = this;

		const clickCallbacks = this.eventStringToCallbacksMap.get('click');
		const clickCallbacksLength = typeof clickCallbacks === 'object' ? Number(clickCallbacks.length) : 0;

		return html`
			<div class='${classes.toast} ${this.item.type}${this.isOpen ? ' active' : ''}'>
				<i class='fa ${this.getIconClass(this.item.type)} fa-sm'></i>
				${clickCallbacksLength > 0 ? html`<a class='clickable' href='#' onclick='false' @click=${() => this.dispatch('click')} >${this.item.text}</a>` : html`<p>${this.item.text}</p>`}
				<a class='dismiss' @click=${() => this.dismiss()} href='#'>
					<i class='fa fa-times-circle fa-sm'></i>
				</a>
			<div>
		`;
	}

	get stylesheet() {
		return {
			toast: {
				display: 'grid',
				columnGap: '8px',
				width: 'fit-content',
				float: 'right',
				clear: 'right',
				marginRight: '6px',
				// marginTop: '24px',
				padding: '16px 16px',
				// borderRadius: '48px',
				lineHeight: '1.4em',
				alignItems: 'center',
				justifyItems: 'center',
				gridTemplateColumns: '16px auto 16px',
				color: 'white',
				opacity: 0,
				pointerEvents: 'none',
				transform: 'translateY(200px)',
				transition: `transform .2s ${Vars.EASE_SLOW_FAST}, opacity .1s ${Vars.EASE_SLOW_FAST}`,
				'&.active': {
					opacity: 1,
					pointerEvents: 'auto',
					cursor: 'pointer',
					transform: 'translateY(0)',
					transition: `transform .5s ${Vars.EASE_FAST_SLOW}, opacity .2s ${Vars.EASE_SLOW_SLOW}`,
				},
				'&.success': {
					background: 'var(--success)',
				},
				'&.info': {
					background: 'var(--info)',
				},
				'&.error': {
					background: 'var(--danger)',
				},
				'&.warn': {
					background: 'var(--warning)',
				},
				'& > .fa, & > .dismiss': {
					color: '#fff8',
				},
				'& > .dismiss:hover': {
					color: '#0003',
				},
				'& > .clickable': {
					textDecoration: 'underline',
					textUnderlineOffset: '4px',
				},
				'& > .clickable:hover': {
					color: '#fff8',
				},
				[`@media (max-width: ${Breakpoints.MOBILE * 1.5}px)`]: {
					float: 'unset',
					marginLeft: 'auto',
					marginRight: 'auto',
				},
			},
		};
	}
}

/** @type {ToastElement}	*/	const toast = new ToastElement();

toast.render();
toast.attach(document.body);

export {
	toast,
};
