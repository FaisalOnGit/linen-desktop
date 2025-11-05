import { useState, useEffect } from "react";

const useDateShift = (initialShift) => {
  const [dateShift, setDateShift] = useState("");
  const [dateShiftWithTime, setDateShiftWithTime] = useState("");

  const getDateForShift = (shift) => {
    const today = new Date();
    const currentHour = today.getHours();

    switch (shift) {
      case "1":
        today.setHours(13, 0, 0, 0); // Set to 13:00:00 local time
        break;
      case "2":
        today.setHours(16, 0, 0, 0); // Set to 16:00:00 local time
        break;
      case "3":
        // Jika login antara 00:00-05:00, gunakan hari kemarin untuk shift 3
        if (currentHour >= 0 && currentHour < 5) {
          today.setDate(today.getDate() - 1);
        }
        today.setHours(19, 0, 0, 0); // Set to 19:00:00 local time
        break;
      default:
        today.setHours(0, 0, 0, 0); // Default to midnight
        break;
    }

    return today;
  };

  const formatDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const updateDateShift = (shift) => {
    if (shift) {
      const newDate = getDateForShift(shift);
      const dateOnly = newDate.toISOString().split("T")[0]; // YYYY-MM-DD for display
      const dateWithTime = formatDateTime(newDate); // Local time format (YYYY-MM-DDTHH:mm:ss)

      setDateShift(dateOnly);
      setDateShiftWithTime(dateWithTime);
    } else {
      setDateShift("");
      setDateShiftWithTime("");
    }
  };

  // Initialize dateShift when component mounts or shift changes
  useEffect(() => {
    if (initialShift) {
      updateDateShift(initialShift);
    }
  }, [initialShift]);

  return { dateShift, dateShiftWithTime, updateDateShift };
};

export default useDateShift;