import { Routes } from '@angular/router';
import { QrScannerComponent } from './components/qr-scanner/qr-scanner.component';
import { MenuComponent } from './components/menu/menu.component';
import { CartComponent } from './components/cart/cart.component';
import { CheckoutComponent } from './components/checkout/checkout.component';

export const routes: Routes = [
  { path: '', redirectTo: '/scanner', pathMatch: 'full' },
  { path: 'scanner', component: QrScannerComponent },
  { path: 'menu/:tableId', component: MenuComponent },
  { path: 'cart/:tableId', component: CartComponent },
  { path: 'checkout/:tableId', component: CheckoutComponent }
];