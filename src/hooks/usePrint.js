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
    return `^XA
^LL600
^FO180,20^A0N,35,35^FDPT JALIN MITRA NUSANTARA^FS
^FO310,60^A0N,28,28^FDDelivery Linen^FS
^FO310,95^A0N,35,35^FDDELIVERY^FS
^FO200,150^BY3^BCN,80,Y,N,N^FD${deliveryData.barcode}^FS
^FO150,270^A0N,25,25^FDDetail Pengiriman:^FS
^FO150,305^GB400,2,2^FS
^FO150,330^A0N,22,22^FDKlien:^FS
^FO300,330^A0N,22,22^FD${deliveryData.customer}^FS
^FO150,365^A0N,22,22^FDDriver:^FS
^FO300,365^A0N,22,22^FD${deliveryData.room}^FS
^FO150,400^A0N,22,22^FDTotal Linen:^FS
^FO300,400^A0N,22,22^FD${deliveryData.totalLinen}^FS
^FO150,435^A0N,22,22^FDQty Linen:^FS
^FO300,435^A0N,22,22^FD${deliveryData.qtyLinen}^FS
^FO150,470^GB400,2,2^FS
^FO250,490^A0N,20,20^FDTerima kasih^FS
^XZ`;
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
