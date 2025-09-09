import React, { useState, useEffect } from "react";

const GroupingTable = ({ groupingTags }) => {
  const [enrichedTags, setEnrichedTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(new Set());

  // API function to fetch linen data by EPC
  const fetchLinenData = async (epc) => {
    if (!epc) return null;

    try {
      const response = await fetch(
        `https://app.nci.co.id/base_linen/api/Process/linen_rfid?epc=${epc}`
      );

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
            room: apiData?.roomName || tag.room || "-",
            status: apiData?.status || tag.status || "-",
            linenTypeName: apiData?.linenTypeName || tag.linenTypeName,
            customerId: apiData?.customerId || tag.customerId,
            linenId: apiData?.linenId || tag.linenId,
            roomId: apiData?.roomId || tag.roomId,
            statusId: apiData?.statusId || tag.statusId,
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
              <th className="text-left py-4 px-4 font-medium text-gray-700">
                Info
              </th>
            </tr>
          </thead>
          <tbody>
            {enrichedTags.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 px-4 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                      <svg
                        className="w-6 h-6 text-gray-400"
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
                    <p>Tidak ada tag terdeteksi</p>
                    <p className="text-sm text-gray-400 mt-1">
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
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4 text-gray-800 font-mono text-sm">
                      {epc || "N/A"}
                    </td>
                    <td className="py-4 px-4 text-gray-800">
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          <span className="text-gray-400">Loading...</span>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">{tag.linenName}</div>
                          {tag.linenTypeName && (
                            <div className="text-sm text-gray-500">
                              {tag.linenTypeName}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-800">
                      {isLoading ? (
                        <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
                      ) : (
                        <div>
                          <div className="font-medium">{tag.customerName}</div>
                          {tag.customerId &&
                            tag.customerId !== tag.customerName && (
                              <div className="text-sm text-gray-500">
                                {tag.customerId}
                              </div>
                            )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-800">
                      {isLoading ? (
                        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
                      ) : (
                        <div>
                          <div className="font-medium">{tag.room}</div>
                          {tag.roomId && tag.roomId !== tag.room && (
                            <div className="text-sm text-gray-500">
                              {tag.roomId}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {isLoading ? (
                        <div className="animate-pulse bg-gray-200 h-6 w-16 rounded-full"></div>
                      ) : (
                        <span className={getStatusColor(tag.status)}>
                          {tag.status}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        {tag.isLoaded ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            API
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            RFID
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {enrichedTags.length > 0 && (
        <div className="p-4 bg-gray-50 border-t text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <div>Total: {enrichedTags.length} tag(s) terdeteksi</div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span>Data dari API</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                <span>Data RFID saja</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupingTable;
