import { Route, Switch } from "wouter";
import Menu from "@/pages/customer/Menu";
import Checkout from "@/pages/customer/Checkout";
import OrderTracking from "@/pages/customer/OrderTracking";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Menu} />
      <Route path="/customer" component={Menu} />
      <Route path="/customer/checkout" component={Checkout} />
      <Route path="/customer/track/:id" component={OrderTracking} />
      <Route>
        <div className="page-customer min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <p className="text-8xl mb-4 select-none opacity-90">🍽️</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
            Page not found
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mb-8">
            This page doesn&apos;t exist or the link is wrong.
          </p>
          <a
            href="/customer"
            className="inline-flex items-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-95 transition"
          >
            Back to menu
          </a>
        </div>
      </Route>
    </Switch>
  );
}
