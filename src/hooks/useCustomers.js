import { useState, useEffect, useCallback } from 'react';

export const useCustomers = (baseUrl) => {
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const fetchCustomers = useCallback(async (searchTerm = "") => {
    setLoadingCustomers(true);
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(`${baseUrl}/Master/customer`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        let customersData = result.data || [];

        if (searchTerm.trim()) {
          customersData = customersData.filter(
            (customer) =>
              customer.customerName
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              customer.customerId
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          );
        }

        setCustomers(customersData);
      } else {
        console.error("Failed to fetch customers");
        setCustomers([]);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, [baseUrl]);

  // Fetch customer linen data by customer ID
  const fetchLinenDataByCustomer = useCallback(async (customerId) => {
    if (!customerId) return;

    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Process/linen_rfid?customerId=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.data || [];
      }
    } catch (error) {
      console.error("Error fetching customer linen data:", error);
    }
    return [];
  }, [baseUrl]);

  // Get customer by ID
  const getCustomerById = useCallback((customerId) => {
    return customers.find(customer => customer.customerId === customerId);
  }, [customers]);

  // Filter customers by search term
  const filterCustomers = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return customers;

    return customers.filter(
      (customer) =>
        customer.customerName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        customer.customerId
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
  }, [customers]);

  // Initialize customers on mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    // State
    customers,
    loadingCustomers,

    // Actions
    fetchCustomers,
    fetchLinenDataByCustomer,
    getCustomerById,
    filterCustomers,
  };
};