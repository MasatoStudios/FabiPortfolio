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
		/** @type {'internal' | 'external'} */
		this.source = 'internal';
	}

	/** @override */
	static from(options) {
		const item = super.from(options);

		Object.keys(item).forEach((/** @type {keyof CartItem} */ key) => {
			switch (key) {
				case 'quantity':
				case 'pricePerItem':
				case 'discountPercent':
					item[key] = Number(item[key]);
					break;
				case 'id':
				case 'thumbnailSrc':
				case 'name':
				case 'variant':
				case 'type':
				case 'source':
					item[key] = String(item[key]);
					break;
				default:
			}
		});

		return item;
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
		/** @type {CartItemElement[]} 	*/ 	this.cartItemElements = [];
		/** @type {boolean} 			*/ 	this.isSuppressingToasts = false;
		/** @type {CartSummaryElement} 	*/ 	this.summary = new CartSummaryElement(null, this);

		this.hydrate();

		this.itemsW.subscribe((items) => {
			const idToIndexMap = new Map();
			const lastItemsLength = this.getLocalStorage().length;
			let isFromExternalSource;

			// merge items with the same ids
			items.forEach((/** @type {CartItem} */ item, i) => {
				const index = idToIndexMap.get(item.id);

				if (index == null) {
					idToIndexMap.set(item.id, i);

					return;
				}

				// detect when prices have changed
				// then prompt the user to remove the outdated products from their cart
				if (items[index].id === item.id
					&& (items[index].pricePerItem !== item.pricePerItem
						|| items[index].discountPercent !== item.discountPercent)) {
					const toastRemoveIndex = toast.store.push(ToastItem.from({
						text: 'The price has changed. Click me to remove old item from cart.',
						type: 'error',
					})) - 1;

					toast.toastItemElements[toastRemoveIndex].once('click', () => {
						this.suppressToasts();
						this.itemsW.splice(items.findIndex((it) => it.id === item.id), 1);
						this.unsuppressToasts();

						const toastRemovedIndex = toast.store.push(ToastItem.from({
							text: 'Old item removed from cart.',
							type: 'success',
						})) - 1;

						toast.toastItemElements[toastRemovedIndex].once('click', () => {
							cart.activate();
						});
					});

					items.splice(i, 1);

					return;
				}

				isFromExternalSource = item.source === 'external';
				items[index].quantity += item.quantity;
				items.splice(i, 1);
			});

			// recreate cartItemElements
			this.cartItemElements.forEach((cartItemElement) => cartItemElement.destroy());
			this.cartItemElements = items.map((item) => new CartItemElement(null, item, this.state !== 'receipt'));
			this.cartItemElements.forEach((cartItemElement) => {
				cartItemElement.render();

				cartItemElement.itemW.subscribeLazy((item) => {
					if (item.quantity < 0) {
						// eslint-disable-next-line max-nested-callbacks
						this.itemsW.update((items) => items.filter((it) => it !== item));
					}
				});

				cartItemElement.on('increment', () => this.onItemChange());
				cartItemElement.on('decrement', () => this.onItemChange());
			});

			if (this.isMounted) {
				this.render();
			}

			if (!this.isSuppressingToasts
				&& (isFromExternalSource
					|| items.length > lastItemsLength)) {
				const index = toast.store.push(ToastItem.from({
					text: 'Added to cart.',
					type: 'success',
				})) - 1;

				toast.toastItemElements[index].once('click', () => {
					this.activate();
				});
			}

			if (!this.isSuppressingToasts
				&& items.length < lastItemsLength) {
				toast.store.push(ToastItem.from({
					text: 'Removed from cart.',
					type: 'error',
				}));
			}

			this.setLocalStorage(items);
		});

		window.addEventListener('keyup', (event) => {
			if (event.key === 'Escape') {
				this.deactivate();
			}
		});

		window.addEventListener('focus', () => {
			this.hydrate();
			this.suppressToasts();
			this.itemsW.trigger();
			this.unsuppressToasts();
		});

		window.addEventListener('cart:activate', () => {
			this.activate();
		});

		window.addEventListener('cart:deactivate', () => {
			this.deactivate();
		});

		window.addEventListener('cart:toggle', () => {
			if (this.isOpen) {
				this.deactivate();
			} else {
				this.activate();
			}
		});
	}

	suppressToasts() {
		this.isSuppressingToasts = true;
	}

	unsuppressToasts() {
		this.isSuppressingToasts = false;
	}

	setLocalStorage(items) {
		localStorage.setItem('cart', JSON.stringify(items));
	}

	getLocalStorage() {
		try {
			const items = JSON.parse(localStorage.getItem('cart'));

			if (!Array.isArray(items)) {
				return [];
			}

			return items;
		} catch (_) {
			return [];
		}
	}

	hydrate() {
		const items = this.getLocalStorage() || [];

		this.itemsW.value.length = 0;

		items.forEach((item) => {
			this.itemsW.value.push(CartItem.from(item));
		});
	}

	activate() {
		this.isOpen = true;
		this.onActivate(this.lastClickSrc);
	}

	deactivate() {
		this.isOpen = false;
		this.onDeactivate(this.lastClickSrc);
	}

	onItemChange() {
		this.setLocalStorage(this.itemsW.value);
		this.summary.render();
	}

	/** @override */
	onAttach() {
		// add listener to all store buttons;
		Array
			.from(document.getElementsByClassName('js-cart-open'))
			.forEach((elem) => {
				elem.addEventListener('click', (event) => {
					event.preventDefault();

					this.isOpen = !this.isOpen;
					this.lastClickSrc = elem;

					if (this.isOpen) {
						this.onActivate(elem);
					} else {
						this.onDeactivate(elem);
					}
				});
			});

		Array
			.from(document.getElementsByClassName('js-cart-add'))
			.forEach((elem) => {
				elem.addEventListener('click', async (event) => {
					event.preventDefault();

					const cartItemOptions = {
						source: 'external',
					};
					const cartItem = new CartItem();

					for (const key in cartItem) {
						if (!Object.prototype.hasOwnProperty.call(cartItem, key)) {
							continue;
						}

						let isExpression = false;
						const datasetKey = `cartAdd${key[0].toUpperCase() + key.substr(1)}`;

						if (elem.dataset[`${datasetKey}:`] != null) {
							isExpression = true;
						}

						const data = elem.dataset[`${datasetKey}${isExpression ? ':' : ''}`];

						if (data) {
							const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
							const result = isExpression
								? await new AsyncFunction('$', 'ctx', `return ${data}`)(document.querySelector.bind(document), cartItemOptions)
								: data;

							cartItemOptions[key] = result;
						}
					}

					cart.store.push(CartItem.from(cartItemOptions));
				});
			});
	}

	/** @param {string} payment */
	onPaid(payment) {
		this.itemsW.value.forEach(async (/** @type {CartItem} */ item, i) => {
			if (item.type === 'downloadable') {
				await new Promise((resolve) => {
					// prevent download file count throttle
					setTimeout(resolve, i * 300);
				});

				const uri = `/api/v1/download?item=${encodeURIComponent(item.id)}&payment=${encodeURIComponent(payment)}`;
				const a = document.createElement('a');
				a.setAttribute('href', uri);
				a.setAttribute('download', uri);
				a.click();
			}
		});

		this.state = 'receipt';
		this.render();
		this.state = 'cart';

		this.itemsW.value.splice(0, this.itemsW.length);
		this.setLocalStorage(this.itemsW.value);
	}

	/** @override */
	async onMount() {
		this.mainElem = this.renderTarget.getElementsByClassName(this.classes.main)[0];
		this.overlayElem = this.renderTarget.getElementsByClassName(this.classes.overlay)[0];
		this.xElem = this.renderTarget.getElementsByClassName(this.classes.x)[0];

		// add deactivate hooks
		this.overlayElem.addEventListener('click', (event) => {
			event.preventDefault();
			this.deactivate();
		});
		this.xElem.addEventListener('click', (event) => {
			event.preventDefault();
			this.deactivate();
		});

		if (window.paypal == null) {
			// wait for window.paypal to appear
			await new Promise((resolve) => {
				const interval = setInterval(() => window.paypal && (clearInterval(interval), resolve()));
			});
		}

		window.paypal.Buttons({
			style: {
				shape: 'rect',
				color: 'gold',
				layout: 'vertical',
				label: 'paypal',
			},
			env: 'sandbox',

			createOrder: async () => (
				await (
					await fetch('/api/v1/payment/new', {
						method: 'POST',
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							items: this.itemsW.value
								.filter((item) => item.quantity > 0)
								.map(
									(/** @type {CartItem} */ item) => ({ id: item.id, quantity: item.quantity }),
								),
						}),
					})
				).json()
			).payment,

			onApprove: async (data) => {
				const response = await fetch('/api/v1/payment/execute', {
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						payment: data.orderID,
					}),
				});
				const result = await response.json();

				if (!response.ok) {
					console.error(result);
					throw new Error('Payment not OK');
				}

				this.onPaid(result.capture);
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
		if (srcElem != null) {
			srcElem.style.opacity = 0;
		}

		void this.removeOutdatedPriceItems();

		this.render();
	}

	/** @param {Element} srcElem */
	onDeactivate(srcElem) {
		if (srcElem != null) {
			srcElem.style.opacity = '';
		}

		this.render();
	}

	async removeOutdatedPriceItems() {
		const itemsWPrePriceCheckLength = this.itemsW.length;

		await Promise.allSettled(this.itemsW.map(async (item, i) => {
			const { price, discountPercent } = (await (await fetch(`/api/v1/price?item=${encodeURIComponent(item.id)}`)).json());

			if (price !== item.pricePerItem
				|| discountPercent !== item.discountPercent) {
				this.suppressToasts();
				this.itemsW.splice(i, 1);
				this.unsuppressToasts();
			}
		}));

		if (itemsWPrePriceCheckLength !== this.itemsW.length) {
			toast.store.push(ToastItem.from({
				text: 'Some items were removed from your cart due to price changes.',
				type: 'info',
			}));
		}
	}

	get store() {
		return this.itemsW;
	}

	/** @override */
	get template() {
		const { classes, itemsW } = this;
		const { value: items } = itemsW;

		/** @type {boolean} 			*/	const isReceipt = this.state === 'receipt';

		this.summary.render();

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
						<h3>${items.length} item${items.length !== 1 && 's'}${isReceipt && ' Purchased'}.</h3>
						${isReceipt && items.some((item) => item.type === 'downloadable') && html`<p>Downloads should start at any moment.</p>`}
					</div>
					${this.summary.renderTarget}
					<div class='items'>
						${this.cartItemElements.map((cartItemElement) => cartItemElement.renderTarget)}
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
			paypal: {
				display: 'none',
				'&.active': {
					display: 'unset',
				},
			},
		};
	}
}

