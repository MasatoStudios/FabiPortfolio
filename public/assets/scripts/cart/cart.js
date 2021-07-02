import { html } from 'https://unpkg.com/lit-html@1.4.1/lit-html.js';
import { Item } from './core/blocks/item.js';
import { StoreArray } from './core/store/extended/array.js';
import { Store } from './core/store.js';
import { Element } from './core/element.js';
import { Vars, MediaQueries } from './core/style.js';
import { toast, ToastItem } from './toast.js';

export class CartItem extends Item {
	constructor() {
		super();

		/** @type {string} Must be unique, follow the convention of: 'productID:variantID' */
		this.id = undefined;
		/** @type {string=Transparent Image} URL to the thumbnail, can be data url */
		this.thumbnailSrc = 'data:image/octet-stream;base64,UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAQAFZQOCAYAAAAMAEAnQEqAQABAA/A/iWkAANwAP7mtQAA';
		/** @type {string} Display name of product, doesn't have to be unique */
		this.name = undefined;
		/** @type {string} Display variant of product, doesn't have to be unique */
		this.variant = undefined;
		/** @type {number=1} */
		this.quantity = 1;
		/** @type {number} */
		this.pricePerItem = undefined;
		/** @type {number=0} */
		this.discountPercent = 0;
		/** @type {'generic' | 'downloadable'} */
		this.type = 'generic';
	}

	get priceTotalAdjustment() {
		return this.priceTotalUnadjusted * (-this.discountPercent / 100);
	}

	get priceTotalUnadjusted() {
		return this.pricePerItem * this.quantity;
	}

	get priceTotal() {
		return Number(
			(this.priceTotalUnadjusted + this.priceTotalAdjustment)
				.toFixed(2),
		);
	}
}

export class CartElement extends Element {
	constructor(renderTarget) {
		super(renderTarget);

		/** @type {StoreArray} 			*/ 	this.itemsW = new StoreArray();
		/** @type {boolean} 			*/ 	this.isOpen = false;
		/** @type {Element | null} 		*/ 	this.lastClickSrc = null;
		/** @type {'cart' | 'receipt'} 	*/ 	this.state = 'cart';

		this.itemsW.subscribeLazy((items) => {
			const idToIndexMap = new Map();

			// merge items with the same ids
			items.forEach((item, i) => {
				const index = idToIndexMap.get(item.id);

				if (index == null) {
					idToIndexMap.set(item.id, i);

					return;
				}

				items[index].quantity += item.quantity;
				items.splice(index, 1);
			});

			this.render();

			toast.store.push(ToastItem.from({
				text: 'Added to cart.',
				type: 'success',
			}));
		});

		this.itemsW.push(...[
			CartItem.from({
				id: '1:A',
				thumbnailSrc: '/shop/img/Rectangle-1920x1080-Placeholder.png',
				name: 'Product 1',
				quantity: 1,
				pricePerItem: 10,
				discountPercent: 10,
				variant: null,
			}),
			CartItem.from({
				id: '2:A',
				thumbnailSrc: '/shop/img/Rectangle-1920x1080-Placeholder.png',
				name: 'Product 2',
				quantity: 1,
				pricePerItem: 10,
				discountPercent: 0,
				variant: 'A',
			}),
			CartItem.from({
				id: '3:A',
				thumbnailSrc: '/shop/img/Rectangle-1920x1080-Placeholder.png',
				name: 'Product 3',
				quantity: 1,
				pricePerItem: 10,
				discountPercent: 0,
				variant: 'A',
			}),
			CartItem.from({
				id: '4:A',
				thumbnailSrc: '/shop/img/Rectangle-1920x1080-Placeholder.png',
				name: 'Product 4',
				quantity: 1,
				pricePerItem: 10,
				discountPercent: 0,
				variant: 'A',
			}),
			CartItem.from({
				id: '4:A',
				thumbnailSrc: '/shop/img/Rectangle-1920x1080-Placeholder.png',
				name: 'Product 4',
				quantity: 4,
				pricePerItem: 10,
				discountPercent: 0,
				variant: 'A',
			}),
		]);
	}

