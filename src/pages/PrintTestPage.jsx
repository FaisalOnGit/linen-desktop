import React, { useState, useRef, useEffect } from "react";
import {
  Printer,
  Settings,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const PrintTestPage = () => {
  const [printerStatus, setPrinterStatus] = useState("loading");
  const [lastPrintTime, setLastPrintTime] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState([]);
  const [status, setStatus] = useState("Loading...");
  const [browserPrintStatus, setBrowserPrintStatus] = useState("Checking...");
  const [labelData, setLabelData] = useState({
    qrCode: "123456789",
    customerName: "PT JALIN MITRA NUSANTARA",
    roomNumber: "101",
    totalLinen: "10",
    qtyLinen: "5",
  });
  const [printerSettings, setPrinterSettings] = useState({
    connectionType: "usb",
    printerName: "ZDesigner ZD888-203dpi ZPL (Copy 1)", // Default printer name
    darkness: 10,
    printSpeed: 4,
    labelWidth: 10,
    labelHeight: 5,
  });
  const iframeRef = useRef(null);

  useEffect(() => {
    // Setup Zebra printer on component mount
    setupZebraPrinter();
  }, []);

  const setupZebraPrinter = () => {
    // Check if BrowserPrint is loaded
    if (!window.BrowserPrint) {
      setBrowserPrintStatus("Error: Zebra Browser Print not loaded");
      setStatus(
        "Zebra Browser Print not available. Please install Zebra Browser Print."
      );
      setPrinterStatus("idle");
      return;
    }

    setBrowserPrintStatus("BrowserPrint loaded successfully");

    // Get default printer device
    window.BrowserPrint.getDefaultDevice(
      "printer",
      (device) => {
        if (device) {
          setSelectedDevice(device);
          setDevices([device]);
          setStatus("Printer connected: " + device.name);
          setPrinterStatus("idle");
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
              setPrinterStatus("idle");
            } else {
              setStatus(
                "No Zebra printers found. Please check printer connection."
              );
              setPrinterStatus("idle");
            }
          },
          (error) => {
            setStatus("Error getting local devices: " + error);
            setPrinterStatus("idle");
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
              setPrinterStatus("idle");
            } else {
              setStatus("No Zebra printers detected");
              setPrinterStatus("idle");
            }
          },
          (error) => {
            setStatus("Error: No printers found - " + error);
            setPrinterStatus("idle");
            console.error("Error in fallback:", error);
          },
          "printer"
        );
      }
    );
  };

  const generateZPL = (data) => {
    const deliveryData = {
      barcode: data.qrCode || "123456789",
      client: data.customerName || "PT JALIN MITRA NUSANTARA",
      room: data.roomNumber || "101",
      totalLinen: data.totalLinen || "10",
      qtyLinen: data.qtyLinen || "5"
    };

    return `^LL550
^FO180,20^A0N,35,35^FDPT JALIN MITRA NUSANTARA^FS
^FO310,60^A0N,28,28^FD(Obsesiman)^FS

^FO310,95^A0N,35,35^FDDELIVERY^FS

^FO200,150^BY2^BCN,80,Y,N,N^FD${deliveryData.barcode}^FS

^FO150,270^A0N,25,25^FDDetail Pengiriman:^FS
^FO150,305^GB400,0,2^FS

^FO150,330^A0N,22,22^FDKlien:^FS
^FO300,330^A0N,22,22^FD${deliveryData.client}^FS

^FO150,365^A0N,22,22^FDRuangan:^FS
^FO300,365^A0N,22,22^FD${deliveryData.room}^FS

^FO150,400^A0N,22,22^FDTotal Linen:^FS
^FO300,400^A0N,22,22^FD${deliveryData.totalLinen}^FS

^FO150,435^A0N,22,22^FDQty Linen:^FS
^FO300,435^A0N,22,22^FD${deliveryData.qtyLinen}^FS

^FO150,470^GB400,0,2^FS
^FO250,490^A0N,20,20^FDTerima kasih^FS
^XZ`;
  };

  const printLabel = async () => {
    setPrinterStatus("printing");
    setError(null);

    try {
      const zplCode = generateZPL(labelData);

      // Try BrowserPrint first if available
      if (selectedDevice && selectedDevice.send) {
        console.log("Trying BrowserPrint with device:", selectedDevice);

        selectedDevice.send(
          zplCode,
          () => {
            console.log("BrowserPrint success!");
            setPrinterStatus("success");
            setLastPrintTime(new Date());
            setStatus("Print successful via BrowserPrint!");
            setTimeout(() => setPrinterStatus("idle"), 3000);
          },
          (error) => {
            console.error("BrowserPrint error:", error);
            setError(error);
            setPrinterStatus("error");
            setStatus("Print error via BrowserPrint: " + error);
            setTimeout(() => setPrinterStatus("idle"), 3000);
          }
        );
        return;
      }

      // Fallback to original printerAPI method
      console.log("Using fallback printerAPI method");
      if (window.printerAPI) {
        const success = await window.printerAPI.printLabel({
          zpl: zplCode,
          printer: {
            connectionType: printerSettings.connectionType,
            printerName: printerSettings.printerName,
            darkness: printerSettings.darkness,
            printSpeed: printerSettings.printSpeed,
            labelWidth: printerSettings.labelWidth,
            labelHeight: printerSettings.labelHeight,
          },
        });

        if (success) {
          setPrinterStatus("success");
          setLastPrintTime(new Date());
          setStatus("Print successful via fallback method!");
        } else {
          throw new Error("Print failed");
        }
      } else {
        throw new Error("No printing method available");
      }
    } catch (err) {
      console.error("Print error:", err);
      setError(err.message);
      setPrinterStatus("error");
      setStatus("Print error: " + err.message);
    } finally {
      setTimeout(() => setPrinterStatus("idle"), 3000);
    }
  };

  const previewLabel = () => {
    const zplCode = generateZPL(labelData);
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <title>Label Preview</title>
            <style>
              body {
                font-family: monospace;
                padding: 20px;
                background: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
              }
              .label {
                background: white;
                border: 2px solid #ddd;
                padding: 20px;
                width: 400px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                text-align: center;
              }
              .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .company-subtitle { font-size: 16px; color: #666; margin-bottom: 10px; }
              .delivery-title { font-size: 28px; font-weight: bold; margin: 15px 0; }
              .barcode-placeholder {
                width: 120px;
                height: 60px;
                border: 2px solid #333;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                text-align: center;
                margin: 20px auto;
                background: #f0f0f0;
              }
              .detail-section {
                text-align: left;
                margin: 20px 0;
                border-top: 2px solid #333;
                padding-top: 15px;
              }
              .detail-row {
                display: flex;
                justify-content: space-between;
                margin: 8px 0;
                font-size: 14px;
              }
              .detail-label { font-weight: bold; }
              .divider {
                border-top: 2px solid #333;
                margin: 15px 0;
              }
              .thank-you {
                font-size: 16px;
                font-style: italic;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="company-name">PT JALIN MITRA NUSANTARA</div>
              <div class="company-subtitle">(Obsesiman)</div>
              <div class="delivery-title">DELIVERY</div>

              <div class="barcode-placeholder">
                BARCODE<br/>${labelData.qrCode}
              </div>

              <div class="detail-section">
                <div class="detail-row">
                  <span class="detail-label">Klien:</span>
                  <span>${labelData.customerName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Ruangan:</span>
                  <span>${labelData.roomNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Total Linen:</span>
                  <span>${labelData.totalLinen}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Qty Linen:</span>
                  <span>${labelData.qtyLinen}</span>
                </div>
              </div>

              <div class="divider"></div>
              <div class="thank-you">Terima kasih</div>
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();
    }
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Print Test Labels (Zebra BrowserPrint)
        </h1>
        <p className="text-gray-600">
          Test printing labels with Zebra BrowserPrint SDK and ZD888 printer
        </p>
      </div>

      {/* Zebra BrowserPrint Status */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">BrowserPrint Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">
              BrowserPrint:
            </span>
            <span
              className={`ml-2 px-2 py-1 rounded text-sm ${
                browserPrintStatus.includes("successfully")
                  ? "bg-green-100 text-green-800"
                  : browserPrintStatus.includes("Error")
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {browserPrintStatus}
            </span>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">
              Printer Status:
            </span>
            <span className="ml-2 text-sm text-gray-600">{status}</span>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={checkBrowserPrint}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Check BrowserPrint
          </button>
          <button
            onClick={refreshDevices}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Refresh Devices
          </button>
        </div>
      </div>

      {/* Device Selection */}
      {devices.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Zebra Printers Found</h2>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Printer:
            </label>
            <select
              onChange={handleDeviceChange}
              value={selectedDevice?.uid || ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {devices.map((device, index) => (
                <option key={index} value={device.uid}>
                  {device.name} ({device.connection})
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Selected: <strong>{selectedDevice?.name || "None"}</strong>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Label Data Configuration */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="mr-2" size={20} />
            Label Data
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barcode
              </label>
              <input
                type="text"
                value={labelData.qrCode}
                onChange={(e) =>
                  setLabelData({ ...labelData, qrCode: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={labelData.customerName}
                onChange={(e) =>
                  setLabelData({ ...labelData, customerName: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={labelData.roomNumber}
                onChange={(e) =>
                  setLabelData({ ...labelData, roomNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Linen
              </label>
              <input
                type="text"
                value={labelData.totalLinen}
                onChange={(e) =>
                  setLabelData({ ...labelData, totalLinen: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qty Linen
              </label>
              <input
                type="text"
                value={labelData.qtyLinen}
                onChange={(e) =>
                  setLabelData({ ...labelData, qtyLinen: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Printer Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Settings className="mr-2" size={20} />
            Printer Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Connection Type
              </label>
              <select
                value={printerSettings.connectionType}
                onChange={(e) =>
                  setPrinterSettings({
                    ...printerSettings,
                    connectionType: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="usb">USB</option>
                <option value="network">Network</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {printerSettings.connectionType === "usb"
                  ? "Printer Name"
                  : "IP Address"}
              </label>
              <input
                type={
                  printerSettings.connectionType === "usb" ? "text" : "text"
                }
                placeholder={
                  printerSettings.connectionType === "usb"
                    ? "Zebra ZD888"
                    : "192.168.1.100"
                }
                value={printerSettings.printerName}
                onChange={(e) =>
                  setPrinterSettings({
                    ...printerSettings,
                    printerName: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {printerSettings.connectionType === "network" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={printerSettings.port || 9100}
                  onChange={(e) =>
                    setPrinterSettings({
                      ...printerSettings,
                      port: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Darkness
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={printerSettings.darkness}
                  onChange={(e) =>
                    setPrinterSettings({
                      ...printerSettings,
                      darkness: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Print Speed
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={printerSettings.printSpeed}
                  onChange={(e) =>
                    setPrinterSettings({
                      ...printerSettings,
                      printSpeed: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label Width (inches)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={printerSettings.labelWidth}
                  onChange={(e) =>
                    setPrinterSettings({
                      ...printerSettings,
                      labelWidth: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label Height (inches)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={printerSettings.labelHeight}
                  onChange={(e) =>
                    setPrinterSettings({
                      ...printerSettings,
                      labelHeight: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview and Print Actions */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Label Preview & Actions</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={previewLabel}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center"
          >
            <FileText className="mr-2" size={16} />
            Preview Label
          </button>
          <button
            onClick={printLabel}
            disabled={printerStatus === "printing"}
            className={`px-4 py-2 rounded-md transition-colors flex items-center ${
              printerStatus === "printing"
                ? "bg-gray-400 cursor-not-allowed"
                : printerStatus === "success"
                ? "bg-green-500 text-white"
                : printerStatus === "error"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            <Printer className="mr-2" size={16} />
            {printerStatus === "printing"
              ? "Printing..."
              : printerStatus === "success"
              ? "Printed!"
              : printerStatus === "error"
              ? "Print Failed"
              : "Print Label"}
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertCircle className="mr-2" size={16} />
            {error}
          </div>
        )}

        {lastPrintTime && printerStatus === "success" && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
            <CheckCircle className="mr-2" size={16} />
            Label printed successfully at {lastPrintTime.toLocaleTimeString()}
          </div>
        )}

        {/* Preview Iframe */}
        <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Label Preview:
          </h3>
          <iframe
            ref={iframeRef}
            className="w-full h-96 border border-gray-200 rounded bg-white"
            title="Label Preview"
          />
        </div>
      </div>
    </div>
  );
};

export default PrintTestPage;
