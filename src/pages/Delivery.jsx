import React, { useState, useEffect } from "react";
import { Play, Plus, Trash2, Square, Truck, User, Car } from "lucide-react";
import Select from "react-select";
import toast from "react-hot-toast";

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
  const baseUrl = import.meta.env.VITE_BASE_URL;

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

  // Simplified function - adds EPC directly without API validation
  const checkEPCAndAddToTable = async (epc) => {
    if (!epc.trim()) return;

    console.log(`📡 Processing EPC: ${epc} (NO VALIDATION - Direct Add)`);

    // Add EPC directly to table without API validation
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
                epc: epc,
                loading: false,
              }
            : linen
        );
      } else {
        // Create new row
        return [
          ...prev,
          {
            epc: epc,
            status_id: 1,
            loading: false,
          },
        ];
      }
    });

    console.log(`✅ EPC ${epc} berhasil ditambahkan ke tabel (tanpa validasi API)`);
  };

  useEffect(() => {
    fetchCustomers();
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
          // Add directly without API validation
          checkEPCAndAddToTable(latestTag.EPC);
        } else {
          console.log(
            `EPC ${latestTag.EPC} sudah ada di baris ${existingIndex + 1}`
          );
        }
      }
    }
  }, [deliveryTags]);

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

  const addLinenRow = () => {
    setLinens([
      ...linens,
      { epc: "", status_id: 1, loading: false },
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
      }
      const updatedLinens = linens.filter((_, i) => i !== index);
      setLinens(updatedLinens);
    }
  };

  // Clear all EPCs and reset processed tags
  const clearAllEPCs = () => {
    setLinens([
      { epc: "", status_id: 1, loading: false },
    ]);
    setProcessedTags(new Set());

    // Reset all form data to initial state
    setFormData({
      customerId: "",
      customerName: "",
      qty: 0,
      driverName: "",
      plateNumber: "",
    });
  };

  // Alternative clear function that clears tags state using RFID hook
  const clearTags = () => {
    // Use the RFID hook's clearTags function if available
    if (rfidHook && rfidHook.clearTags) {
      try {
        rfidHook.clearTags();
        console.log("🧹 Tags cleared using RFID hook in DeliveryPage");
      } catch (err) {
        console.error("Error clearing tags via RFID hook:", err);
        // Fallback to local clear
        clearAllEPCs();
      }
    } else {
      // Fallback to local clear if RFID hook is not available
      clearAllEPCs();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error("Pilih customer terlebih dahulu!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    if (!formData.driverName.trim()) {
      toast.error("Nama driver tidak boleh kosong!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    if (!formData.plateNumber.trim()) {
      toast.error("Nomor plat tidak boleh kosong!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    try {
      // Ambil token
      const token = await window.authAPI.getToken();

      // Filter linen yang valid (harus ada EPC)
      const validLinens = linens.filter(
        (linen) => linen.epc?.trim()
      );

      if (validLinens.length === 0) {
        toast.error("Minimal harus ada 1 EPC linen!", {
          duration: 3000,
          icon: "⚠️",
        });
        return;
      }

      // Buat payload untuk delivery
      const payload = {
        customerId: formData.customerId,
        qty: validLinens.length,
        driverName: formData.driverName,
        plateNumber: formData.plateNumber,
        linens: validLinens.map((linen) => ({
          epc: linen.epc,
          status_id: linen.status_id || 1,
        })),
      };

      console.log("Payload dikirim:", payload);

      // Kirim request POST ke endpoint delivery
      const response = await fetch(`${baseUrl}/Process/Delivery`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("Response dari API:", result);

      if (!response.ok) {
        // Get error message from API or use default message
        const errorMessage =
          result.message || `Request failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      // Get message from API or use default message
      const successMessage = result.message || "Proses delivery berhasil!";

      // Reset form after success
      setFormData({
        customerId: "",
        customerName: "",
        qty: 0,
        driverName: "",
        plateNumber: "",
      });
      setLinens([
        { epc: "", status_id: 1, loading: false },
      ]);
      setProcessedTags(new Set());

      // Stop scanning if active
      if (isDeliveryActive) {
        stopDelivery();
      }

      toast.success(successMessage, {
        duration: 4000,
        icon: "✅",
      });
    } catch (error) {
      console.error("Error submit:", error);
      // Display error message from API or use default error message
      const errorMessage = error.message || "Gagal proses delivery, coba lagi!";
      toast.error(errorMessage, {
        duration: 4000,
        icon: "❌",
      });
    }
  };

  const handleToggleScan = () => {
    if (!isRfidAvailable) {
      toast.error("Device belum terkoneksi!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    if (isDeliveryActive) {
      stopDelivery();
    } else {
      startDelivery();
    }
  };

  const getRowColor = (linen) => {
    if (linen.epc) {
      return "bg-green-50";
    }
    return "hover:bg-gray-50";
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Customer <span className="text-red-500">*</span>
              </label>
              <Select
                value={
                  formData.customerId
                    ? customers.find(
                        (c) => c.customerId === formData.customerId
                      )
                    : null
                }
                onChange={(selected) => {
                  const newFormData = {
                    ...formData,
                    customerId: selected?.customerId || "",
                    customerName: selected?.customerName || "",
                  };
                  setFormData(newFormData);
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
                    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
                    boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                    fontSize: "14px",
                    minHeight: "38px",
                  }),
                  option: (baseStyles) => ({
                    ...baseStyles,
                    fontSize: "14px",
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
                <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  No API Validation
                </span>
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linens.map((linen, index) => (
                    <tr
                      key={index}
                      className={`${getRowColor(linen)} transition-colors duration-200`}
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
                        <input
                          type="text"
                          value={linen.epc}
                          readOnly
                          placeholder="Auto-filled dari scan RFID"
                          className={`w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-gray-50 ${
                            linen.epc
                              ? "bg-green-50 border-green-300"
                              : "border-gray-300"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 border-b">
                        <select
                          value={linen.status_id || 1}
                          onChange={(e) => {
                            const updatedLinens = [...linens];
                            updatedLinens[index].status_id = parseInt(e.target.value);
                            setLinens(updatedLinens);
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                        >
                          <option value={1}>Bersih</option>
                          <option value={2}>Kotor</option>
                          <option value={3}>Rusak</option>
                          <option value={4}>Hilang</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => removeLinenRow(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="Hapus baris"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
                linens.filter((l) => l.epc.trim()).length === 0
              }
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                !formData.customerId ||
                !formData.driverName.trim() ||
                !formData.plateNumber.trim() ||
                linens.filter((l) => l.epc.trim()).length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-blue-400 text-white"
              }`}
            >
              <Truck size={16} />
              Proses Delivery (
              {linens.filter((l) => l.epc.trim()).length} items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPage;