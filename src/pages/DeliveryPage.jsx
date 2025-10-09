import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Plus,
  Trash2,
  Square,
  Truck,
  Printer,
  CheckCircle,
  AlertCircle,
  Settings,
  FileText,
} from "lucide-react";
import Select from "react-select";

const DeliveryPage = ({ rfidHook }) => {
  const {
    deliveryTags = [],
    startDelivery,
    stopDelivery,
    isDeliveryActive = false,
    isRfidAvailable = false,
  } = rfidHook || {};

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    qty: 0,
    driverName: "",
    plateNumber: "",
  });

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [linens, setLinens] = useState([
    { epc: "", status_id: 1, loading: false },
  ]);
  const [processedTags, setProcessedTags] = useState(new Set());
  const [validEpcs, setValidEpcs] = useState(new Set());
  const [nonExistentEpcs, setNonExistentEpcs] = useState(new Set());
  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Printer state
  const [printerStatus, setPrinterStatus] = useState("loading");
  const [lastPrintTime, setLastPrintTime] = useState(null);
  const [printError, setPrintError] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [devices, setDevices] = useState([]);
  const [printerMessage, setPrinterMessage] = useState("Loading...");
  const [browserPrintStatus, setBrowserPrintStatus] = useState("Checking...");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedLinenForPrint, setSelectedLinenForPrint] = useState(null);

  const iframeRef = useRef(null);

  const fetchCustomers = async (searchTerm = "") => {
    setLoadingCustomers(true);
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(`${baseUrl}/Master/customer`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        let customersData = result.data || [];

        if (searchTerm.trim()) {
          customersData = customersData.filter(
            (customer) =>
              customer.customerName
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              customer.customerId
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          );
        }

        setCustomers(customersData);
      } else {
        console.error("Failed to fetch customers");
        setCustomers([]);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const setupZebraPrinter = () => {
    // Check if BrowserPrint is loaded
    if (!window.BrowserPrint) {
      setBrowserPrintStatus("Error: Zebra Browser Print not loaded");
      setPrinterMessage(
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
          setPrinterMessage("Printer connected: " + device.name);
          setPrinterStatus("idle");
          console.log("Default device found:", device);
        } else {
          setPrinterMessage(
            "No default printer found. Searching for devices..."
          );
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
                setPrinterMessage("Printer found: " + allDevices[0].name);
              }
              setPrinterStatus("idle");
            } else {
              setPrinterMessage(
                "No Zebra printers found. Please check printer connection."
              );
              setPrinterStatus("idle");
            }
          },
          (error) => {
            setPrinterMessage("Error getting local devices: " + error);
            setPrinterStatus("idle");
            console.error("Error getting local devices:", error);
          },
          "printer"
        );
      },
      (error) => {
        setPrinterMessage("Error getting default device: " + error);
        console.error("Error getting default device:", error);

        // Try to get local devices anyway
        window.BrowserPrint.getLocalDevices(
          (deviceList) => {
            console.log("Fallback - Device list:", deviceList);
            if (deviceList && deviceList.length > 0) {
              setDevices(deviceList);
              setSelectedDevice(deviceList[0]);
              setPrinterMessage("Printer found: " + deviceList[0].name);
              setPrinterStatus("idle");
            } else {
              setPrinterMessage("No Zebra printers detected");
              setPrinterStatus("idle");
            }
          },
          (error) => {
            setPrinterMessage("Error: No printers found - " + error);
            setPrinterStatus("idle");
            console.error("Error in fallback:", error);
          },
          "printer"
        );
      }
    );
  };

  const generateDeliveryZPL = (linen, deliveryInfo) => {
    const today = new Date().toISOString().split("T")[0];
    const qrCode = linen.epc.slice(-8); // Last 8 characters of EPC as QR code

    return `^XA
^FO100,30^A0N,35,35^FD${deliveryInfo.customerName || "CUSTOMER"}^FS
^FO100,70^A0N,28,28^FDDELIVERY LABEL^FS
^FO100,105^A0N,20,20^FDDelivery: ${deliveryInfo.driverName}^FS
^FO100,130^A0N,20,20^FDPlate: ${deliveryInfo.plateNumber}^FS

^FO150,160^BQN,2,5^FDQA,${qrCode}^FS

^FO450,160^A0N,18,18^FDType: ${linen.linenTypeName || "Linen"}^FS
^FO450,185^A0N,18,18^FDRoom: ${linen.roomName || "-"}^FS
^FO450,210^A0N,18,18^FDDate: ${today}^FS
^FO450,235^A0N,16,16^FDStatus: DELIVERED^FS

^FO250,270^A0N,16,16^FDRFID Tag:^FS
^FO250,290^A0N,14,14^FD${linen.epc}^FS
^XZ`;
  };

  const printDeliveryLabel = async (linen) => {
    setPrinterStatus("printing");
    setPrintError(null);

    try {
      const deliveryInfo = {
        customerName: formData.customerName,
        driverName: formData.driverName,
        plateNumber: formData.plateNumber,
      };

      const zplCode = generateDeliveryZPL(linen, deliveryInfo);

      // Try BrowserPrint first if available
      if (selectedDevice && selectedDevice.send) {
        console.log("Trying BrowserPrint with device:", selectedDevice);

        selectedDevice.send(
          zplCode,
          () => {
            console.log("BrowserPrint success!");
            setPrinterStatus("success");
            setLastPrintTime(new Date());
            setPrinterMessage("Label printed successfully!");
            setTimeout(() => setPrinterStatus("idle"), 3000);
            setShowPrintModal(false);
          },
          (error) => {
            console.error("BrowserPrint error:", error);
            setPrintError(error);
            setPrinterStatus("error");
            setPrinterMessage("Print error: " + error);
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
            connectionType: "usb",
            printerName: "ZDesigner ZD888-203dpi ZPL (Copy 1)",
            darkness: 10,
            printSpeed: 4,
            labelWidth: 4,
            labelHeight: 2,
          },
        });

        if (success) {
          setPrinterStatus("success");
          setLastPrintTime(new Date());
          setPrinterMessage("Label printed successfully via fallback method!");
          setShowPrintModal(false);
        } else {
          throw new Error("Print failed");
        }
      } else {
        throw new Error("No printing method available");
      }
    } catch (err) {
      console.error("Print error:", err);
      setPrintError(err.message);
      setPrinterStatus("error");
      setPrinterMessage("Print error: " + err.message);
    } finally {
      setTimeout(() => setPrinterStatus("idle"), 3000);
    }
  };

  const openPrintModal = (linen) => {
    setSelectedLinenForPrint(linen);
    setShowPrintModal(true);
    if (printerStatus === "loading") {
      setupZebraPrinter();
    }
  };

  const checkEPCAndAddToTable = async (epc) => {
    if (!epc.trim()) return;

    // Check if EPC has already been determined to not exist
    if (nonExistentEpcs.has(epc)) {
      console.log(`EPC ${epc} sudah dicek sebelumnya dan tidak ada di API, diabaikan`);
      return;
    }

    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Process/linen_rfid?epc=${encodeURIComponent(epc)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          const linenData = result.data[0];

          // Check if the linen belongs to the selected customer
          const isValidCustomer =
            !formData.customerId ||
            linenData.customerId === formData.customerId;

          // Add to valid EPCs set
          setValidEpcs(prev => new Set([...prev, epc]));

          // EPC exists in API - add it to the table
          setLinens((prev) => {
            const emptyRowIndex = prev.findIndex(
              (linen) => linen.epc.trim() === ""
            );

            if (emptyRowIndex !== -1) {
              // Use existing empty row
              return prev.map((linen, i) =>
                i === emptyRowIndex
                  ? {
                      ...linen,
                      epc: linenData.epc,
                      customerId: linenData.customerId,
                      customerName: linenData.customerName,
                      linenId: linenData.linenId,
                      linenTypeName: linenData.linenTypeName,
                      linenName: linenData.linenName,
                      roomId: linenData.roomId,
                      roomName: linenData.roomName,
                      statusId: linenData.statusId,
                      status: linenData.status,
                      loading: false,
                      isValidCustomer: isValidCustomer,
                      errorMessage: !isValidCustomer
                        ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                        : null,
                    }
                  : linen
              );
            } else {
              // Create new row
              return [
                ...prev,
                {
                  epc: linenData.epc,
                  customerId: linenData.customerId,
                  customerName: linenData.customerName,
                  linenId: linenData.linenId,
                  linenTypeName: linenData.linenTypeName,
                  linenName: linenData.linenName,
                  roomId: linenData.roomId,
                  roomName: linenData.roomName,
                  statusId: linenData.statusId,
                  status: linenData.status,
                  status_id: linenData.statusId || 1,
                  loading: false,
                  isValidCustomer: isValidCustomer,
                  errorMessage: !isValidCustomer
                    ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                    : null,
                },
              ];
            }
          });
        } else {
          // EPC not found in API - add to cache but don't show in table
          console.log(`EPC ${epc} tidak ditemukan di API, ditambahkan ke cache`);
          setNonExistentEpcs(prev => new Set([...prev, epc]));
        }
      } else {
        console.error("Failed to fetch linen data for EPC:", epc);
        // Add to cache on API error
        setNonExistentEpcs(prev => new Set([...prev, epc]));
      }
    } catch (error) {
      console.error("Error fetching linen data:", error);
      // Add to cache on error
      setNonExistentEpcs(prev => new Set([...prev, epc]));
    }
  };

  const fetchLinenDataAndCheck = async (epc, index) => {
    if (!epc.trim()) return;

    // This function is now mainly used for manual EPC input
    // For RFID scanning, we use checkEPCAndAddToTable instead
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Process/linen_rfid?epc=${encodeURIComponent(epc)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          const linenData = result.data[0];

          // Check if the linen belongs to the selected customer
          const isValidCustomer =
            !formData.customerId ||
            linenData.customerId === formData.customerId;

          // Add to valid EPCs set
          setValidEpcs(prev => new Set([...prev, epc]));

          // Update the specific linen row with fetched data
          setLinens((prev) =>
            prev.map((linen, i) =>
              i === index
                ? {
                    ...linen,
                    epc: linenData.epc,
                    customerId: linenData.customerId,
                    customerName: linenData.customerName,
                    linenId: linenData.linenId,
                    linenTypeName: linenData.linenTypeName,
                    linenName: linenData.linenName,
                    roomId: linenData.roomId,
                    roomName: linenData.roomName,
                    statusId: linenData.statusId,
                    status: linenData.status,
                    loading: false,
                    isValidCustomer: isValidCustomer,
                    errorMessage: !isValidCustomer
                      ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                      : null,
                  }
                : linen
            )
          );
        } else {
          // EPC not found in API - add to cache and remove the row
          console.log(`EPC ${epc} tidak ditemukan di API, menambahkan ke cache dan menghapus baris`);
          setNonExistentEpcs(prev => new Set([...prev, epc]));

          setLinens((prev) => {
            const filtered = prev.filter((_, i) => i !== index);
            // Ensure at least one empty row remains
            return filtered.length > 0
              ? filtered
              : [
                  {
                    epc: "",
                    status_id: 1,
                    loading: false,
                    isValidCustomer: true,
                  },
                ];
          });

          // Remove from processed tags so it can be scanned again if needed
          setProcessedTags((prev) => {
            const newSet = new Set(prev);
            newSet.delete(epc);
            return newSet;
          });
        }
      } else {
        console.error("Failed to fetch linen data for EPC:", epc);
        // Add to cache on API error and remove the row
        setNonExistentEpcs(prev => new Set([...prev, epc]));

        setLinens((prev) => {
          const filtered = prev.filter((_, i) => i !== index);
          return filtered.length > 0
            ? filtered
            : [
                {
                  epc: "",
                  status_id: 1,
                  loading: false,
                  isValidCustomer: true,
                },
              ];
        });

        setProcessedTags((prev) => {
          const newSet = new Set(prev);
          newSet.delete(epc);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error fetching linen data:", error);
      // Add to cache on error and remove the row
      setNonExistentEpcs(prev => new Set([...prev, epc]));

      setLinens((prev) => {
        const filtered = prev.filter((_, i) => i !== index);
        return filtered.length > 0
          ? filtered
          : [{ epc: "", status_id: 1, loading: false, isValidCustomer: true }];
      });

      setProcessedTags((prev) => {
        const newSet = new Set(prev);
        newSet.delete(epc);
        return newSet;
      });
    }
  };

  const fetchLinenData = async (epc, index) => {
    if (!epc.trim()) return;

    setLinens((prev) =>
      prev.map((linen, i) =>
        i === index ? { ...linen, loading: true } : linen
      )
    );

    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Process/linen_rfid?epc=${encodeURIComponent(epc)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          const linenData = result.data[0];

          // Check if the linen belongs to the selected customer
          const isValidCustomer =
            !formData.customerId ||
            linenData.customerId === formData.customerId;

          // Update the specific linen row with fetched data
          setLinens((prev) =>
            prev.map((linen, i) =>
              i === index
                ? {
                    ...linen,
                    epc: linenData.epc,
                    customerId: linenData.customerId,
                    customerName: linenData.customerName,
                    linenId: linenData.linenId,
                    linenTypeName: linenData.linenTypeName,
                    linenName: linenData.linenName,
                    roomId: linenData.roomId,
                    roomName: linenData.roomName,
                    statusId: linenData.statusId,
                    status: linenData.status,
                    loading: false,
                    isValidCustomer: isValidCustomer,
                    errorMessage: !isValidCustomer
                      ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                      : null,
                  }
                : linen
            )
          );
        } else {
          // No data found for this EPC - remove the row
          setLinens((prev) => {
            const filtered = prev.filter((_, i) => i !== index);
            return filtered.length > 0
              ? filtered
              : [
                  {
                    epc: "",
                    status_id: 1,
                    loading: false,
                    isValidCustomer: true,
                  },
                ];
          });
        }
      } else {
        console.error("Failed to fetch linen data for EPC:", epc);
        setLinens((prev) =>
          prev.map((linen, i) =>
            i === index
              ? {
                  ...linen,
                  loading: false,
                  status: "Error fetching data",
                  isValidCustomer: false,
                  errorMessage: "Error fetching data",
                }
              : linen
          )
        );
      }
    } catch (error) {
      console.error("Error fetching linen data:", error);
      setLinens((prev) =>
        prev.map((linen, i) =>
          i === index
            ? {
                ...linen,
                loading: false,
                status: "Error fetching data",
                isValidCustomer: false,
                errorMessage: "Error fetching data",
              }
            : linen
        )
      );
    }
  };

  // Re-validate all linens when customer changes
  const revalidateLinens = async (newCustomerId) => {
    if (!newCustomerId) {
      // If no customer selected, mark all as valid
      setLinens((prev) =>
        prev.map((linen) => ({
          ...linen,
          isValidCustomer: true,
          errorMessage: null,
        }))
      );
      return;
    }

    const updatedLinens = linens.map((linen) => {
      if (linen.epc && linen.customerId) {
        const isValid = linen.customerId === newCustomerId;
        return {
          ...linen,
          isValidCustomer: isValid,
          errorMessage: !isValid
            ? `Tag milik ${linen.customerName} (${linen.customerId})`
            : null,
        };
      }
      return linen;
    });

    setLinens(updatedLinens);
  };

  useEffect(() => {
    fetchCustomers();
    // Initialize printer setup
    setupZebraPrinter();
  }, []);

  useEffect(() => {
    if (deliveryTags && deliveryTags.length > 0) {
      const latestTag = deliveryTags[deliveryTags.length - 1];
      if (latestTag && latestTag.EPC && !processedTags.has(latestTag.EPC)) {
        setProcessedTags((prev) => new Set([...prev, latestTag.EPC]));

        const existingIndex = linens.findIndex(
          (linen) => linen.epc === latestTag.EPC
        );

        if (existingIndex === -1) {
          // Check API first in background before adding to table
          checkEPCAndAddToTable(latestTag.EPC);
        } else {
          console.log(
            `EPC ${latestTag.EPC} sudah ada di baris ${existingIndex + 1}`
          );
        }
      }
    }
  }, [deliveryTags, processedTags, linens]);

  useEffect(() => {
    const validLinens = linens.filter((linen) => linen.epc?.trim());
    setFormData((prev) => ({
      ...prev,
      qty: validLinens.length,
    }));
  }, [linens]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLinenChange = (index, field, value) => {
    const updatedLinens = [...linens];

    if (field === "epc") {
      updatedLinens[index][field] = value;
      // Clear previous data when EPC changes
      updatedLinens[index].status = "";
      updatedLinens[index].linenName = "";
      updatedLinens[index].roomName = "";
      updatedLinens[index].loading = false;
      updatedLinens[index].isValidCustomer = true;
      updatedLinens[index].errorMessage = null;

      if (value.trim()) {
        fetchLinenData(value.trim(), index);
      }
    } else if (field === "status_id") {
      updatedLinens[index][field] = parseInt(value);
    } else {
      updatedLinens[index][field] = value;
    }

    setLinens(updatedLinens);
  };

  const addLinenRow = () => {
    setLinens([
      ...linens,
      { epc: "", status_id: 1, loading: false, isValidCustomer: true },
    ]);
  };

  const removeLinenRow = (index) => {
    if (linens.length > 1) {
      const removedLinen = linens[index];
      // Remove EPC from processed tags if it's being deleted
      if (removedLinen.epc) {
        setProcessedTags((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });
        setValidEpcs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });
      }

      const updatedLinens = linens.filter((_, i) => i !== index);
      setLinens(updatedLinens);
    }
  };

  // Clear all EPCs and reset processed tags
  const clearAllEPCs = () => {
    setLinens([
      { epc: "", status_id: 1, loading: false, isValidCustomer: true },
    ]);
    setProcessedTags(new Set());
    setValidEpcs(new Set());
    setNonExistentEpcs(new Set());

    // Also clear form data if needed
    setFormData(prev => ({
      ...prev,
      qty: 0, // Reset quantity to 0 since no linens
    }));
  };

  // Alternative clear function that clears tags state
  const clearTags = () => {
    clearAllEPCs();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      alert("Pilih customer terlebih dahulu!");
      return;
    }

    if (!formData.driverName.trim()) {
      alert("Nama driver tidak boleh kosong!");
      return;
    }

    if (!formData.plateNumber.trim()) {
      alert("Nomor plat tidak boleh kosong!");
      return;
    }

    // Check for invalid customer tags
    const invalidTags = linens.filter(
      (linen) => linen.epc?.trim() && linen.isValidCustomer === false
    );

    if (invalidTags.length > 0) {
      const invalidEPCs = invalidTags.map((tag) => tag.epc).join(", ");
      alert(
        `Tidak dapat memproses! Ada ${invalidTags.length} tag yang tidak sesuai dengan customer: ${invalidEPCs}`
      );
      return;
    }

    try {
      // Ambil token
      const token = await window.authAPI.getToken();

      // Filter linen yang valid (harus ada EPC dan customer valid)
      const validLinens = linens.filter(
        (linen) => linen.epc?.trim() && linen.isValidCustomer !== false
      );

      if (validLinens.length === 0) {
        alert("Minimal harus ada 1 EPC linen yang valid!");
        return;
      }

      // Buat payload
      const payload = {
        customerId: formData.customerId,
        qty: validLinens.length,
        driverName: formData.driverName,
        plateNumber: formData.plateNumber,
        linens: validLinens.map((linen) => ({
          epc: linen.epc,
          status_id: linen.statusId || 1,
        })),
      };

      console.log("Payload dikirim:", payload);

      // Kirim request POST
      const response = await fetch(`${baseUrl}/Process/delivery`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Request failed: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log("Response dari API:", result);

      // Reset form after success
      setFormData({
        customerId: "",
        customerName: "",
        qty: 0,
        driverName: "",
        plateNumber: "",
      });
      setLinens([
        { epc: "", status_id: 1, loading: false, isValidCustomer: true },
      ]);
      setProcessedTags(new Set());
      setValidEpcs(new Set());
      setNonExistentEpcs(new Set());

      // Stop scanning if active
      if (isDeliveryActive) {
        stopDelivery();
      }

      alert("Proses delivery berhasil!");
    } catch (error) {
      console.error("Error submit:", error);
      alert(`Gagal proses delivery: ${error.message}`);
    }
  };

  const handleToggleScan = () => {
    if (!isRfidAvailable) {
      alert("Device belum terkoneksi!");
      return;
    }

    if (isDeliveryActive) {
      stopDelivery();
    } else {
      startDelivery();
    }
  };

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-50 border-gray-300 text-gray-700";

    switch (status.toLowerCase()) {
      case "bersih":
        return "bg-green-50 border-green-300 text-green-700";
      case "kotor":
        return "bg-yellow-50 border-yellow-300 text-yellow-700";
      case "rusak":
        return "bg-red-50 border-red-300 text-red-700";
      case "hilang":
        return "bg-red-50 border-red-300 text-red-700";
      case "siap kirim":
        return "bg-blue-50 border-blue-300 text-blue-700";
      default:
        return "bg-gray-50 border-gray-300 text-gray-700";
    }
  };

  const getRowColor = (linen) => {
    if (linen.isValidCustomer === false) {
      return "bg-red-50 border-red-200";
    }
    if (linen.epc) {
      return "bg-green-50";
    }
    return "hover:bg-gray-50";
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          {/* Customer and Delivery Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Customer <span className="text-red-500">*</span>
              </label>
              <Select
                value={
                  formData.customerId
                    ? customers.find((c) => c.customerId === formData.customerId)
                    : null
                }
                onChange={(selected) => {
                  const newFormData = {
                    ...formData,
                    customerId: selected?.customerId || "",
                    customerName: selected?.customerName || "",
                  };
                  setFormData(newFormData);

                  // Re-validate all existing linens
                  revalidateLinens(selected?.customerId || "");
                }}
                options={customers}
                getOptionLabel={(customer) =>
                  `${customer.customerName} (${customer.customerCity})`
                }
                getOptionValue={(customer) => customer.customerId}
                placeholder="Cari customer..."
                isClearable
                isSearchable
                isLoading={loadingCustomers}
                noOptionsMessage={() => "Customer tidak ditemukan"}
                className="w-full"
                classNamePrefix="react-select"
                styles={{
                  control: (baseStyles, state) => ({
                    ...baseStyles,
                    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                    fontSize: '14px',
                    minHeight: '38px',
                  }),
                  option: (baseStyles) => ({
                    ...baseStyles,
                    fontSize: '14px',
                  }),
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Linen
              </label>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          {/* Driver Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Driver <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="driverName"
                value={formData.driverName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Masukkan nama driver"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Polisi <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Masukkan nomor plat kendaraan"
              />
            </div>
          </div>

          {/* Linen Table Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Data Linen (EPC & Status)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearTags}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
                  title="Hapus semua EPC untuk scan ulang"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <button
                type="button"
                onClick={handleToggleScan}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
                  !isRfidAvailable
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isDeliveryActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:bg-blue-700"
                }`}
                disabled={!isRfidAvailable}
              >
                {isDeliveryActive ? (
                  <>
                    <Square size={16} />
                    Stop Scan
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Start Scan
                  </>
                )}
              </button>
            </div>

            {/* Warning message for invalid customers */}
            {formData.customerId &&
              linens.filter((l) => l.isValidCustomer === false).length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    ⚠️ Terdapat{" "}
                    {linens.filter((l) => l.isValidCustomer === false).length}{" "}
                    tag yang tidak sesuai dengan customer yang dipilih. Tag
                    tersebut tidak akan diproses saat submit.
                  </p>
                </div>
              )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      EPC
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Customer Info
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linens.map((linen, index) => (
                    <tr
                      key={index}
                      className={`${getRowColor(
                        linen
                      )} transition-colors duration-200`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 border-b">
                        {index + 1}
                        {linen.epc && (
                          <span className="ml-2 text-xs text-green-600">
                            ✓ Scanned
                          </span>
                        )}
                        {linen.isValidCustomer === false && (
                          <span className="ml-2 text-xs text-red-600">
                            ✗ Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        <input
                          type="text"
                          value={linen.epc}
                          readOnly
                          placeholder="Auto-filled dari scan RFID"
                          className={`w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-gray-50 ${
                            linen.isValidCustomer === false
                              ? "border-red-300 bg-red-50"
                              : linen.epc
                              ? "bg-green-50 border-green-300"
                              : "border-gray-300"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 border-b">
                        {linen.loading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-xs text-gray-500">
                              Loading...
                            </span>
                          </div>
                        ) : (
                          <div
                            className={`px-2 py-1 rounded text-xs font-medium text-center ${getStatusColor(
                              linen.status
                            )}`}
                          >
                            {linen.status || "Unknown"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        {linen.isValidCustomer === false &&
                        linen.errorMessage ? (
                          <div className="text-xs text-red-600">
                            {linen.errorMessage}
                          </div>
                        ) : linen.customerName ? (
                          <div className="text-xs text-green-600">
                            {linen.customerName}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">-</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <button
              onClick={handleSubmit}
              disabled={
                !formData.customerId ||
                !formData.driverName.trim() ||
                !formData.plateNumber.trim() ||
                linens.filter(
                  (l) => l.epc.trim() && l.isValidCustomer !== false
                ).length === 0
              }
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                !formData.customerId ||
                !formData.driverName.trim() ||
                !formData.plateNumber.trim() ||
                linens.filter(
                  (l) => l.epc.trim() && l.isValidCustomer !== false
                ).length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-blue-400 text-white"
              }`}
            >
              <Truck size={16} />
              Proses Delivery (
              {
                linens.filter(
                  (l) => l.epc.trim() && l.isValidCustomer !== false
                ).length
              }{" "}
              valid items)
            </button>
          </div>
        </div>
      </div>

      {/* Print Modal */}
      {showPrintModal && selectedLinenForPrint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Print Delivery Label</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Printer Status */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Printer Status:</span>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
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
                <div className="text-xs text-gray-600">{printerMessage}</div>
              </div>
            </div>

            {/* Label Preview */}
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Label Preview:</h4>
              <div className="border border-gray-200 rounded p-3 bg-gray-50 text-xs">
                <div className="space-y-1">
                  <div>
                    <strong>Customer:</strong> {formData.customerName || "-"}
                  </div>
                  <div>
                    <strong>Driver:</strong> {formData.driverName || "-"}
                  </div>
                  <div>
                    <strong>Plate:</strong> {formData.plateNumber || "-"}
                  </div>
                  <div>
                    <strong>Linen Type:</strong>{" "}
                    {selectedLinenForPrint.linenTypeName || "-"}
                  </div>
                  <div>
                    <strong>Room:</strong>{" "}
                    {selectedLinenForPrint.roomName || "-"}
                  </div>
                  <div>
                    <strong>EPC:</strong> {selectedLinenForPrint.epc}
                  </div>
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {printError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
                <AlertCircle className="mr-2" size={16} />
                {printError}
              </div>
            )}

            {lastPrintTime && printerStatus === "success" && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center">
                <CheckCircle className="mr-2" size={16} />
                Label printed successfully at{" "}
                {lastPrintTime.toLocaleTimeString()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => printDeliveryLabel(selectedLinenForPrint)}
                disabled={printerStatus === "printing"}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                  printerStatus === "printing"
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : printerStatus === "success"
                    ? "bg-green-500 text-white"
                    : printerStatus === "error"
                    ? "bg-red-500 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <Printer size={16} />
                {printerStatus === "printing"
                  ? "Printing..."
                  : printerStatus === "success"
                  ? "Printed!"
                  : printerStatus === "error"
                  ? "Print Failed"
                  : "Print Label"}
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPage;
