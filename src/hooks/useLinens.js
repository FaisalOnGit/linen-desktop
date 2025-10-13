import { useState, useEffect, useCallback } from "react";

export const useLinens = (baseUrl) => {
  const [linenOptions, setLinenOptions] = useState([]);
  const [loadingLinens, setLoadingLinens] = useState(false);

  // Fetch unregistered linens
  const fetchUnregisteredLinens = useCallback(
    async (searchTerm = "") => {
      setLoadingLinens(true);
      try {
        const token = await window.authAPI.getToken();
        const response = await fetch(`${baseUrl}/Master/linen-unregistered`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const result = await response.json();
          let linensData = result.data || [];

          if (searchTerm.trim()) {
            linensData = linensData.filter(
              (linen) =>
                linen.linenName
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                linen.linenId.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }

          setLinenOptions(linensData);
        } else {
          console.error("Failed to fetch linens");
          setLinenOptions([]);
        }
      } catch (error) {
        console.error("Error fetching linens:", error);
        setLinenOptions([]);
      } finally {
        setLoadingLinens(false);
      }
    },
    [baseUrl]
  );

  // Get linen by ID
  const getLinenById = useCallback(
    (linenId) => {
      return linenOptions.find((linen) => linen.linenId === linenId);
    },
    [linenOptions]
  );

  // Filter linens by search term
  const filterLinens = useCallback(
    (searchTerm) => {
      if (!searchTerm.trim()) return linenOptions;

      return linenOptions.filter(
        (linen) =>
          linen.linenName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          linen.linenId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    },
    [linenOptions]
  );

  // Initialize linens on mount
  useEffect(() => {
    fetchUnregisteredLinens();
  }, [fetchUnregisteredLinens]);

  // Clear linens
  const clearLinens = useCallback(() => {
    setLinenOptions([]);
  }, []);

  // Refresh linens
  const refreshLinens = useCallback(() => {
    fetchUnregisteredLinens();
  }, [fetchUnregisteredLinens]);

  return {
    // State
    linenOptions,
    loadingLinens,

    // Actions
    fetchUnregisteredLinens,
    getLinenById,
    filterLinens,
    clearLinens,
    refreshLinens,
  };
};
