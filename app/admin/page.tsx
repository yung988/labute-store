"use client";
import { useState, useEffect } from "react";
import OrdersTable from "@/components/admin/OrdersTable";
import InventoryTable from "@/components/admin/InventoryTable";
import PacketaManagement from "@/components/admin/PacketaManagement";
import OrderDetailView from "@/components/admin/OrderDetailView";
import CustomerCommunication from "@/components/admin/CustomerCommunication";
import Dashboard from "@/components/admin/Dashboard";

type AdminSection = 'dashboard' | 'orders' | 'inventory' | 'packeta' | 'customers' | 'order-detail';

export default function AdminPage() {
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') as AdminSection;
    const orderId = urlParams.get('orderId');

    if (section && ['dashboard', 'orders', 'inventory', 'packeta', 'customers', 'order-detail'].includes(section)) {
      setCurrentSection(section);
      if (orderId) {
        setSelectedOrderId(orderId);
      }
    }
  }, []);

  const navigateToSection = (section: AdminSection, orderId?: string) => {
    setCurrentSection(section);
    if (orderId) {
      setSelectedOrderId(orderId);
    }
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('section', section);
    if (orderId) {
      url.searchParams.set('orderId', orderId);
    } else {
      url.searchParams.delete('orderId');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleOrderClick = (orderId: string) => {
    navigateToSection('order-detail', orderId);
  };

  return (
    <>
      {currentSection === 'dashboard' && (
        <Dashboard />
      )}

      {currentSection === 'orders' && (
        <div>
          <h2 className="text-3xl font-bold mb-6">Objednávky</h2>
          <OrdersTable onOrderClick={handleOrderClick} />
        </div>
      )}

      {currentSection === 'inventory' && (
        <div>
          <h2 className="text-3xl font-bold mb-6">Správa skladem</h2>
          <InventoryTable />
        </div>
      )}

      {currentSection === 'packeta' && (
        <div>
          <h2 className="text-3xl font-bold mb-6">Packeta Management</h2>
          <PacketaManagement />
        </div>
      )}

      {currentSection === 'customers' && (
        <div>
          <h2 className="text-3xl font-bold mb-6">Zákazníci</h2>
          <CustomerCommunication />
        </div>
      )}

      {currentSection === 'order-detail' && selectedOrderId && (
        <OrderDetailView
          orderId={selectedOrderId}
          onBack={() => navigateToSection('orders')}
        />
      )}
    </>
  );
}
