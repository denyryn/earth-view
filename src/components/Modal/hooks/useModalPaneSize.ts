import { useCallback, useLayoutEffect, useRef, useState } from "react";

export function useModalPaneSize(modalOpen: boolean) {
  const imagePaneRef = useRef<HTMLDivElement | null>(null);
  const [imagePaneNode, setImagePaneNode] = useState<HTMLDivElement | null>(null);
  const [imagePaneSize, setImagePaneSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  const setImagePaneRef = useCallback((node: HTMLDivElement | null) => {
    imagePaneRef.current = node;
    setImagePaneNode(node);
  }, []);

  useLayoutEffect(() => {
    if (!modalOpen) {
      setImagePaneSize(null);
      return;
    }

    if (!imagePaneNode) {
      return;
    }

    const currentPane = imagePaneNode;

    function updatePaneSize() {
      const rect = currentPane.getBoundingClientRect();
      const nextSize = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };

      setImagePaneSize((previous) =>
        previous?.width === nextSize.width && previous.height === nextSize.height
          ? previous
          : nextSize,
      );
    }

    updatePaneSize();

    const observer = new ResizeObserver(updatePaneSize);
    observer.observe(currentPane);

    return () => observer.disconnect();
  }, [imagePaneNode, modalOpen]);

  return {
    imagePaneRef,
    imagePaneSize,
    setImagePaneRef,
  };
}
