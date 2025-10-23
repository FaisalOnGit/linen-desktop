import { useState, useCallback, useRef } from "react";

export const useLinenData = (baseUrl, customerId, roomId) => {
  const [linens, setLinens] = useState([
    {
      epc: "",
      status_id: 1,
      loading: false,
      isValidCustomer: true,
      isValidRoom: true,
    },
  ]);
  const [processedTags, setProcessedTags] = useState(new Set());
  const [validEpcs, setValidEpcs] = useState(new Set());
  const [nonExistentEpcs, setNonExistentEpcs] = useState(new Set());
  const [epcCache, setEpcCache] = useState(new Map());

  // Track EPCs that are currently being processed to prevent race conditions
  const currentlyProcessing = useRef(new Set());

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
      {
        epc: "",
        status_id: 1,
        loading: false,
        isValidCustomer: true,
        isValidRoom: true,
      },
    ]);

    // Clear ALL tracking states including processedTags and cache
    setProcessedTags(new Set());
    setValidEpcs(new Set());
    setNonExistentEpcs(new Set());
    setEpcCache(new Map());

    // Clear currently processing set
    currentlyProcessing.current.clear();

    console.log(
      "✅ All EPC data cleared - processedTags, cache, and linens reset"
    );
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
        updatedLinens[index].isValidRoom = true;
        updatedLinens[index].errorMessage = null;
      } else if (field === "status_id") {
        updatedLinens[index][field] = parseInt(value);
      } else {
        updatedLinens[index][field] = value;
      }
      return updatedLinens;
    });
  }, []);

  // Revalidate all linens when customer or room changes
  const revalidateLinens = useCallback((newCustomerId, newRoomId) => {
    if (!newCustomerId) {
      // If no customer selected, mark all as valid
      setLinens((prev) =>
        prev.map((linen) => ({
          ...linen,
          isValidCustomer: true,
          isValidRoom: true,
          errorMessage: null,
        }))
      );
      return;
    }

    setLinens((prev) =>
      prev.map((linen) => {
        if (linen.epc && linen.customerId) {
          const isValidCustomer = linen.customerId === newCustomerId;
          const isValidRoom = !newRoomId || linen.roomId === newRoomId;

          return {
            ...linen,
            isValidCustomer: isValidCustomer,
            isValidRoom: isValidRoom,
            errorMessage: !isValidCustomer
              ? `Tag milik ${linen.customerName} (${linen.customerId})`
              : !isValidRoom
              ? `Tag milik room ${linen.roomName} (${linen.roomId})`
              : null,
          };
        }
        return linen;
      })
    );
  }, []);

  // Process EPC from RFID scan (main function for RFID scanning)
  const processScannedEPC = useCallback(
    async (epc, currentCustomerId = null, currentRoomId = null) => {
      if (!epc.trim()) return;

      console.log(`🔍 Processing LinenBersih EPC: ${epc}`);

      // Use provided customer/room IDs or fallback to hook state
      const targetCustomerId =
        currentCustomerId !== null ? currentCustomerId : customerId;
      const targetRoomId = currentRoomId !== null ? currentRoomId : roomId;

      // Check if EPC is currently being processed (race condition protection)
      if (currentlyProcessing.current.has(epc)) {
        console.log(`⚠️ EPC ${epc} sedang diproses, diabaikan`);
        return;
      }

      // Check if EPC is already being processed or exists in processedTags
      if (processedTags.has(epc)) {
        console.log(`⚠️ EPC ${epc} sudah diproses sebelumnya, diabaikan`);
        return;
      }

      // Check if EPC already exists in current linens (this is the real check)
      const existingIndex = linens.findIndex((linen) => linen.epc === epc);
      if (existingIndex !== -1) {
        console.log(`⚠️ EPC ${epc} sudah ada di tabel, diabaikan`);
        return;
      }

      // Mark this EPC as being processed to prevent duplicates and race conditions
      currentlyProcessing.current.add(epc);
      setProcessedTags((prev) => new Set([...prev, epc]));

      try {
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

            // Check if the linen belongs to the selected customer and room
            const isValidCustomer =
              !targetCustomerId || linenData.customerId === targetCustomerId;
            const isValidRoom =
              !targetRoomId || linenData.roomId === targetRoomId;

            // Add to valid EPCs set
            setValidEpcs((prev) => new Set([...prev, epc]));

            // EPC exists in cache - add it to the table
            setLinens((prev) => {
              const emptyRowIndex = prev.findIndex(
                (linen) => linen.epc.trim() === ""
              );

              if (emptyRowIndex !== -1) {
                // Use existing empty row and add a new empty row at the end
                const updated = prev.map((linen, i) =>
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
                        isValidRoom: isValidRoom,
                        errorMessage: !isValidCustomer
                          ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                          : !isValidRoom
                          ? `Tag milik room ${linenData.roomName} (${linenData.roomId})`
                          : null,
                      }
                    : linen
                );

                // Add a new empty row to maintain structure
                return [
                  ...updated,
                  {
                    epc: "",
                    status_id: 1,
                    loading: false,
                    isValidCustomer: true,
                    isValidRoom: true,
                  },
                ];
              } else {
                // No empty row found, append new EPC and add empty row
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
                    isValidRoom: isValidRoom,
                    errorMessage: !isValidCustomer
                      ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                      : !isValidRoom
                      ? `Tag milik room ${linenData.roomName} (${linenData.roomId})`
                      : null,
                  },
                  {
                    epc: "",
                    status_id: 1,
                    loading: false,
                    isValidCustomer: true,
                    isValidRoom: true,
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

              // Check if the linen belongs to the selected customer and room
              const isValidCustomer =
                !targetCustomerId || linenData.customerId === targetCustomerId;
              const isValidRoom =
                !targetRoomId || linenData.roomId === targetRoomId;

              // Add to valid EPCs set
              setValidEpcs((prev) => new Set([...prev, epc]));

              // EPC exists in API - add it to the table
              setLinens((prev) => {
                const emptyRowIndex = prev.findIndex(
                  (linen) => linen.epc.trim() === ""
                );

                if (emptyRowIndex !== -1) {
                  // Use existing empty row and add a new empty row at the end
                  const updated = prev.map((linen, i) =>
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
                          isValidRoom: isValidRoom,
                          errorMessage: !isValidCustomer
                            ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                            : !isValidRoom
                            ? `Tag milik room ${linenData.roomName} (${linenData.roomId})`
                            : null,
                        }
                      : linen
                  );

                  // Add a new empty row to maintain structure
                  return [
                    ...updated,
                    {
                      epc: "",
                      status_id: 1,
                      loading: false,
                      isValidCustomer: true,
                      isValidRoom: true,
                    },
                  ];
                } else {
                  // No empty row found, append new EPC and add empty row
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
                      isValidRoom: isValidRoom,
                      errorMessage: !isValidCustomer
                        ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                        : !isValidRoom
                        ? `Tag milik room ${linenData.roomName} (${linenData.roomId})`
                        : null,
                    },
                    {
                      epc: "",
                      status_id: 1,
                      loading: false,
                      isValidCustomer: true,
                      isValidRoom: true,
                    },
                  ];
                }
              });
              console.log(
                `📋 EPC ${epc} berhasil ditambahkan ke tabel dari API`
              );
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
      } finally {
        // Always remove from currently processing set when done
        currentlyProcessing.current.delete(epc);
      }
    },
    [baseUrl, epcCache, nonExistentEpcs]
  );

  // Handle manual EPC input validation
  const validateManualEPC = useCallback(
    async (epc, index, currentCustomerId = null, currentRoomId = null) => {
      if (!epc.trim()) return;

      console.log(`🔍 Manual input processing EPC: ${epc}`);

      // Use provided customer/room IDs or fallback to hook state
      const targetCustomerId =
        currentCustomerId !== null ? currentCustomerId : customerId;
      const targetRoomId = currentRoomId !== null ? currentRoomId : roomId;

      // Check if EPC is already cached
      if (epcCache.has(epc)) {
        console.log(
          `✅ EPC ${epc} sudah di-cache, menggunakan data yang tersimpan`
        );
        const cachedData = epcCache.get(epc);

        if (cachedData && cachedData.length > 0) {
          const linenData = cachedData[0];

          // Check if the linen belongs to the selected customer and room
          const isValidCustomer =
            !targetCustomerId || linenData.customerId === targetCustomerId;
          const isValidRoom =
            !targetRoomId || linenData.roomId === targetRoomId;

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
                    isValidRoom: isValidRoom,
                    errorMessage: !isValidCustomer
                      ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                      : !isValidRoom
                      ? `Tag milik room ${linenData.roomName} (${linenData.roomId})`
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
                    isValidRoom: true,
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

            // Check if the linen belongs to the selected customer and room
            const isValidCustomer =
              !targetCustomerId || linenData.customerId === targetCustomerId;
            const isValidRoom =
              !targetRoomId || linenData.roomId === targetRoomId;

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
                    isValidRoom: true,
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
    [baseUrl, epcCache]
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

  // Get count of invalid room linens
  const getInvalidRoomLinenCount = useCallback(() => {
    return linens.filter(
      (linen) => linen.epc?.trim() && linen.isValidRoom === false
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
    getInvalidRoomLinenCount,
    setProcessedTags,
  };
};
