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

		this.itemsW.push(...[
			ToastItem.from({
				type: 'info',
				text: 'hello',
			}),
		]);

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
				if (lastItem == null) {
					return;
				}

				this.toastItemElements.splice(lastItemIndex + lastItemIndexOffset, 1);
				--lastItemIndexOffset;
			});

			itemsDiffAdded.forEach((item) => {
				if (item == null) {
					return;
				}

				this.toastItemElements.push(item);
			});

			lastItems = items;

			this.render();
		});
	}

	/** @override */
	get template() {
		const { classes } = this;

		return html`
			<div class='${classes.toasts}'>
				${this.toastItemElements}
			</div>
		`;
	}

	/** @override */
	get stylesheet() {
		return {
			toasts: {
				width: '100%',
				minWidth: Breakpoints.MOBILE,
				maxWidth: '50vw',
				[`@media (max-width: ${Breakpoints.MOBILE * 2}px)`]: {
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

	/**
	 * @param {ToastType} type
	 */
	getIconColour(type) {
		switch (type) {
			case 'success':
				return 'var(--success)';
			case 'info':
				return 'var(--info)';
			case 'error':
				return 'var(--danger)';
			case 'warn':
				return 'var(--warning)';
			default:
				return 'var(--white)';
		}
	}

	activate() {
		this.isOpen = true;
		this.render();
	}

	deactivate() {
		this.isOpen = false;
		this.render();
	}

	/** @override */
	onMount() {
		requestAnimationFrame(() => {
			this.activate();
		});
	}

	/**
	 * @param {number} ms
	 */
	scheduleDismiss(ms) {
		setTimeout(() => this.dismiss, ms);
	}

	dismiss() {
		this.deactivate();

		setTimeout(() => {
			this.destroy();
		}, 100);
	}

	get template() {
		const { classes } = this;

		return html`
			<div class='${classes.toast}'>
				<i class='fa ${this.getIconClass(this.item.type)} fa-md'></i>
				<p>${this.item.text}</p>
				<a @click=${() => this.dismiss()} href='#'>
					<i class='fa fa-times fa-sm'></i>
				</a>
			<div>
		`;
	}

	get stylesheet() {
		return {
			toast: {
				display: 'grid',
				gridTemplateColumns: 'min-content auto min-content',
				opacity: 0,
				pointerEvents: 'none',
				transform: 'translateY(200px)',
				transition: `transform .2s ${Vars.EASE_SLOW_FAST}, opacity .1s ${Vars.EASE_SLOW_FAST}`,
				'&.active': {
					opacity: 1,
					pointerEvents: 'auto',
					transform: 'translateY(0)',
					transition: `transform .5s ${Vars.EASE_FAST_SLOW}, opacity .2s ${Vars.EASE_SLOW_SLOW}`,
				},
				'& > .fa': {
				},
				'& > p': {
				},
				'& > .close': {
				},
			},
		};
	}
}
