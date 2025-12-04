import { useState, useEffect } from "react";

const usePrintCetak = () => {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState([]);
  const [printStatus, setPrintStatus] = useState("Loading...");
  const [isBrowserPrintLoaded, setIsBrowserPrintLoaded] = useState(false);

  useEffect(() => {
    // Check if BrowserPrint is loaded on component mount
    checkBrowserPrintLoaded();
  }, []);

  const checkBrowserPrintLoaded = () => {
    if (window.BrowserPrint) {
      setIsBrowserPrintLoaded(true);
      setupZebraPrinter();
    } else {
      setPrintStatus(
        "Error: Zebra Browser Print not loaded. Please install Zebra Browser Print."
      );
      setIsBrowserPrintLoaded(false);
    }
  };

  const setupZebraPrinter = () => {
    // Get default printer device
    window.BrowserPrint.getDefaultDevice(
      "printer",
      (device) => {
        if (device) {
          setSelectedDevice(device);
          setDevices([device]);
          setPrintStatus("Printer connected: " + device.name);
          console.log("Default device found:", device);
        } else {
          setPrintStatus("No default printer found. Searching for devices...");
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
                setPrintStatus("Printer found: " + allDevices[0].name);
              }
            } else {
              setPrintStatus(
                "No Zebra printers found. Please check printer connection."
              );
            }
          },
          (error) => {
            setPrintStatus("Error getting local devices: " + error);
            console.error("Error getting local devices:", error);
          },
          "printer"
        );
      },
      (error) => {
        setPrintStatus("Error getting default device: " + error);
        console.error("Error getting default device:", error);

        // Try to get local devices anyway
        window.BrowserPrint.getLocalDevices(
          (deviceList) => {
            console.log("Fallback - Device list:", deviceList);
            if (deviceList && deviceList.length > 0) {
              setDevices(deviceList);
              setSelectedDevice(deviceList[0]);
              setPrintStatus("Printer found: " + deviceList[0].name);
            } else {
              setPrintStatus("No Zebra printers detected");
            }
          },
          (error) => {
            setPrintStatus("Error: No printers found - " + error);
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

    // Handle dynamic linen types grouped by room
    let linenItems = "";
    let startY = 360; // Adjusted start position after adding detail pengiriman section
    const lineHeight = 30; // Increased line height for better vertical spacing

    // Group linen items by room
    const roomsData = {};
    if (deliveryData.linenItems && Array.isArray(deliveryData.linenItems)) {
      deliveryData.linenItems.forEach((item) => {
        const room = item.room || "Umum";
        if (!roomsData[room]) {
          roomsData[room] = [];
        }
        roomsData[room].push(item);
      });
    }

    let currentY = startY;

    // Generate linen items for each room
    Object.entries(roomsData).forEach(([roomName, roomItems], roomIndex) => {
      if (roomIndex > 0) {
        // Add spacing between rooms
        currentY += lineHeight;
      }

      // Calculate total items for this room
      const roomTotal = roomItems.reduce(
        (sum, item) => sum + parseInt(item.quantity || 0),
        0
      );

      // Add room header with total count
      linenItems += `^FO70,${currentY}^A0N,25,25^FB480,1,0,B^FDRuangan: ${roomName}^FS\n`;
      currentY += 30;
      linenItems += `^FO70,${currentY}^A0N,25,25^FDTotal Linen: ${roomTotal}^FS\n`;
      currentY += 30;

      // Add headers for QTY and Linen columns for this room
      linenItems += `^FO100,${currentY}^A0N,25,25^FDQTY^FS\n`;
      linenItems += `^FO180,${currentY}^A0N,25,25^FDLinen^FS\n`;
      currentY += lineHeight;

      // Add items for this room (sorted alphabetically by name)
      const sortedRoomItems = roomItems.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      sortedRoomItems.forEach((item) => {
        linenItems += `^FO100,${currentY}^A0N,25,25^FD${item.quantity}^FS\n`;
        linenItems += `^FO180,${currentY}^A0N,25,25^FD${item.name || "-"}^FS\n`;
        currentY += lineHeight;
      });

      // Add separator line after room items
      linenItems += `^FO70,${currentY}^GB480,0,1^FS\n`;
      currentY += 20;
    });

    // Calculate total height based on all grouped items
    const totalLinenHeight = currentY - startY + lineHeight * 2;
    const finalY = startY + totalLinenHeight + 40;
    const labelHeight = Math.max(900, finalY + 250); // Increased minimum height and extra space for better spacing

    // Calculate centered position for delivery type
    const deliveryTypeText = deliveryData.deliveryType || "DELIVERY";
    const textLength = deliveryTypeText.length;
    const charWidth = 22;
    const textWidth = textLength * charWidth;
    const labelWidth = 700; // Total label width
    const centeredX = Math.max(70, Math.floor((labelWidth - textWidth) / 2));

    let zpl = `^XA
^LL${labelHeight}
^FO100,50^A0N,35,35^FDPT JALIN MITRA NUSANTARA^FS
^FO250,90^A0N,35,35^FD(OSLA)^FS

^FO${centeredX},125^A0N,35,35^FD${deliveryTypeText}^FS

^FO230,165^A0N,20,20^FD${currentDate}^FS

^FO70,260^GB480,0,2^FS

^FO70,285^A0N,23,23^FDKlien: ${deliveryData.customer || "-"}^FS

^FO70,310^A0N,23,23^FDTotal: ${deliveryData.totalLinen || "0"}^FS

^FO70,340^GB480,0,2^FS

${linenItems}

^FO70,${finalY}^GB480,0,2^FS
^FO110,${finalY + 30}^A0N,25,25^FDTTD OSLA^FS
^FO380,${finalY + 30}^A0N,25,25^FDTTD PERAWAT^FS
^FO70,${finalY + 140}^A0N,25,25^FD(                      )^FS
^FO380,${finalY + 140}^A0N,25,25^FD(                      )^FS
^XZ`;

    return zpl;
  };

  const printDeliveryLabel = (deliveryData) => {
    return new Promise((resolve, reject) => {
      if (!selectedDevice) {
        const error = "No printer selected!";
        setPrintStatus("Print error: " + error);
        reject(new Error(error));
        return;
      }

      if (!isBrowserPrintLoaded) {
        const error = "Zebra Browser Print not loaded!";
        setPrintStatus("Print error: " + error);
        reject(new Error(error));
        return;
      }

      const zplCommand = generateDeliveryZPL(deliveryData);

      selectedDevice.send(
        zplCommand,
        () => {
          setPrintStatus("Print successful!");
          resolve("Print successful!");
        },
        (error) => {
          setPrintStatus("Print error: " + error);
          reject(new Error(error));
        }
      );
    });
  };

  const handleDeviceChange = (deviceUid) => {
    const device = devices.find((d) => d.uid === deviceUid);
    if (device) {
      setSelectedDevice(device);
      setPrintStatus("Printer selected: " + device.name);
    }
  };

  const refreshDevices = () => {
    setPrintStatus("Refreshing devices...");
    setupZebraPrinter();
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

  return {
    selectedDevice,
    devices,
    printStatus,
    isBrowserPrintLoaded,
    printDeliveryLabel,
    handleDeviceChange,
    refreshDevices,
    checkBrowserPrint,
    setupZebraPrinter,
  };
};

export default usePrintCetak;
