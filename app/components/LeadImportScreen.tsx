"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  onTargetApi,
  type AdminCampaign,
  type AdminClient,
  type AdminStore,
  type ImportBatch,
} from "../lib/ontarget-api";

const errorLabels: Record<string, string> = {
  INVALID_ROW: "Dados inválidos",
  DUPLICATE_IN_FILE: "Duplicado no arquivo",
  DUPLICATE_IN_CAMPAIGN: "Já existe na campanha",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function LeadImportScreen() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [clientId, setClientId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportBatch | null>(null);
  const [detail, setDetail] = useState<ImportBatch | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      onTargetApi.admin.clients(),
      onTargetApi.admin.stores(),
      onTargetApi.admin.campaigns(),
      onTargetApi.admin.imports(),
    ]).then(([clientRows, storeRows, campaignRows, batchRows]) => {
      if (cancelled) return;
      setClients(clientRows.data);
      setStores(storeRows.data);
      setCampaigns(campaignRows.data);
      setBatches(batchRows.data);
      const firstClient = clientRows.data.find((row) => row.active);
      const firstStore = storeRows.data.find((row) => row.active && row.clientId === firstClient?.id);
      const firstCampaign = campaignRows.data.find((row) => row.status === "ACTIVE" && row.storeId === firstStore?.id);
      setClientId(firstClient?.id || "");
      setStoreId(firstStore?.id || "");
      setCampaignId(firstCampaign?.id || "");
    }).catch((cause) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar as importações.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const availableStores = useMemo(() => stores.filter((row) => row.active && row.clientId === clientId), [stores, clientId]);
  const availableCampaigns = useMemo(() => campaigns.filter((row) => row.status === "ACTIVE" && row.clientId === clientId && row.storeId === storeId), [campaigns, clientId, storeId]);

  function selectClient(value: string) {
    const nextStore = stores.find((row) => row.active && row.clientId === value);
    const nextCampaign = campaigns.find((row) => row.status === "ACTIVE" && row.clientId === value && row.storeId === nextStore?.id);
    setClientId(value);
    setStoreId(nextStore?.id || "");
    setCampaignId(nextCampaign?.id || "");
  }

  function selectStore(value: string) {
    setStoreId(value);
    setCampaignId(campaigns.find((row) => row.status === "ACTIVE" && row.storeId === value)?.id || "");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError("Selecione um arquivo CSV ou XLSX.");
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const payload = new FormData();
      payload.set("clientId", clientId);
      payload.set("storeId", storeId);
      payload.set("campaignId", campaignId);
      payload.set("file", file);
      const batch = await onTargetApi.admin.importLeads(payload);
      setResult(batch);
      setDetail(batch);
      setBatches((current) => [batch, ...current.filter((row) => row.id !== batch.id)]);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível importar o arquivo.");
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
      <header className="admin-header">
        <div><span>GESTÃO DE LEADS</span><h1>Importar leads</h1><p>Envie CSV ou XLSX no modelo fixo da OnTarget.</p></div>
        <a className="import-template-link" href="/modelo-importacao-leads.csv" download>Baixar modelo CSV</a>
      </header>

      {error && <div className="admin-message error" role="alert">{error}</div>}

      <div className="import-layout">
        <section className="import-card">
          <div className="import-step"><span>1</span><div><strong>Destino dos leads</strong><small>A campanha define a loja e o cliente responsáveis.</small></div></div>
          <form onSubmit={submit}>
            <label><span>Cliente</span><select value={clientId} required onChange={(event) => selectClient(event.target.value)} disabled={loading}><option value="" disabled>Selecione</option>{clients.filter((row) => row.active).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label><span>Loja</span><select value={storeId} required onChange={(event) => selectStore(event.target.value)} disabled={loading}><option value="" disabled>Selecione</option>{availableStores.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
            <label><span>Campanha ativa</span><select value={campaignId} required onChange={(event) => setCampaignId(event.target.value)} disabled={loading}><option value="" disabled>Selecione</option>{availableCampaigns.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>

            <div className="import-step file-step"><span>2</span><div><strong>Arquivo de leads</strong><small>Até 10 MB e 10.000 linhas por lote.</small></div></div>
            <label className={`import-dropzone ${file ? "selected" : ""}`}>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required onChange={(event) => setFile(event.target.files?.[0] || null)} />
              <span className="import-file-icon">{file ? "✓" : "↑"}</span>
              <strong>{file ? file.name : "Selecione um arquivo"}</strong>
              <small>{file ? `${(file.size / 1024).toFixed(1)} KB` : "CSV ou XLSX"}</small>
            </label>
            <button className="import-submit" type="submit" disabled={uploading || loading || !campaignId}>{uploading ? "Validando e importando..." : "Importar leads"}</button>
          </form>
        </section>

        <aside className="import-rules-card">
          <span>COLUNAS DO MODELO</span>
          <h2>Formato esperado</h2>
          <ul><li><b>nome</b><small>Obrigatório</small></li><li><b>telefone</b><small>Obrigatório e único na campanha</small></li><li><b>veículo</b><small>Obrigatório</small></li><li><b>origem</b><small>Obrigatório</small></li><li><b>motivo</b><small>Opcional</small></li></ul>
          <p>As linhas válidas são importadas. Linhas com erro permanecem no relatório para correção.</p>
        </aside>
      </div>

      {result && <section className="import-result" aria-live="polite"><div><span>Importação concluída</span><strong>{result.fileName}</strong></div><div><strong>{result.totalRows}</strong><span>Linhas</span></div><div className="success"><strong>{result.importedRows}</strong><span>Importadas</span></div><div className={result.rejectedRows ? "warning" : "success"}><strong>{result.rejectedRows}</strong><span>Rejeitadas</span></div></section>}

      <section className="import-history">
        <header><div><span>HISTÓRICO</span><h2>Importações recentes</h2></div></header>
        {loading ? <div className="admin-empty">Carregando lotes...</div> : batches.length === 0 ? <div className="admin-empty">Nenhuma importação realizada.</div> : <div className="admin-table-wrap"><table><thead><tr><th>Arquivo</th><th>Campanha</th><th>Responsável</th><th>Total</th><th>Importados</th><th>Rejeitados</th><th>Data</th><th /></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}><td><strong>{batch.fileName}</strong><small>{batch.fileType}</small></td><td>{batch.campaign.name}<small>{batch.store.shortName}</small></td><td>{batch.uploadedBy.name}</td><td>{batch.totalRows}</td><td className="imported-count">{batch.importedRows}</td><td className={batch.rejectedRows ? "rejected-count" : ""}>{batch.rejectedRows}</td><td>{formatDate(batch.createdAt)}</td><td><button type="button" onClick={() => void openBatch(batch)}>Ver detalhes</button></td></tr>)}</tbody></table></div>}
      </section>

      {detail && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDetail(null)}><section className="admin-modal import-detail" role="dialog" aria-modal="true" aria-labelledby="import-detail-title"><header><div><span>RELATÓRIO DO LOTE</span><h2 id="import-detail-title">{detail.fileName}</h2></div><button type="button" onClick={() => setDetail(null)} aria-label="Fechar">×</button></header><div className="import-detail-summary"><span><b>{detail.totalRows}</b>Total</span><span><b>{detail.importedRows}</b>Importados</span><span><b>{detail.rejectedRows}</b>Rejeitados</span></div>{detail.errors?.length ? <div className="import-error-list">{detail.errors.map((row) => <article key={row.id}><span>Linha {row.rowNumber}</span><div><strong>{errorLabels[row.code] || row.code}</strong><p>{row.message}</p><small>{row.rawData?.nome || "Sem nome"} · {row.rawData?.telefone || "Sem telefone"}</small></div></article>)}{detail.rejectedRows > detail.errors.length && <p className="import-error-limit">Exibindo os primeiros {detail.errors.length} erros de {detail.rejectedRows}.</p>}</div> : <div className="admin-empty">Todas as linhas foram importadas.</div>}</section></div>}
    </div>
  );
}
