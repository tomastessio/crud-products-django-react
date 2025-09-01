import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

function Root() {
  const [mode, setMode] = React.useState(() => localStorage.getItem('mui-mode') || 'light')

  const theme = React.useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#1976d2' },
      secondary: { main: '#9c27b0' }
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
      MuiButton: { defaultProps: { disableElevation: true } }
    }
  }), [mode])

  const onToggleMode = React.useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem('mui-mode', next)
      return next
    })
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App mode={mode} onToggleMode={onToggleMode} />
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')).render(<Root />)
