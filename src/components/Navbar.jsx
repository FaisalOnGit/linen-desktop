import { useState } from "react";
import {
  FileText,
  CheckCircle,
  Truck,
  Settings,
  Wifi,
  WifiOff,
  Printer,
  Package,
  RefreshCw,
  RotateCcw,
  TestTube,
  Search,
  Tags,
  PackageOpen,
  Clock,
  FileOutput,
} from "lucide-react";
import Osla from "../../public/osla.png";
import { useEffect } from "react";

const Navbar = ({ activePage, onNavigate, rfidHook }) => {
  const [activeTab, setActiveTab] = useState("Process");
  const [userMenus, setUserMenus] = useState([]);

  // Get user menus from authAPI on component mount
  useEffect(() => {
    const getUserMenus = async () => {
      try {
        const userData = await window.authAPI.getUserData();
        if (userData && userData.menus) {
          setUserMenus(userData.menus);
          console.log("User menus loaded:", userData.menus);
        }
      } catch (error) {
        console.error("Error loading user menus:", error);
      }
    };

    getUserMenus();
  }, []);

  // Check if user has access to specific menu
  const hasMenuAccess = (menuName) => {
    return userMenus.some(
      (menu) =>
        menu.menuName &&
        menu.menuName.toLowerCase().includes(menuName.toLowerCase())
    );
  };

  // Destructure RFID hook functions and state
  const {
    ip,
    port,
    connect,
    disconnect,
    isConnected,
    isConnecting,
    connectionError,
    clearTags,
  } = rfidHook || {};

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect(ip, port);
    }
  };

  const handleNavigate = async (pageId) => {
    // Clear RFID tags when switching tabs to prevent cross-contamination
    if (clearTags) {
      try {
        await clearTags();
        console.log(`🧹 Tags cleared when navigating to ${pageId}`);
      } catch (err) {
        console.error("Error clearing tags during navigation:", err);
      }
    }

    // Also clear local tag states in the hook
    if (rfidHook && rfidHook.clearTagStates) {
      try {
        rfidHook.clearTagStates();
        console.log(`🧹 Local tag states cleared when navigating to ${pageId}`);
      } catch (err) {
        console.error(
          "Error clearing local tag states during navigation:",
          err
        );
      }
    }

    onNavigate(pageId);
  };

  const ribbonTabs = [
    {
      name: "Process",
      groups: [
        // Register - Menu: Register RFID
        ...(hasMenuAccess("Register RFID")
          ? [
              {
                title: "Register",
                commands: [
                  {
                    id: "register",
                    label: "Register\nRFID",
                    icon: Tags,
                    size: "large",
                    description: "Register new RFID tags",
                  },
                ],
              },
            ]
          : []),
        // Grouping - Menu: Grouping
        ...(hasMenuAccess("Grouping")
          ? [
              {
                title: "Grouping",
                commands: [
                  {
                    id: "grouping",
                    label: "Grouping\nLinen",
                    icon: PackageOpen,
                    size: "large",
                    description: "Group linen items",
                  },
                ],
              },
            ]
          : []),
        // Distribution - Menu: Linen Delivery
        ...(hasMenuAccess("Linen Delivery")
          ? [
              {
                title: "Distribution",
                commands: [
                  {
                    id: "delivery-new",
                    label: "Pengiriman\nBaru",
                    icon: Truck,
                    size: "large",
                    description: "New delivery shipments",
                  },
                  {
                    id: "delivery-regular",
                    label: "Pengiriman\nReguler",
                    icon: Package,
                    size: "large",
                    description: "Regular delivery shipments",
                  },
                  {
                    id: "delivery-rewash",
                    label: "Pengiriman\nRewash",
                    icon: RefreshCw,
                    size: "large",
                    description: "Rewash delivery shipments",
                  },
                  {
                    id: "delivery-retur",
                    label: "Pengiriman\nRetur",
                    icon: RotateCcw,
                    size: "large",
                    description: "Return delivery shipments",
                  },
                ],
              },
            ]
          : []),
        // Final Check - Menu: Final Check
        ...(hasMenuAccess("Final Check")
          ? [
              {
                title: "Final Check",
                commands: [
                  {
                    id: "final-check",
                    label: "Final\nCheck",
                    icon: Search,
                    size: "large",
                    description: "Final check linen validation",
                  },
                ],
              },
            ]
          : []),
        // Pending - Menu: Linen Pending
        ...(hasMenuAccess("Linen Pending")
          ? [
              {
                title: "Pending",
                commands: [
                  {
                    id: "linen-pending",
                    label: "Linen\nPending",
                    icon: Clock,
                    size: "large",
                    description: "View pending linen items",
                  },
                ],
              },
            ]
          : []),
        // Cetak - Menu: Cetak
        ...(hasMenuAccess("Cetak")
          ? [
              {
                title: "Print",
                commands: [
                  {
                    id: "cetak",
                    label: "Cetak\nLaporan",
                    icon: FileOutput,
                    size: "large",
                    description: "Print linen reports",
                  },
                ],
              },
            ]
          : []),
      ],
    },
    {
      name: "Settings",
      groups: [
        // Device - Always show Settings
        {
          title: "Device",
          commands: [
            {
              id: "reader",
              label: "Setting\nReader",
              icon: Settings,
              size: "large",
              description: "Configure RFID reader",
            },
          ],
        },
      ],
    },
  ];

  const currentTab = ribbonTabs.find((tab) => tab.name === activeTab);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 bg-primary border-b border-gray-200">
        {/* Ribbon Tabs di kiri */}
        <div className="flex items-center space-x-2 py-2">
          {ribbonTabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.name
                  ? "text-white border-white"
                  : "text-gray-200 border-transparent hover:text-white hover:border-white/50"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Connection Status & Logo di kanan */}
        <div className="flex items-center space-x-4 py-2">
          {/* Connection Status & Button */}
          {rfidHook && (
            <div className="flex items-center space-x-3">
              {/* Connection Status Indicator */}
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                <span className="text-white text-sm">
                  {ip}:{port}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    isConnected
                      ? "bg-green-600 text-white"
                      : "bg-red-600 text-white"
                  }`}
                >
                  {isConnecting
                    ? "Connecting..."
                    : isConnected
                    ? "Connected"
                    : "Disconnected"}
                </span>
                {connectionError && (
                  <span className="text-xs text-red-300">
                    {connectionError}
                  </span>
                )}
              </div>

              {/* Connect/Disconnect Button */}
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isConnected
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                } ${
                  isConnecting
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
                title={
                  isConnected
                    ? "Disconnect from RFID reader"
                    : "Connect to RFID reader"
                }
              >
                {isConnecting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isConnected ? (
                  <WifiOff className="w-4 h-4" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                <span>
                  {isConnecting
                    ? "..."
                    : isConnected
                    ? "Disconnect"
                    : "Connect"}
                </span>
              </button>
            </div>
          )}

          {/* Logo OSLA */}
          <div className="flex items-center space-x-3">
            <img
              src={Osla}
              alt="OSLA Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      {/* Ribbon Content */}
      <div className="bg-gray-50 px-4 py-3 min-h-[100px]">
        <div className="flex space-x-6">
          {currentTab?.groups.map((group) => (
            <div key={group.title} className="flex flex-col relative">
              <div className="flex items-start space-x-2 mb-2">
                {group.commands.map((command) => {
                  const IconComponent = command.icon;
                  const isActive = activePage === command.id;

                  if (command.size === "large") {
                    return (
                      <button
                        key={command.id}
                        onClick={() => handleNavigate(command.id)}
                        className={`flex flex-col items-center p-2 rounded-md transition-colors min-w-[60px] group ${
                          isActive
                            ? "bg-blue-100 text-blue-600 shadow-sm"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                        title={command.description}
                      >
                        <IconComponent className="w-8 h-8 mb-1" />
                        <span className="text-xs text-center leading-tight whitespace-pre-line">
                          {command.label}
                        </span>
                      </button>
                    );
                  } else {
                    return (
                      <button
                        key={command.id}
                        onClick={() => handleNavigate(command.id)}
                        className={`flex items-center space-x-2 px-2 py-1 rounded transition-colors ${
                          isActive
                            ? "bg-blue-100 text-blue-600"
                            : "hover:bg-gray-100 text-gray-700"
                        }`}
                        title={command.description}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="text-xs whitespace-nowrap">
                          {command.label}
                        </span>
                      </button>
                    );
                  }
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
