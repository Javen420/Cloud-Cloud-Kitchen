import { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { ShoppingBag, UtensilsCrossed } from "lucide-react";
import { useCartStore } from "@/store/cartStore";

export function Navbar({ role }) {
  const [location, setLocation] = useLocation();
  const itemCount = useCartStore(state => state.getCount());
  const cartItems = useCartStore(state => state.items);
  const cartTotal = useCartStore(state => state.getTotal());
  const updateQuantity = useCartStore(state => state.updateQuantity);

  const [cartOpen, setCartOpen] = useState(false);

  const cartDrawer = cartOpen && createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-foreground/20 backdrop-blur-[2px] z-50"
        onClick={() => setCartOpen(false)}
        aria-hidden
      />

      {/* Drawer — full viewport height, right side */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-card/98 backdrop-blur-xl border-l border-border z-50 flex flex-col shadow-2xl" style={{ height: "100dvh" }}>

        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-xl font-extrabold flex items-center gap-2 tracking-tight">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </span>
            Your cart
          </h2>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="w-10 h-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition text-lg leading-none"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {/* Items — scrollable middle section */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 pt-20">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 opacity-50" />
              </div>
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary shrink-0">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">🍔</div>
                    }
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground line-clamp-1">{item.name}</h4>
                      <p className="text-sm text-primary font-medium">${item.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center bg-muted rounded-lg border border-border w-fit">
                      <button
                        onClick={() => updateQuantity(item.id, item.cartQuantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:text-primary transition"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.cartQuantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.cartQuantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:text-primary transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="font-semibold text-right text-sm">
                    ${(item.price * item.cartQuantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — always pinned to bottom */}
        {cartItems.length > 0 && (
          <div className="p-6 bg-muted/30 border-t border-border shrink-0">
            <div className="space-y-2.5 mb-5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-foreground">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery</span>
                <span className="tabular-nums font-medium text-foreground">$4.99</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between items-baseline text-lg font-extrabold text-foreground">
                <span>Total</span>
                <span className="text-primary tabular-nums">${(cartTotal + 4.99).toFixed(2)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setCartOpen(false); setLocation("/customer/checkout"); }}
              className="w-full h-12 text-base font-bold bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/25 hover:opacity-95 transition active:scale-[0.99]"
            >
              Go to checkout
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/25">
                <UtensilsCrossed className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-foreground hidden sm:block">
                Cloud Cloud <span className="text-primary">Kitchen</span>
              </span>
              {role && (
                <span className="ml-1 px-2.5 py-0.5 rounded-full bg-muted border border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {role}
                </span>
              )}
            </div>
          </div>

          {/* Cart Button */}
          {role === "customer" && location !== "/customer/checkout" && (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-muted/80 border border-border shadow-sm transition font-semibold text-sm text-foreground"
            >
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span>Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-[11px] font-bold text-primary-foreground flex items-center justify-center ring-2 ring-background">
                  {itemCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {cartDrawer}
    </>
  );
}