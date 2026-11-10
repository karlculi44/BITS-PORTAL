import { useAuth } from "../hooks/useAuth";
import { usePageLoadingState } from "../hooks/usePageLoading";

function ScrollProgress() {
  const { loading: authLoading } = useAuth();
  const pageLoading = usePageLoadingState();

  if (!authLoading && !pageLoading) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="loading-progress"
    />
  );
}

export default ScrollProgress;
