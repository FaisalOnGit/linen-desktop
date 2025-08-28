import React from "react";

const TagsTable = ({ tags }) => {
  const renderTags = (tagsData) => {
    if (!tagsData || tagsData.length === 0) {
      return (
        <tr>
          <td colSpan="5" className="text-center py-8 text-gray-500">
            No tags detected
          </td>
        </tr>
      );
    }

    return tagsData.map((tag, index) => (
      <tr key={index}>
        <td className="px-4 py-2 border-b">{index + 1}</td>
        <td className="px-4 py-2 border-b font-mono text-sm">
          {tag.EPC || "-"}
        </td>
        <td className="px-4 py-2 border-b">{tag.AntennaID || "-"}</td>
        <td className="px-4 py-2 border-b">{tag.RSSI || "-"} dBm</td>
        <td className="px-4 py-2 border-b">
          {new Date().toLocaleTimeString()}
        </td>
      </tr>
    ));
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-gray-700">
        Detected Tags
      </h3>
      <div className="overflow-x-auto bg-white border border-gray-300 rounded-lg">
        <table className="min-w-full">
          <thead className="bg-blue-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium">EPC</th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Antenna
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">RSSI</th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">{renderTags(tags)}</tbody>
        </table>
      </div>
    </div>
  );
};

export default TagsTable;
