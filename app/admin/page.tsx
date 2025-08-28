"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { InfoIcon } from "lucide-react";
import OrdersTable from "@/components/admin/OrdersTable";
import InventoryTable from "@/components/admin/InventoryTable";
import PacketaManagement from "@/components/admin/PacketaManagement";

type AdminSection = 'orders' | 'inventory' | 'packeta' | 'order-detail';

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentSection, setCurrentSection] = useState<AdminSection>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/auth/login");
        return;
      }

      // Check user role
      const userRole = user.user_metadata?.role || user.app_metadata?.role;
      if (!userRole || !['shopmanager', 'superadmin'].includes(userRole)) {
        router.push("/auth/error?message=Unauthorized access");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Handle URL parameters for section navigation
    const section = searchParams.get('section') as AdminSection;
    const orderId = searchParams.get('orderId');

    if (section) {
      setCurrentSection(section);
    }
    if (orderId) {
      setSelectedOrderId(orderId);
      setCurrentSection('order-detail');
    }
  }, [searchParams]);

  const navigateToSection = (section: AdminSection, orderId?: string) => {
    setCurrentSection(section);
    if (orderId) {
      setSelectedOrderId(orderId);
    }

    // Update URL without page reload
    const params = new URLSearchParams();
    params.set('section', section);
    if (orderId) {
      params.set('orderId', orderId);
    }

    const newUrl = `/admin?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  };

  const handleOrderClick = (orderId: string) => {
    navigateToSection('order-detail', orderId);
  };

  if (loading) {
    return <div className="flex-1 w-full flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is an admin-only page. You must be authenticated to view it.
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => navigateToSection('orders')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            currentSection === 'orders'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => navigateToSection('inventory')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            currentSection === 'inventory'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Inventory
        </button>
        <button
          onClick={() => navigateToSection('packeta')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            currentSection === 'packeta'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Packeta
        </button>
      </div>

      {/* Content */}
      <div>
        {currentSection === 'orders' && (
          <>
            <h2 className="font-bold text-2xl mb-4">Orders</h2>
            <OrdersTable onOrderClick={handleOrderClick} />
          </>
        )}

        {currentSection === 'inventory' && (
          <>
            <h2 className="font-bold text-2xl mb-4">Inventory Management</h2>
            <InventoryTable />
          </>
        )}

        {currentSection === 'packeta' && (
          <>
            <h2 className="font-bold text-2xl mb-4">Packeta Management</h2>
            <PacketaManagement />
          </>
        )}

        {currentSection === 'order-detail' && selectedOrderId && (
          <OrderDetailView
            orderId={selectedOrderId}
            onBack={() => navigateToSection('orders')}
          />
        )}
      </div>
    </div>
  );
}

// Order Detail View Component - Full featured version
function OrderDetailView({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedOrder, setEditedOrder] = useState<any>({});

  const loadOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load order");

      setOrder(json.order);
      setEditedOrder(json.order);

      // Generate timeline from order data
      const timelineEvents = [
        {
          timestamp: json.order.created_at,
          event: "Order Created",
          description: `Order created with status: ${json.order.status}`
        }
      ];

      if (json.order.packeta_shipment_id) {
        timelineEvents.push({
          timestamp: json.order.updated_at || json.order.created_at,
          event: "Shipment Created",
          description: `Packeta shipment created: ${json.order.packeta_shipment_id}`
        });
      }

      setTimeline(timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setNotes([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const saveOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedOrder),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");

      setOrder(json.order);
      setEditMode(false);
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const createPacketaShipment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/packeta/create-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create shipment");

      alert(`Zásilka vytvořena! Packeta ID: ${json.packetaId}`);
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  const cancelPacketaShipment = async () => {
    if (!confirm("Opravdu zrušit Packeta zásilku?")) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/packeta/cancel-shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to cancel shipment");

      alert("Packeta zásilka úspěšně zrušena");
      await loadOrder();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to cancel shipment");
    } finally {
      setLoading(false);
    }
  };

  const printPacketaLabel = async () => {
    try {
      const res = await fetch(`/api/admin/packeta/print-label/${orderId}`, {
        method: "GET",
      });
      if (!res.ok) throw new Error("Failed to get label");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `packeta-label-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to print label");
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    const note = {
      id: Date.now().toString(),
      note: newNote,
      created_at: new Date().toISOString()
    };

    setNotes(prev => [note, ...prev]);
    setNewNote("");

    setTimeline(prev => [{
      timestamp: note.created_at,
      event: "Note Added",
      description: newNote
    }, ...prev]);
  };

  if (loading && !order) {
    return <div className="p-6">Loading...</div>;
  }

  if (!order) {
    return <div className="p-6">Order not found</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            ← Back to Orders
          </button>
          <h1 className="text-2xl font-bold">Order Detail</h1>
        </div>
        <div className="flex gap-2">
          {order.packeta_point_id && order.status === "paid" && !order.packeta_shipment_id && (
            <button
              onClick={createPacketaShipment}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Create Shipment
            </button>
          )}
          {order.packeta_shipment_id && (
            <>
              <button
                onClick={printPacketaLabel}
                className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Print Label
              </button>
              <button
                onClick={cancelPacketaShipment}
                disabled={loading}
                className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Shipment
              </button>
            </>
          )}
          {editMode ? (
            <>
              <button
                onClick={saveOrder}
                disabled={loading}
                className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg mb-4">Order Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Order ID</label>
              <p className="text-sm font-mono text-blue-600">{order.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Customer Name</label>
              {editMode ? (
                <input
                  type="text"
                  value={editedOrder.customer_name || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full border rounded px-2 py-1"
                />
              ) : (
                <p className="text-sm">{order.customer_name || "-"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              {editMode ? (
                <input
                  type="email"
                  value={editedOrder.customer_email || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, customer_email: e.target.value }))}
                  className="w-full border rounded px-2 py-1"
                />
              ) : (
                <p className="text-sm">{order.customer_email || "-"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              {editMode ? (
                <select
                  value={editedOrder.status || ""}
                  onChange={(e) => setEditedOrder(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full border rounded px-2 py-1"
                >
                  {["new", "paid", "processing", "shipped", "cancelled", "refunded"].map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              ) : (
                <span className={`px-2 py-1 rounded text-xs ${
                  order.status === 'paid' ? 'bg-green-100 text-green-800' :
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status}
                </span>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">Amount Total</label>
              <p className="text-sm">{order.amount_total ? `${(order.amount_total / 100).toFixed(2)} CZK` : "-"}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold text-lg mb-4">Timeline</h3>
          <div className="space-y-3">
            {timeline.map((event, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="font-medium text-sm">{event.event}</p>
                  <p className="text-xs text-gray-600">{event.description}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-4">Notes & Communication</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Add Note</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNote()}
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                onClick={addNote}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Internal Notes</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm">{note.note}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-gray-500 text-sm">No notes yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
