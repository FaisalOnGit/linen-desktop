import React, { useState, useEffect } from "react";
import { Play, Trash2, Square, Replace } from "lucide-react";
import toast from "react-hot-toast";
import Select from "react-select";
import { useReplaceTagData } from "../hooks/useReplaceTagData";
import { useCustomers } from "../hooks/useCustomers";

const ReplaceTagPage = ({ rfidHook }) => {
  const {
    replaceTags = [],
    startReplace,
    stopReplace,
    isReplaceActive = false,
    isRfidAvailable = false,
  } = rfidHook || {};

  const baseUrl = import.meta.env.VITE_BASE_URL;

  const [formData, setFormData] = useState({
    customerId: "",
    customerName: "",
    customerServiceName: "",
  });

  // Load customer service name on mount
  useEffect(() => {
    const getCustomerServiceName = async () => {
      try {
        const fullName = await window.authAPI.getFullName();
        setFormData((prev) => ({
          ...prev,
          customerServiceName: fullName || "",
        }));
      } catch (error) {
        console.error("Error getting customer service name:", error);
      }
    };
    getCustomerServiceName();
  }, []);

  // Use custom hook for data management
  const {
    tags,
    clearAllEPCs,
    removeTagRow,
    updateTagField,
    getValidTagCount,
    getCompleteTagCount,
    isFormValid,
    handleReplaceTags,
    handleOldEpcChange,
  } = useReplaceTagData(baseUrl);

  const { customers, loadingCustomers, getCustomerById } =
    useCustomers(baseUrl);

  // Handle RFID tag scanning using hook
  useEffect(() => {
    handleReplaceTags(replaceTags, isReplaceActive);
  }, [replaceTags, isReplaceActive, handleReplaceTags]);

  const handleRemoveTagRow = (index) => {
    const success = removeTagRow(index);
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
    console.log("🔘 Clear All button clicked - Complete state reset");

    try {
      if (isReplaceActive) {
        console.log("🛑 Stopping RFID scan");
        stopReplace();
      }

      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      clearAllEPCs();
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
      const token = await window.authAPI.getToken();

      // Filter valid tags
      const validTags = tags.filter(
        (tag) => tag.oldEpc?.trim() && tag.newEpc?.trim(),
      );

      if (validTags.length === 0) {
        toast.error("Minimal harus ada satu tag lengkap (Old EPC & New EPC)", {
          duration: 3000,
          icon: "⚠️",
        });
        return;
      }

      if (!formData.customerId) {
        toast.error("Pilih customer terlebih dahulu!", {
          duration: 3000,
          icon: "⚠️",
        });
        return;
      }

      const payload = {
        customerId: formData.customerId,
        description: formData.customerServiceName,
        listEpc: validTags.map((tag) => ({
          oldEpc: tag.oldEpc,
          newEpc: tag.newEpc,
        })),
      };

      console.log("Payload dikirim:", payload);

      // Send POST request
      const response = await fetch(`${baseUrl}/Process/replace_tag`, {
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

      const successMessage = result.message || "Replace Tag berhasil!";

      // Reset form after success
      clearAllEPCs();

      if (rfidHook && rfidHook.clearAllData) {
        rfidHook.clearAllData();
      }

      // Stop scanning if active
      if (isReplaceActive) {
        stopReplace();
      }

      toast.success(successMessage, {
        duration: 4000,
        icon: "✅",
      });
    } catch (error) {
      console.error("Error submit:", error);
      const errorMessage = error.message || "Gagal replace tag, coba lagi!";
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
      if (isReplaceActive) {
        console.log("🛑 Stopping replace scan");
        stopReplace();
      } else {
        console.log("▶️ Starting replace scan");
        startReplace();
      }
    } catch (error) {
      console.error("❌ Error toggling replace scan:", error);
      toast.error("Gagal mengontrol scan replace!", {
        duration: 3000,
        icon: "❌",
      });
    }
  };

  // Handle old Epc input - only call API on Enter key
  const handleOldEpcKeyDown = async (index, e) => {
    if (e.key === "Enter") {
      const value = e.target.value;
      e.preventDefault();

      // Call API to get linen info when Enter is pressed
      if (value.trim()) {
        await handleOldEpcChange(value, index);
      } else {
        // Clear linen info if value is empty
        updateTagField(index, "linenInfo", null);
        updateTagField(index, "linenId", "");
      }
    }
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-lg p-6 font-poppins">
        <div className="space-y-6">
          {/* Customer & Customer Service Name */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Customer <span className="text-red-500">*</span>
              </label>
              <Select
                value={
                  formData.customerId
                    ? getCustomerById(formData.customerId)
                    : null
                }
                onChange={(selected) => {
                  setFormData({
                    ...formData,
                    customerId: selected?.customerId || "",
                    customerName: selected?.customerName || "",
                  });
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
                Nama Customer Service <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerServiceName}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                placeholder="Nama customer service otomatis dari user login"
              />
            </div>
          </div>

          {/* Scan Control & Table Section */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <div>
                <button
                  type="button"
                  onClick={handleToggleScan}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
                    !isRfidAvailable
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : isReplaceActive
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-primary hover:bg-blue-700"
                  }`}
                  disabled={!isRfidAvailable}
                >
                  {isReplaceActive ? (
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
              <div className="flex gap-2 items-center">
                {/* Total Count Display */}
                <div className="bg-gray-100 px-3 py-1 rounded-lg text-sm">
                  <span className="text-gray-600">Total: </span>
                  <span className="font-semibold text-gray-800">
                    {getCompleteTagCount()}
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

            {/* Tag Replacement Table */}
            <div className="overflow-x-auto relative z-50">
              <table className="w-full border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b w-16">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Tag RFID Lama
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Tag RFID Baru
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                      Linen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag, index) => (
                    <tr
                      key={index}
                      className={`${
                        tag.oldEpc && tag.newEpc
                          ? "bg-green-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 border-b">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-b">
                        <input
                          type="text"
                          value={tag.oldEpc}
                          onChange={(e) =>
                            updateTagField(index, "oldEpc", e.target.value)
                          }
                          onKeyDown={(e) => handleOldEpcKeyDown(index, e)}
                          placeholder="Input tag lama + Enter..."
                          className={`w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent ${
                            tag.oldEpc ? "bg-amber-50 border-amber-300" : ""
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 border-b">
                        <input
                          type="text"
                          value={tag.newEpc}
                          onChange={(e) =>
                            updateTagField(index, "newEpc", e.target.value)
                          }
                          placeholder="Input atau scan dari RFID..."
                          className={`w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-400 focus:border-transparent ${
                            tag.newEpc ? "bg-green-50 border-green-300" : ""
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 border-b">
                        {tag.linenInfo ? (
                          <div className="text-sm">
                            <div className="font-medium text-gray-800">
                              {tag.linenInfo.linenName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {tag.linenInfo.customerName && (
                                <span>{tag.linenInfo.customerName}</span>
                              )}
                              {tag.linenInfo.customerName &&
                                tag.linenInfo.roomName && <span> • </span>}
                              {tag.linenInfo.roomName && (
                                <span>{tag.linenInfo.roomName}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">
                            Input tag lama + Enter
                          </div>
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
              disabled={!isFormValid() || !formData.customerId}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                isFormValid() && formData.customerId
                  ? "bg-primary hover:bg-blue-400 text-white cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Replace Tag ({getCompleteTagCount()} items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplaceTagPage;
