# Admin Dashboard Repository Map

## Overview
The admin dashboard is a comprehensive React-based interface for managing an e-commerce store, built with Next.js, Supabase, and various UI components. It consists of multiple interconnected components handling different aspects of store management.

## Component Architecture

### Core Structure
```
app/(admin)/admin/page.tsx
├── Main layout with sidebar navigation
├── Responsive mobile header
└── Content area with section routing

components/admin/
├── Dashboard.tsx (Main overview with stats and alerts)
├── OrdersTable.tsx (Order management with filtering/search)
├── InventoryTable.tsx (Stock management)
├── OrderDetailView.tsx (Individual order details)
├── CustomerCommunication.tsx (Customer email management)
└── PacketaManagement.tsx (Shipping management)
```

### Navigation Flow
- **Dashboard**: Central hub with key metrics, alerts, and quick actions
- **Orders**: Comprehensive order table with bulk operations
- **Inventory**: Product stock management with low-stock alerts
- **Packeta**: Shipping management for Packeta deliveries
- **Customers**: Customer communication and management
- **Order Detail**: Deep-dive into individual orders

## Data Flow

### Frontend State Management
- Client-side state using React hooks (useState, useEffect)
- Real-time data fetching from Supabase
- Optimistic updates for better UX
- Error handling with user feedback

### Backend Integration
```
lib/supabase/
├── client.ts (Public client for user operations)
├── admin.ts (Service role client for admin operations)
└── server.ts (Server-side operations)
```

### API Routes
```
app/api/admin/
├── inventory/ (Stock management)
├── orders/ (Order operations)
├── packeta/ (Shipping operations)
└── stripe/ (Payment integration)
```

## Key Dependencies

### External Services
- **Supabase**: Database, authentication, real-time subscriptions
- **Stripe**: Payment processing and webhooks
- **Packeta**: Shipping and delivery management
- **PostHog**: Analytics and user tracking

### UI Framework
- **Next.js**: React framework with App Router
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **Lucide React**: Icon library

## Coupling Points

### High Coupling Areas
1. **Dashboard ↔ OrdersTable**: Shared order data and quick actions
2. **OrdersTable ↔ PacketaManagement**: Shipping integration
3. **InventoryTable ↔ Dashboard**: Stock alerts synchronization
4. **All components ↔ Supabase**: Centralized data source

### Loose Coupling Areas
- Customer communication is somewhat isolated
- Individual order details have minimal dependencies

## Performance Considerations

### Current Bottlenecks
- Large data fetches on dashboard load
- Multiple API calls for related data
- Client-side filtering/sorting of large datasets
- Real-time polling for updates

### Optimization Opportunities
- Implement pagination for large datasets
- Add caching layers
- Use React Query for data management
- Implement virtual scrolling for tables