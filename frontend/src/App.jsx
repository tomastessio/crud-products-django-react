import React, { useEffect, useMemo, useState } from 'react'
import {
  AppBar, Toolbar, Container, Card, CardHeader, CardContent,
  Box, Stack, TextField, Button, Typography, IconButton, Divider,
  Snackbar, Alert, LinearProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip, InputAdornment, Chip
} from '@mui/material'
import { LoadingButton } from '@mui/lab'
import {
  Save as SaveIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  UploadFile as UploadIcon,
  Download as DownloadIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Inventory2Outlined as EmptyIcon
} from '@mui/icons-material'
import {
  DataGrid,
  GridToolbarQuickFilter,
  GridToolbarDensitySelector,
  GridToolbarColumnsButton
} from '@mui/x-data-grid'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const GRID_PREFS_KEY = 'articulos-grid-v5'

// ---------- helpers ----------
const toNumber = (n) => {
  if (typeof n === 'number') return n
  if (n == null) return NaN
  let s = String(n).trim().replace(/\s/g, '')
  const hasComma = s.includes(',')
  const hasDot = s.includes('.')
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',')
    const lastDot = s.lastIndexOf('.')
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (hasComma) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(/,/g, '')
  }
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : NaN
}
const fmtARS = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' })
    .format(Number.isFinite(toNumber(n)) ? toNumber(n) : 0)

// ---------- UI auxiliares ----------
function ConfirmDialog({ open, title, content, onClose, onConfirm, loading = false }) {
  return (
    <Dialog open={open} onClose={() => !loading && onClose()}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>{content}</DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <LoadingButton color="error" variant="contained" onClick={onConfirm} loading={loading}>
          Eliminar
        </LoadingButton>
      </DialogActions>
    </Dialog>
  )
}

function GridToolbarExtras({ onExport }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1 }}>
      <GridToolbarQuickFilter placeholder="Buscar…" />
      <GridToolbarColumnsButton />
      <GridToolbarDensitySelector />
      <Box sx={{ flex: 1 }} />
      <Button
        onClick={onExport}
        startIcon={<Download as any />}
        size="small"
        color="success"
        variant="contained"
      >
        Exportar Excel
      </Button>
    </Stack>
  )
}

