import React, { useState, useEffect } from "react";
import { Play, Plus, Trash2, Square } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";

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
      const response = await fetch(`${baseUrl}/Master/linen-unregistered`, {
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
      // Process only new tags that haven't been processed
      registerTags.forEach((tag) => {
        if (tag && tag.EPC && !processedTags.has(tag.EPC)) {
          // Validate EPC format (should be reasonable length and hex)
          if (tag.EPC.length < 8 || !/^[0-9A-Fa-f]+$/.test(tag.EPC)) {
            console.warn("Invalid EPC format:", tag.EPC);
            return;
          }

          // Mark this EPC as processed
          setProcessedTags((prev) => new Set([...prev, tag.EPC]));

          // Check if EPC already exists in current linens
          const existingIndex = linens.findIndex(
            (linen) => linen.epc === tag.EPC
          );

          if (existingIndex === -1) {
            // Add to valid EPCs set (RegisterPage menerima semua EPC)
            setValidEpcs((prev) => new Set([...prev, tag.EPC]));

            // EPC doesn't exist, find first empty row or add new row
            const emptyRowIndex = linens.findIndex(
              (linen) => linen.epc.trim() === ""
            );

            if (emptyRowIndex !== -1) {
              // Fill empty row
              handleLinenChange(emptyRowIndex, "epc", tag.EPC);
            } else {
              // No empty row found, add new row with EPC
              setLinens((prev) => [
                ...prev,
                { linenId: "", epc: tag.EPC, roomId: "" },
              ]);
            }
          } else {
            // EPC already exists, just update it (in case of re-scan)
            console.log(
              `EPC ${tag.EPC} sudah ada di baris ${existingIndex + 1}`
            );
          }
        }
      });
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
    // Pastikan tidak bisa menghapus jika hanya 1 baris tersisa
    if (linens.length <= 1) {
      toast.error("Minimal harus ada satu baris data", {
        duration: 3000,
        icon: "⚠️",
      });
      return;
    }

    try {
      const removedLinen = linens[index];

      // Hapus EPC dari processedTags jika ada
      if (removedLinen?.epc) {
        setProcessedTags((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });

        // Hapus EPC dari validEpcs jika ada
        setValidEpcs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });
      }

      // Update linens array dengan menghapus item pada index tertentu
      setLinens((prev) => prev.filter((_, i) => i !== index));

      toast.success("Baris berhasil dihapus", {
        duration: 2000,
        icon: "✅",
      });
    } catch (error) {
      console.error("Error removing linen row:", error);
      toast.error("Gagal menghapus baris", {
        duration: 3000,
        icon: "❌",
      });
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

      const result = await response.json();
      console.log("Response dari API:", result);

      if (!response.ok) {
        // Get error message from API or use default message
        const errorMessage =
          result.message || `Request failed: ${response.status}`;
        throw new Error(errorMessage);
      }

      // Get message from API or use default message
      const successMessage = result.message || "Registrasi RFID berhasil!";

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

      // Refresh data after successful registration
      await fetchCustomers();
      await fetchLinens();
      if (formData.customerId) {
        await fetchRooms(formData.customerId);
      }

      toast.success(successMessage, {
        duration: 4000,
        icon: "✅",
      });
    } catch (error) {
      console.error("Error submit:", error);
      // Display error message from API or use default error message
      const errorMessage = error.message || "Gagal registrasi RFID, coba lagi!";
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

    if (isRegisterActive) {
      stopRegister();
    } else {
      startRegister();
    }
  };

  // Fungsi validasi form
  const isFormValid = () => {
    // Check if customer is selected
    if (!formData.customerId?.trim()) {
      return false;
    }

    // Check if description is filled
    if (!formData.rfidRegisterDescription?.trim()) {
      return false;
    }

    // Check if there's at least one valid linen row
    const validLinens = linens.filter(
      (linen) =>
        linen.linenId?.trim() && linen.epc?.trim() && linen.roomId?.trim()
    );

    if (validLinens.length === 0) {
      return false;
    }

    return true;
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6 font-poppins">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="relative z-40">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Customer
              </label>
              <Select
                value={
                  formData.customerId
                    ? customers.find(
                        (c) => c.customerId === formData.customerId
                      )
                    : null
                }
                onChange={(selected) =>
                  setFormData({
                    ...formData,
                    customerId: selected?.customerId || "",
                    customerName: selected?.customerName || "",
                  })
                }
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="rfidRegisterDescription"
                value={formData.rfidRegisterDescription}
                onChange={handleChange}
                placeholder="Deskripsi registrasi RFID"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              ></textarea>
            </div>
          </div>

          {/* EPC, Linen & Room Table Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Data EPC, Linen & Room
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearAllEPCs}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg font-medium flex items-center space-x-1 text-sm"
                >
                  <Trash2 size={14} />
                  <span>Clear</span>
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

            {/* EPC, Linen & Room Table */}
            <div className="overflow-x-auto relative z-50">
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
                      Linen
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
                              linen.linenId
                                ? linenOptions.find(
                                    (l) => l.linenId === linen.linenId
                                  )
                                : null
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
                      <td className="px-4 py-3 border-b relative">
                        <div className="relative">
                          <Select
                            value={
                              linen.roomId
                                ? rooms.find((r) => r.roomId === linen.roomId)
                                : null
                            }
                            onChange={(selected) =>
                              handleLinenChange(
                                index,
                                "roomId",
                                selected?.roomId || ""
                              )
                            }
                            options={rooms}
                            getOptionLabel={(room) =>
                              `${room.roomName} (${room.roomId})`
                            }
                            getOptionValue={(room) => room.roomId}
                            placeholder="Pilih room..."
                            isClearable
                            isSearchable
                            noOptionsMessage={() => "Room tidak ditemukan"}
                            className="w-full"
                            classNamePrefix="react-select"
                            menuPortalTarget={document.body}
                            menuPortalStyle={{ zIndex: 9999 }}
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
                                zIndex: 9999,
                              }),
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center border-b">
                        <button
                          type="button"
                          onClick={() => removeLinenRow(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors duration-200"
                          title="Hapus baris ini"
                        >
                          <Trash2 size={16} />
                        </button>
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
              disabled={!isFormValid()}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                isFormValid()
                  ? "bg-primary hover:bg-blue-400 text-white cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
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
