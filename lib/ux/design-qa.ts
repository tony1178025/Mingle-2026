import { useEffect } from "react";

export function useDesignQA() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.querySelector(".mg-pwa");
    if (!root) return;
    const tooSmallButtons = Array.from(root.querySelectorAll("button")).filter(
      (el) => el.getBoundingClientRect().height < 44
    );
    if (tooSmallButtons.length > 0) {
      console.warn("[mg-qa] button height violation", tooSmallButtons.length);
    }
  }, []);
}
