import { create } from "zustand";
import type { ShapeSelection } from "@/lib/types";

interface SelectionStoreState {
  selections: ShapeSelection[];
  addSelection: (selection: Omit<ShapeSelection, "id">, id?: string) => void;
  clearSelectionById: (id: string) => void;
  clearSelections: () => void;
}

export const useSelectionStore = create<SelectionStoreState>((set) => ({
  selections: [],
  addSelection: (selection: Omit<ShapeSelection, "id">, id?: string) =>
    set((state) => ({
      selections: [
        ...state.selections,
        { ...selection, id: id || crypto.randomUUID() },
      ],
    })),
  clearSelectionById: (id: string) =>
    set((state) => ({
      selections: state.selections.filter((s) => s.id !== id),
    })),
  clearSelections: () => set({ selections: [] }),
}));

// Helper functions for calling actions without subscribing to state
export const addSelectionAction = (
  selection: Omit<ShapeSelection, "id">,
  id?: string
) => useSelectionStore.getState().addSelection(selection, id);
export const clearSelectionByIdAction = (id: string) =>
  useSelectionStore.getState().clearSelectionById(id);
export const clearSelectionsAction = () =>
  useSelectionStore.getState().clearSelections();

// Selector functions - use these with the hook for reactive subscriptions
export const selectSelections = (state: SelectionStoreState) =>
  state.selections;
