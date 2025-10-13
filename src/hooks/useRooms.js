import { useState, useEffect, useCallback } from "react";

export const useRooms = (baseUrl) => {
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Fetch rooms by customer ID
  const fetchRooms = useCallback(async (customerId) => {
    if (!customerId) {
      setRooms([]);
      return;
    }

    setLoadingRooms(true);
    try {
      const token = await window.authAPI.getToken();
      const response = await fetch(
        `${baseUrl}/Master/room?customerId=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setRooms(result.data || []);
      } else {
        console.error("Failed to fetch rooms");
        setRooms([]);
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, [baseUrl]);

  // Get room by ID
  const getRoomById = useCallback((roomId) => {
    return rooms.find((room) => room.roomId === roomId);
  }, [rooms]);

  // Filter rooms by search term
  const filterRooms = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return rooms;

    return rooms.filter(
      (room) =>
        room.roomName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        room.roomId
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
  }, [rooms]);

  // Clear rooms
  const clearRooms = useCallback(() => {
    setRooms([]);
  }, []);

  return {
    // State
    rooms,
    loadingRooms,

    // Actions
    fetchRooms,
    getRoomById,
    filterRooms,
    clearRooms,
  };
};