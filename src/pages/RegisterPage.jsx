import React from "react";

const RegisterPage = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 font-poppins">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Register Linen
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Linen Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                EPC Tag ID
              </label>
              <input
                type="text"
                placeholder="Scan or enter EPC tag"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linen Type
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                <option>Bed Sheet</option>
                <option>Pillow Case</option>
                <option>Towel</option>
                <option>Blanket</option>
                <option>Patient Gown</option>
                <option>Surgical Drape</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
                <option>Extra Large</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <input
                type="text"
                placeholder="Enter color"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-transparent">
                <option>General Ward</option>
                <option>ICU</option>
                <option>Surgery</option>
                <option>Emergency</option>
                <option>Maternity</option>
                <option>Pediatric</option>
              </select>
            </div>
            <button className="w-full bg-blue-800 hover:bg-blue-400 text-white px-4 py-3 rounded-lg font-medium transition-colors">
              Register Linen
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Quick Actions
          </h3>
          <div className="space-y-3 mb-6">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              Scan New Tag
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">
              Bulk Register
            </button>
            <button className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors">
              Import from CSV
            </button>
          </div>

          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Recent Registrations
          </h3>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <div>
                  <span className="font-medium">EPC123456</span>
                  <span className="text-sm text-gray-600 ml-2">Bed Sheet</span>
                </div>
                <span className="text-xs text-gray-500">2 min ago</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-white rounded border">
                <div>
                  <span className="font-medium">EPC789012</span>
                  <span className="text-sm text-gray-600 ml-2">Towel</span>
                </div>
                <span className="text-xs text-gray-500">5 min ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
