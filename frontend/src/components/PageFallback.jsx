import "./PageFallback.css";

export default function PageFallback() {
  return (
    <div className="page-fallback" role="status" aria-label="Loading">
      <span className="page-fallback-spinner" />
    </div>
  );
}
