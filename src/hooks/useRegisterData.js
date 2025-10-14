import { useState, useCallback } from "react";

export const useRegisterData = () => {
  const [linens, setLinens] = useState([{ linenId: "", epc: "", roomId: "" }]);
  const [processedTags, setProcessedTags] = useState(new Set());
  const [validEpcs, setValidEpcs] = useState(new Set());

  // Add new empty linen row
  const addLinenRow = useCallback(() => {
    setLinens((prev) => [...prev, { linenId: "", epc: "", roomId: "" }]);
  }, []);

  // Remove linen row by index
  const removeLinenRow = useCallback((index) => {
    // Ensure we can't delete if only 1 row remains
    if (linens.length <= 1) {
      return false; // Indicate deletion not allowed
    }

    try {
      const removedLinen = linens[index];

      // Remove EPC from processedTags if it exists
      if (removedLinen?.epc) {
        setProcessedTags((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });

        // Remove EPC from validEpcs if it exists
        setValidEpcs((prev) => {
          const newSet = new Set(prev);
          newSet.delete(removedLinen.epc);
          return newSet;
        });
      }

      // Update linens array by removing item at specific index
      setLinens((prev) => prev.filter((_, i) => i !== index));
      return true; // Indicate successful deletion
    } catch (error) {
      console.error("Error removing linen row:", error);
      return false; // Indicate deletion failed
    }
  }, [linens.length]);

  // Clear all EPCs and reset state
  const clearAllEPCs = useCallback(() => {
    console.log("🧹 Clearing all register EPC data...");

    setLinens([{ linenId: "", epc: "", roomId: "" }]);
    setProcessedTags(new Set());
    setValidEpcs(new Set());

    console.log("✅ All register EPC data cleared");
  }, []);

  // Update linen field by index
  const updateLinenField = useCallback((index, field, value) => {
    setLinens((prev) => {
      const updatedLinens = [...prev];
      updatedLinens[index][field] = value;
      return updatedLinens;
    });
  }, []);

  // Process EPC from RFID scan (for RegisterPage - accepts all EPCs)
  const processScannedEPC = useCallback((epc) => {
    if (!epc) return false;

    console.log(`🔍 Processing Register EPC: ${epc}`);

    // Validate EPC format (should be reasonable length and hex)
    if (epc.length < 8 || !/^[0-9A-Fa-f]+$/.test(epc)) {
      console.warn("Invalid EPC format:", epc);
      return false;
    }

    // Check if EPC already exists in current linens (this is the real check)
    const existingIndex = linens.findIndex((linen) => linen.epc === epc);

    if (existingIndex === -1) {
      // Mark this EPC as processed to prevent duplicate processing in same session
      setProcessedTags((prev) => new Set([...prev, epc]));

      // Add to valid EPCs set (RegisterPage accepts all EPCs)
      setValidEpcs((prev) => new Set([...prev, epc]));

      // EPC doesn't exist, find first empty row or add new row
      const emptyRowIndex = linens.findIndex((linen) => linen.epc.trim() === "");

      if (emptyRowIndex !== -1) {
        // Fill empty row
        updateLinenField(emptyRowIndex, "epc", epc);
      } else {
        // No empty row found, add new row with EPC
        setLinens((prev) => [...prev, { linenId: "", epc: epc, roomId: "" }]);
      }
      console.log(`✅ EPC ${epc} added successfully`);
      return true;
    } else {
      // EPC already exists in table
      console.log(`EPC ${epc} already exists in row ${existingIndex + 1}`);
      return false;
    }
  }, [linens, updateLinenField]);

  // Handle register tags from RFID scanner
  const handleRegisterTags = useCallback((registerTags, isRegisterActive) => {
    // Skip if RFID is not active
    if (!isRegisterActive) return;

    if (registerTags && registerTags.length > 0) {
      console.log(`📡 RegisterPage: Processing ${registerTags.length} tags from RFID`);

      // Process each tag using the existing processScannedEPC function
      registerTags.forEach((tag, index) => {
        if (tag && tag.EPC) {
          console.log(`🔍 Processing EPC ${tag.EPC} (index ${index})`);
          processScannedEPC(tag.EPC);
        }
      });
    }
  }, [processScannedEPC]);

  // Get count of valid linens (with any field filled)
  const getValidLinenCount = useCallback(() => {
    return linens.filter(
      (linen) => linen.linenId?.trim() || linen.epc?.trim() || linen.roomId?.trim()
    ).length;
  }, [linens]);

  // Get count of complete linens (with all required fields)
  const getCompleteLinenCount = useCallback(() => {
    return linens.filter(
      (linen) => linen.linenId?.trim() && linen.epc?.trim() && linen.roomId?.trim()
    ).length;
  }, [linens]);

  // Check if form is valid
  const isFormValid = useCallback((customerId, description) => {
    // Check if customer is selected
    if (!customerId?.trim()) {
      return false;
    }

    // Check if description is filled
    if (!description?.trim()) {
      return false;
    }

    // Check if there's at least one complete linen row
    return getCompleteLinenCount() > 0;
  }, [getCompleteLinenCount]);

  return {
    // State
    linens,
    processedTags,
    validEpcs,

    // Actions
    addLinenRow,
    removeLinenRow,
    clearAllEPCs,
    updateLinenField,
    processScannedEPC,
    handleRegisterTags,

    // Computed values
    getValidLinenCount,
    getCompleteLinenCount,
    isFormValid,
  };
};