import { createContext, useContext } from 'react';

type ParametresEditorFocusState = {
  active: boolean;
  onAttemptExit: () => void;
};

type ParametresEditorFocusContextValue = {
  focusState: ParametresEditorFocusState | null;
  setFocusState: (state: ParametresEditorFocusState | null) => void;
};

export const ParametresEditorFocusContext = createContext<ParametresEditorFocusContextValue | null>(null);

export const useParametresEditorFocus = () => useContext(ParametresEditorFocusContext);
