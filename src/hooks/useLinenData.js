import { useState, useCallback } from "react";

export const useLinenData = (baseUrl, customerId) => {
  const [linens, setLinens] = useState([
    { epc: "", status_id: 1, loading: false, isValidCustomer: true },
  ]);
  const [processedTags, setProcessedTags] = useState(new Set());
  const [validEpcs, setValidEpcs] = useState(new Set());
  const [nonExistentEpcs, setNonExistentEpcs] = useState(new Set());
  const [epcCache, setEpcCache] = useState(new Map());

  // Add new empty linen row
  const addLinenRow = useCallback(() => {
    setLinens((prev) => [
      ...prev,
      { epc: "", status_id: 1, loading: false, isValidCustomer: true },
    ]);
  }, []);

  // Remove linen row by index
  const removeLinenRow = useCallback((index) => {
    setLinens((prev) => {
      if (prev.length > 1) {
        const removedLinen = prev[index];
        // Remove EPC from processed tags if it's being deleted
        if (removedLinen.epc) {
          setProcessedTags((processed) => {
            const newSet = new Set(processed);
            newSet.delete(removedLinen.epc);
            return newSet;
          });
        }
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  }, []);

  // Clear all EPCs and reset state
  const clearAllEPCs = useCallback(() => {
    console.log("🧹 Clearing all EPC data...");

    // Reset all linen data to initial state
    setLinens([
      { epc: "", status_id: 1, loading: false, isValidCustomer: true },
    ]);

    // Clear ALL tracking states including processedTags and cache
    setProcessedTags(new Set());
    setValidEpcs(new Set());
    setNonExistentEpcs(new Set());
    setEpcCache(new Map());

    console.log("✅ All EPC data cleared - processedTags, cache, and linens reset");
  }, []);

  // Update linen field by index
  const updateLinenField = useCallback((index, field, value) => {
    setLinens((prev) => {
      const updatedLinens = [...prev];
      if (field === "epc") {
        updatedLinens[index][field] = value;
        // Clear previous data when EPC changes
        updatedLinens[index].status = "";
        updatedLinens[index].linenName = "";
        updatedLinens[index].roomName = "";
        updatedLinens[index].loading = false;
        updatedLinens[index].isValidCustomer = true;
        updatedLinens[index].errorMessage = null;
      } else if (field === "status_id") {
        updatedLinens[index][field] = parseInt(value);
      } else {
        updatedLinens[index][field] = value;
      }
      return updatedLinens;
    });
  }, []);

  // Revalidate all linens when customer changes
  const revalidateLinens = useCallback((newCustomerId) => {
    if (!newCustomerId) {
      // If no customer selected, mark all as valid
      setLinens((prev) =>
        prev.map((linen) => ({
          ...linen,
          isValidCustomer: true,
          errorMessage: null,
        }))
      );
      return;
    }

    setLinens((prev) =>
      prev.map((linen) => {
        if (linen.epc && linen.customerId) {
          const isValid = linen.customerId === newCustomerId;
          return {
            ...linen,
            isValidCustomer: isValid,
            errorMessage: !isValid
              ? `Tag milik ${linen.customerName} (${linen.customerId})`
              : null,
          };
        }
        return linen;
      })
    );
  }, []);

  // Process EPC from RFID scan (main function for RFID scanning)
  const processScannedEPC = useCallback(
    async (epc) => {
      if (!epc.trim()) return;

      console.log(`🔍 Processing EPC: ${epc}`);

      // Step 1: Check if EPC has already been determined to not exist
      if (nonExistentEpcs.has(epc)) {
        console.log(
          `❌ EPC ${epc} sudah dicek sebelumnya dan tidak ada di API, diabaikan`
        );
        return;
      }

      // Step 2: Check if EPC is already cached
      if (epcCache.has(epc)) {
        console.log(
          `✅ EPC ${epc} sudah di-cache, menggunakan data yang tersimpan`
        );
        const cachedData = epcCache.get(epc);

        if (cachedData && cachedData.length > 0) {
          const linenData = cachedData[0];

          // Check if the linen belongs to the selected customer
          const isValidCustomer =
            !customerId || linenData.customerId === customerId;

          // Add to valid EPCs set
          setValidEpcs((prev) => new Set([...prev, epc]));

          // EPC exists in cache - add it to the table
          setLinens((prev) => {
            const emptyRowIndex = prev.findIndex(
              (linen) => linen.epc.trim() === ""
            );

            if (emptyRowIndex !== -1) {
              // Use existing empty row
              return prev.map((linen, i) =>
                i === emptyRowIndex
                  ? {
                      ...linen,
                      epc: linenData.epc,
                      customerId: linenData.customerId,
                      customerName: linenData.customerName,
                      linenId: linenData.linenId,
                      linenTypeName: linenData.linenTypeName,
                      linenName: linenData.linenName,
                      roomId: linenData.roomId,
                      roomName: linenData.roomName,
                      statusId: linenData.statusId,
                      status: linenData.status,
                      loading: false,
                      isValidCustomer: isValidCustomer,
                      errorMessage: !isValidCustomer
                        ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                        : null,
                    }
                  : linen
              );
            } else {
              // Create new row
              return [
                ...prev,
                {
                  epc: linenData.epc,
                  customerId: linenData.customerId,
                  customerName: linenData.customerName,
                  linenId: linenData.linenId,
                  linenTypeName: linenData.linenTypeName,
                  linenName: linenData.linenName,
                  roomId: linenData.roomId,
                  roomName: linenData.roomName,
                  statusId: linenData.statusId,
                  status: linenData.status,
                  status_id: linenData.statusId || 1,
                  loading: false,
                  isValidCustomer: isValidCustomer,
                  errorMessage: !isValidCustomer
                    ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                    : null,
                },
              ];
            }
          });
          console.log(`📋 EPC ${epc} berhasil ditambahkan dari cache`);
        } else {
          // Cached data is empty (not found)
          console.log(
            `📭 EPC ${epc} ada di cache tapi data kosong, ditandai sebagai tidak ada`
          );
          setNonExistentEpcs((prev) => new Set([...prev, epc]));
        }
        return;
      }

      // Step 3: EPC not found in cache, need to hit API
      console.log(
        `🌐 EPC ${epc} belum ada di cache, mengambil data dari API...`
      );

      try {
        const token = await window.authAPI.getToken();
        console.log(`📡 Calling API for EPC: ${epc}`);

        const response = await fetch(
          `${baseUrl}/Process/linen_rfid?epc=${encodeURIComponent(epc)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          console.log(`💾 Saving API response to cache for EPC: ${epc}`);
          // Cache the response regardless of success or failure
          setEpcCache((prev) => new Map([...prev, [epc, result.data || []]]));

          if (result.success && result.data && result.data.length > 0) {
            const linenData = result.data[0];
            console.log(
              `✅ Found linen data for EPC: ${epc} - ${linenData.linenName}`
            );

            // Check if the linen belongs to the selected customer
            const isValidCustomer =
              !customerId || linenData.customerId === customerId;

            // Add to valid EPCs set
            setValidEpcs((prev) => new Set([...prev, epc]));

            // EPC exists in API - add it to the table
            setLinens((prev) => {
              const emptyRowIndex = prev.findIndex(
                (linen) => linen.epc.trim() === ""
              );

              if (emptyRowIndex !== -1) {
                // Use existing empty row
                return prev.map((linen, i) =>
                  i === emptyRowIndex
                    ? {
                        ...linen,
                        epc: linenData.epc,
                        customerId: linenData.customerId,
                        customerName: linenData.customerName,
                        linenId: linenData.linenId,
                        linenTypeName: linenData.linenTypeName,
                        linenName: linenData.linenName,
                        roomId: linenData.roomId,
                        roomName: linenData.roomName,
                        statusId: linenData.statusId,
                        status: linenData.status,
                        loading: false,
                        isValidCustomer: isValidCustomer,
                        errorMessage: !isValidCustomer
                          ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                          : null,
                      }
                    : linen
                );
              } else {
                // Create new row
                return [
                  ...prev,
                  {
                    epc: linenData.epc,
                    customerId: linenData.customerId,
                    customerName: linenData.customerName,
                    linenId: linenData.linenId,
                    linenTypeName: linenData.linenTypeName,
                    linenName: linenData.linenName,
                    roomId: linenData.roomId,
                    roomName: linenData.roomName,
                    statusId: linenData.statusId,
                    status: linenData.status,
                    status_id: linenData.statusId || 1,
                    loading: false,
                    isValidCustomer: isValidCustomer,
                    errorMessage: !isValidCustomer
                      ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                      : null,
                  },
                ];
              }
            });
            console.log(`📋 EPC ${epc} berhasil ditambahkan ke tabel dari API`);
          } else {
            // EPC not found in API - add to cache but don't show in table
            console.log(
              `❌ EPC ${epc} tidak ditemukan di API, ditambahkan ke cache sebagai tidak ada`
            );
            setNonExistentEpcs((prev) => new Set([...prev, epc]));
          }
        } else {
          console.error(`❌ Failed to fetch linen data for EPC: ${epc}`);
          // Cache the failed response and add to non-existent cache
          setEpcCache((prev) => new Map([...prev, [epc, []]]));
          setNonExistentEpcs((prev) => new Set([...prev, epc]));
        }
      } catch (error) {
        console.error(`❌ Error fetching linen data for EPC: ${epc}`, error);
        // Cache the error and add to non-existent cache
        setEpcCache((prev) => new Map([...prev, [epc, []]]));
        setNonExistentEpcs((prev) => new Set([...prev, epc]));
      }
    },
    [baseUrl, customerId, epcCache, nonExistentEpcs]
  );

  // Handle manual EPC input validation
  const validateManualEPC = useCallback(
    async (epc, index) => {
      if (!epc.trim()) return;

      console.log(`🔍 Manual input processing EPC: ${epc}`);

      // Check if EPC is already cached
      if (epcCache.has(epc)) {
        console.log(
          `✅ EPC ${epc} sudah di-cache, menggunakan data yang tersimpan`
        );
        const cachedData = epcCache.get(epc);

        if (cachedData && cachedData.length > 0) {
          const linenData = cachedData[0];

          // Check if the linen belongs to the selected customer
          const isValidCustomer =
            !customerId || linenData.customerId === customerId;

          // Add to valid EPCs set
          setValidEpcs((prev) => new Set([...prev, epc]));

          // Update the specific linen row with cached data
          setLinens((prev) =>
            prev.map((linen, i) =>
              i === index
                ? {
                    ...linen,
                    epc: linenData.epc,
                    customerId: linenData.customerId,
                    customerName: linenData.customerName,
                    linenId: linenData.linenId,
                    linenTypeName: linenData.linenTypeName,
                    linenName: linenData.linenName,
                    roomId: linenData.roomId,
                    roomName: linenData.roomName,
                    statusId: linenData.statusId,
                    status: linenData.status,
                    loading: false,
                    isValidCustomer: isValidCustomer,
                    errorMessage: !isValidCustomer
                      ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                      : null,
                  }
                : linen
            )
          );
        } else {
          // Cached data is empty (not found)
          setNonExistentEpcs((prev) => new Set([...prev, epc]));

          setLinens((prev) => {
            const filtered = prev.filter((_, i) => i !== index);
            // Ensure at least one empty row remains
            return filtered.length > 0
              ? filtered
              : [
                  {
                    epc: "",
                    status_id: 1,
                    loading: false,
                    isValidCustomer: true,
                  },
                ];
          });

          // Remove from processed tags so it can be scanned again if needed
          setProcessedTags((prev) => {
            const newSet = new Set(prev);
            newSet.delete(epc);
            return newSet;
          });
        }
        return;
      }

      // Fetch from API for manual input
      try {
        const token = await window.authAPI.getToken();
        const response = await fetch(
          `${baseUrl}/Process/linen_rfid?epc=${encodeURIComponent(epc)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          // Cache the response regardless of success or failure
          setEpcCache((prev) => new Map([...prev, [epc, result.data || []]]));

          if (result.success && result.data && result.data.length > 0) {
            const linenData = result.data[0];

            // Check if the linen belongs to the selected customer
            const isValidCustomer =
              !customerId || linenData.customerId === customerId;

            // Add to valid EPCs set
            setValidEpcs((prev) => new Set([...prev, epc]));

            // Update the specific linen row with fetched data
            setLinens((prev) =>
              prev.map((linen, i) =>
                i === index
                  ? {
                      ...linen,
                      epc: linenData.epc,
                      customerId: linenData.customerId,
                      customerName: linenData.customerName,
                      linenId: linenData.linenId,
                      linenTypeName: linenData.linenTypeName,
                      linenName: linenData.linenName,
                      roomId: linenData.roomId,
                      roomName: linenData.roomName,
                      statusId: linenData.statusId,
                      status: linenData.status,
                      loading: false,
                      isValidCustomer: isValidCustomer,
                      errorMessage: !isValidCustomer
                        ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                        : null,
                    }
                  : linen
              )
            );
          } else {
            // EPC not found in API - add to cache and remove the row
            console.log(
              `EPC ${epc} tidak ditemukan di API, menambahkan ke cache dan menghapus baris`
            );
            setNonExistentEpcs((prev) => new Set([...prev, epc]));

            setLinens((prev) => {
              const filtered = prev.filter((_, i) => i !== index);
              // Ensure at least one empty row remains
              return filtered.length > 0
                ? filtered
                : [
                    {
                      epc: "",
                      status_id: 1,
                      loading: false,
                      isValidCustomer: true,
                    },
                  ];
            });

            // Remove from processed tags so it can be scanned again if needed
            setProcessedTags((prev) => {
              const newSet = new Set(prev);
              newSet.delete(epc);
              return newSet;
            });
          }
        } else {
          console.error("Failed to fetch linen data for EPC:", epc);
          // Cache the failed response and add to non-existent cache
          setEpcCache((prev) => new Map([...prev, [epc, []]]));
          setNonExistentEpcs((prev) => new Set([...prev, epc]));

          setLinens((prev) => {
            const filtered = prev.filter((_, i) => i !== index);
            return filtered.length > 0
              ? filtered
              : [
                  {
                    epc: "",
                    status_id: 1,
                    loading: false,
                    isValidCustomer: true,
                  },
                ];
          });

          setProcessedTags((prev) => {
            const newSet = new Set(prev);
            newSet.delete(epc);
            return newSet;
          });
        }
      } catch (error) {
        console.error("Error fetching linen data:", error);
        // Cache the error and add to non-existent cache
        setEpcCache((prev) => new Map([...prev, [epc, []]]));
        setNonExistentEpcs((prev) => new Set([...prev, epc]));

        setLinens((prev) => {
          const filtered = prev.filter((_, i) => i !== index);
          return filtered.length > 0
            ? filtered
            : [
                {
                  epc: "",
                  status_id: 1,
                  loading: false,
                  isValidCustomer: true,
                },
              ];
        });

        setProcessedTags((prev) => {
          const newSet = new Set(prev);
          newSet.delete(epc);
          return newSet;
        });
      }
    },
    [baseUrl, customerId, epcCache]
  );

  // Get count of valid linens (with EPC and valid customer)
  const getValidLinenCount = useCallback(() => {
    return linens.filter(
      (linen) => linen.epc?.trim() && linen.isValidCustomer !== false
    ).length;
  }, [linens]);

  // Get count of invalid linens
  const getInvalidLinenCount = useCallback(() => {
    return linens.filter(
      (linen) => linen.epc?.trim() && linen.isValidCustomer === false
    ).length;
  }, [linens]);

  return {
    // State
    linens,
    processedTags,
    validEpcs,
    nonExistentEpcs,
    epcCache,

    // Actions
    addLinenRow,
    removeLinenRow,
    clearAllEPCs,
    updateLinenField,
    revalidateLinens,
    processScannedEPC,
    validateManualEPC,

    // Computed values
    getValidLinenCount,
    getInvalidLinenCount,
    setProcessedTags,
  };
};
