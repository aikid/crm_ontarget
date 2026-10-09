type LoadingOverlayProps = {
  show: boolean;
  title?: string;
  message?: string;
};

export default function LoadingOverlay({
  show,
  title = "Carregando",
  message = "Estamos preparando as informações para você.",
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-dialog">
        <span className="loading-brand" aria-hidden="true"><i /></span>
        <div className="loading-copy">
          <strong>{title}</strong>
          <p>{message}</p>
        </div>
        <div className="loading-progress" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
