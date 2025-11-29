import React, { useState, useEffect } from "react";
import { Play, Trash2, Square } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";
import { useRegisterData } from "../hooks/useRegisterData";
import { useCustomers } from "../hooks/useCustomers";
import { useRooms } from "../hooks/useRooms";
import { useLinens } from "../hooks/useLinens";

const RegisterPage = ({ rfidHook }) => {
  const {
    registerTags = [],
    startRegister,
    stopRegister,
    isRegisterActive = false,
    isRfidAvailable = false,
  } = rfidHook || {};

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    roomId: "",
    roomName: "",
    linenId: "",
    rfidRegisterDescription: "-", // Hardcoded value
    linenQty: 0, // Quantity of scanned linens
  });

  const baseUrl = import.meta.env.VITE_BASE_URL;

  // Use custom hooks for data management
  const {
    linens,
    clearAllEPCs,
    addLinenRow,
    removeLinenRow,
    updateLinenField,
    getValidLinenCount,
    getCompleteLinenCount,
    isFormValid,
    handleRegisterTags,
  } = useRegisterData();

  const { customers, loadingCustomers, fetchCustomers, getCustomerById } =
    useCustomers(baseUrl);

  const { rooms, loadingRooms, fetchRooms, getRoomById } = useRooms(baseUrl);

  const { linenOptions, loadingLinens, refreshLinens, getLinenById } =
    useLinens(baseUrl);

  // Handle RFID tag scanning using hook
  useEffect(() => {
    handleRegisterTags(registerTags, isRegisterActive);
  }, [registerTags, isRegisterActive, handleRegisterTags]);

  // Fetch today's linen register count
  const fetchTodayLinenCount = async () => {
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];

      // Get token from authAPI
      const token = await window.authAPI.getToken();

      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const response = await fetch(
        `${baseUrl}/Report/dashboard/ReportLinenRegister?dateStart=${today}&dateEnd=${today}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error(
          "Failed to fetch today's linen count:",
          response.statusText
        );
        return;
      }

      const result = await response.json();
      console.log("Today's linen register data:", result);

      if (result.success && result.count !== undefined) {
        setFormData((prev) => ({
          ...prev,
          linenQty: result.count,
        }));
      }
    } catch (error) {
      console.error("Error fetching today's linen count:", error);
    }
  };

  // Fetch today's linen count on component mount
  useEffect(() => {
    fetchTodayLinenCount();
  }, []);

  // Refresh today's linen count after successful registration
  useEffect(() => {
    if (linens.some((linen) => linen.epc?.trim())) {
      // If there are newly scanned linens, refresh the count
      fetchTodayLinenCount();
    }
  }, [linens]);

  // Effect untuk fetch rooms ketika customerId berubah
  useEffect(() => {
    if (formData.customerId) {
      fetchRooms(formData.customerId);
    }
  }, [formData.customerId, fetchRooms]);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCustomerChange = (selected) => {
    const newFormData = {
      ...formData,
      customerId: selected?.customerId || "",
      customerName: selected?.customerName || "",
      roomId: "", // Reset room when customer changes
      roomName: "", // Reset room name when customer changes
    };
    setFormData(newFormData);
  };

  const handleLinenChange = (index, field, value) => {
    updateLinenField(index, field, value);
  };

  const handleRoomChange = (selected) => {
    const newFormData = {
      ...formData,
      roomId: selected?.roomId || "",
      roomName: selected?.roomName || "",
    };
    setFormData(newFormData);
  };

  const handleRemoveLinenRow = (index) => {
    const success = removeLinenRow(index);
    if (!success) {
      toast.error("Minimal harus ada satu baris data", {
        duration: 3000,
        icon: "⚠️",
      });
    } else {
      toast.success("Baris berhasil dihapus", {
        duration: 2000,
        icon: "✅",
      });
    }
  };

  const handleClearAll = () => {
    console.log(
      "🔘 Clear All button clicked - Complete state reset with rfidHook.clearAllData()"
    );

    try {
      // Stop RFID scanning first to prevent immediate re-population
      if (isRegisterActive) {
        console.log("🛑 Stopping RFID scan to prevent re-population");
        stopRegister();
      }

      // Use rfidHook.clearAllData() like tab switching for complete state reset
      console.log("🗑️ Clearing all RFID data using rfidHook.clearAllData()...");
      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      // Clear all EPC data using the hook
      console.log("🗑️ Clearing all EPC data...");
      clearAllEPCs();

      // Reset form data completely (like tab switching) - keep customer
      console.log("🔄 Resetting form data completely...");
      setFormData((prev) => ({
        ...prev,
        customerId: formData.customerId, // Keep customer selection
        customerName: formData.customerName, // Keep customer name
        roomId: formData.roomId, // Keep room selection
        roomName: formData.roomName, // Keep room name
        linenId: "",
        rfidRegisterDescription: "-", // Keep hardcoded value
      }));

      // Refresh today's linen count after clearing
      fetchTodayLinenCount();

      // Force multiple state updates to ensure complete clearing
      setTimeout(() => {
        console.log("🔄 Double-checking and clearing any remaining state...");
        clearAllEPCs(); // Call again to be sure

        // Double-check rfidHook data clearing
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }
      }, 50);

      setTimeout(() => {
        console.log("🔄 Final state cleanup...");
        clearAllEPCs();

        // Final rfidHook data clearing
        if (rfidHook && rfidHook.clearAllData) {
          rfidHook.clearAllData();
        }
      }, 200);
    } catch (error) {
      console.error("❌ Error clearing all data:", error);
      toast.error("Gagal membersihkan data!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Get authentication token
      const token = await window.authAPI.getToken();

      // Filter linen yang valid
      const validLinens = linens.filter(
        (linen) =>
          linen.linenId?.trim() || linen.epc?.trim() || linen.roomId?.trim()
      );

      // Create payload - tambahkan roomId ke setiap linen untuk body request tetap sama
      const linensWithRoom = validLinens.map((linen) => ({
        ...linen,
        roomId: formData.roomId || linen.roomId, // Gunakan room dari form atau linen existing
      }));

      const payload = {
        customerId: formData.customerId,
        rfidRegisterDescription: formData.rfidRegisterDescription,
        locationId: "LOC001",
        linens: linensWithRoom,
      };

      console.log("Payload dikirim:", payload);

      // Send POST request
      const response = await fetch(`${baseUrl}/Process/register_rfid`, {
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
        const errorMessage =
          result.message || `Request failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      const successMessage = result.message || "Registrasi RFID berhasil!";

      // Reset form after success
      setFormData({
        customerId: "",
        customerName: "",
        roomId: "",
        roomName: "",
        linenId: "",
        rfidRegisterDescription: "-", // Reset to hardcoded value
        linenQty: 0, // Reset quantity
      });

      // Use rfidHook.clearAllData() for complete state reset
      console.log("🗑️ Clearing all RFID data after successful register...");
      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      // Clear all EPC data using the hook
      clearAllEPCs();

      // Stop scanning if active
      if (isRegisterActive) {
        stopRegister();
      }

      // Refresh data after successful registration
      fetchCustomers();
      refreshLinens();
      if (formData.customerId) {
        fetchRooms(formData.customerId);
      }

      // Refresh today's linen count after successful registration
      fetchTodayLinenCount();

      toast.success(successMessage, {
        duration: 4000,
        icon: "✅",
      });
    } catch (error) {
      console.error("Error submit:", error);
      const errorMessage = error.message || "Gagal registrasi RFID, coba lagi!";
      toast.error(errorMessage, {
        duration: 4000,
        icon: "❌",
      });
    }
  };

  // RFID scan toggle handler
  const handleToggleScan = () => {
    if (!isRfidAvailable) {
      toast.error("Device belum terkoneksi!", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    try {
      if (isRegisterActive) {
        console.log("🛑 Stopping register scan");
        stopRegister();
      } else {
        console.log("▶️ Starting register scan");
        startRegister();
      }
    } catch (error) {
      console.error("❌ Error toggling register scan:", error);
      toast.error("Gagal mengontrol scan register!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6 font-poppins">
        <div className="space-y-6">
          {/* Customer & Room Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Customer
              </label>
              <Select
                value={
                  formData.customerId
                    ? getCustomerById(formData.customerId)
                    : null
                }
                onChange={handleCustomerChange}
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
                menuPortalTarget={document.body}
                menuPortalStyle={{ zIndex: 9998 }}
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
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 9998,
                  }),
                }}
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Room
              </label>
              <Select
                value={formData.roomId ? getRoomById(formData.roomId) : null}
                onChange={handleRoomChange}
                options={rooms}
                getOptionLabel={(room) => `${room.roomName} (${room.roomId})`}
                getOptionValue={(room) => room.roomId}
                placeholder="Pilih room..."
                isClearable
                isSearchable
                isLoading={loadingRooms}
                noOptionsMessage={() => "Room tidak ditemukan"}
                className="w-full"
                classNamePrefix="react-select"
                menuPortalTarget={document.body}
                menuPortalStyle={{ zIndex: 9998 }}
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
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 9998,
                  }),
                }}
              />
            </div>
          </div>

          {/* EPC & Linen Table Section */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <div>
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
              </div>
              <div className="flex items-end gap-4">
                <div className="flex items-center gap-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Total Linen Registrasi RFID hari ini.
                  </label>
                  <input
                    type="text"
                    value={formData.linenQty}
                    disabled
                    className="w-16 border border-gray-300 rounded-lg px-3 py-1 text-sm bg-gray-100 text-gray-600 cursor-not-allowed"
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  {/* Total Count Display */}
                  <div className="bg-gray-100 px-3 py-1 rounded-lg text-sm">
                    <span className="text-gray-600">Total: </span>
                    <span className="font-semibold text-gray-800">
                      {linens.filter((linen) => linen.epc?.trim()).length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
                  >
                    <Trash2 size={14} />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            </div>

            {/* EPC & Linen Table */}
            <div className="overflow-x-auto relative z-50">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      RFID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Linen
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
                      </td>
                      <td className="px-4 py-3 border-b">
                        <input
                          type="text"
                          value={linen.epc}
                          readOnly
                          placeholder="Auto-filled dari scan RFID"
                          className={`w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent bg-gray-50 ${
                            linen.epc ? "bg-green-50 border-green-300" : ""
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 border-b relative">
                        <div className="relative">
                          <Select
                            value={
                              linen.linenId ? getLinenById(linen.linenId) : null
                            }
                            onChange={(selected) =>
                              handleLinenChange(
                                index,
                                "linenId",
                                selected?.linenId || ""
                              )
                            }
                            options={linenOptions}
                            getOptionLabel={(linen) =>
                              `${linen.linenName} - (${linen.linenId})`
                            }
                            getOptionValue={(linen) => linen.linenId}
                            placeholder="Pilih linen..."
                            isClearable
                            isSearchable
                            isLoading={loadingLinens}
                            noOptionsMessage={() => "Linen tidak ditemukan"}
                            className="w-full"
                            classNamePrefix="react-select"
                            menuPortalTarget={document.body}
                            menuPortalStyle={{ zIndex: 9998 }}
                            styles={{
                              control: (baseStyles, state) => ({
                                ...baseStyles,
                                borderColor: state.isFocused
                                  ? "#3b82f6"
                                  : "#d1d5db",
                                boxShadow: state.isFocused
                                  ? "0 0 0 1px #3b82f6"
                                  : "none",
                                fontSize: "13px",
                                minHeight: "32px",
                              }),
                              option: (baseStyles) => ({
                                ...baseStyles,
                                fontSize: "13px",
                              }),
                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 9998,
                              }),
                            }}
                          />
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
                !isFormValid(
                  formData.customerId,
                  formData.rfidRegisterDescription,
                  formData.roomId
                )
              }
              className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                isFormValid(
                  formData.customerId,
                  formData.rfidRegisterDescription,
                  formData.roomId
                )
                  ? "bg-primary hover:bg-blue-400 text-white cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Register Linen ({getValidLinenCount()} items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
