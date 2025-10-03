import React, { useState, useEffect } from "react";
import { Play, Plus, Trash2, Square } from "lucide-react";

const RegisterPage = ({ rfidHook }) => {
  const {
    registerTags = [],
    startRegister,
    stopRegister,
    isRegisterActive = false,
    isRfidAvailable = false,
  } = rfidHook || {};

  useEffect(() => {
    console.log("rfidHook:", rfidHook);
    console.log("registerTags:", registerTags);
  }, [rfidHook, registerTags]);

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    linenId: "",
    rfidRegisterDescription: "",
  });

  const [customers, setCustomers] = useState([]);
  const [rooms, setRooms] = useState([]); // State untuk menyimpan data room
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false); // State untuk loading rooms
  const [linenOptions, setLinenOptions] = useState([]);
  const [loadingLinens, setLoadingLinens] = useState(false);

  const [linens, setLinens] = useState([{ linenId: "", epc: "", roomId: "" }]);
  const [processedTags, setProcessedTags] = useState(new Set());
  const [validEpcs, setValidEpcs] = useState(new Set());
  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Fungsi untuk fetch customers
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

  // Fungsi untuk fetch rooms berdasarkan customerId
  const fetchRooms = async (customerId) => {
    if (!customerId) {
      setRooms([]);
      return;
    }

    setLoadingRooms(true);
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Master/room?customerId=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setRooms(result.data || []);
      } else {
        console.error("Failed to fetch rooms");
        setRooms([]);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const fetchLinens = async (searchTerm = "") => {
    setLoadingLinens(true);
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(`${baseUrl}/Master/linen`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        let linensData = result.data || [];

        if (searchTerm.trim()) {
          linensData = linensData.filter(
            (linen) =>
              linen.linenName
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              linen.linenId.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        setLinenOptions(linensData);
      } else {
        console.error("Failed to fetch linens");
        setLinenOptions([]);
      }
    } catch (error) {
      console.error("Error fetching linens:", error);
      setLinenOptions([]);
    } finally {
      setLoadingLinens(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchLinens();
  }, []);

  // Effect untuk fetch rooms ketika customerId berubah
  useEffect(() => {
    if (formData.customerId) {
      fetchRooms(formData.customerId);
    } else {
      setRooms([]);
    }
  }, [formData.customerId]);

  useEffect(() => {
    if (registerTags && registerTags.length > 0) {
      const latestTag = registerTags[registerTags.length - 1];
      if (latestTag && latestTag.EPC && !processedTags.has(latestTag.EPC)) {
        // Mark this EPC as processed
        setProcessedTags((prev) => new Set([...prev, latestTag.EPC]));

        // Check if EPC already exists in current linens
        const existingIndex = linens.findIndex(
          (linen) => linen.epc === latestTag.EPC
        );

        if (existingIndex === -1) {
          // Add to valid EPCs set (RegisterPage menerima semua EPC)
          setValidEpcs((prev) => new Set([...prev, latestTag.EPC]));

          // EPC doesn't exist, find first empty row or add new row
          const emptyRowIndex = linens.findIndex(
            (linen) => linen.epc.trim() === ""
          );

          if (emptyRowIndex !== -1) {
            // Fill empty row
            handleLinenChange(emptyRowIndex, "epc", latestTag.EPC);
          } else {
            // No empty row found, add new row with EPC
            setLinens((prev) => [
              ...prev,
              { linenId: "", epc: latestTag.EPC, roomId: "" },
            ]);
          }
        } else {
          // EPC already exists, just update it (in case of re-scan)
          console.log(
            `EPC ${latestTag.EPC} sudah ada di baris ${existingIndex + 1}`
          );
        }
      }
    }
  }, [registerTags]); // Simplified dependencies

  useEffect(() => {
    if (!isRegisterActive) {
    }
  }, [isRegisterActive]);

  const handleCustomerSearch = (value) => {
    setCustomerSearchTerm(value);
    setFormData({ ...formData, customerName: value, customerId: "" });
    setShowCustomerDropdown(true);

    const timeoutId = setTimeout(() => {
      fetchCustomers(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const selectCustomer = (customer) => {
    setFormData({
      ...formData,
      customerId: customer.customerId,
      customerName: customer.customerName,
    });
    setCustomerSearchTerm(customer.customerName);
    setShowCustomerDropdown(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "customerName") {
      handleCustomerSearch(value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleLinenChange = (index, field, value) => {
    const updatedLinens = [...linens];
    updatedLinens[index][field] = value;
    setLinens(updatedLinens);
  };

  const addLinenRow = () => {
    setLinens([...linens, { linenId: "", epc: "", roomId: "" }]);
  };

  const removeLinenRow = (index) => {
    if (linens.length > 1) {
      const removedLinen = linens[index];
      if (removedLinen.epc) {
        setProcessedTags((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });
      }

      const updatedLinens = linens.filter((_, i) => i !== index);
      setLinens(updatedLinens);
    }
  };

  const clearAllEPCs = () => {
    setLinens([{ linenId: "", epc: "", roomId: "" }]);
    setProcessedTags(new Set());
    setValidEpcs(new Set());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Ambil token
      const token = await window.authAPI.getToken();

      // Filter linen yang valid
      const validLinens = linens.filter(
        (linen) =>
          linen.linenId?.trim() || linen.epc?.trim() || linen.roomId?.trim()
      );

      // Buat payload
      const payload = {
        customerId: formData.customerId,
        rfidRegisterDescription: formData.rfidRegisterDescription,
        locationId: "LOC001",
        linens: validLinens,
      };

      console.log("Payload dikirim:", payload);

      // Kirim request POST
      const response = await fetch(`${baseUrl}/Process/register_rfid`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Response dari API:", result);

      // Reset form after success
      setFormData({
        customerId: "",
        customerName: "",
        linenId: "",
        rfidRegisterDescription: "",
      });
      setLinens([{ linenId: "", epc: "", roomId: "" }]);
      setProcessedTags(new Set());
      setValidEpcs(new Set());

      // Stop scanning if active
      if (isRegisterActive) {
        stopRegister();
      }

      alert("Registrasi RFID berhasil!");
    } catch (error) {
      console.error("Error submit:", error);
      alert("Gagal registrasi RFID, coba lagi!");
    }
  };

  const handleToggleScan = () => {
    if (!isRfidAvailable) {
      alert("Device belum terkoneksi!");
      return;
    }

    if (isRegisterActive) {
      stopRegister();
    } else {
      startRegister();
    }
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6 font-poppins">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Customer
              </label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={(e) => {
                  const selected = customers.find(
                    (c) => c.customerId === e.target.value
                  );
                  setFormData({
                    ...formData,
                    customerId: selected?.customerId || "",
                    customerName: selected?.customerName || "",
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map((customer) => (
                  <option key={customer.customerId} value={customer.customerId}>
                    {customer.customerName} ({customer.customerCity})
                  </option>
                ))}
              </select>

              {loadingCustomers && (
                <p className="text-xs text-gray-500 mt-1">
                  Loading customer...
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                RFID Register Description
              </label>
              <textarea
                name="rfidRegisterDescription"
                value={formData.rfidRegisterDescription}
                onChange={handleChange}
                placeholder="Deskripsi registrasi RFID"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent h-[100px]"
              ></textarea>
            </div>
          </div>

          {/* Linen Table Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Data Linen (EPC & Room ID)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addLinenRow}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
                >
                  <Plus size={14} />
                  <span>Tambah Baris</span>
                </button>
                <button
                  type="button"
                  onClick={clearAllEPCs}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            <div className="mb-4 flex gap-4 flex-wrap">
              <button
                type="button"
                onClick={handleToggleScan}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
                  !isRfidAvailable
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isRegisterActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:bg-blue-700"
                }`}
                disabled={!isRfidAvailable}
              >
                {isRegisterActive ? (
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

              <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-lg">
                <span className="text-sm text-blue-700 font-medium">
                  Total Rows: {linens.length}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-lg">
                <span className="text-sm text-green-700 font-medium">
                  Filled EPCs: {linens.filter((l) => l.epc.trim()).length}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Linen
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      EPC
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Room ID
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linens.map((linen, index) => (
                    <tr
                      key={index}
                      className={`${
                        linen.epc ? "bg-green-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 border-b">
                        {index + 1}
                        {linen.epc && (
                          <span className="ml-2 text-xs text-green-600">
                            ✓ Scanned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 border-b">
                        <select
                          value={linen.linenId}
                          onChange={(e) =>
                            handleLinenChange(index, "linenId", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                        >
                          <option value="">-- Pilih Linen --</option>
                          {linenOptions.map((linen) => (
                            <option key={linen.linenId} value={linen.linenId}>
                              {linen.linenName} ({linen.linenTypeName})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <input
                          type="text"
                          value={linen.epc}
                          onChange={(e) =>
                            handleLinenChange(index, "epc", e.target.value)
                          }
                          placeholder="Auto-filled dari scan / manual input"
                          className={`w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent ${
                            linen.epc ? "bg-green-50 border-green-300" : ""
                          }`}
                          readOnly={linen.epc && processedTags.has(linen.epc)}
                        />
                      </td>
                      <td className="px-4 py-3 border-b">
                        <select
                          value={linen.roomId}
                          onChange={(e) =>
                            handleLinenChange(index, "roomId", e.target.value)
                          }
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                        >
                          <option value="">-- Pilih Room --</option>
                          {rooms.map((room) => (
                            <option key={room.roomId} value={room.roomId}>
                              {room.roomName} ({room.roomId})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center border-b">
                        {linens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLinenRow(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Hapus baris"
                          >
                            <Trash2 size={16} />
                          </button>
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
              className="w-full bg-primary hover:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium"
            >
              Register Linen (
              {
                linens.filter(
                  (l) => l.linenId.trim() || l.epc.trim() || l.roomId.trim()
                ).length
              }{" "}
              items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
