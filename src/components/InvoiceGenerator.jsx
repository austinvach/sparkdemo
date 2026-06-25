import { useState, useCallback } from 'react'
import { copyToClipboard, formatSats } from '../utils'

export default function InvoiceGenerator({ wallet, addLog }) {
  const [amountSats, setAmountSats] = useState('')
  const [memo, setMemo] = useState('')
  const [includeSparkAddress, setIncludeSparkAddress] = useState(false)
  const [loading, setLoading] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(async () => {
    const sats = parseInt(amountSats, 10)
    if (!sats || sats <= 0) {
      addLog('Enter a valid amount in sats', 'error')
      return
    }
    setLoading(true)
    setInvoice(null)
    addLog(`Generating Lightning invoice for ${formatSats(sats)} sats…`, 'info')
    try {
      const params = {
        amountSats: sats,
        memo: memo || undefined,
        includeSparkAddress,
      }
      const result = await wallet.createLightningInvoice(params)
      setInvoice(result)
      addLog(`Invoice created (${formatSats(sats)} sats)${includeSparkAddress ? ' + Spark address' : ''}`, 'success')
    } catch (e) {
      addLog(`Invoice error: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [wallet, amountSats, memo, includeSparkAddress, addLog])

  const handleCopy = useCallback(async () => {
    if (!invoice) return
    await copyToClipboard(invoice.invoice.encodedInvoice)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [invoice])

  return (
    <div className="section-card">
      <div className="section-title"><span className="icon">⬇️</span> Receive – Create Lightning Invoice</div>

      <div className="row">
        <div className="field">
          <label>Amount (sats)</label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 1000"
            value={amountSats}
            onChange={e => setAmountSats(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label>Memo (optional)</label>
          <input
            type="text"
            placeholder="Payment for…"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="field" style={{ marginBottom: '0.75rem' }}>
        <label className="checkbox-row" style={{ textTransform: 'none', letterSpacing: 'normal', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeSparkAddress}
            onChange={e => setIncludeSparkAddress(e.target.checked)}
            disabled={loading}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Include Spark address in invoice (enables Spark-native payment fallback)
          </span>
        </label>
      </div>

      <button
        className="btn-primary"
        onClick={handleGenerate}
        disabled={loading || !amountSats}
        style={{ width: '100%' }}
      >
        {loading ? <><span className="spinner" />Generating…</> : '⚡ Generate Invoice'}
      </button>

      {invoice && (
        <div style={{ marginTop: '0.75rem' }}>
          <div className="invoice-box">
            <div className="invoice-box-header">
              <span className="invoice-box-label">Bolt11 Invoice</span>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {formatSats(invoice.invoice.amountMSats ? Math.ceil(Number(invoice.invoice.amountMSats) / 1000) : parseInt(amountSats, 10))} sats
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
          {includeSparkAddress && (
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: '0.25rem' }}>
              ✓ Spark address embedded – sender can pay via Spark network if supported
            </div>
          )}
        </div>
      )}
    </div>
  )
}
