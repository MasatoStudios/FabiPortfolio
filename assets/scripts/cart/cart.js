import { html } from 'https://unpkg.com/lit-html@1.4.1/lit-html.js';
import { Item } from './core/blocks/item.js';
import { StoreArray } from './core/store/extended/array.js';
import { Store } from './core/store.js';
import { Element } from './core/element.js';
import { Vars, MediaQueries } from './core/style.js';

export class CartItem extends Item {
	constructor() {
		super();

		/** @type {string} Must be unique, follow the convention of: 'productID:variantID' */
		this.id = undefined;
		/** @type {string=Transparent Image} URL to the thumbnail, can be data url */
		this.thumbnailSrc = 'data:image/octet-stream;base64,UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAQAFZQOCAYAAAAMAEAnQEqAQABAA/A/iWkAANwAP7mtQAA';
		/** @type {string} Display name of product, doesn't have to be unique */
		this.name = undefined;
		// todo: make null variant hide variant text
		/** @type {string} Display variant of product, doesn't have to be unique */
		this.variant = undefined;
		/** @type {number=1} */
		this.quantity = 1;
		/** @type {number} */
		this.pricePerItem = undefined;
		/** @type {number=0} */
		this.discountPercent = 0;
	}
}

export class CartElement extends Element {
	constructor(renderTarget) {
		super(renderTarget);

		/** @type {StoreArray} 			*/ 	this.itemsW = new StoreArray();
		/** @type {boolean} 			*/ 	this.isOpen = false;
		/** @type {Element | null} 		*/ 	this.lastClickSrc = null;

		this.itemsW.push(...[
			CartItem.from({
				id: '1:A',
				thumbnailSrc: '/shop/img/Rectangle-1920x1080-Placeholder.png',
				name: 'Product 1',
				quantity: 1,
				pricePerItem: 10,
				discountPercent: 0,
				variant: 'A',
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

		this.itemsW.subscribe((items) => {
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

	/** @override */
	async onMount() {
		this.mainElem = document.getElementsByClassName(this.classes.main)[0];
		this.overlayElem = document.getElementsByClassName(this.classes.overlay)[0];
		this.xElem = document.getElementsByClassName(this.classes.x)[0];

		// add deactivate hooks
		this.overlayElem.addEventListener('click', () => this.deactivate());
		this.xElem.addEventListener('click', () => this.deactivate());

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

			createOrder(data, actions) {
				return actions.order.create({
					// eslint-disable-next-line camelcase
					purchase_units: [{ description: 'aaaaaaaaa', amount: { currency_code: 'USD', value: 1 } }],
				});
			},

			onApprove(data, actions) {
				return actions.order.capture().then((details) => {
					alert('Transaction completed by ' + details.payer.name.given_name + '!');
				});
			},

			onError(err) {
				console.log(err);
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

	/** @override */
	get template() {
		const { classes, itemsW } = this;
		const { value: items } = itemsW;

		/** @type {number} 				*/	const totalRaw = items.reduce((prev, curr) => prev + (curr.pricePerItem * curr.quantity), 0);
		/** @type {number} 				*/	const total = items.reduce((prev, curr) => prev + (curr.pricePerItem * curr.quantity * ((100 - curr.discountPercent) / 100)), 0);
		/** @type {number} 				*/	const totalAdjustments = total - totalRaw;
		/** @type {CartItemElement[]}	*/ 	const cartItemElements = items.map((item) => new CartItemElement(null, item));

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
					<p>Your Cart</p>
				</div>
				<div class='content'>
					<div class='shade'></div>
					<div class='title'>
						<h3>${items.length} item${items.length === 1 ? '' : 's'}.</h3>
					</div>
					<div class='summary'>
						<div class='wrapper'>
							<div class='data'>
								<p>Total: </p>
								<h6>$${total}</h6>
								<br>
								<p>Total Price Adjustments: </p>
								<h6>$${totalAdjustments}</h6>
							</div>
							<div style='height: 48px'></div>
							<div class='${classes.paypal}'>
								<a class='checkout vlt-btn vlt-btn--primary vlt-btn--md' href='#'>...</a>
							</div>
							<a @click=${() => this.deactivate()} class='continue vlt-btn vlt-btn--primary vlt-btn--md' href='#'>Continue Shopping</a>
						</div>
					</div>
					<div class='items'>
						${cartItemElements.map((cartItemElement) => cartItemElement.template)}
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
					background: 'linear-gradient(210deg, #cf000f 0%, #cf000f00 100%)',
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
						background: 'linear-gradient(180deg, #000c 0%, #000b 30%, #0003 80%, #0000 100%)',
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
							},
							'& > .checkout': {
								background: 'black',
							},
							'& > .checkout:hover, & > .checkout:active': {
								background: 'transparent',
								color: 'black',
								boxShadow: 'inset 0 0 0 1px black',
							},
							'& > .checkout:active': {
								background: 'black',
							},
							'& > .continue': {
								background: 'transparent',
								color: 'black',
							},
							'& > .continue:hover': {
								color: 'grey',
								boxShadow: 'none',
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
	 * */
	constructor(renderTarget, item) {
		super(renderTarget || null);

		/** @type {Store} */ 	this.itemW = new Store(item);
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
				<p class='variant'><b>${item.variant}</b></p>
				<p class='price'>$${item.pricePerItem * item.quantity}</p>
				<div class='quantity'>
					<a @click=${() => this.onDecrement()} class='vlt-btn vlt-btn--primary vlt-btn--md' href='#'>${item.quantity > 0 ? '-' : '×'}</a>
					<p>${item.quantity}</p>
					<a @click=${() => this.onIncrement()} class='vlt-btn vlt-btn--primary vlt-btn--md' href='#'>+</a>
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
									'thumbnail variant _ _'`,
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
					color: 'white',
					gridArea: 'price',
					alignSelf: 'center',
				},
				'&  > .quantity': {
					gridArea: 'quantity',
					display: 'grid',
					gridTemplateColumns: 'repeat(3, 45px)',
					alignItems: 'center',
					justifyItems: 'center',
					color: 'white',
					'& > .vlt-btn': {
						borderRadius: Vars.PADDING,
						zIndex: 'unset',
						padding: 16,
						background: 'transparent',
						boxShadow: 'inset 0 0 0 1px white',
						opacity: 0.3,
						'&:hover': {
							boxShadow: 'inset 0 0 0 1px #fff0',
						},
						'&:active': {
							background: 'white',
						},
					},
				},
				'& > .variant': {
					lineHeight: '0.5em',
					gridArea: 'variant',
					'@media (max-width: 500px)': {
						lineHeight: '1em',
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
				'&:last-child': {
					marginBottom: 0,
				},
			},
		};
	}

	/** @private */
	render() {
		throw new Error('Unimplemented');
	}
}
