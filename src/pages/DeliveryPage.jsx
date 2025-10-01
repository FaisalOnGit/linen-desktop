import React, { useState, useEffect } from "react";
import { Play, Plus, Trash2, Square, Truck } from "lucide-react";

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
          // No data found for this EPC
          setLinens((prev) =>
            prev.map((linen, i) =>
              i === index
                ? {
                    ...linen,
                    loading: false,
                    status: "Data tidak ditemukan",
                    isValidCustomer: false,
                    errorMessage: "Data tidak ditemukan",
                  }
                : linen
            )
          );
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
    if (deliveryTags && deliveryTags.length > 0) {
      const latestTag = deliveryTags[deliveryTags.length - 1];
      if (latestTag && latestTag.EPC && !processedTags.has(latestTag.EPC)) {
        setProcessedTags((prev) => new Set([...prev, latestTag.EPC]));

        const existingIndex = linens.findIndex(
          (linen) => linen.epc === latestTag.EPC
        );

        if (existingIndex === -1) {
          const emptyRowIndex = linens.findIndex(
            (linen) => linen.epc.trim() === ""
          );

          if (emptyRowIndex !== -1) {
            handleLinenChange(emptyRowIndex, "epc", latestTag.EPC);
            fetchLinenData(latestTag.EPC, emptyRowIndex);
          } else {
            const newIndex = linens.length;
            setLinens((prev) => [
              ...prev,
              { epc: latestTag.EPC, status_id: 1, loading: false },
            ]);
            setTimeout(() => fetchLinenData(latestTag.EPC, newIndex), 100);
          }
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
              <select
                name="customerId"
                value={formData.customerId}
                onChange={(e) => {
                  const selected = customers.find(
                    (c) => c.customerId === e.target.value
                  );
                  const newFormData = {
                    ...formData,
                    customerId: selected?.customerId || "",
                    customerName: selected?.customerName || "",
                  };
                  setFormData(newFormData);

                  // Re-validate all existing linens
                  revalidateLinens(selected?.customerId || "");
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

              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isDeliveryActive
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }`}
                ></div>
                <span className="text-sm text-gray-600">
                  {isDeliveryActive ? "Scanning..." : "Idle"}
                </span>
                {deliveryTags.length > 0 && (
                  <span className="text-xs text-blue-600">
                    ({deliveryTags.length} tags detected)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 rounded-lg">
                <span className="text-sm text-blue-700 font-medium">
                  Total Rows: {linens.length}
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 rounded-lg">
                <span className="text-sm text-green-700 font-medium">
                  Valid EPCs:{" "}
                  {
                    linens.filter(
                      (l) => l.epc.trim() && l.isValidCustomer !== false
                    ).length
                  }
                </span>
              </div>

              {linens.filter((l) => l.isValidCustomer === false).length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-100 rounded-lg">
                  <span className="text-sm text-red-700 font-medium">
                    Invalid EPCs:{" "}
                    {linens.filter((l) => l.isValidCustomer === false).length}
                  </span>
                </div>
              )}
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
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b">
                      Aksi
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
                          onChange={(e) =>
                            handleLinenChange(index, "epc", e.target.value)
                          }
                          placeholder="Auto-filled dari scan / manual input"
                          className={`w-full border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent ${
                            linen.isValidCustomer === false
                              ? "border-red-300 bg-red-50"
                              : linen.epc
                              ? "bg-green-50 border-green-300"
                              : "border-gray-300"
                          }`}
                          readOnly={linen.epc && processedTags.has(linen.epc)}
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
    </div>
  );
};

export default DeliveryPage;
