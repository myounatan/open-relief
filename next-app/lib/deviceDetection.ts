export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  const userAgent = navigator.userAgent;
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

  return mobileRegex.test(userAgent);
};

export const isMobileScreen = (): boolean => {
  if (typeof window === "undefined") return false;

  return window.innerWidth <= 768;
};

export const shouldUseMobileFlow = (): boolean => {
  return isMobileDevice() || isMobileScreen();
};
