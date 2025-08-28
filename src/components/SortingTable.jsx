import React from "react";

const SortingTable = ({ sortingTags, antennaNumber }) => {
  const headerColorClass =
    antennaNumber === 1
      ? "bg-blue-100 border-blue-200"
      : "bg-green-100 border-green-200";

  return (
    <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className={`${headerColorClass} border-b`}>
            <th className="text-left py-3 px-3 font-medium text-gray-700 text-sm">
              No Seri RFID
            </th>
            <th className="text-left py-3 px-3 font-medium text-gray-700 text-sm">
              Nama Linen
            </th>
            <th className="text-left py-3 px-3 font-medium text-gray-700 text-sm">
              Customer
            </th>
            <th className="text-left py-3 px-3 font-medium text-gray-700 text-sm">
              Ruangan
            </th>
            <th className="text-left py-3 px-3 font-medium text-gray-700 text-sm">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sortingTags.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="py-8 px-4 text-center text-gray-500 text-sm"
              >
                Tidak ada tag terdeteksi di antenna {antennaNumber}
              </td>
            </tr>
          ) : (
            sortingTags.map((tag, index) => (
              <tr
                key={`antenna-${antennaNumber}-${index}`}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-3 text-gray-800 text-sm">{tag.EPC}</td>
                <td className="py-3 px-3 text-gray-800 text-sm">
                  {tag.linenName}
                </td>
                <td className="py-3 px-3 text-gray-800 text-sm">
                  {tag.customerName}
                </td>
                <td className="py-3 px-3 text-gray-800 text-sm">{tag.room}</td>
                <td className="py-3 px-3">
                  <span
                    className={`font-medium text-sm ${
                      antennaNumber === 1 ? "text-blue-700" : "text-green-700"
                    }`}
                  >
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

export default SortingTable;
