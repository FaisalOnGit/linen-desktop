import React, { useState, useEffect } from "react";
import { Play, Plus, Trash2, Square } from "lucide-react";
import Select from "react-select";

const LinenCleanPage = ({ rfidHook }) => {
  const {
    linenBersihTags = [],
    startLinenBersih,
    stopLinenBersih,
    isLinenBersihActive = false,
    isRfidAvailable = false,
  } = rfidHook || {};

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    linenQty: 0,
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

  const fetchLinenDataByCustomer = async (customerId) => {
    if (!customerId) return;

    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Process/linen_rfid?customerId=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.data || [];
      }
    } catch (error) {
      console.error("Error fetching customer linen data:", error);
    }
    return [];
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
  }, []);

  useEffect(() => {
    if (linenBersihTags && linenBersihTags.length > 0) {
      const latestTag = linenBersihTags[linenBersihTags.length - 1];

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
  }, [linenBersihTags]);

  useEffect(() => {
    const validLinens = linens.filter((linen) => linen.epc?.trim());
    setFormData((prev) => ({
      ...prev,
      linenQty: validLinens.length,
    }));
  }, [linens.length]); // Optimize to only run when linen count changes

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      alert("Pilih customer terlebih dahulu!");
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
        linenQty: validLinens.length,
        linens: validLinens.map((linen) => ({
          epc: linen.epc,
          status_id: linen.statusId || 1,
        })),
      };

      console.log("Payload dikirim:", payload);

      // Kirim request POST
      const response = await fetch(`${baseUrl}/Process/linen_clean`, {
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
        linenQty: 0,
      });
      setLinens([
        { epc: "", status_id: 1, loading: false, isValidCustomer: true },
      ]);
      setProcessedTags(new Set());
      setValidEpcs(new Set());
      setNonExistentEpcs(new Set());

      // Stop scanning if active
      if (isLinenBersihActive) {
        stopLinenBersih();
      }

      alert("Proses linen bersih berhasil!");
    } catch (error) {
      console.error("Error submit:", error);
      alert(`Gagal proses linen bersih: ${error.message}`);
    }
  };

  const handleToggleScan = () => {
    if (!isRfidAvailable) {
      alert("Device belum terkoneksi!");
      return;
    }

    if (isLinenBersihActive) {
      stopLinenBersih();
    } else {
      startLinenBersih();
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
                name="linenQty"
                value={formData.linenQty}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder="Auto-calculated"
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
                  onClick={clearAllEPCs}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
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
                    : isLinenBersihActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:bg-blue-700"
                }`}
                disabled={!isRfidAvailable}
              >
                {isLinenBersihActive ? (
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
                linens.filter(
                  (l) => l.epc.trim() && l.isValidCustomer !== false
                ).length === 0
              }
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                !formData.customerId ||
                linens.filter(
                  (l) => l.epc.trim() && l.isValidCustomer !== false
                ).length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-primary hover:bg-blue-400 text-white"
              }`}
            >
              Proses Linen Bersih (
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
    </div>
  );
};

export default LinenCleanPage;
