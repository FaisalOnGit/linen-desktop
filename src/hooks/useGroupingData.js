import { useState, useCallback, useRef } from "react";

export const useGroupingData = (baseUrl) => {
  const [processedTags, setProcessedTags] = useState(new Set());
  const [validEpcs, setValidEpcs] = useState(new Set());
  const [nonExistentEpcs, setNonExistentEpcs] = useState(new Set());
  const [epcCache, setEpcCache] = useState(new Map());
  const [currentLinenInfo, setCurrentLinenInfo] = useState({
    epc: "",
    customerName: "",
    linenName: "",
    roomName: "",
  });

  // Track EPCs that are currently being processed to prevent race conditions
  const currentlyProcessing = useRef(new Set());

  // Clear all state
  const clearAllData = useCallback(() => {
    console.log("🧹 Clearing all grouping data...");

    setProcessedTags(new Set());
    setValidEpcs(new Set());
    setNonExistentEpcs(new Set());
    setEpcCache(new Map());
    setCurrentLinenInfo({
      epc: "",
      customerName: "",
      linenName: "",
      roomName: "",
    });

    // Clear currently processing set
    currentlyProcessing.current.clear();

    console.log("✅ All grouping data cleared - processedTags, cache, and info reset");
  }, []);

  // Process scanned EPC (main function for RFID scanning) - simplified like DeliveryPage
  const processScannedEPC = useCallback(
    async (epc) => {
      if (!epc.trim()) return false;

      console.log(`🔍 Processing Grouping EPC: ${epc}`);

      // Early return for already processed EPCs (most common case)
      if (processedTags.has(epc) || currentlyProcessing.current.has(epc)) {
        return false;
      }

      // Mark this EPC as being processed
      currentlyProcessing.current.add(epc);
      setProcessedTags((prev) => new Set([...prev, epc]));

      try {
        // Step 1: Check if EPC has already been determined to not exist
        if (nonExistentEpcs.has(epc)) {
          console.log(
            `❌ EPC ${epc} sudah dicek sebelumnya dan tidak ada di API, diabaikan`
          );
          setCurrentLinenInfo({
            epc: "",
            customerName: "Belum Teregister",
            linenName: "Belum Teregister",
            roomName: "Belum Teregister",
          });
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
            console.log(`✅ Found cached linen data for EPC: ${epc} - ${linenData.linenName}`);

            // Add to valid EPCs set
            setValidEpcs((prev) => new Set([...prev, epc]));

            // Create linen info object
            const linenInfo = {
              epc: linenData.epc,
              customerName: linenData.customerName || "-",
              linenName: linenData.linenName || "-",
              roomName: linenData.roomName || "-",
            };

            // Update current linen info
            setCurrentLinenInfo(linenInfo);

            console.log(`📋 EPC ${epc} berhasil diproses dari cache`);
            return true;
          } else {
            // Cached data is empty (not found)
            console.log(
              `📭 EPC ${epc} ada di cache tapi data kosong, ditandai sebagai tidak ada`
            );
            setNonExistentEpcs((prev) => new Set([...prev, epc]));
            setCurrentLinenInfo({
              epc: "",
              customerName: "Belum Teregister",
              linenName: "Belum Teregister",
              roomName: "Belum Teregister",
            });
            return false;
          }
        }

        // Step 3: EPC not found in cache, need to hit API
        console.log(
          `🌐 EPC ${epc} belum ada di cache, mengambil data dari API...`
        );

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

            // Add to valid EPCs set
            setValidEpcs((prev) => new Set([...prev, epc]));

            // Create linen info object
            const linenInfo = {
              epc: linenData.epc,
              customerName: linenData.customerName || "-",
              linenName: linenData.linenName || "-",
              roomName: linenData.roomName || "-",
            };

            // Update current linen info
            setCurrentLinenInfo(linenInfo);

            console.log(`📋 EPC ${epc} berhasil diproses dari API`);
            return true;
          } else {
            // EPC not found in API - add to cache but don't process
            console.log(
              `❌ EPC ${epc} tidak ditemukan di API, ditambahkan ke cache sebagai tidak ada`
            );
            setNonExistentEpcs((prev) => new Set([...prev, epc]));
            setCurrentLinenInfo({
              epc: "",
              customerName: "Belum Teregister",
              linenName: "Belum Teregister",
              roomName: "Belum Teregister",
            });
            return false;
          }
        } else {
          console.error(`❌ Failed to fetch linen data for EPC: ${epc}`);
          // Cache the failed response and add to non-existent cache
          setEpcCache((prev) => new Map([...prev, [epc, []]]));
          setNonExistentEpcs((prev) => new Set([...prev, epc]));
          setCurrentLinenInfo({
            epc: "",
            customerName: "Belum Teregister",
            linenName: "Belum Teregister",
            roomName: "Belum Teregister",
          });
          return false;
        }
      } catch (error) {
        console.error(`❌ Error fetching linen data for EPC: ${epc}`, error);
        // Cache the error and add to non-existent cache
        setEpcCache((prev) => new Map([...prev, [epc, []]]));
        setNonExistentEpcs((prev) => new Set([...prev, epc]));
        setCurrentLinenInfo({
          epc: "",
          customerName: "Belum Teregister",
          linenName: "Belum Teregister",
          roomName: "Belum Teregister",
        });
        return false;
      } finally {
        // Always remove from currently processing set when done
        currentlyProcessing.current.delete(epc);
      }
    },
    [baseUrl, processedTags, nonExistentEpcs, epcCache]
  );

  // Filter tags based on valid EPCs - simplified for single reader
  const getFilteredTags = useCallback(
    (tags) => {
      if (!tags || tags.length === 0) return [];

      // Early return for empty validEpcs
      if (validEpcs.size === 0) return [];

      // Filter only valid EPCs (registered in API)
      return tags.filter((tag) => validEpcs.has(tag.EPC));
    },
    [validEpcs]
  );

  return {
    // State
    processedTags,
    validEpcs,
    nonExistentEpcs,
    epcCache,
    currentLinenInfo,

    // Actions
    clearAllData,
    processScannedEPC,
    getFilteredTags,
  };
};