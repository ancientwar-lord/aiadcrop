"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { AuthContextProvider, useAuth } from "@/lib/context/AuthContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthContextProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthContextProvider>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  const isTryOnPage = pathname?.startsWith("/tryon");

  return (
    <>
      {!user && !isTryOnPage && <Navbar />}
      {user && !isTryOnPage && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      )}
      <main
        className={`min-h-screen transition-all duration-300 ${
          !user || isTryOnPage ? "" : ""
        } ${user && !isTryOnPage ? (isSidebarCollapsed ? "md:pl-20" : "md:pl-64") : ""}`}
      >
        {children}
      </main>
      {!user && !isTryOnPage && <Footer />}
    </>
  );
}