// ---------- main ----------
export default function App ({ mode, onToggleMode }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({ id: null, code: '', description: '', price: '' })
  const [touched, setTouched] = useState({ code: false, description: false, price: false })

  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState([])
  const [toast, setToast] = useState({ open: false, msg: '', sev: 'success' })
  const [importing, setImporting] = useState(false)
  const [confirm, setConfirm] = useState({ open: false, row: null, loading: false })

  // undo tras borrar
  const [undo, setUndo] = useState({ open: false, row: null })

  // paginación (v5)
  const savedPrefs = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(GRID_PREFS_KEY) || '{}') } catch { return {} }
  }, [])
  const [pageSize, setPageSize] = useState(savedPrefs.pageSize || 10)
  useEffect(() => {
    localStorage.setItem(GRID_PREFS_KEY, JSON.stringify({ pageSize }))
  }, [pageSize])

  // ----- carga -----
  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/articles/`)
      const data = await res.json()
      setItems(data.results || data)
    } catch {
      setToast({ open: true, msg: 'Error cargando artículos', sev: 'error' })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchItems() }, [])

  // normalización
  const rows = useMemo(
    () => (items || []).map(it => ({
      id: it.id ?? it.code,
      code: it.code ?? '',
      description: it.description ?? '',
      price: toNumber(it.price)
    })),
    [items]
  )
  const total = useMemo(
    () => rows.reduce((acc, r) => acc + (Number.isFinite(r.price) ? r.price : 0), 0),
    [rows]
  )

  // validaciones
  const priceStr = String(form.price ?? '').trim()
  const priceNum = toNumber(priceStr)
  const priceEmpty = priceStr === ''
  const priceInvalidValue = !Number.isFinite(priceNum) || priceNum < 0
  const priceError = touched.price && (priceEmpty || priceInvalidValue)
  const codeDuplicate = useMemo(
    () => !form.id && form.code.trim() && items.some(it => String(it.code).trim() === form.code.trim()),
    [form.id, form.code, items]
  )
  const codeError = touched.code && Boolean(codeDuplicate)
  const canSubmit =
    form.code.trim() && form.description.trim() &&
    !codeDuplicate && !priceEmpty && !priceInvalidValue

  const resetForm = () => {
    setForm({ id: null, code: '', description: '', price: '' })
    setTouched({ code: false, description: false, price: false })
  }

  // guardar
  const save = async (e) => {
    e.preventDefault()
    if (!canSubmit) {
      setTouched({ code: true, description: true, price: true })
      setToast({ open: true, msg: 'Revisá los campos del formulario', sev: 'warning' })
      return
    }
    const current = form.id ? items.find(x => x.id === form.id)?.price : null
    let priceFinal = toNumber(form.price)
    if (!Number.isFinite(priceFinal) && current != null) priceFinal = toNumber(current)

    const payload = { code: form.code.trim(), description: form.description.trim(), price: priceFinal }
    const url = form.id ? `${API_URL}/api/articles/${form.id}/` : `${API_URL}/api/articles/`
    const method = form.id ? 'PUT' : 'POST'

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (!res.ok) { setToast({ open: true, msg: 'No se pudo guardar', sev: 'error' }); return }

    await fetchItems()
    resetForm()
    setToast({ open: true, msg: form.id ? 'Artículo actualizado' : 'Artículo creado', sev: 'success' })
  }

  // eliminar
  const askDelete = (row) => setConfirm({ open: true, row, loading: false })
  const doDelete = async () => {
    if (!confirm.row) return
    setConfirm((c) => ({ ...c, loading: true }))
    const res = await fetch(`${API_URL}/api/articles/${confirm.row.id}/`, { method: 'DELETE' })
    if (!res.ok) { setToast({ open: true, msg: 'No se pudo eliminar', sev: 'error' }); setConfirm({ open: false, row: null, loading: false }); return }
    setUndo({ open: true, row: { ...confirm.row } })
    await fetchItems()
    setToast({ open: true, msg: 'Artículo eliminado', sev: 'success' })
    setConfirm({ open: false, row: null, loading: false })
  }

  // UNDO
  const handleUndo = async () => {
    if (!undo.row) { setUndo({ open: false, row: null }); return }
    try {
      const payload = { code: undo.row.code, description: undo.row.description, price: undo.row.price }
      const res = await fetch(`${API_URL}/api/articles/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('restore failed')
      setToast({ open: true, msg: 'Artículo restaurado', sev: 'success' })
      await fetchItems()
    } catch {
      setToast({ open: true, msg: 'No se pudo deshacer', sev: 'error' })
    } finally {
      setUndo({ open: false, row: null })
    }
  }

  // import / export
  const doImport = async () => {
    if (!file) { setToast({ open: true, msg: 'Elegí un .xlsx primero', sev: 'warning' }); return }
    setImporting(true); setErrors([])
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch(`${API_URL}/api/articles/import/`, { method: 'POST', body: fd })
      const data = await res.json()
      setErrors(data.errors || []); await fetchItems()
      setToast({ open: true, msg: `Importación: Creados ${data.created || 0}, Actualizados ${data.updated || 0}`, sev: 'success' })
    } catch { setToast({ open: true, msg: 'Error importando Excel', sev: 'error' }) }
    finally { setImporting(false) }
  }
  const doExport = () => { window.location.href = `${API_URL}/api/articles/export/` }

  // columnas
  const columns = useMemo(() => ([
    { field: 'code', headerName: 'Código', flex: 1, minWidth: 120 },
    { field: 'description', headerName: 'Descripción', flex: 2, minWidth: 200 },
    {
      field: 'price',
      headerName: 'Precio',
      type: 'number',
      flex: 1,
      minWidth: 140,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Box sx={{ width: '100%', textAlign: 'right' }}>
          {fmtARS(params.row?.price)}
        </Box>
      )
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      sortable: false,
      filterable: false,
      width: 120,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ width: '100%' }}>
          <IconButton
            color="primary"
            size="small"
            onClick={() => {
              setForm({
                id: params.row.id,
                code: params.row.code,
                description: params.row.description,
                price: String(params.row.price ?? '')
              })
              setTouched({ code: false, description: false, price: false })
            }}
            aria-label={`Editar artículo ${params.row.code}`}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => askDelete(params.row)} aria-label={`Eliminar artículo ${params.row.code}`}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      )
    }
  ]), [])

  return (
    <>
      {/* AppBar con toggle */}
      <AppBar position="sticky" elevation={0} color="transparent" sx={{ backdropFilter: 'blur(6px)' }}>
        <Toolbar sx={{ px: { xs: 2, md: '10vw' } }}>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>Gestión de Artículos</Typography>
          <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            <IconButton onClick={onToggleMode} sx={{ mr: 1 }} aria-label="Alternar tema claro/oscuro">
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
        <Divider />
      </AppBar>

      {/* Contenido */}
      <Container maxWidth={false} disableGutters sx={{ py: 4, px: { xs: 2, md: '10vw' } }}>
        {/* FILA SUPERIOR */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* Form */}
          <Card elevation={1} sx={{ height: '100%', width: '100%' }}>
            <CardHeader title={form.id ? 'Editar artículo' : 'Nuevo artículo'} />
            <CardContent>
              <Box component="form" onSubmit={save} aria-label="Formulario de artículo">
                <Stack spacing={2}>
                  <TextField
                    label="Código"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    onBlur={() => setTouched(t => ({ ...t, code: true }))}
                    required size="small"
                    error={codeError}
                    helperText={codeError ? 'Ya existe un artículo con ese código' : ' '}
                  />
                  <TextField
                    label="Descripción"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    onBlur={() => setTouched(t => ({ ...t, description: true }))}
                    required size="small"
                  />
                  <TextField
                    label="Precio"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    onBlur={() => setTouched(t => ({ ...t, price: true }))}
                    required size="small"
                    type="text"
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    placeholder="0,00"
                    error={priceError}
                    helperText={
                      priceError
                        ? 'Ingresá un precio válido (>= 0). Usá coma o punto para decimales'
                        : 'Usá coma o punto para decimales'
                    }
                  />
                  <Stack direction="row" spacing={1}>
                    <LoadingButton
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      loading={loading}
                      disabled={!canSubmit}
                    >
                      {form.id ? 'Actualizar' : 'Crear'}
                    </LoadingButton>
                    {form.id && <Button variant="outlined" onClick={resetForm}>Cancelar</Button>}
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          {/* Import / Export */}
          <Card elevation={1} sx={{ height: '100%', width: '100%' }}>
            <CardHeader title="Importar / Exportar Excel" />
            {importing && <LinearProgress />}
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <input id="file-input" type="file" accept=".xlsx"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }} />
                <label htmlFor="file-input">
                  <Button component="span" variant="outlined" startIcon={<UploadIcon />}>Elegir archivo</Button>
                </label>
                <LoadingButton variant="contained" onClick={doImport} startIcon={<UploadIcon />} loading={importing}>
                  Importar
                </LoadingButton>
                <Button variant="contained" color="success" onClick={doExport} startIcon={<DownloadIcon />}>
                  Exportar
                </Button>
                <Box sx={{ ml: 1, color: 'text.secondary' }}>
                  {file?.name || 'Ningún archivo seleccionado'}
                </Box>
              </Stack>

              {!!errors.length && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Alert severity="warning" variant="outlined" sx={{ mb: 1 }}>
                    Errores de importación:
                  </Alert>
                  <Box component="ul" sx={{ mt: 0, pl: 3 }}>
                    {errors.map((er, i) => (<li key={i}>Fila {er.row}: {er.error}</li>))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>

          {/* Listado full-width */}
          <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
            <Card elevation={1} sx={{ width: '100%' }}>
              <CardHeader
                title={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6">Listado de Artículos ({rows.length})</Typography>
                    <Chip size="small" label={`Total: ${fmtARS(total)}`} />
                  </Stack>
                }
              />
              <Divider />
              <CardContent>
                {!rows.length ? (
                  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <EmptyIcon sx={{ fontSize: 64, mb: 1, opacity: 0.7 }} />
                    <Typography variant="h6" gutterBottom>No hay artículos</Typography>
                    <Typography variant="body2">Creá uno con el formulario o importá desde Excel.</Typography>
                  </Box>
                ) : (
                  <div style={{ width: '100%' }}>
                    <DataGrid
                      rows={rows}
                      columns={columns}
                      getRowId={(row) => row.id}
                      autoHeight
                      disableSelectionOnClick
                      pagination
                      rowsPerPageOptions={[5, 10, 25]}
                      pageSize={pageSize}
                      onPageSizeChange={(newSize) => setPageSize(newSize)}
                      components={{ Toolbar: GridToolbarExtras }}
                      componentsProps={{ toolbar: { onExport: doExport } }}
                      loading={loading}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Snackbars / Confirm */}
        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.sev} variant="filled" sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        </Snackbar>

        <Snackbar
          open={undo.open}
          autoHideDuration={5000}
          onClose={() => setUndo({ open: false, row: null })}
          message={undo.row ? `Artículo "${undo.row.description}" eliminado` : 'Eliminado'}
          action={<Button color="inherit" size="small" onClick={handleUndo}>DESHACER</Button>}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        />

        <ConfirmDialog
          open={confirm.open}
          title="Confirmar eliminación"
          content={confirm.row ? `¿Eliminar el artículo "${confirm.row.description}" (código ${confirm.row.code})?` : ''}
          onClose={() => setConfirm({ open: false, row: null, loading: false })}
          onConfirm={doDelete}
          loading={confirm.loading}
        />
      </Container>
    </>
  )
}
