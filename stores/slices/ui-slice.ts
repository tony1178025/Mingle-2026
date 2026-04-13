import type { StoreSlice, UiSlice } from "@/stores/types";

export const createUiSlice: StoreSlice<UiSlice> = (set) => ({
  customerTab: "explore",
  adminPanel: "overview",
  selectedTableId: 1,
  toast: null,

  setCustomerTab(customerTab) {
    set({ customerTab });
  },

  setAdminPanel(adminPanel) {
    set({ adminPanel });
  },

  setSelectedTableId(selectedTableId) {
    set({ selectedTableId });
  },

  dismissToast() {
    set({ toast: null });
  }
});
