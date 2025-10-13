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

  // Cache for linen data to avoid repeated API calls
  const linenCache = useRef(new Map());

  // Process scanned EPC for delivery flow
  const processScannedEPC = useCallback(
    async (epc, customerId) => {
      if (!epc) return false;

      // Validate EPC format
      if (epc.length < 8 || !/^[0-9A-Fa-f]+$/.test(epc)) {
        console.warn("Invalid EPC format:", epc);
        return false;
      }

      // Check if EPC already processed
      if (processedTags.has(epc)) {
        console.log(`EPC ${epc} already processed`);
        return false;
      }

      // Check if EPC already exists in current linens
      const existingIndex = linens.findIndex((linen) => linen.epc === epc);
      if (existingIndex !== -1) {
        console.log(`EPC ${epc} already exists in row ${existingIndex + 1}`);
        return false;
      }

      // Mark as processed
      setProcessedTags((prev) => new Set([...prev, epc]));

      // Find first empty row or add new row
      const emptyRowIndex = linens.findIndex((linen) => linen.epc.trim() === "");
      const targetIndex = emptyRowIndex !== -1 ? emptyRowIndex : linens.length;

      if (emptyRowIndex === -1) {
        // Add new row
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
      } else {
        // Update empty row
        updateLinenField(targetIndex, "epc", epc);
        updateLinenField(targetIndex, "isProcessed", true);
        updateLinenField(targetIndex, "loading", true);
      }

      // Validate EPC against API
      await validateEPC(epc, targetIndex, customerId);

      return true;
    },
    [processedTags, linens]
  );

  // Validate EPC against API
  const validateEPC = async (epc, index, customerId) => {
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Process/linen_rfid?epc=${epc}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to validate EPC");
      }

      const linenDataArray = result.data || [];

      if (linenDataArray.length === 0) {
        // Non-existent EPC
        updateLinenField(index, "isNonExist", true);
        updateLinenField(index, "loading", false);
        setNonExistEpc((prev) => new Set([...prev, epc]));
        return;
      }

      const linenData = linenDataArray[0];

      // Update linen data
      updateLinenField(index, "linenName", linenData.linenName || "");
      updateLinenField(index, "linenTypeName", linenData.linenTypeName || "");
      updateLinenField(index, "roomId", linenData.roomId || "");
      updateLinenField(index, "roomName", linenData.roomName || "");
      updateLinenField(index, "buildingName", linenData.buildingName || "");
      updateLinenField(index, "status", linenData.status);
      updateLinenField(index, "statusId", linenData.statusId || 1);
      updateLinenField(index, "customerId", linenData.customerId);
      updateLinenField(index, "customerName", linenData.customerName);
      updateLinenField(index, "loading", false);

      // Check customer validation
      if (customerId && linenData.customerId !== customerId) {
        updateLinenField(index, "isValidCustomer", false);
        updateLinenField(index, "errorMessage", `Tag milik ${linenData.customerName} (${linenData.customerId})`);
      } else {
        updateLinenField(index, "isValidCustomer", true);
        setValidEpcs((prev) => new Set([...prev, epc]));
      }

      // Cache the data
      linenCache.current.set(epc, linenData);

    } catch (error) {
      console.error("Error validating EPC:", error);
      updateLinenField(index, "isNonExist", true);
      updateLinenField(index, "loading", false);
      updateLinenField(index, "errorMessage", error.message);
      setNonExistEpc((prev) => new Set([...prev, epc]));
    }
  };

  // Validate manual EPC input
  const validateManualEPC = async (epc, index, customerId) => {
    if (!epc?.trim()) {
      updateLinenField(index, "isNonExist", false);
      updateLinenField(index, "isDuplicate", false);
      updateLinenField(index, "isValidCustomer", null);
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

    updateLinenField(index, "loading", true);
    updateLinenField(index, "isNonExist", false);
    updateLinenField(index, "isProcessed", true);

    await validateEPC(epc, index, customerId);
  };

  // Validate all linens when customer changes
  const validateAllLinens = useCallback(
    async (customerId) => {
      const updatedLinens = await Promise.all(
        linens.map(async (linen, index) => {
          if (!linen.epc || linen.isNonExist) return linen;

          // Check cache first
          if (linenCache.current.has(linen.epc)) {
            const cachedData = linenCache.current.get(linen.epc);
            const isValidCustomer = customerId
              ? cachedData.customerId === customerId
              : null;

            return {
              ...linen,
              isValidCustomer,
              errorMessage:
                isValidCustomer === false
                  ? `Customer: ${cachedData.customerName}`
                  : null,
            };
          }

          // Fetch from API if not in cache
          try {
            const token = await window.authAPI.getToken();
            const response = await fetch(
              `${baseUrl}/Process/linen_rfid?epc=${linen.epc}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (response.ok) {
              const result = await response.json();
              const linenDataArray = result.data || [];

              if (linenDataArray.length > 0) {
                const linenData = linenDataArray[0];
                linenCache.current.set(linen.epc, linenData);
                const isValidCustomer = customerId
                  ? linenData.customerId === customerId
                  : null;

                return {
                  ...linen,
                  linenName: linenData.linenName || "",
                  linenTypeName: linenData.linenTypeName || "",
                  roomId: linenData.roomId || "",
                  roomName: linenData.roomName || "",
                  buildingName: linenData.buildingName || "",
                  status: linenData.status,
                  statusId: linenData.statusId || 1,
                  customerId: linenData.customerId,
                  customerName: linenData.customerName,
                  isValidCustomer,
                  errorMessage:
                    isValidCustomer === false
                      ? `Tag milik ${linenData.customerName} (${linenData.customerId})`
                      : null,
                };
              }
            }
          } catch (error) {
            console.error("Error validating linen:", error);
          }

          return linen;
        })
      );

      setLinens(updatedLinens);
    },
    [baseUrl, linens]
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

    // Clear cache
    linenCache.current.clear();

    console.log("✅ All delivery EPC data cleared");
  }, []);

  // Update linen field by index
  const updateLinenField = useCallback((index, field, value) => {
    setLinens((prev) => {
      const updatedLinens = [...prev];
      updatedLinens[index] = { ...updatedLinens[index], [field]: value };
      return updatedLinens;
    });
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