import { createRoot } from 'react-dom/client'
import './tokens/theme.css'
import './tokens/extra.css'
import './tokens/global.css'
import { App } from './app/App'

createRoot(document.getElementById('root')!).render(<App />)
