import React, { useState, useEffect } from "react";
import { Play, CircleStop, Plus, Trash2, ChevronDown } from "lucide-react";

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    linenId: "",
    rfidRegisterDescription: "",
    locationId: "",
  });

  const [customers, setCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [linenOptions, setLinenOptions] = useState([]);
  const [loadingLinens, setLoadingLinens] = useState(false);

  const [linens, setLinens] = useState([{ epc: "", roomId: "" }]);

  const [isConnected, setIsConnected] = useState(true);
  const [isInventoryActive, setIsInventoryActive] = useState(false);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);

  const fetchCustomers = async (searchTerm = "") => {
    setLoadingCustomers(true);
    try {
      // ✅ Ambil token dari storage
      const token = await window.authAPI.getToken();

      if (!token) {
        console.error("No token found, user needs to login");
        setCustomers([]);
        // Optional: redirect to login or show error
        return;
      }

      const response = await fetch(
        "https://app.nci.co.id/base_linen/api/Master/customer",
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Gunakan token dinamis
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Customers response:", data); // Debug log

        let customersData = data.data || data || []; // ✅ Handle multiple response formats
        let filteredCustomers = customersData;

        // ✅ Filter berdasarkan search term jika ada
        if (searchTerm.trim() && Array.isArray(customersData)) {
          filteredCustomers = customersData.filter(
            (customer) =>
              customer.customerName
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              customer.customerId
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          );
        }

        setCustomers(filteredCustomers);
      } else {
        console.error("Failed to fetch customers, status:", response.status);

        // ✅ Handle specific HTTP errors
        if (response.status === 401) {
          console.error("Token expired or invalid");
          // Optional: clear token and redirect to login
          await window.authAPI.clearToken();
        }

        setCustomers([]);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);

      // ✅ Handle different types of errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        console.error("Network error - check internet connection");
      }

      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchLinens = async (searchTerm = "") => {
    setLoadingLinens(true);
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        "https://app.nci.co.id/base_linen/api/Master/linen",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        let linensData = result.data || [];

        // filter kalau user cari linen berdasarkan nama / id
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

  const handleCustomerSearch = (value) => {
    setCustomerSearchTerm(value);
    setFormData({ ...formData, customerName: value, customerId: "" });
    setShowCustomerDropdown(true);

    // Debounce search
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
    setLinens([...linens, { epc: "", roomId: "" }]);
  };

  const removeLinenRow = (index) => {
    if (linens.length > 1) {
      const updatedLinens = linens.filter((_, i) => i !== index);
      setLinens(updatedLinens);
      // Reset current row index if needed
      if (currentRowIndex >= updatedLinens.length) {
        setCurrentRowIndex(updatedLinens.length - 1);
      }
    }
  };

  const handleSubmit = () => {
    // Filter out empty linens
    const validLinens = linens.filter(
      (linen) => linen.epc.trim() || linen.roomId.trim()
    );

    const payload = {
      customerId: formData.customerId,
      linenId: formData.linenId,
      rfidRegisterDescription: formData.rfidRegisterDescription,
      locationId: formData.locationId,
      linens: validLinens,
    };

    console.log("Payload dikirim:", payload);
    // TODO: fetch ke API register_rfid
  };

  const handleScan = () => {
    if (!isConnected) {
      alert("Device belum terkoneksi!");
      return;
    }

    if (isInventoryActive) {
      // Stop Inventory
      setIsInventoryActive(false);
      alert("Inventory dihentikan ❌");
    } else {
      // Start Inventory
      setIsInventoryActive(true);
      alert("Inventory dimulai 🚀");

      // Simulasi scan EPC ke row yang sedang aktif
      setTimeout(() => {
        const mockEPC = `EPC${Date.now().toString().slice(-6)}`;
        handleLinenChange(currentRowIndex, "epc", mockEPC);
        alert(`EPC berhasil di-scan: ${mockEPC}`);
        setIsInventoryActive(false);
      }, 2000);
    }
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h1 className="text-2xl font-semibold text-primary">Register Linen</h1>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 font-poppins">
        <div className="space-y-6">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Search with Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Cari customer..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  autoComplete="off"
                />
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                />

                {/* Customer ID Display */}
                {formData.customerId && (
                  <div className="mt-1 text-xs text-gray-500">
                    ID: {formData.customerId}
                  </div>
                )}
              </div>

              {/* Dropdown */}
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingCustomers ? (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      Loading customers...
                    </div>
                  ) : customers.length > 0 ? (
                    customers.map((customer) => (
                      <div
                        key={customer.customerId}
                        onClick={() => selectCustomer(customer)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {customer.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.customerId} • {customer.customerCity}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      Tidak ada customer ditemukan
                    </div>
                  )}
                </div>
              )}

              {/* Overlay to close dropdown */}
              {showCustomerDropdown && (
                <div
                  className="fixed inset-0 z-5"
                  onClick={() => setShowCustomerDropdown(false)}
                ></div>
              )}
            </div>

            {/* Linen ID */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Linen
              </label>
              <select
                name="linenId"
                value={formData.linenId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              >
                {linenOptions.map((linen) => (
                  <option key={linen.linenId} value={linen.linenId}>
                    {linen.linenName} ({linen.linenTypeName})
                  </option>
                ))}
              </select>

              {loadingLinens && (
                <p className="text-xs text-gray-500 mt-1">Loading linen...</p>
              )}
            </div>

            {/* RFID Description */}
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

            {/* Location ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location ID
              </label>
              <input
                type="text"
                name="locationId"
                value={formData.locationId}
                onChange={handleChange}
                placeholder="Masukkan Location ID"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Linen Table Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Data Linen (EPC & Room ID)
              </label>
              <button
                type="button"
                onClick={addLinenRow}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
              >
                <Plus size={14} />
                <span>Tambah Baris</span>
              </button>
            </div>

            {/* Scan Controls */}
            <div className="mb-4 flex gap-4">
              <button
                type="button"
                onClick={handleScan}
                className={`px-6 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors duration-200 ${
                  !isConnected
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : isInventoryActive
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-primary text-white hover:bg-blue-700"
                }`}
              >
                {isInventoryActive ? (
                  <CircleStop size={16} />
                ) : (
                  <Play size={16} />
                )}
                <span>{isInventoryActive ? "Stop Scan" : "Scan EPC"}</span>
              </button>

              <select
                value={currentRowIndex}
                onChange={(e) => setCurrentRowIndex(parseInt(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              >
                {linens.map((_, index) => (
                  <option key={index} value={index}>
                    Scan ke Baris {index + 1}
                  </option>
                ))}
              </select>
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
                        currentRowIndex === index
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 border-b">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-b">
                        <input
                          type="text"
                          value={linen.epc}
                          onChange={(e) =>
                            handleLinenChange(index, "epc", e.target.value)
                          }
                          onClick={() => setCurrentRowIndex(index)}
                          placeholder="Scan / masukkan EPC"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                        />
                      </td>
                      <td className="px-4 py-3 border-b">
                        <input
                          type="text"
                          value={linen.roomId}
                          onChange={(e) =>
                            handleLinenChange(index, "roomId", e.target.value)
                          }
                          onClick={() => setCurrentRowIndex(index)}
                          placeholder="Masukkan Room ID"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                        />
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

          {/* Submit Button */}
          <div>
            <button
              onClick={handleSubmit}
              className="w-full bg-primary hover:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium"
            >
              Register Linen (
              {linens.filter((l) => l.epc.trim() || l.roomId.trim()).length}{" "}
              items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
