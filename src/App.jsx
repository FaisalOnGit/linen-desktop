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
import RfidTestPage from "./pages/RfidTestPage";
import FinalCheckPage from "./pages/FinalCheck";
import { Toaster } from "react-hot-toast";
import ScanningPage from "./pages/ScanningPage";
import Scanning from "./pages/Scanning";
import LinenPending from "./pages/LinenPending";
import Cetak from "./pages/Cetak";

const App = () => {
  const [activePage, setActivePage] = useState("login");
  const rfidHook = useRfid();

  // Get default page based on user menus after login
  const getDefaultPageFromMenus = (menus) => {
    if (!menus || !Array.isArray(menus)) return "register";

    // Define which menus are available in desktop app
    const desktopAvailableMenus = [
      "Register RFID",
      "Grouping",
      "Linen Delivery",
      "Final Check",
      "Linen Pending",
      "Cetak",
    ];

    // Filter only active menus that are available in desktop app and sort by menuSort
    const availableDesktopMenus = menus
      .filter(
        (menu) =>
          menu.menuIsActive && desktopAvailableMenus.includes(menu.menuName)
      )
      .sort((a, b) => a.menuSort - b.menuSort);

    console.log("All user menus:", menus);
    console.log(
      "Available desktop menus filtered and sorted:",
      availableDesktopMenus
    );

    if (availableDesktopMenus.length === 0) {
      console.log("No desktop menus found, returning register as fallback");
      return "register";
    }

    const highestPriorityMenu = availableDesktopMenus[0];
    console.log("Highest priority desktop menu:", highestPriorityMenu);

    // Map menuName to pageId
    const menuPageMap = {
      "Register RFID": "register",
      Grouping: "grouping",
      "Linen Delivery": "delivery-new",
      "Final Check": "final-check",
      "Linen Pending": "linen-pending",
      "Setting Reader": "reader",
      Cetak: "cetak",
    };

    const pageId = menuPageMap[highestPriorityMenu.menuName];
    console.log("Mapped to pageId:", pageId);

    return pageId || "register";
  };

  const handleNavigation = (page) => {
    setActivePage(page);
  };

  useEffect(() => {
    return () => {
      rfidHook.clearAllData();
      // Clear delivery persistent data when app closes
      localStorage.removeItem('deliveryPersistentData');
    };
  }, [rfidHook.clearAllData]);

  // Handle login success with menu-based navigation
  const handleLoginSuccess = async () => {
    try {
      // Get user data including menus
      const userData = await window.authAPI.getUserData();

      if (userData && userData.menus) {
        const defaultPage = getDefaultPageFromMenus(userData.menus);
        console.log("Setting active page to:", defaultPage);
        setActivePage(defaultPage);
      } else {
        // Fallback to grouping if no menus found
        console.log("No menus found, fallback to grouping");
        setActivePage("grouping");
      }
    } catch (error) {
      console.error("Error getting user data after login:", error);
      // Fallback to grouping
      setActivePage("grouping");
    }
  };

  const renderActivePage = () => {
    switch (activePage) {
      case "login":
        return <LoginPage onLoginSuccess={handleLoginSuccess} />;
      case "reader":
        return <SettingPage rfidHook={rfidHook} />;
      case "register":
        return <RegisterPage rfidHook={rfidHook} />;
      case "sorting":
        return <LinenCleanPage rfidHook={rfidHook} />;
      case "final-check":
        return <FinalCheckPage rfidHook={rfidHook} />;
      case "scanning":
        return <GroupingPage rfidHook={rfidHook} />;
      case "grouping":
        return <Scanning rfidHook={rfidHook} />;
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
      case "rfid-test":
        return <RfidTestPage rfidHook={rfidHook} />;
      case "linen-pending":
        return <LinenPending rfidHook={rfidHook} />;
      case "cetak":
        return <Cetak />;
      default:
        return <RegisterPage rfidHook={rfidHook} />;
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
          <div className="w-full mx-auto h-full px-4 py-2">
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
