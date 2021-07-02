import { CartElement } from './cart.js';
import { ToastElement } from './toast.js';

/** @type {CartElement}		*/	const cart = new CartElement();
/** @type {ToastElement}	*/	const toast = new ToastElement();

cart.render();
cart.attach(document.body);

toast.render();
toast.attach(document.body);

export {
	cart,
	toast,
};
