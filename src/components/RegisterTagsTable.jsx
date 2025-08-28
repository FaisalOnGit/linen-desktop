import React from "react";

const RegisterTagsTable = ({ tags, antennaId, title }) => {
  const renderRegisterTags = (tagsData, antennaId) => {
    const filteredTags = tagsData.filter((tag) => tag.AntennaID === antennaId);

    if (filteredTags.length === 0) {
      return (
        <tr>
          <td colSpan="2" className="text-center py-4 text-gray-500">
            No tags detected
          </td>
        </tr>
      );
    }

    return filteredTags.map((tag, index) => (
      <tr key={index}>
        <td className="px-4 py-2 border-b font-mono text-sm">
          {tag.EPC || "-"}
        </td>
        <td className="px-4 py-2 border-b">{tag.AntennaID || "-"}</td>
      </tr>
    ));
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="py-2 px-4 border-b">EPC</th>
              <th className="py-2 px-4 border-b">Antena</th>
            </tr>
          </thead>
          <tbody>{renderRegisterTags(tags, antennaId)}</tbody>
        </table>
      </div>
    </div>
  );
};

export default RegisterTagsTable;
