import { useState, useEffect } from "react";

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

interface Restaurant {
  id: number;
  name: string;
  address: string;
  rating: number;
  menus: MenuItem[];
}

interface OrderForm {
  user_id: number;
  restaurant_id: number;
  total_amount: number;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation state
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  
  // Cart & Ordering state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((res) => {
        if (!res.ok) throw new Error(`Error: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setRestaurants(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.id !== itemId);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Clear cart when leaving a restaurant
  const handleBackToRestaurants = () => {
    if (cart.length > 0) {
      if (confirm("Leaving this restaurant will clear your cart. Are you sure?")) {
        setCart([]);
        setSelectedRestaurant(null);
      }
    } else {
      setSelectedRestaurant(null);
    }
  };

  const placeOrder = async () => {
    if (!selectedRestaurant || cart.length === 0) return;
    setOrderLoading(true);
    try {
      const body: OrderForm = {
        user_id: 1,
        restaurant_id: selectedRestaurant.id,
        total_amount: cartTotal,
      };
      
      // 1. Create the order in our database
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to place order");
      
      const newOrder = await res.json();
      
      // Save order to session storage for the Orders page
      const stored = sessionStorage.getItem("placed_orders");
      const ordersList = stored ? JSON.parse(stored) : [];
      ordersList.unshift(newOrder);
      sessionStorage.setItem("placed_orders", JSON.stringify(ordersList));
      window.dispatchEvent(new Event("orders_updated"));

      // 2. Create Stripe Checkout Session
      const stripeRes = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            order_id: newOrder.id,
            amount: cartTotal
        }),
      });
      
      if (!stripeRes.ok) throw new Error("Failed to create Stripe session");
      
      const stripeData = await stripeRes.json();
      
      // 3. Redirect to Stripe
      window.location.href = stripeData.url;

    } catch (err) {
      alert("Failed to process payment. Try again.");
      setOrderLoading(false);
    }
  };

  // Check URL for Stripe success/cancel
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      setOrderSuccess(true);
      setShowCheckoutModal(true);
      setCart([]); // Clear cart
      setTimeout(() => {
        setShowCheckoutModal(false);
        setOrderSuccess(false);
        // Remove query params
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 4000);
    }
    if (query.get("canceled")) {
      alert("Payment was canceled. You can try again.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const renderStars = (rating: number) => {
    return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">🍔</div>
          <p className="text-muted-foreground text-sm">Loading restaurants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <p className="font-medium text-destructive">Failed to load restaurants</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {!selectedRestaurant ? (
        // MAIN VIEW: Restaurant List
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Restaurants in Tashkent</h1>
            <p className="text-muted-foreground text-sm mt-1">Select a restaurant to view its menu and order</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRestaurant(r)}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-1"
              >
                <div className="bg-gradient-to-br from-orange-100 to-red-50 p-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center text-4xl">
                    {r.name.includes("Evos") ? "🌯" : r.name.includes("Oqtepa") ? "🍔" : r.name.includes("Yapona") ? "🍣" : "🍲"}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{r.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{r.address}</p>
                    <div className="inline-block mt-3 bg-white px-3 py-1 rounded-full shadow-sm">
                      <span className="text-amber-500 font-medium text-sm">{renderStars(r.rating)} {r.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted/30 text-center border-t border-border">
                  <span className="text-primary font-medium text-sm">View Menu →</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        // DETAILS VIEW: Restaurant Menu
        <>
          <button 
            onClick={handleBackToRestaurants}
            className="mb-6 text-sm font-medium text-muted-foreground hover:text-primary flex items-center transition-colors"
          >
            ← Back to Restaurants
          </button>

          <div className="bg-card border border-border rounded-xl overflow-hidden mb-8 shadow-sm">
             <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 sm:p-10 flex items-center gap-6">
               <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center text-5xl shrink-0">
                  {selectedRestaurant.name.includes("Evos") ? "🌯" : selectedRestaurant.name.includes("Oqtepa") ? "🍔" : selectedRestaurant.name.includes("Yapona") ? "🍣" : "🍲"}
               </div>
               <div>
                 <h1 className="text-3xl font-bold">{selectedRestaurant.name}</h1>
                 <p className="text-muted-foreground mt-2">{selectedRestaurant.address}</p>
                 <p className="text-amber-500 text-sm mt-1">{renderStars(selectedRestaurant.rating)} {selectedRestaurant.rating.toFixed(1)}</p>
               </div>
             </div>
          </div>

          <h2 className="text-2xl font-semibold mb-6">Menu</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Menu List */}
            <div className="lg:col-span-2 space-y-4">
              {selectedRestaurant.menus.length === 0 ? (
                <p className="text-muted-foreground">No items available at the moment.</p>
              ) : (
                selectedRestaurant.menus.map((item) => {
                  const cartItem = cart.find(c => c.id === item.id);
                  return (
                    <div key={item.id} className="bg-card border border-border p-5 rounded-xl flex items-center justify-between hover:border-primary/30 transition-colors">
                      <div>
                        <h3 className="font-medium text-lg">{item.name}</h3>
                        <p className="text-green-600 font-semibold mt-1">${item.price.toFixed(2)}</p>
                      </div>
                      
                      {cartItem ? (
                        <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-1 border border-border">
                          <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center rounded bg-background shadow-sm hover:bg-accent font-bold">-</button>
                          <span className="w-4 text-center font-medium">{cartItem.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center rounded bg-background shadow-sm hover:bg-accent font-bold">+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="bg-primary/10 text-primary px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Cart Summary (Sidebar) */}
            <div className="hidden lg:block">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24 shadow-sm">
                <h3 className="font-bold text-xl mb-4">Your Order</h3>
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                      {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-start text-sm">
                          <div>
                            <span className="font-medium">{item.quantity}x</span> {item.name}
                          </div>
                          <span className="font-semibold text-green-600">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border pt-4 mb-6">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span className="text-green-600">${cartTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCheckoutModal(true)}
                      className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all"
                    >
                      Go to Checkout
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Cart Floating Bar */}
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
              <button 
                onClick={() => setShowCheckoutModal(true)}
                className="w-full bg-primary text-primary-foreground p-4 rounded-2xl shadow-xl flex items-center justify-between font-bold"
              >
                <div className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {cartItemsCount} items
                </div>
                <span>View Cart</span>
                <span>${cartTotal.toFixed(2)}</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Order Confirmation Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border bg-muted/30 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Checkout</h2>
                <p className="text-sm text-muted-foreground">{selectedRestaurant?.name}</p>
              </div>
              {!orderSuccess && (
                <button onClick={() => setShowCheckoutModal(false)} className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground">✕</button>
              )}
            </div>

            {orderSuccess ? (
              <div className="p-10 text-center">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-2xl font-bold text-green-600">Order placed!</p>
                <p className="text-sm text-muted-foreground mt-2">The restaurant is preparing your food.</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="bg-accent/40 rounded-xl p-5 mb-6 max-h-60 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center mb-3 last:mb-0 text-sm">
                      <div className="flex gap-2">
                        <span className="font-semibold text-primary">{item.quantity}x</span>
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <hr className="my-4 border-border" />
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-medium text-muted-foreground">Total to pay:</span>
                    <span className="font-bold text-green-600">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={placeOrder}
                  disabled={orderLoading}
                  className="w-full bg-primary text-primary-foreground rounded-xl py-4 text-base font-bold hover:bg-primary/90 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {orderLoading ? "Processing..." : `Confirm & Pay $${cartTotal.toFixed(2)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
