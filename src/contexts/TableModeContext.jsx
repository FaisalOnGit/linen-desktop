import React, { createContext, useState, useContext, useEffect } from 'react';

const TableModeContext = createContext();

export const useTableMode = () => {
  const context = useContext(TableModeContext);
  if (!context) {
    throw new Error('useTableMode must be used within a TableModeProvider');
  }
  return context;
};

export const TableModeProvider = ({ children }) => {
  const [tableMode, setTableMode] = useState(() => {
    // Load from localStorage on initial render
    const saved = localStorage.getItem('tableMode');
    return saved || 'double'; // default to double
  });

  // Save to localStorage whenever tableMode changes
  useEffect(() => {
    localStorage.setItem('tableMode', tableMode);
  }, [tableMode]);

  const handleTableModeChange = (mode) => {
    setTableMode(mode);
  };

  return (
    <TableModeContext.Provider value={{ tableMode, handleTableModeChange }}>
      {children}
    </TableModeContext.Provider>
  );
};

export default TableModeContext;