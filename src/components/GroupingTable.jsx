import React from "react";

const GroupingTable = ({ groupingTags }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-200 border-b">
            <th className="text-left py-4 px-4 font-medium text-gray-700">
              No Seri RFID
            </th>
            <th className="text-left py-4 px-4 font-medium text-gray-700">
              Nama Linen
            </th>
            <th className="text-left py-4 px-4 font-medium text-gray-700">
              Nama Customer
            </th>
            <th className="text-left py-4 px-4 font-medium text-gray-700">
              Ruangan
            </th>
            <th className="text-left py-4 px-4 font-medium text-gray-700">
              Status Linen
            </th>
          </tr>
        </thead>
        <tbody>
          {groupingTags.length === 0 ? (
            <tr>
              <td colSpan="5" className="py-4 px-4 text-center text-gray-500">
                Tidak ada tag terdeteksi
              </td>
            </tr>
          ) : (
            groupingTags.map((tag, index) => (
              <tr
                key={index}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-4 text-gray-800">{tag.EPC}</td>
                <td className="py-4 px-4 text-gray-800">{tag.linenName}</td>
                <td className="py-4 px-4 text-gray-800">{tag.customerName}</td>
                <td className="py-4 px-4 text-gray-800">{tag.room}</td>
                <td className="py-4 px-4">
                  <span className="text-blue-700 font-medium">
                    {tag.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GroupingTable;