export class CartSummaryElement extends Element {
	/**
	 * @param {CartElement} cart
	 * @param {Element | null} renderTarget
	 * */
	constructor(renderTarget, cart) {
		super(renderTarget || null);

		/** @type {CartElement} 	*/ 	this.cart = cart;
	}

	/** @override */
	get template() {
		const { classes } = this;
		const { value: items } = this.cart.itemsW;

		/** @type {boolean} 			*/	const isReceipt = this.state === 'receipt';
		/** @type {number} 				*/	const totalUnadjusted = items.reduce((prev, curr) => prev + curr.priceTotalUnadjusted, 0);
		/** @type {number} 				*/	const total = items.reduce((prev, curr) => prev + curr.priceTotal, 0);
		/** @type {number} 				*/	const totalAdjustments = total - totalUnadjusted;
		return html`
			<div class='${classes.summary}'>
				<div class='wrapper'>
					<div class='data'>
						<p>Total: </p>
						<h6>$${totalUnadjusted.toFixed(2)}${Boolean(totalAdjustments) && ` (${totalAdjustments < 0 && '-'}$${Math.abs(totalAdjustments.toFixed(2))})`}</h6>
						${Boolean(totalAdjustments) && html`
							<br>
							<p>Adjusted Total: </p>
							<h6>$${total.toFixed(2)}</h6>
						`}
					</div>
					<div style='height: 48px'></div>
					${html`<div class='${this.cart.classes.paypal}${!isReceipt && total > 0 && ' active'}'></div>`}
					<a @click=${() => this.cart.deactivate()} class='continue vlt-btn vlt-btn--primary vlt-btn--md' href='#'>
						Continue Shopping
					</a>
				</div>
			</div>
		`;
	}

