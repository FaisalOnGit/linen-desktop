import { useState, useEffect } from "react";

const usePrint = () => {
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

    // Handle dynamic linen types
    let linenItems = "";
    let startY = 360; // Adjusted start position after removing duplicate DO
    const lineHeight = 25;

    // Add headers for QTY and Linen columns
    linenItems += `^FO70,${startY}^A0N,22,22^FDQTY^FS\n`;
    linenItems += `^FO150,${startY}^A0N,22,22^FDLinen^FS\n`;
    startY += lineHeight;

    if (deliveryData.linenItems && Array.isArray(deliveryData.linenItems)) {
      deliveryData.linenItems.forEach((item, index) => {
        const yPos = startY + index * lineHeight;

        // Display QTY in first column, linen name in second column
        linenItems += `^FO70,${yPos}^A0N,22,22^FD${item.quantity}^FS\n`;
        linenItems += `^FO150,${yPos}^A0N,22,22^FD${item.name || "-"}^FS\n`;
      });
    } else if (deliveryData.linenTypes) {
      // Fallback for single linen type
      linenItems += `^FO70,${startY}^A0N,22,22^FD1^FS\n`;
      linenItems += `^FO150,${startY}^A0N,22,22^FD${deliveryData.linenTypes}^FS\n`;
      startY += lineHeight;
    }

    // Calculate total height based on linen items plus headers
    const numberOfLinenItems = deliveryData.linenItems
      ? deliveryData.linenItems.length
      : 1;
    const totalLinenHeight = (numberOfLinenItems + 1) * lineHeight; // +1 for headers
    const finalY = startY + totalLinenHeight + 35;
    const labelHeight = Math.max(600, finalY + 50);

    let zpl = `^XA
^LL${labelHeight}
^FO100,50^A0N,35,35^FDPT JALIN MITRA NUSANTARA^FS
^FO250,90^A0N,35,35^FD(OSLA)^FS

^FO150,125^A0N,35,35^FD${deliveryData.deliveryType || "DELIVERY"}^FS

^FO180,165^A0N,35,35^FD${deliveryData.deliveryNumber || "DO251024000090"}^FS

^FO230,200^A0N,20,20^FD${currentDate}^FS

^FO70,225^A0N,25,25^FDDetail Pengiriman:^FS
^FO70,260^GB480,0,2^FS

^FO70,285^A0N,22,22^FDKlien: ${deliveryData.customer || "-"}^FS

^FO70,310^A0N,22,22^FDRuangan: ${deliveryData.room || "-"}^FS

^FO70,335^A0N,22,22^FDTotal Linen: ${deliveryData.totalLinen || "0"}^FS

^FO450,285^A0N,22,22^FD${deliveryData.driverLabel || "Operator"}^FS
^FO450,310^A0N,22,22^FD${deliveryData.driverName || "-"}^FS

${linenItems}

^FO70,${finalY}^GB480,0,2^FS
^FO220,${finalY + 30}^A0N,20,20^FDTerima kasih^FS
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

export default usePrint;
