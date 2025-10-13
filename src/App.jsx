import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import RegisterPage from "./pages/RegisterPage";
import GroupingPage from "./pages/GroupingPage";
import SettingPage from "./pages/SettingPage";
import { useRfid } from "./hooks/useRfid";
import LoginPage from "./pages/LoginPage";
import LinenCleanPage from "./pages/LinenBersih";
import DeliveryPage from "./pages/DeliveryPage";
import SortingLinenPage from "./pages/SortingPage";
import PrintTestPage from "./pages/PrintTestPage";
import { TableModeProvider } from "./contexts/TableModeContext";
import Print from "./pages/Print";
import DeliveryPage2 from "./pages/Delivery";
import { Toaster } from "react-hot-toast";

const App = () => {
  const [activePage, setActivePage] = useState("login");
  const rfidHook = useRfid();

  const handleNavigation = (page) => {
    setActivePage(page);
  };

  useEffect(() => {
    return () => {
      rfidHook.clearAllData();
    };
  }, [rfidHook.clearAllData]);

  const renderActivePage = () => {
    switch (activePage) {
      case "login":
        return <LoginPage onLoginSuccess={() => setActivePage("sorting")} />;
      case "reader":
        return <SettingPage rfidHook={rfidHook} />;
      case "register":
        return <RegisterPage rfidHook={rfidHook} />;
      case "sorting":
        return <LinenCleanPage rfidHook={rfidHook} />;
      case "grouping":
        return <GroupingPage rfidHook={rfidHook} />;
      case "delivery-new":
        return <DeliveryPage rfidHook={rfidHook} deliveryType={1} />;
      case "delivery-regular":
        return <DeliveryPage rfidHook={rfidHook} deliveryType={2} />;
      case "delivery-rewash":
        return <DeliveryPage rfidHook={rfidHook} deliveryType={3} />;
      case "delivery-retur":
        return <DeliveryPage rfidHook={rfidHook} deliveryType={4} />;
      case "print-test":
        return <PrintTestPage />;
      default:
        return <LinenCleanPage rfidHook={rfidHook} />;
    }
  };

  return (
    <TableModeProvider>
      <div className="font-poppins bg-gray-100 min-h-screen">
        {activePage !== "login" && (
          <Navbar
            activePage={activePage}
            onNavigate={handleNavigation}
            rfidHook={rfidHook}
          />
        )}

        {activePage === "login" ? (
          renderActivePage()
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {renderActivePage()}
          </div>
        )}

        {/* Toast Notification Container */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "500",
              borderRadius: "8px",
              padding: "12px 16px",
            },
            success: {
              duration: 4000,
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </div>
    </TableModeProvider>
  );
};

export default App;
