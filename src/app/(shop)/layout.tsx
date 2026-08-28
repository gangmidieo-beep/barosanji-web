import { CartProvider } from "@/lib/cart-context";
import { PointsProvider } from "@/lib/points-context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <PointsProvider>
        <div className="app-shell flex flex-col">
          <Header />
          <main className="flex-1 pb-16">{children}</main>
          <Footer />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px]">
            <BottomNav />
          </div>
        </div>
      </PointsProvider>
    </CartProvider>
  );
}
