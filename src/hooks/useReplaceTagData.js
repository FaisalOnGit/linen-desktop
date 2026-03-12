import { useState, useCallback, useRef } from "react";

export const useReplaceTagData = (baseUrl) => {
  const [tags, setTags] = useState([
    { oldEpc: "", newEpc: "", linenId: "", linenInfo: null },
  ]);
  const [processedTags, setProcessedTags] = useState(new Set());
  const [epcCache, setEpcCache] = useState(new Map());

  // Track EPCs that are currently being fetched to prevent duplicate calls
  const fetchingEpcs = useRef(new Set());

  // Add new empty tag row
  const addTagRow = useCallback(() => {
    setTags((prev) => [
      ...prev,
      { oldEpc: "", newEpc: "", linenId: "", linenInfo: null },
    ]);
  }, []);

  // Remove tag row by index
  const removeTagRow = useCallback(
    (index) => {
      if (tags.length <= 1) {
        return false;
      }

      try {
        const removedTag = tags[index];

        if (removedTag?.oldEpc) {
          setProcessedTags((prev) => {
            const newSet = new Set(prev);
            newSet.delete(removedTag.oldEpc);
            return newSet;
          });
        }

        if (removedTag?.newEpc) {
          setProcessedTags((prev) => {
            const newSet = new Set(prev);
            newSet.delete(removedTag.newEpc);
            return newSet;
          });
        }

        setTags((prev) => prev.filter((_, i) => i !== index));
        return true;
      } catch (error) {
        console.error("Error removing tag row:", error);
        return false;
      }
    },
    [tags.length]
  );

  // Clear all EPCs and reset state
  const clearAllEPCs = useCallback(() => {
    console.log("🧹 Clearing all replace tag data...");

    setTags([{ oldEpc: "", newEpc: "", linenId: "", linenInfo: null }]);
    setProcessedTags(new Set());
    setEpcCache(new Map());
    fetchingEpcs.current.clear();

    console.log("✅ All replace tag data cleared");
  }, []);

  // Update tag field by index
  const updateTagField = useCallback((index, field, value) => {
    setTags((prev) => {
      const updatedTags = [...prev];
      updatedTags[index][field] = value;
      return updatedTags;
    });
  }, []);

  // Fetch linen info from API - called when oldEpc is filled
  const fetchLinenInfoByOldEpc = useCallback(
    async (epc) => {
      if (!epc) return null;

      // Check cache first
      if (epcCache.has(epc)) {
        console.log(`📦 Using cached linen info for old EPC: ${epc}`);
        return epcCache.get(epc);
      }

      // Prevent duplicate fetches
      if (fetchingEpcs.current.has(epc)) {
        console.log(`⏳ Already fetching old EPC: ${epc}, waiting...`);
        return null;
      }

      fetchingEpcs.current.add(epc);

      try {
        const token = await window.authAPI.getToken();
        console.log(`📡 Fetching linen info from API for old EPC: ${epc}`);

        const response = await fetch(
          `${baseUrl}/Process/linen_rfid?epc=${encodeURIComponent(epc)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        let linenInfo = null;

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.data && result.data.length > 0) {
            const linenData = result.data[0];
            linenInfo = {
              epc: linenData.epc,
              linenName: linenData.linenName || "-",
              customerName: linenData.customerName || "-",
              roomName: linenData.roomName || "-",
              linenId: linenData.linenId || null,
            };
            console.log(`✅ Found linen: ${linenInfo.linenName}`);
          } else {
            console.log(`❌ Old EPC ${epc} not found in API`);
            linenInfo = { linenName: "Belum Teregister" };
          }
        } else {
          console.error(`❌ API Error for old EPC: ${epc}`);
          linenInfo = { linenName: "Error API" };
        }

        // Cache the result
        setEpcCache((prev) => new Map([...prev, [epc, linenInfo]]));

        return linenInfo;
      } catch (error) {
        console.error(`❌ Error fetching linen info for old EPC: ${epc}`, error);
        const errorInfo = { linenName: "Error" };
        setEpcCache((prev) => new Map([...prev, [epc, errorInfo]]));
        return errorInfo;
      } finally {
        fetchingEpcs.current.delete(epc);
      }
    },
    [baseUrl, epcCache]
  );

  // Process new EPC from RFID scan - ONLY fills newEpc field
  const processNewEPC = useCallback(
    async (epc) => {
      if (!epc) return false;

      console.log(`🔍 Processing New EPC from RFID: ${epc}`);

      // Validate EPC format
      if (epc.length < 8 || !/^[0-9A-Fa-f]+$/.test(epc)) {
        console.warn("Invalid EPC format:", epc);
        return false;
      }

      // Check if already in newEpc field
      const existingIndex = tags.findIndex((tag) => tag.newEpc === epc);

      if (existingIndex === -1) {
        // Check if already processed to prevent duplicates
        if (processedTags.has(epc)) {
          console.log(`New EPC ${epc} already processed, skipping`);
          return false;
        }

        // Mark as processed
        setProcessedTags((prev) => new Set([...prev, epc]));

        // Find first empty newEpc row
        setTags((prevTags) => {
          const emptyIndex = prevTags.findIndex((tag) => tag.newEpc.trim() === "");

          if (emptyIndex !== -1) {
            const updatedTags = [...prevTags];
            updatedTags[emptyIndex].newEpc = epc;
            return updatedTags;
          } else {
            // Add new row
            return [
              ...prevTags,
              { oldEpc: "", newEpc: epc, linenId: "", linenInfo: null },
            ];
          }
        });

        console.log(`✅ New EPC ${epc} added (no API call)`);
        return true;
      } else {
        console.log(`New EPC ${epc} already exists in row ${existingIndex + 1}`);
        return false;
      }
    },
    [tags, processedTags]
  );

  // Handle old Epc input change - triggers API call
  const handleOldEpcChange = useCallback(
    async (epc, rowIndex) => {
      console.log(`🔍 Old EPC changed: ${epc} at row ${rowIndex + 1}`);

      // Validate EPC format
      if (epc && epc.length >= 5 && /^[0-9A-Fa-f]+$/.test(epc)) {
        // Call API immediately to get linen info
        console.log(`🌐 Calling API for old EPC: ${epc}`);
        const linenInfo = await fetchLinenInfoByOldEpc(epc);

        // Update the row with linen info
        updateTagField(rowIndex, "linenInfo", linenInfo);
        updateTagField(rowIndex, "linenId", linenInfo?.linenId || "");
        console.log(`✅ Row ${rowIndex + 1} updated with linen info`);
      } else if (!epc) {
        // Clear linen info if old Epc is cleared
        updateTagField(rowIndex, "linenInfo", null);
        updateTagField(rowIndex, "linenId", "");
      }
    },
    [fetchLinenInfoByOldEpc, updateTagField]
  );

  // Handle replace tags from RFID scanner - ONLY fills newEpc
  const handleReplaceTags = useCallback(
    async (replaceTags, isReplaceActive) => {
      if (!isReplaceActive) return;

      if (replaceTags && replaceTags.length > 0) {
        console.log(
          `📡 Processing ${replaceTags.length} tags from RFID - filling newEpc only`
        );

        // Process each tag as newEpc only
        for (let i = 0; i < replaceTags.length; i++) {
          const tag = replaceTags[i];
          if (tag && tag.EPC) {
            await processNewEPC(tag.EPC);
          }
        }
      }
    },
    [processNewEPC]
  );

  // Get count of valid tags (with any field filled)
  const getValidTagCount = useCallback(() => {
    return tags.filter(
      (tag) =>
        tag.oldEpc?.trim() || tag.newEpc?.trim() || tag.linenId?.trim()
    ).length;
  }, [tags]);

  // Get count of complete tags (with oldEpc and newEpc)
  const getCompleteTagCount = useCallback(() => {
    return tags.filter(
      (tag) => tag.oldEpc?.trim() && tag.newEpc?.trim()
    ).length;
  }, [tags]);

  // Check if form is valid
  const isFormValid = useCallback(() => {
    return getCompleteTagCount() > 0;
  }, [getCompleteTagCount]);

  return {
    // State
    tags,
    processedTags,
    epcCache,

    // Actions
    addTagRow,
    removeTagRow,
    clearAllEPCs,
    updateTagField,
    processNewEPC,
    handleReplaceTags,
    handleOldEpcChange,
    fetchLinenInfoByOldEpc,

    // Computed values
    getValidTagCount,
    getCompleteTagCount,
    isFormValid,
  };
};
