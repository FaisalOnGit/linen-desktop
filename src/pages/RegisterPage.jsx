import React, { useState } from "react";
import { Play, CircleStop } from "lucide-react"; // ✅ Import ikon

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    customerId: "",
    linenId: "",
    rfidRegisterDescription: "",
    locationId: "",
    epc: "",
    roomId: "",
  });

  const [isConnected, setIsConnected] = useState(true); // ✅ sementara true (anggap device terkoneksi)
  const [isInventoryActive, setIsInventoryActive] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      customerId: formData.customerId,
      linenId: formData.linenId,
      rfidRegisterDescription: formData.rfidRegisterDescription,
      locationId: formData.locationId,
      linens: [
        {
          epc: formData.epc,
          roomId: formData.roomId,
        },
      ],
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
    }
  };

  return (
    <div className="font-poppins">
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h1 className="text-2xl font-semibold text-primary">Register Linen</h1>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 font-poppins">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Customer ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer ID
            </label>
            <input
              type="text"
              name="customerId"
              value={formData.customerId}
              onChange={handleChange}
              placeholder="Masukkan Customer ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* Linen ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Linen ID
            </label>
            <input
              type="text"
              name="linenId"
              value={formData.linenId}
              onChange={handleChange}
              placeholder="Masukkan Linen ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
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

          {/* EPC + Scan Button */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              EPC
            </label>

            {/* Input EPC */}
            <input
              type="text"
              name="epc"
              value={formData.epc}
              onChange={handleChange}
              placeholder="Scan / masukkan EPC"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />

            {/* Tombol Scan */}
            <button
              type="button" // ✅ Supaya tidak submit form
              onClick={handleScan}
              className={`mt-2 w-full px-6 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors duration-200 ${
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
              <span>{isInventoryActive ? "Stop" : "Scan"}</span>
            </button>
          </div>

          {/* Room ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room ID
            </label>
            <input
              type="text"
              name="roomId"
              value={formData.roomId}
              onChange={handleChange}
              placeholder="Masukkan Room ID"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* Submit Button full width */}
          <div className="lg:col-span-2">
            <button
              type="submit"
              className="w-full bg-primary hover:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium"
            >
              Register Linen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