	activate() {
		this.isOpen = true;
		this.onActivate(this.lastClickSrc);
	}

	deactivate() {
		this.isOpen = false;
		this.onDeactivate(this.lastClickSrc);
	}

	/** @override */
	onAttach() {
		// add listener to all store buttons;
		Array
			.from(document.getElementsByClassName('js-cart-button'))
			.forEach((elem) => {
				elem.addEventListener('click', () => {
					this.isOpen = !this.isOpen;
					this.lastClickSrc = elem;

					if (this.isOpen) {
						this.onActivate(elem);
					} else {
						this.onDeactivate(elem);
					}
				});
			});
	}

	onApprove(details) {
		this.itemsW.value.forEach(async (/** @type {CartItem} */ item, i) => {
			if (item.type === 'downloadable') {
				await new Promise((resolve) => {
					// prevent download file count throttle
					setTimeout(resolve, i * 300);
				});

				const uri = `/api/v1/download?i=${item.id}&o=${details.orderID}`;
				const a = document.createElement('a');
				a.setAttribute('href', uri);
				a.setAttribute('download', uri);
				a.setAttribute();
				a.click();
			}
		});

		this.render();

		this.itemsW.value.splice(0, this.itemsW.length);
	}

	/** @override */
	async onMount() {
		this.mainElem = this.renderTarget.getElementsByClassName(this.classes.main)[0];
		this.overlayElem = this.renderTarget.getElementsByClassName(this.classes.overlay)[0];
		this.xElem = this.renderTarget.getElementsByClassName(this.classes.x)[0];

		// add deactivate hooks
		this.overlayElem.addEventListener('click', () => this.deactivate());
		this.xElem.addEventListener('click', () => this.deactivate());

		if (window.paypal == null) {
			// wait for window.paypal to appear
			await new Promise((resolve) => {
				const interval = setInterval(() => window.paypal && (clearInterval(interval), resolve()));
			});
		}

		const idPrefix = `${Date.now()}:${Math.floor(Math.random() * 1000)}`;

		window.paypal.Buttons({
			style: {
				shape: 'rect',
				color: 'gold',
				layout: 'vertical',
				label: 'paypal',
			},

			createOrder: (data, actions) => actions.order.create({
				/* eslint-disable camelcase */
				purchase_units: this.itemsW.value.map((/** @type {CartItem} */ item) => ({
					reference_id: `${idPrefix}:${item.id}`,
					description: `${item.name} (x${item.quantity})`,
					amount: {
						currency_code: 'USD',
						value: item.priceTotal,
					},
				})),
				/* eslint-enable camelcase */
			}),

			onApprove: async (data, actions) => {
				const details = await actions.order.capture();

				this.onApprove(details);
			},

			onError: (err) => {
				toast.store.push(ToastItem.from({
					type: 'error',
					text: err.message,
					time: 10000,
				}));
			},
		}).render(`.${this.classes.paypal}`);
	}

	/** @param {Element} srcElem */
	onActivate(srcElem) {
		srcElem.style.opacity = 0;

		this.render();
	}

	/** @param {Element} srcElem */
	onDeactivate(srcElem) {
		srcElem.style.opacity = '';

		this.render();
	}

	get store() {
		return this.itemsW;
	}

