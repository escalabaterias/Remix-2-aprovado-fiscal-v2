import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface CoachContextData {
  questionId?: string;
  statement?: string;
  options?: string[];
  correctAnswer?: string;
  examBoard?: string;
  subjectName?: string;
  topicName?: string;
  errorId?: string;
  planId?: string;
  customPrompt?: string;
}

interface CoachContextType {
  isOpen: boolean;
  contextData: CoachContextData | null;
  openCoach: (customPrompt?: string, data?: CoachContextData) => void;
  closeCoach: () => void;
  toggleCoach: () => void;
}

const CoachDrawerContext = createContext<CoachContextType | undefined>(undefined);

export function CoachProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contextData, setContextData] = useState<CoachContextData | null>(null);

  const openCoach = useCallback((customPrompt?: string, data?: CoachContextData) => {
    setContextData({
      ...(data || {}),
      customPrompt: customPrompt || data?.customPrompt,
    });
    setIsOpen(true);
  }, []);

  const closeCoach = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleCoach = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <CoachDrawerContext.Provider
      value={{
        isOpen,
        contextData,
        openCoach,
        closeCoach,
        toggleCoach,
      }}
    >
      {children}
    </CoachDrawerContext.Provider>
  );
}

export function useCoachDrawer() {
  const context = useContext(CoachDrawerContext);
  if (!context) {
    throw new Error("useCoachDrawer must be used within a CoachProvider");
  }
  return context;
}
