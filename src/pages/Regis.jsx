import React, { useState, useEffect } from "react";
import { Play, Square, Save, Trash2 } from "lucide-react";

const RegLinenPage = ({ rfidHook }) => {
  const { groupingTags, startGrouping, stopGrouping } = rfidHook;
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    customerId: "",
    linenId: "",
    rfidRegisterDescription: "",
    locationId: "",
  });

  // Selected tags for registration
  const [selectedTags, setSelectedTags] = useState([]);
  const [roomAssignments, setRoomAssignments] = useState({});

  const handleToggle = () => {
    if (isRunning) {
      stopGrouping();
    } else {
      startGrouping();
    }
    setIsRunning(!isRunning);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTagSelect = (tag) => {
    const tagEpc = tag.EPC;
    setSelectedTags((prev) => {
      if (prev.some((t) => t.EPC === tagEpc)) {
        // Remove tag if already selected
        const newTags = prev.filter((t) => t.EPC !== tagEpc);
        // Also remove room assignment
        const newRoomAssignments = { ...roomAssignments };
        delete newRoomAssignments[tagEpc];
        setRoomAssignments(newRoomAssignments);
        return newTags;
      } else {
        // Add tag if not selected
        return [...prev, tag];
      }
    });
  };

  const handleRoomAssignment = (epc, roomId) => {
    setRoomAssignments((prev) => ({
      ...prev,
      [epc]: roomId,
    }));
  };

  const removeSelectedTag = (epc) => {
    setSelectedTags((prev) => prev.filter((t) => t.EPC !== epc));
    const newRoomAssignments = { ...roomAssignments };
    delete newRoomAssignments[epc];
    setRoomAssignments(newRoomAssignments);
  };

  const clearAllSelections = () => {
    setSelectedTags([]);
    setRoomAssignments({});
  };

  const handleRegister = async () => {
    // Validation
    if (!formData.customerId || !formData.linenId || !formData.locationId) {
      alert("Mohon lengkapi semua field yang wajib diisi!");
      return;
    }

    if (selectedTags.length === 0) {
      alert("Mohon pilih minimal satu RFID tag!");
      return;
    }

    // Prepare request body
    const requestBody = {
      customerId: formData.customerId,
      linenId: formData.linenId,
      rfidRegisterDescription: formData.rfidRegisterDescription,
      locationId: formData.locationId,
      linens: selectedTags.map((tag) => ({
        epc: tag.EPC,
        roomId: roomAssignments[tag.EPC] || "",
      })),
    };

    setIsLoading(true);
    try {
      const response = await fetch(
        "https://app.nci.co.id/base_linen/api/Process/register_rfid",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert("Registration berhasil!");
        console.log("Registration success:", result);

        // Reset form
        setFormData({
          customerId: "",
          linenId: "",
          rfidRegisterDescription: "",
          locationId: "",
        });
        clearAllSelections();
      } else {
        const errorData = await response.json();
        alert(
          `Registration gagal: ${errorData.message || response.statusText}`
        );
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Terjadi kesalahan saat melakukan registration!");
    } finally {
      setIsLoading(false);
    }
  };

  const lastTag =
    groupingTags && groupingTags.length > 0
      ? groupingTags[groupingTags.length - 1]
      : null;

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h1 className="text-2xl font-semibold text-primary">Register Linen</h1>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Form Registration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer ID *
            </label>
            <input
              type="text"
              name="customerId"
              value={formData.customerId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Masukkan Customer ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Linen ID *
            </label>
            <input
              type="text"
              name="linenId"
              value={formData.linenId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Masukkan Linen ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location ID *
            </label>
            <input
              type="text"
              name="locationId"
              value={formData.locationId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Masukkan Location ID"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              name="rfidRegisterDescription"
              value={formData.rfidRegisterDescription}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Masukkan deskripsi (opsional)"
            />
          </div>
        </div>
      </div>

      {/* RFID Reading Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-700">RFID Reader</h2>
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
              isRunning
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-blue-800"
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-5 h-5" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Start
              </>
            )}
          </button>
        </div>

        {/* Current Tag Info */}
        <div className="grid grid-cols-1 gap-y-2 font-bold mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <label className="text-gray-600 w-24">RFID</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {lastTag ? lastTag.EPC || "?" : "−"}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Linen</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {lastTag ? lastTag.linenName || "-" : "−"}
            </span>
          </div>
          <div className="flex items-center">
            <label className="text-gray-600 w-24">Customer</label>
            <span className="mx-3">:</span>
            <span className="text-gray-800">
              {lastTag ? lastTag.customerName || "-" : "−"}
            </span>
          </div>
        </div>
      </div>

      {/* Available Tags Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Available RFID Tags
        </h2>

        {groupingTags && groupingTags.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
            {groupingTags.map((tag, index) => {
              const isSelected = selectedTags.some((t) => t.EPC === tag.EPC);
              return (
                <div
                  key={index}
                  onClick={() => handleTagSelect(tag)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-blue-50 shadow-md"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-800">
                        EPC: {tag.EPC || "Unknown"}
                      </div>
                      <div className="text-sm text-gray-600">
                        Linen: {tag.linenName || "-"} | Customer:{" "}
                        {tag.customerName || "-"}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-gray-300"
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Tidak ada RFID tag yang terdeteksi. Mulai scanner untuk membaca tag.
          </div>
        )}
      </div>

      {/* Selected Tags Section */}
      {selectedTags.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">
              Selected Tags ({selectedTags.length})
            </h2>
            <button
              onClick={clearAllSelections}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {selectedTags.map((tag, index) => (
              <div
                key={index}
                className="p-4 border border-primary bg-blue-50 rounded-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium text-gray-800">
                      EPC: {tag.EPC}
                    </div>
                    <div className="text-sm text-gray-600">
                      Linen: {tag.linenName || "-"}
                    </div>
                  </div>
                  <button
                    onClick={() => removeSelectedTag(tag.EPC)}
                    className="text-red-600 hover:bg-red-100 p-1 rounded transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room ID
                  </label>
                  <input
                    type="text"
                    value={roomAssignments[tag.EPC] || ""}
                    onChange={(e) =>
                      handleRoomAssignment(tag.EPC, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    placeholder="Masukkan Room ID (opsional)"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Register Button */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={handleRegister}
          disabled={isLoading || selectedTags.length === 0}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all duration-300 transform hover:scale-105 ${
            isLoading || selectedTags.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          <Save className="w-5 h-5" />
          {isLoading ? "Registering..." : "Register Linen"}
        </button>
      </div>
    </div>
  );
};

export default RegLinenPage;
