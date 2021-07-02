import { CartElement } from './cart.js';
import { ToastElement } from './toast.js';

new CartElement(document.getElementsByClassName('js-cart-render-target')[0]).render();
new ToastElement(document.getElementsByClassName('js-toasts-render-target')[0]).render();
