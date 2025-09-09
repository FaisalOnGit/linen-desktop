import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import ReaderPage from "./pages/ReaderPage";
import RegisterPage from "./pages/RegisterPage";
import SortingLinenPage from "./pages/SortingPage";
import GroupingPage from "./pages/GroupingPage";
import SettingPage from "./pages/SettingPage";
import { useRfid } from "./hooks/useRfid";
import LoginPage from "./pages/LoginPage";
import LinenCleanPage from "./pages/LinenBersih";

const App = () => {
  const [activePage, setActivePage] = useState("login");
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
      case "login":
        return <LoginPage onLoginSuccess={() => setActivePage("reader")} />;
      case "reader":
        return <SettingPage rfidHook={rfidHook} />;
      case "sorting":
        return <RegisterPage rfidHook={rfidHook} />;
      case "register":
        return <LinenCleanPage rfidHook={rfidHook} />;
      case "grouping":
        return <GroupingPage rfidHook={rfidHook} />;
      default:
        return <ReaderPage rfidHook={rfidHook} />;
    }
  };

  return (
    <div className="font-poppins bg-gray-100 min-h-screen">
      {activePage !== "login" && (
        <Navbar activePage={activePage} onNavigate={handleNavigation} />
      )}

      {activePage === "login" ? (
        renderActivePage()
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-6">{renderActivePage()}</div>
      )}
    </div>
  );
};

export default App;