	/** @override */
	get template() {
		const { classes, itemsW } = this;
		const { value: items } = itemsW;

		/** @type {boolean} 			*/	const isReceipt = this.state === 'receipt';
		/** @type {number} 				*/	const totalUnadjusted = items.reduce((prev, curr) => prev + curr.priceTotalUnadjusted, 0);
		/** @type {number} 				*/	const total = items.reduce((prev, curr) => prev + curr.priceTotal, 0);
		/** @type {number} 				*/	const totalAdjustments = total - totalUnadjusted;
		/** @type {CartItemElement[]}	*/ 	const cartItemElements = items.map((item) => new CartItemElement(null, item, !isReceipt));

		cartItemElements.forEach((cartItemElement) => {
			cartItemElement.itemW.subscribeLazy((item) => {
				// unsubscribe all
				cartItemElements.forEach((cartItemElement) => {
					cartItemElement.itemW.subscribers.length = 0;
				});

				if (item.quantity < 0) {
					this.itemsW.update((items) => items.filter((it) => it !== item));
				}

				this.render();
			});

			cartItemElement.render();
		});

		return html`
			<div class='${classes.overlay}${this.isOpen ? ' active' : ''}'></div>
			<a class='${classes.x} vlt-menu-burger${this.isOpen ? ' active' : ''}' href='#'>
				<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='currentColor' stroke-linecap='square' stroke-linejoin='round' stroke-width='2' viewBox='0 0 24 24'>
					<path d='M18 6L6 18M6 6l12 12'></path>
				</svg>
			</a>
			<div class='${classes.main}${this.isOpen ? ' active' : ''}'>
				<div class='gradient'></div>
				<div class='header'>
					<p>${isReceipt ? 'Your Receipt' : 'Your Cart'}</p>
				</div>
				<div class='content'>
					<div class='shade'></div>
					<div class='title'>
						<h3>${items.length} item${items.length === 1 ? '' : 's'}${isReceipt ? ' Purchased' : ''}.</h3>
						${isReceipt && items.some((item) => item.type === 'downloadable') && html`<p>Downloads should start at any moment.</p>`}
					</div>
					<div class='summary'>
						<div class='wrapper'>
							<div class='data'>
								<p>Total: </p>
								<h6>$${total}</h6>
								<br>
								<p>Total Price Adjustments: </p>
								<h6>${totalAdjustments < 0 ? '-' : ''}$${Math.abs(totalAdjustments.toFixed(2))}</h6>
							</div>
							<div style='height: 48px'></div>
							${isReceipt ? '' : html`<div class='${classes.paypal}'></div>`}
							<a @click=${() => this.deactivate()} class='continue vlt-btn vlt-btn--primary vlt-btn--md' href='#'>
								Continue Shopping
							</a>
						</div>
					</div>
					<div class='items'>
						${cartItemElements.map((cartItemElement) => cartItemElement.renderTarget)}
					</div>
				</div>
			<div>
		`;
	}

