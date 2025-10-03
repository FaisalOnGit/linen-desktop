import { useState, useEffect } from "react";

function Print() {
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

  const printDeliveryLinen = () => {
    if (!selectedDevice) {
      alert("No printer selected!");
      return;
    }

    // Sample data - bisa diganti dengan data dinamis
    const deliveryData = {
      barcode: "DLV20250310001",
      client: "RS PREMIER JATINEGARA",
      room: "RUANG RAWAT INAP LT 3",
      totalLinen: "45",
      qtyLinen: "45 PCS",
    };

    // ZPL command untuk struk delivery linen
    const zplCommand = `^XA
^FO50,20^A0N,40,40^FDPT JALIN MITRA NUSANTARA^FS
^FO180,65^A0N,30,30^FD(Obsesiman)^FS
^FO220,100^A0N,35,35^FDDELIVERY^FS

^FO100,150^BY2^BCN,80,Y,N,N^FD${deliveryData.barcode}^FS

^FO50,250^A0N,25,25^FDDetail Pengiriman:^FS
^FO50,280^GB500,0,2^FS

^FO50,300^A0N,22,22^FDKlien:^FS
^FO200,300^A0N,22,22^FD${deliveryData.client}^FS

^FO50,330^A0N,22,22^FDRuangan:^FS
^FO200,330^A0N,22,22^FD${deliveryData.room}^FS

^FO50,360^A0N,22,22^FDTotal Linen:^FS
^FO200,360^A0N,22,22^FD${deliveryData.totalLinen}^FS

^FO50,390^A0N,22,22^FDQty Linen:^FS
^FO200,390^A0N,22,22^FD${deliveryData.qtyLinen}^FS

^FO50,430^GB500,0,2^FS
^FO150,450^A0N,20,20^FDTerima kasih^FS
^XZ`;

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
    <div className="App">
      <h1>Zebra Print Demo</h1>

      <div className="card">
        <p>Status: {status}</p>

        <div style={{ marginBottom: "10px" }}>
          <button onClick={checkBrowserPrint} style={{ marginRight: "5px" }}>
            Check Browser Print
          </button>
          <button onClick={refreshDevices}>Refresh Devices</button>
        </div>

        {devices.length > 0 ? (
          <div>
            <label>Select Printer: </label>
            <select
              onChange={handleDeviceChange}
              defaultValue={selectedDevice?.uid}
            >
              {devices.map((device, index) => (
                <option key={index} value={device.uid}>
                  {device.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p style={{ color: "orange" }}>No printers detected</p>
        )}

        <br />

        <button onClick={printDeliveryLinen} disabled={!selectedDevice}>
          Print Delivery Linen
        </button>
      </div>
    </div>
  );
}

export default Print;
