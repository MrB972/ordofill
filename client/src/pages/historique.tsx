import { FileText } from "lucide-react";

export default function HistoriquePage() {
  return (
    <div className="p-6" data-testid="historique-page">
      <div className="text-center py-12 text-muted-foreground" data-testid="history-empty">
        <FileText className="size-12 mx-auto mb-3 opacity-50" />
        <p>Aucun historique</p>
      </div>
    </div>
  );
}
