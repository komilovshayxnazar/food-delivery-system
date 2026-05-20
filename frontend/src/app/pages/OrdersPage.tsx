import { useState, useEffect } from "react";

interface Order {
  id: number;
  user_id: number;
  restaurant_id: number;
  total_amount: number;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-blue-100 text-blue-800",
  PREPARING: "bg-purple-100 text-purple-800",
  DISPATCHED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_EMOJI: Record<string, string> = {
  PENDING: "⏳",
  ACCEPTED: "✅",
  PREPARING: "👨‍🍳",
  DISPATCHED: "🛵",
  DELIVERED: "🎉",
  CANCELLED: "❌",
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(false);
    // Load orders from session storage
    const stored = sessionStorage.getItem("placed_orders");
    if (stored) {
      setOrders(JSON.parse(stored));
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Listen to storage changes
  useEffect(() => {
    const handler = () => fetchOrders();
    window.addEventListener("orders_updated", handler);
    return () => window.removeEventListener("orders_updated", handler);
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">📦</div>
          <p className="text-muted-foreground text-sm">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your recent orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="font-medium text-foreground mb-2">No orders yet</h3>
          <p className="text-sm text-muted-foreground">Go to Restaurants and place your first order!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-xl p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-lg">
                  {STATUS_EMOJI[order.status] || "📦"}
                </div>
                <div>
                  <p className="font-medium text-sm">Order #{order.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Restaurant #{order.restaurant_id} · User #{order.user_id}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-green-600">
                  ${order.total_amount.toFixed(2)}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || "bg-muted text-muted-foreground"}`}>
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
