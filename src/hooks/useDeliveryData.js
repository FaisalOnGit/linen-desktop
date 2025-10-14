import { useState, useCallback, useRef } from "react";
import { useCustomers } from "./useCustomers";

export const useDeliveryData = (baseUrl) => {
  // Use existing customers hook
  const { customers, loadingCustomers, fetchCustomers, getCustomerById } =
    useCustomers(baseUrl);

  // State for delivery data
  const [linens, setLinens] = useState([
    {
      epc: "",
      linenName: "",
      roomId: "",
      roomName: "",
      buildingName: "",
      isValidCustomer: null,
      status: null,
      isNonExist: false,
      isDuplicate: false,
      isProcessed: false,
      loading: false,
      errorMessage: null,
    },
  ]);

  const [processedTags, setProcessedTags] = useState(new Set());
  const [validEpcs, setValidEpcs] = useState(new Set());
  const [nonExistEpc, setNonExistEpc] = useState(new Set());
  const [duplicateEpc, setDuplicateEpc] = useState(new Set());
  const [isDataValid, setIsDataValid] = useState(false);
  const [epcCache, setEpcCache] = useState(new Map());

  // Track EPCs that are currently being processed to prevent race conditions
  const currentlyProcessing = useRef(new Set());

  // Update linen field by index
  const updateLinenField = useCallback((index, field, value) => {
    setLinens((prev) => {
      const updatedLinens = [...prev];
      updatedLinens[index] = { ...updatedLinens[index], [field]: value };
      return updatedLinens;
    });
  }, []);

  // Process scanned EPC for delivery flow (optimized version like LinenBersih)
  const processScannedEPC = useCallback(
    async (epc, customerId) => {
      if (!epc?.trim()) return false;

      console.log(`🔍 Processing Delivery EPC: ${epc}`);

      // Validate EPC format
      if (epc.length < 8 || !/^[0-9A-Fa-f]+$/.test(epc)) {
        console.warn("Invalid EPC format:", epc);
        return false;
      }

      // Check if EPC is currently being processed (race condition protection)
      if (currentlyProcessing.current.has(epc)) {
        console.log(`⚠️ EPC ${epc} sedang diproses, diabaikan`);
        return false;
      }

      // Check if EPC is already being processed or exists in processedTags
      if (processedTags.has(epc)) {
        console.log(`⚠️ EPC ${epc} sudah diproses sebelumnya, diabaikan`);
        return false;
      }

      // Mark this EPC as being processed to prevent duplicates and race conditions
      currentlyProcessing.current.add(epc);
      setProcessedTags((prev) => new Set([...prev, epc]));

      try {
        // Step 1: Check if EPC has already been determined to not exist
        if (nonExistEpc.has(epc)) {
          console.log(
            `❌ EPC ${epc} sudah dicek sebelumnya dan tidak ada di API, diabaikan`
          );
          return false;
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
            // Always append new row for cached EPCs
            setLinens((prev) => [
              ...prev,
              {
                epc,
                linenName: linenData.linenName || "",
                roomId: linenData.roomId || "",
                roomName: linenData.roomName || "",
                buildingName: linenData.buildingName || "",
                isValidCustomer,
                status: linenData.status,
                statusId: linenData.statusId || 1,
                customerId: linenData.customerId,
                customerName: linenData.customerName,
                isNonExist: false,
                isDuplicate: false,
                isProcessed: true,
                loading: false,
                errorMessage: isValidCustomer === false
                  ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                  : null,
              },
            ]);

            console.log(`📋 EPC ${epc} berhasil ditambahkan dari cache`);
            return true;
          } else {
            // Cached data is empty (not found)
            console.log(
              `📭 EPC ${epc} ada di cache tapi data kosong, ditandai sebagai tidak ada`
            );
            setNonExistEpc((prev) => new Set([...prev, epc]));
            return false;
          }
        }

        // Step 3: EPC not found in cache, need to hit API
        console.log(
          `🌐 EPC ${epc} belum ada di cache, mengambil data dari API...`
        );

        // Add new row with loading state - always append new row for new EPCs
        setLinens((prev) => [
          ...prev,
          {
            epc,
            linenName: "",
            roomId: "",
            roomName: "",
            buildingName: "",
            isValidCustomer: null,
            status: null,
            isNonExist: false,
            isDuplicate: false,
            isProcessed: true,
            loading: true,
            errorMessage: null,
          },
        ]);

        const targetIndex = linens.length; // New row index

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

              // Update the row with fetched data
              setLinens((prev) => {
                const updated = [...prev];
                // Find the loading row by EPC and update it
                const loadingIndex = updated.findIndex(
                  (linen) => linen.epc === epc && linen.loading
                );
                if (loadingIndex !== -1) {
                  updated[loadingIndex] = {
                    ...updated[loadingIndex],
                    linenName: linenData.linenName || "",
                    roomId: linenData.roomId || "",
                    roomName: linenData.roomName || "",
                    buildingName: linenData.buildingName || "",
                    isValidCustomer,
                    status: linenData.status,
                    statusId: linenData.statusId || 1,
                    customerId: linenData.customerId,
                    customerName: linenData.customerName,
                    loading: false,
                    errorMessage: isValidCustomer === false
                      ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                      : null,
                  };
                }
                return updated;
              });

              console.log(`📋 EPC ${epc} berhasil ditambahkan ke tabel dari API`);
              return true;
            } else {
              // EPC not found in API - add to cache but don't show in table
              console.log(
                `❌ EPC ${epc} tidak ditemukan di API, ditambahkan ke cache sebagai tidak ada`
              );
              setNonExistEpc((prev) => new Set([...prev, epc]));

              // Remove the loading row
              setLinens((prev) => prev.filter((linen) => !(linen.epc === epc && linen.loading)));
              return false;
            }
          } else {
            console.error(`❌ Failed to fetch linen data for EPC: ${epc}`);
            // Cache the failed response and add to non-existent cache
            setEpcCache((prev) => new Map([...prev, [epc, []]]));
            setNonExistEpc((prev) => new Set([...prev, epc]));

            // Remove the loading row
            setLinens((prev) => prev.filter((linen) => !(linen.epc === epc && linen.loading)));
            return false;
          }
        } catch (error) {
          console.error(`❌ Error fetching linen data for EPC: ${epc}`, error);
          // Cache the error and add to non-existent cache
          setEpcCache((prev) => new Map([...prev, [epc, []]]));
          setNonExistEpc((prev) => new Set([...prev, epc]));

          // Remove the loading row
          setLinens((prev) => prev.filter((linen) => !(linen.epc === epc && linen.loading)));
          return false;
        }
      } finally {
        // Always remove from currently processing set when done
        currentlyProcessing.current.delete(epc);
      }
    },
    [processedTags, nonExistEpc, epcCache]
  );

  
  // Validate manual EPC input (optimized version like LinenBersih)
  const validateManualEPC = async (epc, index, customerId) => {
    if (!epc?.trim()) {
      updateLinenField(index, "isNonExist", false);
      updateLinenField(index, "isDuplicate", false);
      updateLinenField(index, "isValidCustomer", null);
      updateLinenField(index, "loading", false);
      return;
    }

    // Validate EPC format
    if (epc.length < 8 || !/^[0-9A-Fa-f]+$/.test(epc)) {
      updateLinenField(index, "errorMessage", "Invalid EPC format");
      updateLinenField(index, "isNonExist", true);
      updateLinenField(index, "loading", false);
      return;
    }

    // Check for duplicates
    const duplicateCount = linens.filter(
      (linen, i) => i !== index && linen.epc === epc
    ).length;

    if (duplicateCount > 0) {
      updateLinenField(index, "isDuplicate", true);
      updateLinenField(index, "errorMessage", "Duplicate EPC");
      updateLinenField(index, "loading", false);
      setDuplicateEpc((prev) => new Set([...prev, epc]));
      return;
    } else {
      updateLinenField(index, "isDuplicate", false);
      setDuplicateEpc((prev) => {
        const newSet = new Set(prev);
        newSet.delete(epc);
        return newSet;
      });
    }

    // Check if EPC is currently being processed (race condition protection)
    if (currentlyProcessing.current.has(epc)) {
      console.log(`⚠️ EPC ${epc} sedang diproses, menunggu...`);
      return;
    }

    // Mark this EPC as being processed
    currentlyProcessing.current.add(epc);
    updateLinenField(index, "loading", true);
    updateLinenField(index, "isNonExist", false);
    updateLinenField(index, "isProcessed", true);

    try {
      // Step 1: Check if EPC has already been determined to not exist
      if (nonExistEpc.has(epc)) {
        console.log(`❌ EPC ${epc} sudah dicek sebelumnya dan tidak ada di API`);
        updateLinenField(index, "isNonExist", true);
        updateLinenField(index, "loading", false);
        updateLinenField(index, "errorMessage", "EPC tidak ditemukan di database");
        return;
      }

      // Step 2: Check if EPC is already cached
      if (epcCache.has(epc)) {
        console.log(`✅ EPC ${epc} sudah di-cache, menggunakan data yang tersimpan`);
        const cachedData = epcCache.get(epc);

        if (cachedData && cachedData.length > 0) {
          const linenData = cachedData[0];

          // Check if the linen belongs to the selected customer
          const isValidCustomer =
            !customerId || linenData.customerId === customerId;

          // Add to valid EPCs set
          setValidEpcs((prev) => new Set([...prev, epc]));

          // Update the specific linen row with cached data
          updateLinenField(index, "linenName", linenData.linenName || "");
          updateLinenField(index, "roomId", linenData.roomId || "");
          updateLinenField(index, "roomName", linenData.roomName || "");
          updateLinenField(index, "buildingName", linenData.buildingName || "");
          updateLinenField(index, "isValidCustomer", isValidCustomer);
          updateLinenField(index, "status", linenData.status);
          updateLinenField(index, "statusId", linenData.statusId || 1);
          updateLinenField(index, "customerId", linenData.customerId);
          updateLinenField(index, "customerName", linenData.customerName);
          updateLinenField(index, "loading", false);
          updateLinenField(index, "errorMessage", isValidCustomer === false
            ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
            : null);

          console.log(`📋 EPC ${epc} berhasil diperbarui dari cache`);
          return;
        } else {
          // Cached data is empty (not found)
          updateLinenField(index, "isNonExist", true);
          updateLinenField(index, "loading", false);
          updateLinenField(index, "errorMessage", "EPC tidak ditemukan di database");
          console.log(`📭 EPC ${epc} ada di cache tapi data kosong`);
          return;
        }
      }

      // Step 3: EPC not found in cache, need to hit API
      console.log(`🌐 EPC ${epc} belum ada di cache, mengambil data dari API...`);

      try {
        const token = await window.authAPI.getToken();
        console.log(`📡 Calling API for manual EPC: ${epc}`);

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
            console.log(`✅ Found linen data for EPC: ${epc} - ${linenData.linenName}`);

            // Check if the linen belongs to the selected customer
            const isValidCustomer =
              !customerId || linenData.customerId === customerId;

            // Add to valid EPCs set
            setValidEpcs((prev) => new Set([...prev, epc]));

            // Update the specific linen row with fetched data
            updateLinenField(index, "linenName", linenData.linenName || "");
            updateLinenField(index, "roomId", linenData.roomId || "");
            updateLinenField(index, "roomName", linenData.roomName || "");
            updateLinenField(index, "buildingName", linenData.buildingName || "");
            updateLinenField(index, "isValidCustomer", isValidCustomer);
            updateLinenField(index, "status", linenData.status);
            updateLinenField(index, "statusId", linenData.statusId || 1);
            updateLinenField(index, "customerId", linenData.customerId);
            updateLinenField(index, "customerName", linenData.customerName);
            updateLinenField(index, "loading", false);
            updateLinenField(index, "errorMessage", isValidCustomer === false
              ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
              : null);

            console.log(`📋 EPC ${epc} berhasil diperbarui dari API`);
          } else {
            // EPC not found in API
            console.log(`❌ EPC ${epc} tidak ditemukan di API`);
            updateLinenField(index, "isNonExist", true);
            updateLinenField(index, "loading", false);
            updateLinenField(index, "errorMessage", "EPC tidak ditemukan di database");
            setNonExistEpc((prev) => new Set([...prev, epc]));
          }
        } else {
          console.error(`❌ Failed to fetch linen data for EPC: ${epc}`);
          updateLinenField(index, "isNonExist", true);
          updateLinenField(index, "loading", false);
          updateLinenField(index, "errorMessage", "Gagal memvalidasi EPC");
          // Cache the failed response and add to non-existent cache
          setEpcCache((prev) => new Map([...prev, [epc, []]]));
          setNonExistEpc((prev) => new Set([...prev, epc]));
        }
      } catch (error) {
        console.error(`❌ Error fetching linen data for EPC: ${epc}`, error);
        updateLinenField(index, "isNonExist", true);
        updateLinenField(index, "loading", false);
        updateLinenField(index, "errorMessage", "Gagal memvalidasi EPC");
        // Cache the error and add to non-existent cache
        setEpcCache((prev) => new Map([...prev, [epc, []]]));
        setNonExistEpc((prev) => new Set([...prev, epc]));
      }
    } finally {
      // Always remove from currently processing set when done
      currentlyProcessing.current.delete(epc);
    }
  };

  // Validate all linens when customer changes (optimized version)
  const validateAllLinens = useCallback(
    async (customerId) => {
      if (!customerId) {
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
            const isValid = linen.customerId === customerId;
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
    },
    []
  );

  // Add new linen row
  const addLinenRow = useCallback(() => {
    setLinens((prev) => [
      ...prev,
      {
        epc: "",
        linenName: "",
        roomId: "",
        roomName: "",
        buildingName: "",
        isValidCustomer: null,
        status: null,
        isNonExist: false,
        isDuplicate: false,
        isProcessed: false,
        loading: false,
        errorMessage: null,
      },
    ]);
  }, []);

  // Remove linen row by index
  const removeLinenRow = useCallback((index) => {
    // Ensure we can't delete if only 1 row remains
    if (linens.length <= 1) {
      return false;
    }

    try {
      const removedLinen = linens[index];

      // Remove from tracking sets
      if (removedLinen?.epc) {
        setProcessedTags((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });

        setValidEpcs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });

        setNonExistEpc((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });

        setDuplicateEpc((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });
      }

      setLinens((prev) => prev.filter((_, i) => i !== index));
      return true;
    } catch (error) {
      console.error("Error removing linen row:", error);
      return false;
    }
  }, [linens.length]);

  // Clear all EPCs and reset state
  const clearAllEPCs = useCallback(() => {
    console.log("🧹 Clearing all delivery EPC data...");

    setLinens([
      {
        epc: "",
        linenName: "",
        roomId: "",
        roomName: "",
        buildingName: "",
        isValidCustomer: null,
        status: null,
        isNonExist: false,
        isDuplicate: false,
        isProcessed: false,
        loading: false,
        errorMessage: null,
      },
    ]);

    setProcessedTags(new Set());
    setValidEpcs(new Set());
    setNonExistEpc(new Set());
    setDuplicateEpc(new Set());
    setIsDataValid(false);
    setEpcCache(new Map());

    // Clear currently processing set
    currentlyProcessing.current.clear();

    console.log("✅ All delivery EPC data cleared - processedTags, cache, and linens reset");
  }, []);

  // Get count of valid linens
  const getValidLinenCount = useCallback(() => {
    return linens.filter(
      (linen) =>
        linen.epc?.trim() &&
        !linen.isNonExist &&
        !linen.isDuplicate &&
        linen.isValidCustomer !== false
    ).length;
  }, [linens]);

  // Get count of invalid linens
  const getInvalidLinenCount = useCallback(() => {
    return linens.filter(
      (linen) =>
        linen.epc?.trim() &&
        (linen.isNonExist ||
          linen.isDuplicate ||
          linen.isValidCustomer === false)
    ).length;
  }, [linens]);

  // Check if all linens are valid for submission
  const checkAllLinensValid = useCallback(() => {
    const hasInvalid = linens.some(
      (linen) =>
        linen.epc?.trim() &&
        (linen.isNonExist ||
          linen.isDuplicate ||
          linen.isValidCustomer === false)
    );

    const hasValid = linens.some(
      (linen) =>
        linen.epc?.trim() &&
        !linen.isNonExist &&
        !linen.isDuplicate &&
        linen.isValidCustomer !== false
    );

    setIsDataValid(hasValid && !hasInvalid);
  }, [linens]);

  // Update validation status when linens change
  const checkDataValidity = useCallback(() => {
    const invalidCount = getInvalidLinenCount();
    const validCount = getValidLinenCount();
    const hasEPCData = linens.some((linen) => linen.epc?.trim());

    setIsDataValid(hasEPCData && validCount > 0 && invalidCount === 0);
  }, [getInvalidLinenCount, getValidLinenCount, linens]);

  return {
    // State
    linens,
    processedTags,
    validEpcs,
    nonExistEpc,
    duplicateEpc,
    isDataValid,
    epcCache,

    // Customer management (reused from existing hook)
    customers,
    loadingCustomers,
    fetchCustomers,
    getCustomerById,

    // EPC Processing
    processScannedEPC,
    validateManualEPC,
    validateAllLinens,

    // Linen Management
    addLinenRow,
    removeLinenRow,
    clearAllEPCs,
    updateLinenField,

    // Computed values
    getValidLinenCount,
    getInvalidLinenCount,
    checkAllLinensValid,
    checkDataValidity,
  };
};