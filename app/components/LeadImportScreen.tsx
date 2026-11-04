"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  onTargetApi,
  type AdminCampaign,
  type AdminClient,
  type GoogleSheetsImportConfig,
  type ImportBatch,
} from "../lib/ontarget-api";
import LoadingOverlay from "./ui/LoadingOverlay";

const errorLabels: Record<string, string> = {
  INVALID_ROW: "Dados inválidos",
  DUPLICATE_IN_FILE: "Duplicado no arquivo",
  DUPLICATE_IN_CAMPAIGN: "Já existe na ação",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function sourceLabel(value: ImportBatch["fileType"]) {
  return value === "GOOGLE_SHEETS" ? "Google Sheets" : value;
}

export default function LeadImportScreen() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [clientId, setClientId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<"file" | "google-sheets">("file");
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<GoogleSheetsImportConfig>({ configured: false, serviceAccountEmail: null });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportBatch | null>(null);
  const [detail, setDetail] = useState<ImportBatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      onTargetApi.admin.clients(),
      onTargetApi.admin.campaigns(),
      onTargetApi.admin.imports(),
      onTargetApi.admin.googleSheetsImportConfig(),
    ]).then(([clientRows, campaignRows, batchRows, sheetsConfig]) => {
      if (cancelled) return;
      setClients(clientRows.data);
      setCampaigns(campaignRows.data);
      setBatches(batchRows.data);
      setGoogleSheetsConfig(sheetsConfig);
      const firstClient = clientRows.data.find((row) => row.active);
      const firstCampaign = campaignRows.data.find((row) => row.status === "ACTIVE" && row.clientId === firstClient?.id);
      setClientId(firstClient?.id || "");
      setCampaignId(firstCampaign?.id || "");
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as importações.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const availableCampaigns = useMemo(() => campaigns.filter((row) => row.status === "ACTIVE" && row.clientId === clientId), [campaigns, clientId]);

  function selectClient(value: string) {
    const nextCampaign = campaigns.find((row) => row.status === "ACTIVE" && row.clientId === value);
    setClientId(value);
    setCampaignId(nextCampaign?.id || "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (source === "file" && !file) return setError("Selecione um arquivo CSV ou XLSX.");
    if (source === "google-sheets" && !spreadsheetUrl.trim()) return setError("Informe o link da planilha do Google Sheets.");
    setUploading(true);
    setError("");
    setResult(null);
    try {
      let batch: ImportBatch;
      if (source === "google-sheets") {
        batch = await onTargetApi.admin.importGoogleSheets({
          clientId,
          campaignId,
          spreadsheetUrl: spreadsheetUrl.trim(),
          ...(sheetName.trim() ? { sheetName: sheetName.trim() } : {}),
        });
      } else {
        const payload = new FormData();
        payload.set("clientId", clientId);
        payload.set("campaignId", campaignId);
        payload.set("file", file!);
        batch = await onTargetApi.admin.importLeads(payload);
      }
      setResult(batch);
      setDetail(batch);
      setBatches((current) => [batch, ...current.filter((row) => row.id !== batch.id)]);
      setFile(null);
      if (source === "google-sheets") {
        setSpreadsheetUrl("");
        setSheetName("");
      }
      if (fileRef.current) fileRef.current.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível importar os leads.");
    } finally {
      setUploading(false);
    }
  }

  async function openBatch(batch: ImportBatch) {
    setError("");
    try { setDetail(await onTargetApi.admin.importBatch(batch.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível abrir o lote."); }
  }

  return (
    <div className="import-screen">
      <LoadingOverlay
        show={loading || uploading}
        title={uploading ? "Importando sua base" : "Carregando importações"}
        message={uploading ? (source === "google-sheets" ? "Lendo a planilha e validando cada lead." : "Validando as linhas e protegendo a integridade dos leads.") : "Buscando ações e lotes recentes."}
      />
      <header className="admin-header">
        <div><span>GESTÃO DE LEADS</span><h1>Importar leads</h1><p>Envie um arquivo ou conecte uma planilha do Google Sheets.</p></div>
        <a className="import-template-link" href="/modelo-importacao-leads.csv" download>Baixar modelo CSV</a>
      </header>

      {error && <div className="admin-message error" role="alert">{error}</div>}

      <div className="import-layout">
        <section className="import-card">
          <div className="import-step"><span>1</span><div><strong>Destino dos leads</strong><small>Selecione o cliente e a ação responsáveis.</small></div></div>
          <form onSubmit={submit}>
            <label><span>Cliente</span><select value={clientId} required onChange={(event) => selectClient(event.target.value)} disabled={loading}><option value="" disabled>Selecione</option>{clients.filter((row) => row.active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label><span>Ação</span><select value={campaignId} required onChange={(event) => setCampaignId(event.target.value)} disabled={loading}><option value="" disabled>Selecione</option>{availableCampaigns.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>

            <div className="import-step file-step"><span>2</span><div><strong>Origem dos leads</strong><small>Escolha arquivo local ou Google Sheets.</small></div></div>
            <div className="import-source-tabs" role="tablist" aria-label="Origem da importação">
              <button type="button" role="tab" aria-selected={source === "file"} className={source === "file" ? "active" : ""} onClick={() => setSource("file")}>Arquivo CSV/XLSX</button>
              <button type="button" role="tab" aria-selected={source === "google-sheets"} className={source === "google-sheets" ? "active" : ""} onClick={() => setSource("google-sheets")}>Google Sheets</button>
            </div>

            {source === "file" ? (
              <label className={`import-dropzone ${file ? "selected" : ""}`}>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required onChange={(event) => setFile(event.target.files?.[0] || null)} />
                <span className="import-file-icon">{file ? "✓" : "↑"}</span>
                <strong>{file ? file.name : "Selecione um arquivo"}</strong>
                <small>{file ? `${(file.size / 1024).toFixed(1)} KB` : "CSV ou XLSX · até 10 MB"}</small>
              </label>
            ) : (
              <div className="google-sheets-fields" role="tabpanel">
                <label><span>Link da planilha</span><input type="url" value={spreadsheetUrl} required placeholder="https://docs.google.com/spreadsheets/d/..." onChange={(event) => setSpreadsheetUrl(event.target.value)} /></label>
                <label><span>Nome da aba <small>(opcional)</small></span><input type="text" value={sheetName} maxLength={100} placeholder="Ex.: Leads" onChange={(event) => setSheetName(event.target.value)} /></label>
                <div className={`google-sheets-access ${googleSheetsConfig.configured ? "ready" : "missing"}`}>
                  <span>{googleSheetsConfig.configured ? "✓" : "!"}</span>
                  <div>
                    <strong>{googleSheetsConfig.configured ? "Compartilhe a planilha como Leitora" : "Integração ainda não configurada"}</strong>
                    {googleSheetsConfig.serviceAccountEmail
                      ? <><p>Use este e-mail no compartilhamento do Google Sheets:</p><code>{googleSheetsConfig.serviceAccountEmail}</code></>
                      : <p>Configure a conta de serviço no backend para habilitar esta opção.</p>}
                  </div>
                </div>
              </div>
            )}
            <button className="import-submit" type="submit" disabled={uploading || loading || !campaignId || (source === "google-sheets" && !googleSheetsConfig.configured)}>{uploading ? "Validando e importando..." : "Importar leads"}</button>
          </form>
        </section>

        <aside className="import-rules-card">
          <span>COLUNAS DO MODELO</span>
          <h2>Formato esperado</h2>
          <ul><li><b>Ação</b><small>Evento / loja / concessionária</small></li><li><b>Numero</b><small>DDD + número</small></li><li><b>Nome Cliente</b><small>Nome completo</small></li><li><b>ORIGEM</b><small>Pode ficar vazia</small></li><li><b>DIA DA AÇÃO</b><small>dd/mm/aaaa</small></li></ul>
          <p>As linhas válidas são importadas. Linhas com erro permanecem no relatório para correção.</p>
        </aside>
      </div>

      {result && <section className="import-result" aria-live="polite"><div><span>Importação concluída</span><strong>{result.fileName}</strong></div><div><strong>{result.totalRows}</strong><span>Linhas</span></div><div className="success"><strong>{result.importedRows}</strong><span>Importadas</span></div><div className={result.rejectedRows ? "warning" : "success"}><strong>{result.rejectedRows}</strong><span>Rejeitadas</span></div></section>}

      <section className="import-history">
        <header><div><span>HISTÓRICO</span><h2>Importações recentes</h2></div></header>
        {loading ? <div className="admin-empty">Carregando lotes...</div> : batches.length === 0 ? <div className="admin-empty">Nenhuma importação realizada.</div> : <div className="admin-table-wrap"><table><thead><tr><th>Arquivo</th><th>Ação</th><th>Responsável</th><th>Total</th><th>Importados</th><th>Rejeitados</th><th>Data</th><th /></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td><strong>{batch.fileName}</strong><small>{sourceLabel(batch.fileType)}</small></td><td>{batch.campaign.name}<small>{batch.store.shortName}</small></td><td>{batch.uploadedBy.name}</td><td>{batch.totalRows}</td><td className="imported-count">{batch.importedRows}</td><td className={batch.rejectedRows ? "rejected-count" : ""}>{batch.rejectedRows}</td><td>{formatDate(batch.createdAt)}</td><td><button type="button" onClick={() => void openBatch(batch)}>Ver detalhes</button></td></tr>)}</tbody></table></div>}
      </section>

      {detail && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDetail(null)}><section className="admin-modal import-detail" role="dialog" aria-modal="true" aria-labelledby="import-detail-title"><header><div><span>RELATÓRIO DO LOTE</span><h2 id="import-detail-title">{detail.fileName}</h2></div><button type="button" onClick={() => setDetail(null)} aria-label="Fechar">×</button></header><div className="import-detail-summary"><span><b>{detail.totalRows}</b>Total</span><span><b>{detail.importedRows}</b>Importados</span><span><b>{detail.rejectedRows}</b>Rejeitados</span></div>{detail.errors?.length ? <div className="import-error-list">{detail.errors.map((row) => <article key={row.id}><span>Linha {row.rowNumber}</span><div><strong>{errorLabels[row.code] || row.code}</strong><p>{row.message}</p><small>{row.rawData?.nome || "Sem nome"} · {row.rawData?.telefone || "Sem telefone"}</small></div></article>)}{detail.rejectedRows > detail.errors.length && <p className="import-error-limit">Exibindo os primeiros {detail.errors.length} erros de {detail.rejectedRows}.</p>}</div> : <div className="admin-empty">Todas as linhas foram importadas.</div>}</section></div>}
    </div>
  );
}
