import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import ReaderPage from "./pages/ReaderPage";
import RegisterPage from "./pages/RegisterPage";
import SortingPage from "./pages/SortingPage";
import GroupingPage from "./pages/GroupingPage";
import { useRfid } from "./hooks/useRfid";

const App = () => {
  const [activePage, setActivePage] = useState("reader");
  const rfidHook = useRfid();

  const handleNavigation = (page) => {
    setActivePage(page);
  };

  useEffect(() => {
    return () => {
      if (rfidHook.groupingIntervalRef.current) {
        clearInterval(rfidHook.groupingIntervalRef.current);
      }
    };
  }, [rfidHook.groupingIntervalRef]);

  const renderActivePage = () => {
    switch (activePage) {
      case "reader":
        return <ReaderPage rfidHook={rfidHook} />;
      case "sorting":
        return <RegisterPage />;
      case "register":
        return <SortingPage rfidHook={rfidHook} />;
      case "grouping":
        return <GroupingPage rfidHook={rfidHook} />;
      default:
        return <ReaderPage rfidHook={rfidHook} />;
    }
  };

  return (
    <div className="font-sans bg-gray-100 min-h-screen">
      <Navbar activePage={activePage} onNavigate={handleNavigation} />
      <div className="max-w-7xl mx-auto px-4 py-6">{renderActivePage()}</div>
    </div>
  );
};

export default App;