	/** @override */
	get stylesheet() {
		return {
			main: {
				height: '80%',
				width: '50%',
				minWidth: 500,

				overflow: 'hidden auto',

				position: 'fixed',
				top: '10%',
				right: 0,
				zIndex: 100,
				pointerEvents: 'none',
				backdropFilter: 'blur(10px)',
				outline: 'solid 1px #ffffff17',
				outlineOffset: '50px',
				opacity: 0,
				transform: 'translateX(200px)',
				transition: `transform .2s ${Vars.EASE_SLOW_FAST}, opacity .1s ${Vars.EASE_SLOW_FAST}, outline-offset .2s ${Vars.EASE_SLOW_FAST}`,
				'&.active': {
					opacity: 1,
					transform: 'translateX(0)',
					outlineOffset: '10px',
					transition: `transform .5s ${Vars.EASE_FAST_SLOW}, opacity .2s ${Vars.EASE_SLOW_SLOW}, outline-offset .7s ${Vars.EASE_FAST_SLOW}`,
					pointerEvents: 'auto',
				},
				[MediaQueries.MOBILE]: {
					width: '100vw',
					height: '100%',
					top: 0,
					minWidth: 'unset',
				},
				'& > .gradient': {
					position: 'sticky',
					top: 0,
					left: 0,
					boxSizing: 'border-box',
					padding: Vars.PADDING,
					width: '100%',
					height: '100%',
					background: 'linear-gradient(210deg, #cf000f 0%, #cf000f00 60%, #cf000f00 100%)',
					zIndex: -1,
				},
				'& > .header': {
					position: 'absolute',
					top: 0,
					background: '#000f',
					padding: Vars.PADDING,
					width: '100%',
					height: `calc(50% - ${Vars.PADDING} * 4)`,
					zIndex: 1,
					'& > .fa-shopping-cart': {
						color: 'white',
					},
					'& > p': {
						color: 'white',
						lineHeight: '1em',
						fontSize: '.9375rem',
						letterSpacing: '1px',
						textTransform: 'uppercase',
					},
				},
				'& > .content': {
					width: '100%',
					position: 'absolute',
					top: `calc(50% - ${Vars.PADDING} * 4);`,
					// top: 0,
					boxSizing: 'border-box',
					'& > .shade': {
						position: 'sticky',
						top: 0,
						width: '100%',
						height: `calc(${Vars.PADDING} * 4)`,
						background: 'linear-gradient(180deg, #000f 0%, #000e 30%, #0003 80%, #0000 100%)',
					},
					'& > .title': {
						position: 'sticky',
						top: Vars.PADDING,
						marginTop: `calc(-${Vars.PADDING} * 1)`,
						marginLeft: Vars.PADDING,
						'& > h3': {
							lineHeight: '1em',
						},
					},
					'& > .summary': {
						position: 'sticky',
						marginTop: Vars.PADDING,
						top: 0,
						height: 0,
						float: 'right',
						'& > .wrapper': {
							background: '#fffa',
							backdropFilter: 'invert(1)',
							width: 'calc(16.6666667vw - 5px)',
							minWidth: 240,
							padding: Vars.PADDING,
							'& > .data': {
								'& > p': {
									margin: 0,
								},
								'& > p, & > h6': {
									color: 'black',
								},
							},
							'& > .vlt-btn': {
								zIndex: 'unset',
								width: '100%',
								height: 45,
							},
							'& > .continue': {
								background: 'transparent',
								color: 'black',
								boxShadow: 'inset 0 0 0 1px black',
							},
							'& > .continue:hover, & > .continue:active': {
								background: 'black',
								color: 'white',
							},
							'& > .continue:active': {
								background: 'transparent',
								color: 'transparent',
							},
							'@media (max-width: 1480px)': {
								height: 'auto',
								width: '100%',
							},
						},
						'@media (max-width: 1480px)': {
							float: 'unset',
							height: 'auto',
						},
					},
					'& > .items': {
						boxSizing: 'border-box',
						padding: Vars.PADDING,
						maxWidth: '33.333333vw',
						minWidth: 500,
						'@media (max-width: 1480px)': {
							maxWidth: '100vw',
							minWidth: 'unset',
						},
						'& > div:last-child > div': {
							marginBottom: 0,
						},
					},
				},
			},
			x: {
				position: 'absolute',
				top: 'calc(10% + 48px + 1.35rem)',
				right: 'calc(max(50%, 500px) + 72px)',
				color: 'white',
				zIndex: 1000,
				opacity: 0,
				transform: 'rotate(0deg) translateX(100px)',
				transition: `transform .3s ease, opacity .2s ${Vars.EASE_FAST_SLOW}, color .2s ${Vars.EASE_FAST_SLOW}`,
				'&.active': {
					opacity: 1,
					transform: 'rotate(0deg) translateX(0px)',
				},
				'&.active:hover': {
					opacity: 1,
					transform: 'rotate(180deg) translateX(0px)',
				},
				[MediaQueries.MOBILE]: {
					top: 'calc((-10% / 2) - (1.75rem / 2))',
					left: 48,
				},
			},
			overlay: {
				position: 'fixed',
				top: 0,
				left: 0,
				zIndex: 99,
				pointerEvents: 'none',
				background: '#0008',
				height: '100%',
				width: '100%',
				opacity: 0,
				transition: `opacity 1s ${Vars.EASE_FAST_SLOW}`,
				'&.active': {
					opacity: 1,
					pointerEvents: 'auto',
				},
			},
			paypal: {},
		};
	}
}

