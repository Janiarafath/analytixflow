import React, { createContext, useContext, useState } from 'react';

interface DataContextType {
  processedData: any[];
  setProcessedData: (data: any[]) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [processedData, setProcessedData] = useState<any[]>([]);

  return (
    <DataContext.Provider value={{ processedData, setProcessedData }}>
      {children}
    </DataContext.Provider>
  );
};