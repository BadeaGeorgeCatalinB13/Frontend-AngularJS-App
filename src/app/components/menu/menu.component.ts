import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { HesburgerApiService, Product, CartItem, CategoryWithProducts } from '../../services/api.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css']
})
export class MenuComponent implements OnInit, OnDestroy {
  tableId: string = '';
  selectedCategory: string = 'all';
  searchTerm: string = '';
  
  // Data arrays
  products: Product[] = [];
  categories: any[] = [];
  categoriesWithProducts: CategoryWithProducts[] = [];
  cart: CartItem[] = [];
  
  // Loading states
  isLoadingProducts = true;
  isLoadingCategories = false;
  errorMessage = '';
  
  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  // 🔒 PROTECTED: These categories can NEVER be overwritten
  private readonly FIXED_CATEGORIES = [
    { id: 'all', name: 'All Items', icon: '🍽️' },
    { id: 'burgers', name: 'Burgers', icon: '🍔' },
    { id: 'chicken', name: 'Chicken', icon: '🍗' },
    { id: 'sides', name: 'Sides', icon: '🍟' },
    { id: 'drinks', name: 'Drinks', icon: '🥤' },
    { id: 'desserts', name: 'Desserts', icon: '🍦' },
    { id: 'other', name: 'Other', icon: '📦' }
  ];

  // 🖼️ IMAGE HANDLING PROPERTIES (FIXED TO PREVENT INFINITE LOOPS)
  private imageCache = new Map<string, string>();
  private imageLoadingCache = new Map<string, boolean>(); // CHANGED: Use boolean instead of Subscription
  private imageLoadingStates = new Map<number, boolean>();
  private imageErrorStates = new Map<number, boolean>();