	/** @override */
	get stylesheet() {
		return {
			summary: {
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

		this.itemW.subscribe(() => {
			this.render();
		});
	}

	onDestroy() {
		this.itemW.subscribers.length = 0;
	}

	decrement() {
		this.itemW.update((item) => {
			--item.quantity;

			return item;
		});

		this.dispatch('decrement');
	}

	increment() {
		this.itemW.update((item) => {
			++item.quantity;

			return item;
		});

		this.dispatch('increment');
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
				<p class='price'>$${item.priceTotalUnadjusted.toFixed(2)}${item.priceTotalAdjustment ? ` (${item.priceTotalAdjustment > 0 ? '' : '-'}$${Math.abs(item.priceTotalAdjustment.toFixed(2))})` : ''}</p>
				<div class='quantity'>
					${this.isEditable && html`<a @click=${() => this.decrement()} class='vlt-btn vlt-btn--primary vlt-btn--md' href='#'>${item.quantity > 0 ? '-' : '??'}</a>`}
					<p>${item.quantity}</p>
					${this.isEditable && html`<a @click=${() => this.increment()} class='vlt-btn vlt-btn--primary vlt-btn--md' href='#'>+</a>`}
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
				gridTemplateColumns: '48px 1fr 52px min-content',
				columnGap: '3vw',
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
					wordBreak: 'break-word',
					'@media (max-width: 500px)': {
						wordBreak: 'unset',
					},
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
					lineHeight: '1em',
					gridArea: 'variant',
					'@media (max-width: 500px)': {
						marginBottom: '8px',
					},
				},
				'& p, & h6': {
					margin: 0,
					hyphens: 'auto',
					minWidth: 0,
					// wordBreak: 'break-all',
				},
				'@media (max-width: 500px)': {
					gridTemplateAreas: `'thumbnail name price'
										'thumbnail variant _ '
										'thumbnail quantity _'`,
					gridTemplateColumns: '48px auto min-content',
					gridTemplateRows: 'repeat(3, min-content)',
					columnGap: 16,
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
