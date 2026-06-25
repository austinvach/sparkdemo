import { useState, useCallback } from 'react'
import './App.css'
import WalletPanel from './components/WalletPanel'

export default function App() {
  const [wallets, setWallets] = useState([null, null])
  const [network, setNetwork] = useState('MAINNET')

  const setWallet = useCallback((index, wallet) => {
    setWallets(prev => {
      const next = [...prev]
      next[index] = wallet
      return next
    })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="app-header">
        <div>
          <h1>Spark SDK Sandbox</h1>
          <div className="subtitle">Two-wallet Lightning payment demo using the Spark SDK</div>
        </div>
        <label className="network-control">
          <select value={network} onChange={e => setNetwork(e.target.value)}>
            <option value="REGTEST">Regtest</option>
            <option value="MAINNET">Mainnet</option>
          </select>
        </label>
      </header>

      <div className="app-body">
        <WalletPanel index={0} wallet={wallets[0]} onWalletReady={setWallet} network={network} />
        <WalletPanel index={1} wallet={wallets[1]} onWalletReady={setWallet} network={network} />
      </div>
    </div>
  )
}
