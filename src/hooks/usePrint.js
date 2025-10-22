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
    let startY = 360;
    const lineHeight = 25;

    if (deliveryData.linenItems && Array.isArray(deliveryData.linenItems)) {
      deliveryData.linenItems.forEach((item, index) => {
        const yPos = startY + index * lineHeight;

        // Display linen name and quantity vertically in single column
        linenItems += `^FO170,${yPos}^A0N,22,22^FD${index + 1}. ${
          item.name
        }: ${item.quantity || "-"}^FS\n`;
      });
    } else if (deliveryData.linenTypes) {
      // Fallback for single linen type
      linenItems = `^FO170,${startY}^A0N,22,22^FDLinen: ${deliveryData.linenTypes}^FS\n`;
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
^FO200,20^A0N,35,35^FDPT JALIN MITRA NUSANTARA^FS
^FO330,60^A0N,28,28^FD(Obsesiman)^FS

^FO250,95^A0N,35,35^FD${deliveryData.deliveryType || "DELIVERY"}^FS

^FO330,135^A0N,20,20^FD${currentDate}^FS

^FO170,160^A0N,25,25^FDDetail Pengiriman:^FS
^FO170,195^GB400,0,2^FS

^FO170,220^A0N,22,22^FD${deliveryData.driverLabel || "Operator"}:^FS
^FO320,220^A0N,22,22^FD${deliveryData.driverName || "-"}^FS

^FO170,255^A0N,22,22^FDKlien:^FS
^FO320,255^A0N,22,22^FD${deliveryData.customer || "-"}^FS

^FO170,290^A0N,22,22^FDRuangan:^FS
^FO320,290^A0N,22,22^FD${deliveryData.room || "-"}^FS

^FO170,325^A0N,22,22^FDTotal Linen:^FS
^FO320,325^A0N,22,22^FD${deliveryData.totalLinen || "0"}^FS

${linenItems}

^FO170,${finalY}^GB400,0,2^FS
^FO330,${finalY + 30}^A0N,20,20^FDTerima kasih^FS
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
