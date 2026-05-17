import { useState } from "react";
import { RestaurantsPage } from "./pages/RestaurantsPage";
import { OrdersPage } from "./pages/OrdersPage";

type Page = "restaurants" | "orders";

export default function App() {
  const [page, setPage] = useState<Page>("restaurants");

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍔</span>
            <span className="font-semibold text-lg text-foreground">FoodDelivery</span>
          </div>
          <nav className="flex gap-1">
            {(["restaurants", "orders"] as Page[]).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                  page === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {p === "restaurants" ? "🏪 Restaurants" : "📦 Orders"}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {page === "restaurants" && <RestaurantsPage />}
        {page === "orders" && <OrdersPage />}
      </main>
    </div>
  );
}
