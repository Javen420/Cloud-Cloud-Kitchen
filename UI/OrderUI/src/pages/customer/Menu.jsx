import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, Sparkles, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useCartStore } from "@/store/cartStore";
import { getMenu } from "@/api/menuService";

function MenuSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm"
        >
          <div className="w-24 h-24 rounded-xl bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
            <div className="h-3 w-full rounded-md bg-muted/70 animate-pulse" />
            <div className="h-4 w-20 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Menu() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { items: cartItems, addItem, updateQuantity } = useCartStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await getMenu();
        if (!cancelled) setMenuItems(items);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load menu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((i) => i.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [menuItems]);

  const filtered = useMemo(() => {
    return activeCategory === "All"
      ? menuItems
      : menuItems.filter((i) => i.category === activeCategory);
  }, [activeCategory, menuItems]);

  const getCartQuantity = (id) =>
    cartItems.find((i) => i.id === id)?.cartQuantity || 0;

  return (
    <div className="page-customer pb-10">
      <Navbar role="customer" />

      <div className="container mx-auto px-4 pt-8 pb-10 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 md:p-10 mb-10 shadow-sm">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-primary/5 blur-3xl" />
            <div className="relative">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3">
                What are you craving?
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                Freshly made-to-order meals, packed with care and delivered fast to your door.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-destructive/25 bg-destructive/5 p-5 text-sm text-destructive">
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 font-semibold text-destructive hover:bg-destructive/15 transition shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          )}

          {/* Categories */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:thin]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                    : "bg-card text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {loading && <MenuSkeleton />}

          {!loading && filtered.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
              <p className="text-muted-foreground font-medium">No dishes in this category.</p>
              <p className="text-sm text-muted-foreground/80 mt-1">Try another filter above.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!loading &&
              filtered.map((item, idx) => {
                const qty = getCartQuantity(item.id);
                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                    className="group flex gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/15 transition-all duration-300"
                  >
                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted shrink-0 ring-1 ring-primary/10">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-muted to-secondary/40">
                          🍔
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-foreground text-lg leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                        {item.description ? (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        ) : null}
                        <p className="text-lg font-bold text-primary mt-2 tabular-nums">
                          ${Number(item.price || 0).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center justify-end">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => addItem(item)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, qty - 1)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-background text-foreground transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary text-primary-foreground hover:opacity-90 transition"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.article>
                );
              })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
