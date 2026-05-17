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

export function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderModal, setOrderModal] = useState<Restaurant | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
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

  const placeOrder = async () => {
    if (!orderModal || !selectedItem) return;
    setOrderLoading(true);
    try {
      const body: OrderForm = {
        user_id: 1,
        restaurant_id: orderModal.id,
        total_amount: selectedItem.price,
      };
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to place order");
      
      const newOrder = await res.json();
      
      // Save to sessionStorage for OrdersPage to display
      const stored = sessionStorage.getItem("placed_orders");
      const ordersList = stored ? JSON.parse(stored) : [];
      ordersList.unshift(newOrder);
      sessionStorage.setItem("placed_orders", JSON.stringify(ordersList));
      window.dispatchEvent(new Event("orders_updated"));

      setOrderSuccess(true);
      setTimeout(() => {
        setOrderModal(null);
        setOrderSuccess(false);
        setSelectedItem(null);
      }, 2000);
    } catch {
      alert("Failed to place order. Try again.");
    } finally {
      setOrderLoading(false);
    }
  };

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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Restaurants</h1>
        <p className="text-muted-foreground text-sm mt-1">Browse and order from our partner restaurants</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((r) => (
          <div
            key={r.id}
            className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Restaurant Card Header */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl">
                {r.name.includes("Pizza") ? "🍕" : r.name.includes("Burger") ? "🍔" : "🍽️"}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{r.name}</h3>
                <p className="text-xs text-muted-foreground">{r.address}</p>
                <p className="text-amber-500 text-sm mt-0.5">{renderStars(r.rating)} {r.rating.toFixed(1)}</p>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">Menu</p>
              <div className="space-y-2">
                {r.menus.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items available</p>
                ) : (
                  r.menus.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <span className="text-sm font-medium text-green-600">${item.price.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => { setOrderModal(r); setSelectedItem(r.menus[0] || null); }}
                className="mt-4 w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Modal */}
      {orderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Place an Order</h2>
              <p className="text-sm text-muted-foreground">{orderModal.name}</p>
            </div>

            {orderSuccess ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="font-medium text-green-600">Order placed successfully!</p>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm font-medium mb-3">Select an item:</p>
                <div className="space-y-2 mb-6">
                  {orderModal.menus.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="menu-item"
                          checked={selectedItem?.id === item.id}
                          onChange={() => setSelectedItem(item)}
                          className="accent-primary"
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">${item.price.toFixed(2)}</span>
                    </label>
                  ))}
                </div>

                {selectedItem && (
                  <div className="bg-accent rounded-lg p-3 mb-4 text-sm flex justify-between">
                    <span>Total:</span>
                    <span className="font-semibold">${selectedItem.price.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setOrderModal(null); setSelectedItem(null); }}
                    className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={placeOrder}
                    disabled={!selectedItem || orderLoading}
                    className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {orderLoading ? "Placing..." : "Confirm Order"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
