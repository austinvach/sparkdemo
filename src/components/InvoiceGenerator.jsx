import { useState, useCallback } from 'react'
import { copyToClipboard, formatSats } from '../utils'

export default function InvoiceGenerator({ wallet, addLog }) {
  const [amountSats, setAmountSats] = useState('')
  const [memo, setMemo] = useState('')
  const [includeSparkInvoice, setIncludeSparkInvoice] = useState(true)
  const [loading, setLoading] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(async () => {
    const sats = parseInt(amountSats, 10)
    if (!sats || sats <= 0) {
      addLog('Enter a valid amount in ₿', 'error')
      return
    }
    setLoading(true)
    setInvoice(null)
    addLog(`Generating Lightning invoice for ${formatSats(sats)} ₿…`, 'info')
    try {
      const params = {
        amountSats: sats,
        memo: memo || undefined,
      }
      if (includeSparkInvoice) params.includeSparkInvoice = true

      const result = await wallet.createLightningInvoice(params)
      setInvoice(result)
      const modeText = includeSparkInvoice ? ' + includeSparkInvoice' : ''
      addLog(`Invoice created (${formatSats(sats)} ₿)${modeText}`, 'success')
    } catch (e) {
      addLog(`Invoice error: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [wallet, amountSats, memo, includeSparkInvoice, addLog])

  const handleCopy = useCallback(async () => {
    if (!invoice) return
    await copyToClipboard(invoice.invoice.encodedInvoice)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [invoice])

  return (
    <div className="section-card">
      <div className="section-title">
        <span className="icon">⚡</span>
        Create Lightning Invoice
        <a
          className="sdk-link"
          href="https://docs.spark.money/api-reference/wallet/create-lightning-invoice"
          target="_blank"
          rel="noreferrer"
        >
          wallet.createLightningInvoice()
        </a>
      </div>

      <div className="row">
        <div className="field" style={{ flex: '1 1 0' }}>
          <label>Amount (₿)</label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 1000"
            value={amountSats}
            onChange={e => setAmountSats(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field" style={{ flex: '1 1 0' }}>
          <label>Memo (optional)</label>
          <input
            type="text"
            placeholder="Payment for…"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field" style={{ flex: '0 0 auto', marginBottom: 0 }}>
          <label style={{ visibility: 'hidden' }}>includeSparkInvoice</label>
          <label className="checkbox-row" style={{ textTransform: 'none', letterSpacing: 'normal', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: 0, minHeight: 40, display: 'flex', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={includeSparkInvoice}
              onChange={e => setIncludeSparkInvoice(e.target.checked)}
              disabled={loading}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <a
                href="https://docs.spark.money/api-reference/wallet/create-lightning-invoice#param-include-spark-invoice"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--accent-light)', textDecoration: 'none' }}
              >
                includeSparkInvoice
              </a>
            </span>
          </label>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={handleGenerate}
        disabled={loading || !amountSats}
        style={{ width: '100%', marginTop: '0.6rem' }}
      >
        {loading ? <><span className="spinner" />Generating…</> : 'Generate Invoice'}
      </button>

      {invoice && (
        <div style={{ marginTop: '0.75rem' }}>
          <div className="invoice-box">
            <div className="invoice-box-header">
              <span className="invoice-box-label">Bolt11 Invoice</span>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {formatSats(invoice.invoice.amountMSats ? Math.ceil(Number(invoice.invoice.amountMSats) / 1000) : parseInt(amountSats, 10))} ₿
                </span>
                <button className="copy-btn" onClick={handleCopy}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="mono" style={{ color: 'var(--accent-light)', fontSize: '0.7rem', lineHeight: '1.4' }}>
              {invoice.invoice.encodedInvoice}
            </div>
          </div>
          {includeSparkInvoice && (
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '0.25rem' }}>
              ✓ includeSparkInvoice enabled: Spark invoice embedded in routing hints
            </div>
          )}
        </div>
      )}
    </div>
  )
}
