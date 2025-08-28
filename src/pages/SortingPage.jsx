import React from "react";
import RegisterTagsTable from "../components/RegisterTagsTable";

const SortingPage = ({ rfidHook }) => {
  const { registerTags, connect, startInventory, stopInventory } = rfidHook;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Sorting Linen
      </h2>

      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Connection</h3>
        <button
          onClick={connect}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Connect
        </button>
        <button
          onClick={startInventory}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ml-2"
        >
          Start (Register)
        </button>
        <button
          onClick={stopInventory}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 ml-2"
        >
          Stop
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RegisterTagsTable tags={registerTags} antennaId={1} title="Antena 1" />
        <RegisterTagsTable tags={registerTags} antennaId={2} title="Antena 2" />
      </div>
    </div>
  );
};

export default SortingPage;