  // For debugging
  testProductId: number | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: HesburgerApiService,
    private cdr: ChangeDetectorRef
  ) {
    // Force categories in constructor too (extra safety)
    this.categories = [...this.FIXED_CATEGORIES];
  }

  ngOnInit(): void {
    console.log('🚀 MenuComponent initializing...');
    
    // STEP 1: FORCE categories first (MOST CRITICAL)
    this.initializeCategories();
    
    // STEP 2: Get table ID from route
    this.initializeRoute();
    
    // STEP 3: Initialize cart subscription
    this.initializeCart();
    
    // STEP 4: Load products (but NEVER let them affect categories)
    this.loadProducts();
    
    console.log('✅ MenuComponent initialization complete');
  }

  ngOnDestroy(): void {
    console.log('🔄 MenuComponent destroying, cleaning up...');
    
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Clean up blob URLs to prevent memory leaks
    this.imageCache.forEach(dataUrl => {
      if (dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(dataUrl);
      }
    });
    this.imageCache.clear();
    this.imageLoadingCache.clear();
    this.imageLoadingStates.clear();
    this.imageErrorStates.clear();
  }

  // =============== INITIALIZATION METHODS ===============

  private initializeCategories(): void {
    console.log('📂 🔒 FORCE-Initializing protected categories...');
    
    // CRITICAL: Set categories and NEVER EVER let anything override them
    this.categories = [...this.FIXED_CATEGORIES];
    
    console.log('✅ Categories FORCE-initialized:', this.categories.length);
    console.log('📋 Categories list:', this.categories.map(c => `${c.icon} ${c.name}`).join(', '));
    
    // Triple-check categories are set
    if (this.categories.length !== 7) {
      console.error('🚨 CRITICAL: Categories not set properly!');
      this.categories = [...this.FIXED_CATEGORIES]; // Force again
    }
    
    // Force change detection to ensure UI updates immediately
    this.cdr.detectChanges();
    
    console.log('🔒 Categories are now PROTECTED from any external changes');
  }

  private initializeRoute(): void {
    const routeSub = this.route.params.subscribe(params => {
      this.tableId = params['tableId'];
      console.log('🏷️ Table ID:', this.tableId);
    });
    this.subscriptions.push(routeSub);
  }

  private initializeCart(): void {
    const cartSub = this.apiService.cart$.subscribe(cart => {
      this.cart = cart;
      console.log('🛒 Cart updated, items:', cart.length);
    });
    this.subscriptions.push(cartSub);
  }

  // =============== PRODUCT LOADING (CATEGORIES PROTECTED) ===============

  private loadProducts(): void {
    console.log('📦 Starting product loading (categories are PROTECTED)...');
    
    // SAFETY CHECK: Ensure categories are still there
    if (this.categories.length !== 7) {
      console.warn('⚠️ Categories were somehow cleared! Re-initializing...');
      this.initializeCategories();
    }
    
    // Try to load from API first
    this.loadProductsFromAPI();
    
    // Load API categories for reference only (won't affect our fixed categories)
    this.loadCategoriesFromAPIForReference();
  }

  private loadProductsFromAPI(): void {
    this.isLoadingProducts = true;
    this.errorMessage = '';
    console.log('🔄 Loading products from Hesburger API...');
    
    const productsSub = this.apiService.getSellingProducts().subscribe({
      next: (products: Product[]) => {
        console.log('✅ Products loaded successfully:', products.length, 'items');
        
        if (products && products.length > 0) {
          this.products = products;
          console.log('📝 Sample product:', products[0]);
          this.debugPricesAfterLoad();
        } else {
          console.warn('⚠️ No products received, using fallback');
          this.loadMockProducts();
        }
        
        this.isLoadingProducts = false;
        
        // SAFETY CHECK: Ensure categories are STILL protected
        this.ensureCategoriesProtected();
      },
      error: (error) => {
        console.warn('❌ Failed to load products from API:', error);
        this.errorMessage = 'Using demo data - API connection failed';
        this.loadMockProducts();
        this.ensureCategoriesProtected();
      }
    });
    
    this.subscriptions.push(productsSub);
  }

  private loadCategoriesFromAPIForReference(): void {
    this.isLoadingCategories = true;
    console.log('📋 Loading API categories (for reference only - won\'t affect fixed categories)...');
    
    const categoriesSub = this.apiService.getCategoriesWithProducts().subscribe({
      next: (categoriesWithProducts: CategoryWithProducts[]) => {
        console.log('✅ API categories loaded for reference:', categoriesWithProducts.length);
        this.categoriesWithProducts = categoriesWithProducts;
        
        // Log API categories but DON'T use them to replace our fixed categories
        if (categoriesWithProducts.length > 0) {
          console.log('📋 API categories available:', categoriesWithProducts.map(c => c.name));
          console.log('📂 But keeping our FIXED categories intact:', this.categories.length);
        }
        
        this.isLoadingCategories = false;
        this.ensureCategoriesProtected();
      },
      error: (error) => {
        console.warn('⚠️ Failed to load API categories:', error);
        this.isLoadingCategories = false;
        this.ensureCategoriesProtected();
      }
    });
    
    this.subscriptions.push(categoriesSub);
  }

  // 🔒 CRITICAL SAFETY METHOD
  private ensureCategoriesProtected(): void {
    if (this.categories.length !== 7) {
      console.error('🚨 CRITICAL ALERT: Categories were compromised! Restoring...');
      this.categories = [...this.FIXED_CATEGORIES];
      this.cdr.detectChanges();
      console.log('✅ Categories restored to protected state');
    }
  }

  private loadMockProducts(): void {
    console.log('📦 Loading mock products...');
    
    this.products = [
      {
        id: 1,
        name: 'Big Hesburger',
        description: 'Our signature burger with double beef, cheese, lettuce, tomato',
        price: 25.90,
        category: 'burgers',
        image: 'http://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop&crop=center&q=80',
        isPopular: true,
        allergens: ['Gluten', 'Dairy'],
        estimatedTime: 8,
        isAvailable: true
      },
      {
        id: 2,
        name: 'Cheese Burger',
        description: 'Classic cheeseburger with beef patty and melted cheese',
        price: 19.90,
        category: 'burgers',
        image: 'http://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop&crop=center&q=80&sig=2',
        isPopular: false,
        allergens: ['Gluten', 'Dairy'],
        estimatedTime: 6,
        isAvailable: true
      },
      {
        id: 3,
        name: 'Crispy Chicken',
        description: 'Crispy fried chicken breast with spicy mayo',
        price: 23.50,
        category: 'chicken',
        image: 'http://images.unsplash.com/photo-1562967914-608f82629710?w=300&h=200&fit=crop&crop=center&q=80',
        isPopular: true,
        allergens: ['Gluten'],
        estimatedTime: 10,
        isAvailable: true
      },
      {
        id: 4,
        name: 'French Fries',
        description: 'Golden crispy french fries',
        price: 8.90,
        category: 'sides',
        image: 'http://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop&crop=center&q=80',
        isPopular: true,
        allergens: [],
        estimatedTime: 4,
        isAvailable: true
      },
      {
        id: 5,
        name: 'Coca Cola',
        description: 'Classic Coca Cola 0.5L',
        price: 6.50,
        category: 'drinks',
        image: 'http://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop&crop=center&q=80',
        isPopular: true,
        allergens: [],
        estimatedTime: 1,
        isAvailable: true
      },
      {
        id: 6,
        name: 'Ice Cream Cone',
        description: 'Vanilla ice cream in waffle cone',
        price: 7.90,
        category: 'desserts',
        image: 'http://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=200&fit=crop&crop=center&q=80',
        isPopular: true,
        allergens: ['Dairy', 'Gluten'],
        estimatedTime: 2,
        isAvailable: true
      }
    ];
    
    this.isLoadingProducts = false;
    console.log('📦 Mock products loaded:', this.products.length, 'items');
    this.debugPricesAfterLoad();
    this.ensureCategoriesProtected();
  }

  // =============== PRICE FORMATTING ===============

  formatPrice(price: number): string {
    if (!price || price <= 0) return '0,00 LEI';
    
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  formatPriceSimple(price: number): string {
    if (!price || price <= 0) return '0,00 LEI';
    return `${price.toFixed(2).replace('.', ',')} LEI`;
  }

  hasValidPrice(product: Product): boolean {
    return typeof product.price === 'number' && product.price > 0;
  }

  getPriceDisplayText(product: Product): string {
    if (!this.hasValidPrice(product)) {
      return 'Preț la cerere';
    }
    return this.formatPriceSimple(product.price);
  }

  getFormattedCartTotal(): string {
    return this.formatPriceSimple(this.cartTotal);
  }

  // =============== FILTERING & SEARCH ===============
  
  get filteredProducts(): Product[] {
    let filtered = this.products.filter(product => product.isAvailable !== false);
    
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === this.selectedCategory);
    }
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
    console.log('📂 Category selected:', categoryId);
    this.ensureCategoriesProtected(); // Safety check
  }

  onSearch(event: any): void {
    this.searchTerm = event.target.value;
    console.log('🔍 Search term:', this.searchTerm);
  }

  clearSearchAndCategory(): void {
    this.selectedCategory = 'all';
    this.searchTerm = '';
    console.log('🔄 Cleared search and category filters');
  }

  // =============== CART MANAGEMENT ===============
  
  getProductQuantityInCart(productId: number): number {
    const cartItem = this.cart.find(item => item.id === productId);
    return cartItem ? cartItem.quantity : 0;
  }

  isProductInCart(productId: number): boolean {
    return this.getProductQuantityInCart(productId) > 0;
  }

  addToCart(product: Product, quantity: number = 1): void {
    console.log('🛒 Adding to cart:', product.name, 'quantity:', quantity, 'price:', this.formatPriceSimple(product.price));
    this.apiService.addToCart(product, quantity);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  updateProductQuantity(product: Product, newQuantity: number): void {
    if (newQuantity <= 0) {
      this.removeFromCart(product);
    } else {
      console.log('📊 Updating quantity for:', product.name, 'to:', newQuantity);
      this.apiService.updateCartQuantity(product.id, newQuantity);
    }
  }

  removeFromCart(product: Product): void {
    console.log('🗑️ Removing from cart:', product.name);
    this.apiService.removeFromCart(product.id);
  }

  get cartItemCount(): number {
    return this.apiService.getCartItemCount();
  }

  get cartTotal(): number {
    return this.apiService.getCartTotal();
  }

  // =============== NAVIGATION ===============
  
  goToCart(): void {
    console.log('🛒 Navigating to cart for table:', this.tableId, 'Total:', this.getFormattedCartTotal());
    this.router.navigate(['/cart', this.tableId]);
  }

  goBack(): void {
    console.log('⬅️ Navigating back to scanner');
    this.router.navigate(['/scanner']);
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'All Items';
  }

  retryLoadData(): void {
    console.log('🔄 Retrying data load...');
    this.ensureCategoriesProtected();
    this.loadProducts();
  }

  reloadData(): void {
    console.log('🔄 Reloading data...');
    this.ensureCategoriesProtected();
    this.loadProducts();
  }

  // =============== HELPER METHODS ===============
  
  private get httpOptions() {
    const headers: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'ApiKey': 'your-api-key-here'  // This specific header might trigger preflight
    };
    return { headers };
  }
  
  hasAllergens(product: Product): boolean {
    return product.allergens != null && product.allergens.length > 0;
  }

  getAllergensText(product: Product): string {
    return product.allergens?.join(', ') || '';
  }

  trackByProductId(index: number, product: Product): number {
    return product.id;
  }

  trackByCategoryId(index: number, category: any): string {
    return category.id;
  }

  isDevelopment(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.port !== '';
  }

  // =============== 🖼️ SIMPLIFIED IMAGE HANDLING (NO INFINITE LOOPS) ===============

  getImageUrl(product: Product): string {
    // SIMPLIFIED: Just use fallback images to avoid CORS and infinite loop issues
    return this.getCategoryBasedImageUrl(product);
  }

  onImageError(event: any, product: Product): void {
    console.log('🖼️ Image loading failed for:', product.name);
    
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = this.getCategoryBasedImageUrl(product);
      this.imageErrorStates.set(product.id, true);
      this.cdr.detectChanges();
    }
  }

  onImageLoad(event: any, product: Product): void {
    console.log('🖼️ Image loaded successfully for:', product.name);
    this.imageLoadingStates.set(product.id, false);
    this.imageErrorStates.delete(product.id);
    this.cdr.detectChanges();
  }

  isImageLoading(productId: number): boolean {
    return this.imageLoadingStates.get(productId) || false;
  }

  hasImageError(productId: number): boolean {
    return this.imageErrorStates.get(productId) || false;
  }

  getImageSource(product: Product): string {
    return 'Fallback';
  }

  private getCategoryBasedImageUrl(product: Product): string {
    const category = product.category || 'other';
    const id = product.id || Math.floor(Math.random() * 1000);
    
    const categoryImages: { [key: string]: string } = {
      'burgers': `http://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop&crop=center&q=80&sig=${id}`,
      'chicken': `http://images.unsplash.com/photo-1562967914-608f82629710?w=300&h=200&fit=crop&crop=center&q=80&sig=${id}`,
      'sides': `http://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop&crop=center&q=80&sig=${id}`,
      'drinks': `http://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop&crop=center&q=80&sig=${id}`,
      'desserts': `http://images.unsplash.com/photo-1551024506-0bccd828d307?w=300&h=200&fit=crop&crop=center&q=80&sig=${id}`,
      'other': `http://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=300&h=200&fit=crop&crop=center&q=80&sig=${id}`
    };
    
    return categoryImages[category] || categoryImages['other'];
  }

  getImageStats(): string {
    const total = this.products.length;
    const cached = this.imageCache.size;
    const loading = Array.from(this.imageLoadingStates.values()).filter(v => v).length;
    const errors = this.imageErrorStates.size;
    
    return `${total} total, ${cached} cached, ${loading} loading, ${errors} errors`;
  }

  // =============== DEBUG METHODS ===============

  debugProductPrice(product: Product): void {
    console.log('🔍 === PRICE DEBUG FOR:', product.name, '===');
    console.log('- Displayed price:', product.price, 'RON');
    console.log('- Formatted price:', this.formatPriceSimple(product.price));
    console.log('- Has valid price:', this.hasValidPrice(product));
    console.log('- Location prices:', product.locationPrices);
    console.log('- Unit price with VAT:', product.unitPriceWithVat);
    console.log('=====================================');
  }

  
  private debugPricesAfterLoad(): void {
    if (this.isDevelopment()) {
      setTimeout(() => {
        console.log('🔍 === PRODUCTS PRICE SUMMARY ===');
        this.products.forEach((product, index) => {
          console.log(`${index + 1}. ${product.name}:`, {
            price: `${product.price} RON`,
            formatted: this.formatPriceSimple(product.price),
            hasValidPrice: this.hasValidPrice(product)
          });
        });
        
        const totalProducts = this.products.length;
        const validPrices = this.products.filter(p => this.hasValidPrice(p)).length;
        const averagePrice = this.products
          .filter(p => this.hasValidPrice(p))
          .reduce((sum, p) => sum + p.price, 0) / validPrices;
          
        console.log('📊 PRICE STATISTICS:');
        console.log('- Total products:', totalProducts);
        console.log('- Products with valid prices:', validPrices);
        console.log('- Average price:', this.formatPriceSimple(averagePrice || 0));
        console.log('================================');
      }, 1000);
    }
  }

  debugAllPrices(): void {
    console.log('🔍 === MANUAL PRICE DEBUG ===');
    this.products.forEach(product => this.debugProductPrice(product));
  }

  debugImageUrl(product: Product): void {
    console.log('🖼️ === IMAGE DEBUG FOR:', product.name, '===');
    console.log('- ImageUid:', product.imageUid);
    console.log('- Image field:', product.image);
    console.log('- Current URL:', this.getImageUrl(product));
    console.log('- Loading state:', this.isImageLoading(product.id));
    console.log('- Error state:', this.hasImageError(product.id));
    console.log('- Source type:', this.getImageSource(product));
    console.log('=====================================');
  }

  debugApiEndpoints(): void {
    console.log('🔧 Testing API endpoints...');
    this.apiService.testApiEndpoints?.()?.subscribe({
      next: (response) => {
        console.log('✅ API endpoints test successful:', response);
      },
      error: (error) => {
        console.error('❌ API endpoints test failed:', error);
      }
    });
    this.ensureCategoriesProtected();
  }

  getCategoryStats(): void {
    const stats = this.products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    console.log('📊 Product categories stats:', stats);
    console.log('📂 PROTECTED categories count:', this.categories.length);
    console.log('🖼️ Image cache stats:', this.getImageStats());
    this.ensureCategoriesProtected();
  }

  forceReauth(): void {
    console.log('🔄 Forcing re-authentication...');
    this.apiService.forceReauth?.()?.subscribe({
      next: () => {
        console.log('✅ Re-authentication successful');
        this.loadProducts();
      },
      error: (error) => {
        console.error('❌ Re-authentication failed:', error);
      }
    });
    this.ensureCategoriesProtected();
  }

  // 🔒 EMERGENCY CATEGORY RECOVERY
  emergencyRestoreCategories(): void {
    console.log('🚨 EMERGENCY: Manually restoring categories...');
    this.categories = [...this.FIXED_CATEGORIES];
    this.cdr.detectChanges();
    console.log('✅ Emergency restore complete:', this.categories.length, 'categories');
  }
}