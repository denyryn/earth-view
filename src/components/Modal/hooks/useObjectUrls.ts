import { useCallback, useEffect, useRef } from "react";

export function useObjectUrls() {
  const objectUrlsRef = useRef(new Set<string>());

  const createObjectUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeObjectUrl = useCallback((url?: string | null) => {
    if (!url?.startsWith("blob:")) {
      return;
    }

    if (objectUrlsRef.current.delete(url)) {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }

      objectUrls.clear();
    };
  }, []);

  return {
    createObjectUrl,
    revokeObjectUrl,
  };
}
