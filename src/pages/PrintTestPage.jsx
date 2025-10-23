import { useState, useEffect } from "react";

function PrintTestPage() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState("Loading...");

  useEffect(() => {
    // Setup Zebra printer on component mount
    setupZebraPrinter();
  }, []);

  const setupZebraPrinter = () => {
    // Check if BrowserPrint is loaded
    if (!window.BrowserPrint) {
      setStatus(
        "Error: Zebra Browser Print not loaded. Please install Zebra Browser Print."
      );
      return;
    }

    // Get default printer device
    window.BrowserPrint.getDefaultDevice(
      "printer",
      (device) => {
        if (device) {
          setSelectedDevice(device);
          setDevices([device]);
          setStatus("Printer connected: " + device.name);
          console.log("Default device found:", device);
        } else {
          setStatus("No default printer found. Searching for devices...");
        }

        // Discover other available devices
        window.BrowserPrint.getLocalDevices(
          (deviceList) => {
            console.log("Device list:", deviceList);
            if (deviceList && deviceList.length > 0) {
              const allDevices = device ? [device] : [];
              deviceList.forEach((dev) => {
                if (!device || dev.uid !== device.uid) {
                  allDevices.push(dev);
                }
              });
              setDevices(allDevices);
              if (allDevices.length > 0 && !selectedDevice) {
                setSelectedDevice(allDevices[0]);
                setStatus("Printer found: " + allDevices[0].name);
              }
            } else {
              setStatus(
                "No Zebra printers found. Please check printer connection."
              );
            }
          },
          (error) => {
            setStatus("Error getting local devices: " + error);
            console.error("Error getting local devices:", error);
          },
          "printer"
        );
      },
      (error) => {
        setStatus("Error getting default device: " + error);
        console.error("Error getting default device:", error);

        // Try to get local devices anyway
        window.BrowserPrint.getLocalDevices(
          (deviceList) => {
            console.log("Fallback - Device list:", deviceList);
            if (deviceList && deviceList.length > 0) {
              setDevices(deviceList);
              setSelectedDevice(deviceList[0]);
              setStatus("Printer found: " + deviceList[0].name);
            } else {
              setStatus("No Zebra printers detected");
            }
          },
          (error) => {
            setStatus("Error: No printers found - " + error);
            console.error("Error in fallback:", error);
          },
          "printer"
        );
      }
    );
  };

  const generateDeliveryZPL = (deliveryData) => {
    // Generate current date in dd/MM/yyyy HH:mm format
    const currentDate = new Date()
      .toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(",", "");

    // Handle dynamic linen types
    let linenItems = "";
    let startY = 390;
    const lineHeight = 25;

    if (deliveryData.linenItems && Array.isArray(deliveryData.linenItems)) {
      deliveryData.linenItems.forEach((item, index) => {
        const yPos = startY + index * lineHeight;

        // Display linen name and quantity vertically in single column
        linenItems += `^FO70,${yPos}^A0N,22,22^FD* ${item.name}: ${
          item.quantity || "-"
        }^FS\n`;
      });
    } else if (deliveryData.linenTypes) {
      // Fallback for single linen type
      linenItems = `^FO70,${startY}^A0N,22,22^FDLinen: ${deliveryData.linenTypes}^FS\n`;
      startY += lineHeight;
    }

    // Calculate total height based on linen items
    const numberOfLinenItems = deliveryData.linenItems
      ? deliveryData.linenItems.length
      : 1;
    const totalLinenHeight = numberOfLinenItems * lineHeight;
    const finalY = startY + totalLinenHeight + 35;
    const labelHeight = Math.max(600, finalY + 50);

    let zpl = `^XA
^LL${labelHeight}
^FO100,50^A0N,35,35^FDPT JALIN MITRA NUSANTARA^FS
^FO220,90^A0N,28,28^FD(Obsesiman)^FS

^FO150,125^A0N,35,35^FD${deliveryData.deliveryType || "DELIVERY"}^FS

^FO230,165^A0N,20,20^FD${currentDate}^FS

^FO70,190^A0N,25,25^FDDetail Pengiriman:^FS
^FO70,225^GB480,0,2^FS

^FO70,250^A0N,22,22^FD${deliveryData.driverLabel || "Operator"}:^FS
^FO270,250^A0N,22,22^FD${deliveryData.driverName || "-"}^FS

^FO70,285^A0N,22,22^FDKlien:^FS
^FO270,285^A0N,22,22^FD${deliveryData.customer || "-"}^FS

^FO70,320^A0N,22,22^FDRuangan:^FS
^FO270,320^A0N,22,22^FD${deliveryData.room || "-"}^FS

^FO70,355^A0N,22,22^FDTotal Linen:^FS
^FO270,355^A0N,22,22^FD${deliveryData.totalLinen || "0"}^FS

${linenItems}

^FO70,${finalY}^GB480,0,2^FS
^FO220,${finalY + 30}^A0N,20,20^FDTerima kasih^FS
^XZ`;

    return zpl;
  };

  const printDeliveryLinen = () => {
    if (!selectedDevice) {
      alert("No printer selected!");
      return;
    }

    // Sample data with dynamic linen items
    const deliveryData = {
      deliveryType: "Pengiriman Reguler",
      customer: "RS PREMIER JATINEGARA",
      room: "RUANG RAWAT INAP LT 3",
      totalLinen: "45",
      // Dynamic linen items - will be displayed in columns
      linenItems: [
        { name: "Handuk Besar", quantity: "15" },
        { name: "Handuk Kecil", quantity: "8" },
        { name: "Sprei Queen", quantity: "6" },
        { name: "Sprei King", quantity: "4" },
        { name: "Selimut Tebal", quantity: "5" },
        { name: "Selimut Tipis", quantity: "3" },
        { name: "Guling", quantity: "8" },
        { name: "Bantal", quantity: "10" },
        { name: "Sarung Bantal", quantity: "10" },
        { name: "Keset Kamar", quantity: "4" },
      ],
      driverLabel: "Operator",
      driverName: "Asep Santoso",
    };

    const zplCommand = generateDeliveryZPL(deliveryData);

    selectedDevice.send(
      zplCommand,
      () => {
        setStatus("Print delivery successful!");
      },
      (error) => {
        setStatus("Print error: " + error);
        alert("Error: " + error);
      }
    );
  };

  const handleDeviceChange = (e) => {
    const selectedUid = e.target.value;
    const device = devices.find((d) => d.uid === selectedUid);
    if (device) {
      setSelectedDevice(device);
      setStatus("Printer selected: " + device.name);
    }
  };

  const checkBrowserPrint = () => {
    if (!window.BrowserPrint) {
      alert("Zebra Browser Print NOT loaded!");
      return;
    }

    window.BrowserPrint.getApplicationConfiguration(
      (config) => {
        alert(
          "Zebra Browser Print Version: " + JSON.stringify(config, null, 2)
        );
      },
      (error) => {
        alert("Error getting config: " + error);
      }
    );
  };

  const refreshDevices = () => {
    setStatus("Refreshing devices...");
    setupZebraPrinter();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl text-blue-600 font-bold text-center text-gray-900 mb-8">
          Zebra Print Demo
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span className="font-medium text-gray-900">{status}</span>
            </p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={checkBrowserPrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Check Browser Print
            </button>
            <button
              onClick={refreshDevices}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Refresh Devices
            </button>
          </div>

          {devices.length > 0 ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Printer:
              </label>
              <select
                onChange={handleDeviceChange}
                defaultValue={selectedDevice?.uid}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {devices.map((device, index) => (
                  <option key={index} value={device.uid}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">No printers detected</p>
            </div>
          )}

          <button
            onClick={printDeliveryLinen}
            disabled={!selectedDevice}
            className={`w-full px-6 py-3 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              selectedDevice
                ? "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default PrintTestPage;
