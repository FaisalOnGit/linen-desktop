import React, { useState, useEffect } from "react";

const GroupingTable = ({ groupingTags, isCompact = false }) => {
  const [enrichedTags, setEnrichedTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(new Set());

  // API function to fetch linen data by EPC
  const fetchLinenData = async (epc) => {
    if (!epc) return null;

    try {
      const token = await window.authAPI.getToken();
      const baseUrl = import.meta.env.VITE_BASE_URL;
      const response = await fetch(`${baseUrl}/Process/linen_rfid?epc=${epc}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        return result.data[0]; // Return first item from data array
      }

      return null;
    } catch (error) {
      console.error(`Error fetching linen data for EPC ${epc}:`, error);
      return null;
    }
  };

  // Effect to enrich tags with API data when groupingTags changes
  useEffect(() => {
    const enrichTags = async () => {
      if (!groupingTags || groupingTags.length === 0) {
        setEnrichedTags([]);
        return;
      }

      const enrichedData = [];

      for (let i = 0; i < groupingTags.length; i++) {
        const tag = groupingTags[i];
        const epc = tag.EPC || tag.epc;

        // Check if we already have enriched data for this tag
        const existingEnriched = enrichedTags.find(
          (enriched) => (enriched.EPC || enriched.epc) === epc
        );

        if (existingEnriched) {
          // Use existing enriched data
          enrichedData.push(existingEnriched);
        } else {
          // Mark as loading
          setLoadingTags((prev) => new Set([...prev, epc]));

          // Fetch API data
          const apiData = await fetchLinenData(epc);

          // Create enriched tag object
          const enrichedTag = {
            ...tag,
            ...(apiData || {}),
            // Ensure consistent field mapping
            EPC: epc,
            linenName: apiData?.linenName || tag.linenName || "-",
            customerName: apiData?.customerName || tag.customerName || "-",
            room: apiData?.roomName || tag.roomName || "-",
            status: apiData?.status || tag.status || "-",
            // Add loading flag
            isLoaded: !!apiData,
          };

          enrichedData.push(enrichedTag);

          // Remove from loading set
          setLoadingTags((prev) => {
            const newSet = new Set(prev);
            newSet.delete(epc);
            return newSet;
          });
        }
      }

      setEnrichedTags(enrichedData);
    };

    enrichTags();
  }, [groupingTags]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "bersih":
        return "text-green-700 bg-green-100 px-2 py-1 rounded-full text-sm font-medium";
      case "kotor":
        return "text-red-700 bg-red-100 px-2 py-1 rounded-full text-sm font-medium";
      case "proses":
        return "text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full text-sm font-medium";
      default:
        return "text-gray-700 bg-gray-100 px-2 py-1 rounded-full text-sm font-medium";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-700">
          Daftar Tag Terdeteksi ({enrichedTags.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`border-b ${
                isCompact ? "bg-gray-100" : "bg-gray-200"
              }`}
            >
              <th
                className={`text-left font-medium text-gray-700 ${
                  isCompact ? "py-2 px-2 text-xs" : "py-4 px-4"
                }`}
              >
                No Seri RFID
              </th>
              <th
                className={`text-left font-medium text-gray-700 ${
                  isCompact ? "py-2 px-2 text-xs" : "py-4 px-4"
                }`}
              >
                Nama Linen
              </th>
              <th
                className={`text-left font-medium text-gray-700 ${
                  isCompact ? "py-2 px-2 text-xs" : "py-4 px-4"
                }`}
              >
                Nama Customer
              </th>
              <th
                className={`text-left font-medium text-gray-700 ${
                  isCompact ? "py-2 px-2 text-xs" : "py-4 px-4"
                }`}
              >
                Ruangan
              </th>
              <th
                className={`text-left font-medium text-gray-700 ${
                  isCompact ? "py-2 px-2 text-xs" : "py-4 px-4"
                }`}
              >
                Status Linen
              </th>
            </tr>
          </thead>
          <tbody>
            {enrichedTags.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  className={`${
                    isCompact ? "py-4 px-2" : "py-8 px-4"
                  } text-center text-gray-500`}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`${
                        isCompact ? "w-8 h-8" : "w-12 h-12"
                      } bg-gray-100 rounded-full flex items-center justify-center mb-2`}
                    >
                      <svg
                        className={`${
                          isCompact ? "w-4 h-4" : "w-6 h-6"
                        } text-gray-400`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2"
                        />
                      </svg>
                    </div>
                    <p className={isCompact ? "text-xs" : ""}>
                      Tidak ada tag terdeteksi
                    </p>
                    <p
                      className={`text-gray-400 mt-1 ${
                        isCompact ? "text-xs" : "text-sm"
                      }`}
                    >
                      Mulai pemindaian untuk melihat data
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              enrichedTags.map((tag, index) => {
                const epc = tag.EPC || tag.epc;
                const isLoading = loadingTags.has(epc);

                return (
                  <tr
                    key={`${epc}-${index}`}
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      isCompact ? "text-xs" : ""
                    }`}
                  >
                    <td
                      className={`${
                        isCompact
                          ? "py-2 px-2 font-mono text-xs"
                          : "py-4 px-4 font-mono text-sm"
                      } text-gray-800`}
                    >
                      {epc || "N/A"}
                    </td>
                    <td
                      className={`${
                        isCompact ? "py-2 px-2" : "py-4 px-4"
                      } text-gray-800`}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div
                            className={`animate-spin rounded-full ${
                              isCompact ? "h-3 w-3" : "h-4 w-4"
                            } border-b-2 border-blue-600 mr-1`}
                          ></div>
                          <span
                            className={`text-gray-400 ${
                              isCompact ? "text-xs" : ""
                            }`}
                          >
                            Loading...
                          </span>
                        </div>
                      ) : (
                        <div className={isCompact ? "text-xs" : "font-medium"}>
                          {tag.linenName}
                        </div>
                      )}
                    </td>
                    <td
                      className={`${
                        isCompact ? "py-2 px-2" : "py-4 px-4"
                      } text-gray-800`}
                    >
                      {isLoading ? (
                        <div
                          className={`animate-pulse bg-gray-200 ${
                            isCompact ? "h-3 w-16" : "h-4 w-20"
                          } rounded`}
                        ></div>
                      ) : (
                        <div className={isCompact ? "text-xs" : "font-medium"}>
                          {tag.customerName}
                        </div>
                      )}
                    </td>
                    <td
                      className={`${
                        isCompact ? "py-2 px-2" : "py-4 px-4"
                      } text-gray-800`}
                    >
                      {isLoading ? (
                        <div
                          className={`animate-pulse bg-gray-200 ${
                            isCompact ? "h-3 w-12" : "h-4 w-16"
                          } rounded`}
                        ></div>
                      ) : (
                        <div className={isCompact ? "text-xs" : "font-medium"}>
                          {tag.room}
                        </div>
                      )}
                    </td>
                    <td className={`${isCompact ? "py-2 px-2" : "py-4 px-4"}`}>
                      {isLoading ? (
                        <div
                          className={`animate-pulse bg-gray-200 ${
                            isCompact ? "h-4 w-12" : "h-6 w-16"
                          } rounded-full`}
                        ></div>
                      ) : (
                        <span
                          className={
                            isCompact
                              ? getStatusColor(tag.status).replace(
                                  "px-2 py-1",
                                  "px-1 py-0.5 text-xs"
                                )
                              : getStatusColor(tag.status)
                          }
                        >
                          {tag.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {enrichedTags.length > 0 && (
        <div
          className={`bg-gray-50 border-t text-gray-600 ${
            isCompact ? "p-2 text-xs" : "p-4 text-sm"
          }`}
        >
          <div className="flex items-center justify-center">
            <div>Total: {enrichedTags.length} tag(s) terdeteksi</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupingTable;