export class CartItemElement extends Element {
	/**
	 * @param {CartItem} item
	 * @param {Element | null} renderTarget
	 * @param {boolean} isEditable
	 * */
	constructor(renderTarget, item, isEditable = true) {
		super(renderTarget || null);

		/** @type {Store} 	*/ 	this.itemW = new Store(item);
		/** @type {boolean} */ 	this.isEditable = isEditable;
	}

	onDecrement() {
		this.itemW.update((item) => {
			--item.quantity;

			return item;
		});
	}

	onIncrement() {
		this.itemW.update((item) => {
			++item.quantity;

			return item;
		});
	}

	/** @override */
	get template() {
		const { itemW, classes } = this;
		const { value: item } = itemW;

		return html`
			<div class='${classes.item}'>
				<img class='thumbnail' src='${item.thumbnailSrc}'>
				<h6 class='name'>${item.name}</h6>
				${item.variant && html`<p class='variant'><b>${item.variant}</b></p>`}
				<p class='price'>$${item.priceTotalUnadjusted}${item.priceTotalAdjustment ? ` (${item.priceTotalAdjustment > 0 ? '' : '-'}$${Math.abs(item.priceTotalAdjustment.toFixed(2))})` : ''}</p>
				<div class='quantity'>
					${this.isEditable && html`<a @click=${() => this.onDecrement()} class='vlt-btn vlt-btn--primary vlt-btn--md' href='#'>${item.quantity > 0 ? '-' : '×'}</a>`}
					<p>${item.quantity}</p>
					${this.isEditable && html`<a @click=${() => this.onIncrement()} class='vlt-btn vlt-btn--primary vlt-btn--md' href='#'>+</a>`}
				</div>
			</div>
		`;
	}

	/** @override */
	get stylesheet() {
		return {
			item: {
				display: 'grid',
				gridTemplateAreas: `'thumbnail name price quantity'
									'thumbnail variant _ quantity'`,
				gridTemplateColumns: '48px auto repeat(2, min-content)',
				gridTemplateRows: 'repeat(2, min-content)',
				columnGap: 48,
				marginBottom: 48,
				'& > .thumbnail': {
					width: 48,
					gridArea: 'thumbnail',
				},
				'&  > .name': {
					gridArea: 'name',
				},
				'&  > .price': {
					textAlign: 'right',
					color: 'white',
					gridArea: 'price',
					lineHeight: '1.1em',
				},
				'&  > .quantity': {
					gridArea: 'quantity',
					display: 'grid',
					gridTemplateColumns: 'repeat(3, 38px)',
					alignItems: 'center',
					justifyItems: 'center',
					height: 'min-content',
					color: 'white',
					'& > .vlt-btn': {
						zIndex: 'unset',
						padding: 16,
						background: '#fff0',
						boxShadow: 'inset 0 0 0 1px white',
						position: 'unset',
						'&:hover': {
							boxShadow: 'inset 0 0 0 1px #fff0',
						},
						'&:active': {
							background: 'white',
						},
					},
				},
				'& > .variant': {
					// lineHeight: '0.5em',
					gridArea: 'variant',
					'@media (max-width: 500px)': {
						marginBottom: '8px',
					},
				},
				'& p, & h6': {
					margin: 0,
				},
				'@media (max-width: 500px)': {
					gridTemplateAreas: `'thumbnail name price'
										'thumbnail variant _ '
										'thumbnail quantity _'`,
					gridTemplateColumns: '48px auto min-content',
					gridTemplateRows: 'repeat(3, min-content)',
				},
			},
		};
	}
}

/** @type {CartElement}		*/	const cart = new CartElement();

cart.render();
cart.attach(document.body);

export {
	cart,
};
