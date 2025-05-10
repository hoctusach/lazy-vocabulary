
import { useState } from "react";

export const useModalState = () => {
  // Modal state
  const [isAddWordModalOpen, setIsAddWordModalOpen] = useState(false);

  return {
    isAddWordModalOpen,
    setIsAddWordModalOpen
  };
};
