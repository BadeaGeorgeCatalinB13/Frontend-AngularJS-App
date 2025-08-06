import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HesburgerApiService, CartItem } from '../../services/api.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit, OnDestroy {
  tableId: string = '';
  cart: CartItem[] = [];
  deliveryFee: number = 0;
  serviceFee: number = 2.50;
  taxRate: number = 0.1; // 10% tax
  
  private subscriptions: Subscription[] = [];
  
  // Order summary calculations
  get subtotal(): number {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
  
  get taxAmount(): number {
    return this.subtotal * this.taxRate;
  }
  
  get finalTotal(): number {
    return this.subtotal + this.deliveryFee + this.serviceFee + this.taxAmount;
  }
  
  get totalItems(): number {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }
  
  get estimatedTime(): number {
    if (this.cart.length === 0) return 0;
    return Math.max(...this.cart.map(item => item.estimatedTime || 5));
  }

  // Get cart data directly from service
  get cartTotal(): number {
    return this.apiService.getCartTotal();
  }

  get cartItemCount(): number {
    return this.apiService.getCartItemCount();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: HesburgerApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🛒 CartComponent initializing...');
    
    // Get table ID from route
    this.route.params.subscribe(params => {
      this.tableId = params['tableId'];
      console.log('🏷️ Cart for table:', this.tableId);
    });

    // Subscribe to cart updates from the service
    this.initializeCart();
    
    // Debug the cart state
    this.debugCartState();
  }

  ngOnDestroy(): void {
    console.log('🔄 CartComponent destroying, cleaning up subscriptions...');
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeCart(): void {
    console.log('🛒 Initializing cart subscription in CartComponent...');
    
    const cartSub = this.apiService.cart$.subscribe(cart => {
      console.log('🛒 Cart updated in CartComponent:', cart.length, 'items');
      console.log('🛒 Cart items:', cart.map(item => `${item.name} x${item.quantity}`));
      
      this.cart = [...cart]; // Create new array reference
      this.cdr.detectChanges(); // Force change detection
      
      console.log('✅ CartComponent cart state updated');
    });
    
    this.subscriptions.push(cartSub);
  }

  // Debug cart state
  debugCartState(): void {
    console.log('🛒 === CART COMPONENT DEBUG ===');
    console.log('- Component cart items:', this.cart.length);
    console.log('- Service cart items:', this.apiService.getCartItemCount());
    console.log('- Service cart total:', this.apiService.getCartTotal());
    console.log('- localStorage key used by service: hesburger_cart');
    
    // Check localStorage directly
    const storedCart = localStorage.getItem('hesburger_cart');
    if (storedCart) {
      try {
        const parsed = JSON.parse(storedCart);
        console.log('- localStorage cart items:', parsed.length);
        console.log('- localStorage cart contents:', parsed.map((item: any) => `${item.name} x${item.quantity}`));
      } catch (e) {
        console.error('- Error parsing localStorage cart:', e);
      }
    } else {
      console.log('- No cart data in localStorage!');
    }
    
    console.log('===============================');
  }

  // Update item quantity - use service methods
  updateQuantity(productId: number, quantity: number): void {
    console.log('📊 Updating quantity for product:', productId, 'to:', quantity);
    
    if (quantity <= 0) {
      this.removeFromCart(productId);
    } else {
      this.apiService.updateCartQuantity(productId, quantity);
    }
  }

  // Remove item from cart - use service method
  removeFromCart(productId: number): void {
    console.log('🗑️ Removing product from cart:', productId);
    this.apiService.removeFromCart(productId);
    
    // Visual feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  // Clear entire cart - use service method
  clearCart(): void {
    if (confirm('Are you sure you want to clear your cart?')) {
      console.log('🗑️ Clearing entire cart');
      this.apiService.clearCart();
    }
  }

  // Add special instructions to item
  addInstructions(productId: number, instructions: string): void {
    const item = this.cart.find(item => item.id === productId);
    if (item) {
      item.specialInstructions = instructions;
      // Since we're modifying the cart, we need to update the service
      this.apiService.updateCartQuantity(productId, item.quantity);
      console.log('📝 Added instructions to item:', productId, instructions);
    }
  }

  // Navigation methods
  goBackToMenu(): void {
    console.log('⬅️ Going back to menu for table:', this.tableId);
    this.router.navigate(['/menu', this.tableId]);
  }

  // SUPER DEBUG VERSION - Enhanced proceedToCheckout with extensive logging
  proceedToCheckout(): void {
    console.log('🚨 === SUPER DETAILED CHECKOUT DEBUG ===');
    
    // 1. Log all current states
    console.log('📊 CURRENT STATES:');
    console.log('- Component cart length:', this.cart.length);
    console.log('- Service cart count:', this.apiService.getCartItemCount());
    console.log('- Service cart total:', this.apiService.getCartTotal());
    console.log('- Table ID:', this.tableId);
    console.log('- Router available:', !!this.router);
    console.log('- Current URL:', window.location.href);
    
    // 2. Check localStorage
    console.log('💾 LOCALSTORAGE CHECK:');
    const storedCart = localStorage.getItem('hesburger_cart');
    if (storedCart) {
      try {
        const parsed = JSON.parse(storedCart);
        console.log('- localStorage has cart:', parsed.length, 'items');
        console.log('- localStorage items:', parsed.map((item: any) => `${item.name} x${item.quantity}`));
        
        // Force sync if component cart is empty but localStorage has items
        if (this.cart.length === 0 && parsed.length > 0) {
          console.log('🔄 FORCE SYNCING from localStorage...');
          this.cart = parsed;
          this.cdr.detectChanges();
          console.log('✅ Cart synced, new length:', this.cart.length);
        }
      } catch (e) {
        console.error('❌ Error parsing localStorage cart:', e);
      }
    } else {
      console.log('- No localStorage cart found');
    }
    
    // 3. Final cart check
    console.log('🔍 FINAL CART CHECK:');
    console.log('- Component cart after sync:', this.cart.length);
    console.log('- hasItems():', this.hasItems());
    console.log('- Cart items:', this.cart.map(item => `${item.name} x${item.quantity}`));
    
    // 4. Cart validation with multiple fallbacks
    const componentHasItems = this.cart.length > 0;
    const serviceHasItems = this.apiService.getCartItemCount() > 0;
    const storageHasItems = storedCart ? JSON.parse(storedCart).length > 0 : false;
    
    console.log('✅ VALIDATION RESULTS:');
    console.log('- Component has items:', componentHasItems);
    console.log('- Service has items:', serviceHasItems);
    console.log('- Storage has items:', storageHasItems);
    
    // 5. Try all possible ways to confirm cart has items
    const cartHasItems = componentHasItems || serviceHasItems || storageHasItems;
    
    console.log('🎯 FINAL DECISION: Cart has items =', cartHasItems);
    
    if (!cartHasItems) {
      console.log('❌ CHECKOUT BLOCKED: No items found anywhere');
      alert('Your cart is empty! Please add some items first.');
      return;
    }
    
    // 6. Attempt navigation with extensive logging
    console.log('🚀 ATTEMPTING NAVIGATION:');
    console.log('- Target route: /checkout/' + this.tableId);
    console.log('- Cart total for checkout:', this.formatPrice(this.finalTotal));
    
    try {
      console.log('📍 Navigation starting...');
      
      // Try the navigation
      const navigationPromise = this.router.navigate(['/checkout', this.tableId]);
      
      console.log('📍 Navigation promise created:', navigationPromise);
      
      // Handle the navigation promise
      navigationPromise.then((success) => {
        if (success) {
          console.log('✅ Navigation SUCCESS!');
        } else {
          console.log('❌ Navigation FAILED - route not found or blocked');
          alert('Navigation failed. Please check if checkout route exists.');
        }
      }).catch((error) => {
        console.error('❌ Navigation ERROR:', error);
        alert('Navigation error: ' + error.message);
      });
      
      console.log('📍 Navigation attempt completed');
      
    } catch (error) {
      console.error('🚨 NAVIGATION EXCEPTION:', error);
      alert('Navigation exception: ' + (error as Error).message);
    }
    
    console.log('🚨 === END CHECKOUT DEBUG ===');
  }

  // Simple fallback checkout method for testing
  simpleCheckout(): void {
    console.log('🔧 === SIMPLE CHECKOUT TEST ===');
    console.log('- Cart length:', this.cart.length);
    console.log('- Service count:', this.apiService.getCartItemCount());
    
    if (this.cart.length === 0 && this.apiService.getCartItemCount() === 0) {
      alert('Cart is empty!');
      return;
    }
    
    console.log('🚀 Simple navigation to checkout...');
    this.router.navigate(['/checkout', this.tableId]);
  }

  // Force navigation regardless of cart state (for testing)
  forceNavigateToCheckout(): void {
    console.log('⚡ FORCE NAVIGATION - ignoring cart state');
    console.log('- Navigating to: /checkout/' + this.tableId);
    
    this.router.navigate(['/checkout', this.tableId]).then(success => {
      console.log('Force navigation result:', success);
    }).catch(error => {
      console.error('Force navigation error:', error);
    });
  }

  // Test if checkout route exists
  testCheckoutRoute(): void {
    console.log('🧪 Testing if checkout route exists...');
    
    // Try to navigate to checkout route
    this.router.navigate(['/checkout', this.tableId]).then(success => {
      if (success) {
        console.log('✅ Checkout route exists and is accessible');
        // Navigate back immediately
        setTimeout(() => {
          this.router.navigate(['/cart', this.tableId]);
        }, 1000);
      } else {
        console.log('❌ Checkout route does not exist or is not accessible');
        alert('Checkout route not found! Please check your routing configuration.');
      }
    }).catch(error => {
      console.error('❌ Checkout route test failed:', error);
      alert('Checkout route test error: ' + error.message);
    });
  }

  // Get quantity for display
  getItemQuantity(productId: number): number {
    const item = this.cart.find(item => item.id === productId);
    return item ? item.quantity : 0;
  }

  // Get item subtotal
  getItemSubtotal(item: CartItem): number {
    return item.price * item.quantity;
  }

  // Format price for display
  formatPrice(price: number): string {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  // Promotional features
  applyPromoCode(code: string): void {
    // Mock promo code logic
    const promoCodes: any = {
      'SAVE10': { discount: 0.1, type: 'percentage', description: '10% off' },
      'FREE5': { discount: 5, type: 'fixed', description: '5 RON off' },
      'STUDENT': { discount: 0.15, type: 'percentage', description: '15% student discount' }
    };
    
    if (promoCodes[code.toUpperCase()]) {
      const promo = promoCodes[code.toUpperCase()];
      console.log('🎟️ Promo applied:', promo.description);
      alert(`Promo code applied: ${promo.description}`);
      // TODO: Implement actual discount logic in service
    } else {
      alert('Invalid promo code');
    }
  }

  // Quick actions
  duplicateOrder(): void {
    if (confirm('Add all items again to your cart?')) {
      console.log('🔄 Duplicating order...');
      this.cart.forEach(item => {
        this.apiService.addToCart(item, item.quantity);
      });
    }
  }

  // Save for later - use consistent key
  saveOrderForLater(): void {
    const orderData = {
      tableId: this.tableId,
      items: this.cart,
      savedAt: new Date(),
      total: this.finalTotal
    };
    
    localStorage.setItem('hesburger_saved_order', JSON.stringify(orderData));
    alert('Order saved for later!');
    console.log('💾 Order saved for later');
  }

  // Load saved order - use consistent key
  loadSavedOrder(): void {
    const savedOrder = localStorage.getItem('hesburger_saved_order');
    if (savedOrder) {
      try {
        const orderData = JSON.parse(savedOrder);
        if (confirm(`Load saved order from ${new Date(orderData.savedAt).toLocaleDateString()}?`)) {
          console.log('📥 Loading saved order...');
          
          // Clear current cart first
          this.apiService.clearCart();
          
          // Add saved items using service
          orderData.items.forEach((item: CartItem) => {
            this.apiService.addToCart(item, item.quantity);
          });
        }
      } catch (e) {
        console.error('❌ Error loading saved order:', e);
        alert('Error loading saved order');
      }
    } else {
      alert('No saved order found');
    }
  }

  // Force refresh cart from service
  refreshCart(): void {
    console.log('🔄 Force refreshing cart from service...');
    this.debugCartState();
  }

  // Test checkout readiness
  testCheckoutReadiness(): void {
    console.log('🧪 === CHECKOUT READINESS TEST ===');
    console.log('- Component cart length:', this.cart.length);
    console.log('- Service cart count:', this.apiService.getCartItemCount());
    console.log('- Service cart total:', this.apiService.getCartTotal());
    console.log('- hasItems():', this.hasItems());
    console.log('- finalTotal:', this.finalTotal);
    console.log('- Cart contents:', this.cart.map(item => `${item.name} x${item.quantity} = ${this.formatPrice(item.price * item.quantity)}`));
    
    // Check localStorage
    const storedCart = localStorage.getItem('hesburger_cart');
    if (storedCart) {
      try {
        const parsed = JSON.parse(storedCart);
        console.log('- localStorage cart items:', parsed.length);
      } catch (e) {
        console.error('- Error parsing localStorage:', e);
      }
    }
    
    if (this.hasItems()) {
      console.log('✅ Ready for checkout!');
    } else {
      console.log('❌ Not ready for checkout - cart appears empty');
      
      if (storedCart) {
        console.log('🔄 Found localStorage cart, attempting sync...');
        this.syncCartFromStorage();
      }
    }
    console.log('===================================');
  }

  // Manual cart sync (for debugging)
  syncCartFromStorage(): void {
    console.log('🔄 Manually syncing cart from localStorage...');
    
    const storedCart = localStorage.getItem('hesburger_cart');
    if (storedCart) {
      try {
        const parsed = JSON.parse(storedCart);
        this.cart = parsed;
        this.cdr.detectChanges();
        console.log('✅ Cart synced from localStorage:', this.cart.length, 'items');
      } catch (e) {
        console.error('❌ Error syncing cart:', e);
      }
    } else {
      console.log('⚠️ No cart data found in localStorage');
    }
  }

  // Track by function for ngFor performance
  trackByItemId(index: number, item: CartItem): number {
    return item.id;
  }

  // Check if cart has items - use both component and service state
  hasItems(): boolean {
    const componentHasItems = this.cart.length > 0;
    const serviceHasItems = this.apiService.getCartItemCount() > 0;
    
    // If there's a mismatch, try to sync from service
    if (serviceHasItems && !componentHasItems) {
      console.log('⚠️ Cart state mismatch detected, syncing from service...');
      this.syncCartFromStorage();
      return this.cart.length > 0; // Check again after sync
    }
    
    return componentHasItems || serviceHasItems;
  }

  // Development mode check
  isDevelopment(): boolean {
    return true; // Enable debug features for now
  }

  // Get allergens text for item
  getAllergensText(item: CartItem): string {
    return item.allergens?.join(', ') || 'None';
  }

  // Check if item has allergens
  hasAllergens(item: CartItem): boolean {
    return item.allergens != null && item.allergens.length > 0;
  }
}