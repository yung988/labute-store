'use client';

import * as React from 'react';

interface AdminContextType {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
}

const AdminContext = React.createContext<AdminContextType>({
  onDateSelect: () => {},
});

export const useAdminContext = () => React.useContext(AdminContext);

export const AdminProvider = AdminContext.Provider;
