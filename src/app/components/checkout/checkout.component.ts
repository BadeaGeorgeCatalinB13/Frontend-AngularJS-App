import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HesburgerApiService, CartItem } from '../../services/api.service'; // Import the service

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  tableId: string = '';
  cart: CartItem[] = []; // Use CartItem type
  customerForm: FormGroup;
  selectedPaymentMethod: string = '';
  isProcessingPayment: boolean = false;
  showOrderConfirmation: boolean = false;
  orderNumber: string = '';
cartItemCount: any;
serviceCartItemCount: any;
  
  // Order calculations
  get subtotal(): number {
    return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
  
  get serviceFee(): number {
    return 2.50;
  }
  
  get taxAmount(): number {
    return this.subtotal * 0.1;
  }
  
  get finalTotal(): number {
    return this.subtotal + this.serviceFee + this.taxAmount;
  }
  
  get totalItems(): number {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }
  
  get estimatedTime(): number {
    if (this.cart.length === 0) return 0;
    return Math.max(...this.cart.map(item => item.estimatedTime || 5));
  }

  // Payment methods with Romanian context
  paymentMethods = [
    {
      id: 'card',
      name: 'Card Bancar',
      icon: '💳',
      description: 'Visa, Mastercard, American Express'
    },
    {
      id: 'cash',
      name: 'Numerar',
      icon: '💵',
      description: 'Plătește la masă când ajunge comanda'
    },
    {
      id: 'digital',
      name: 'Portofel Digital',
      icon: '📱',
      description: 'Apple Pay, Google Pay, PayPal'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private apiService: HesburgerApiService // Inject the service
  ) {
    // Initialize customer form
    this.customerForm = this.formBuilder.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      specialRequests: [''],
      // Card payment fields
      cardNumber: [''],
      expiryDate: [''],
      cvv: [''],
      cardName: [''],
      // Terms acceptance
      acceptTerms: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    console.log('🛒 CheckoutComponent initializing...');
    
    // Get table ID from route
    this.route.params.subscribe(params => {
      this.tableId = params['tableId'];
      console.log('🏷️ Checkout for table:', this.tableId);
    });

    // Load cart - FIXED: Use correct localStorage key
    this.loadCart();
    
    // Debug cart loading
    this.debugCartLoad();
    
    // If cart is empty, redirect to menu
    if (this.cart.length === 0) {
      console.log('❌ Cart is empty, redirecting to menu');
      alert('Your cart is empty! Please add some items first.');
      this.router.navigate(['/menu', this.tableId]);
    }
  }

  // FIXED: Load cart from correct localStorage key
  private loadCart(): void {
    console.log('📥 Loading cart for checkout...');
    
    // Try to get cart from service first
    const serviceCartCount = this.apiService.getCartItemCount();
    console.log('🔧 Service cart count:', serviceCartCount);
    
    // Use the CORRECT localStorage key that matches the service
    const savedCart = localStorage.getItem('hesburger_cart'); // FIXED: was 'restaurant_cart'
    
    if (savedCart) {
      try {
        this.cart = JSON.parse(savedCart);
        console.log('✅ Cart loaded from localStorage:', this.cart.length, 'items');
        console.log('📦 Cart items:', this.cart.map(item => `${item.name} x${item.quantity}`));
      } catch (e) {
        console.error('❌ Error parsing cart from localStorage:', e);
        this.cart = [];
      }
    } else {
      console.log('⚠️ No cart found in localStorage');
      this.cart = [];
    }
  }

  // Debug method to check cart loading
  public debugCartLoad(): void {
    console.log('🔍 === CHECKOUT CART DEBUG ===');
    console.log('- Component cart length:', this.cart.length);
    console.log('- Service cart count:', this.apiService.getCartItemCount());
    console.log('- Service cart total:', this.apiService.getCartTotal());
    
    // Check both possible localStorage keys
    const hesburgerCart = localStorage.getItem('hesburger_cart');
    const restaurantCart = localStorage.getItem('restaurant_cart');
    
    console.log('- hesburger_cart in localStorage:', hesburgerCart ? 'EXISTS' : 'NOT FOUND');
    console.log('- restaurant_cart in localStorage:', restaurantCart ? 'EXISTS' : 'NOT FOUND');
    
    if (hesburgerCart) {
      try {
        const parsed = JSON.parse(hesburgerCart);
        console.log('- hesburger_cart items:', parsed.length);
      } catch (e) {
        console.log('- hesburger_cart parse error:', e);
      }
    }
    
    console.log('===============================');
  }

  // Force reload cart if empty
  forceReloadCart(): void {
    console.log('🔄 Force reloading cart...');
    this.loadCart();
    this.debugCartLoad();
  }

  // Format price for display (Romanian Lei)
  formatPrice(price: number): string {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  // Payment method selection
  selectPaymentMethod(method: string): void {
    this.selectedPaymentMethod = method;
    console.log('💳 Payment method selected:', method);
    
    // Update form validators based on payment method
    if (method === 'card') {
      this.customerForm.get('cardNumber')?.setValidators([Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]);
      this.customerForm.get('expiryDate')?.setValidators([Validators.required, Validators.pattern(/^\d{2}\/\d{2}$/)]);
      this.customerForm.get('cvv')?.setValidators([Validators.required, Validators.pattern(/^\d{3,4}$/)]);
      this.customerForm.get('cardName')?.setValidators([Validators.required]);
    } else {
      // Remove card validators for other payment methods
      this.customerForm.get('cardNumber')?.clearValidators();
      this.customerForm.get('expiryDate')?.clearValidators();
      this.customerForm.get('cvv')?.clearValidators();
      this.customerForm.get('cardName')?.clearValidators();
    }
    
    // Update form validation
    this.customerForm.get('cardNumber')?.updateValueAndValidity();
    this.customerForm.get('expiryDate')?.updateValueAndValidity();
    this.customerForm.get('cvv')?.updateValueAndValidity();
    this.customerForm.get('cardName')?.updateValueAndValidity();
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const field = this.customerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.customerForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        const romanianFieldNames: { [key: string]: string } = {
          'firstName': 'Prenumele',
          'lastName': 'Numele',
          'email': 'Email-ul',
          'phone': 'Telefonul',
          'cardNumber': 'Numărul cardului',
          'expiryDate': 'Data expirării',
          'cvv': 'CVV',
          'cardName': 'Numele pe card'
        };
        const displayName = romanianFieldNames[fieldName] || fieldName;
        return `${displayName} este obligatoriu`;
      }
      if (field.errors['email']) return 'Te rugăm să introduci un email valid';
      if (field.errors['minlength']) return `Câmpul este prea scurt`;
      if (field.errors['pattern']) {
        if (fieldName === 'phone') return 'Formatul telefonului nu este valid';
        if (fieldName === 'cardNumber') return 'Numărul cardului nu este valid';
        if (fieldName === 'expiryDate') return 'Data expirării nu este validă (MM/AA)';
        if (fieldName === 'cvv') return 'CVV nu este valid';
        return 'Formatul nu este valid';
      }
      if (field.errors['requiredTrue']) return 'Trebuie să accepți termenii și condițiile';
    }
    return '';
  }

  // Order processing with Romanian messages
  async processOrder(): Promise<void> {
    console.log('🚀 Processing order...');
    
    if (!this.selectedPaymentMethod) {
      alert('Te rugăm să selectezi o metodă de plată');
      return;
    }

    if (this.customerForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.customerForm.controls).forEach(key => {
        this.customerForm.get(key)?.markAsTouched();
      });
      alert('Te rugăm să completezi corect toate câmpurile obligatorii');
      return;
    }

    if (this.cart.length === 0) {
      alert('Coșul tău este gol!');
      return;
    }

    this.isProcessingPayment = true;

    try {
      console.log('💳 Simulating payment processing...');
      
      // Simulate payment processing
      await this.simulatePaymentProcess();
      
      // Generate order number
      this.orderNumber = this.generateOrderNumber();
      console.log('📋 Generated order number:', this.orderNumber);
      
      // Create order data
      const orderData = {
        orderNumber: this.orderNumber,
        tableId: this.tableId,
        customerInfo: this.customerForm.value,
        items: this.cart,
        paymentMethod: this.selectedPaymentMethod,
        totals: {
          subtotal: this.subtotal,
          serviceFee: this.serviceFee,
          tax: this.taxAmount,
          total: this.finalTotal
        },
        estimatedTime: this.estimatedTime,
        orderTime: new Date(),
        status: 'confirmed'
      };

      // Save order
      this.saveOrder(orderData);
      
      // Clear cart using service method
      this.apiService.clearCart();
      this.cart = []; // Also clear local cart
      
      // Show confirmation
      this.showOrderConfirmation = true;
      console.log('✅ Order processed successfully!');
      
    } catch (error) {
      console.error('❌ Payment processing failed:', error);
      alert('Plata a eșuat. Te rugăm să încerci din nou.');
    } finally {
      this.isProcessingPayment = false;
    }
  }

  // Simulate payment processing delay
  private simulatePaymentProcess(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000); // 2 second delay to simulate processing
    });
  }

  // Generate unique order number
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `HB-${timestamp}-${random}`; // Hesburger prefix
  }

  // Save order (later will use API service)
  private saveOrder(orderData: any): void {
    // Save to localStorage for demo purposes
    const orders = JSON.parse(localStorage.getItem('hesburger_orders') || '[]');
    orders.push(orderData);
    localStorage.setItem('hesburger_orders', JSON.stringify(orders));
    localStorage.setItem('hesburger_current_order', JSON.stringify(orderData));
    
    console.log('💾 Order saved:', orderData);
  }

  // Navigation methods
  goBackToCart(): void {
    console.log('⬅️ Going back to cart');
    this.router.navigate(['/cart', this.tableId]);
  }

  goBackToMenu(): void {
    console.log('⬅️ Going back to menu');
    this.router.navigate(['/menu', this.tableId]);
  }

  startNewOrder(): void {
    console.log('🔄 Starting new order');
    this.showOrderConfirmation = false;
    this.router.navigate(['/menu', this.tableId]);
  }

  // Print receipt (mock)
  printReceipt(): void {
    window.print();
  }

  // Download receipt (mock)
  downloadReceipt(): void {
    const orderData = JSON.parse(localStorage.getItem('hesburger_current_order') || '{}');
    const receiptContent = this.generateReceiptContent(orderData);
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${this.orderNumber}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Generate receipt content
  private generateReceiptContent(orderData: any): string {
    let content = `
HESBURGER RESTAURANT
Order Receipt
========================

Order Number: ${orderData.orderNumber}
Table: ${orderData.tableId}
Date: ${new Date(orderData.orderTime).toLocaleString('ro-RO')}

Customer Information:
${orderData.customerInfo.firstName} ${orderData.customerInfo.lastName}
${orderData.customerInfo.email}
${orderData.customerInfo.phone}

Items Ordered:
`;

    orderData.items.forEach((item: any) => {
      const itemTotal = item.price * item.quantity;
      content += `${item.quantity}x ${item.name} - ${this.formatPrice(itemTotal)}\n`;
    });

    content += `
========================
Subtotal: ${this.formatPrice(orderData.totals.subtotal)}
Service Fee: ${this.formatPrice(orderData.totals.serviceFee)}
Tax (10%): ${this.formatPrice(orderData.totals.tax)}
========================
TOTAL: ${this.formatPrice(orderData.totals.total)}

Payment Method: ${this.getPaymentMethodName(orderData.paymentMethod)}
Estimated Time: ${orderData.estimatedTime} minutes

Mulțumim pentru comandă!
Thank you for your order!
`;

    return content;
  }

  // Get payment method display name
  private getPaymentMethodName(methodId: string): string {
    const method = this.paymentMethods.find(m => m.id === methodId);
    return method ? method.name : methodId;
  }

  // Card number formatting
  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    const formattedValue = value.match(/.{1,4}/g)?.join(' ') || '';
    if (formattedValue.length <= 19) { // Max length for formatted card number
      this.customerForm.patchValue({ cardNumber: formattedValue });
    }
  }

  // Expiry date formatting
  formatExpiryDate(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    this.customerForm.patchValue({ expiryDate: value });
  }

  // Get card type based on number
  getCardType(cardNumber: string): string {
    const number = cardNumber.replace(/\s/g, '');
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5')) return 'Mastercard';
    if (number.startsWith('3')) return 'American Express';
    return 'Card';
  }

  // Development mode check for debugging
  isDevelopment(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.port !== '';
  }
}