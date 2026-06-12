'use client'
import { useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
  colHint: string
}

export default function UploadZone({ onFile, colHint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]; if (file) onFile(file)
  }

  return (
    <div>
      <div
        className={`upload-zone p-5 flex flex-col sm:flex-row items-center justify-center gap-4 ${dragging ? 'drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }}
        />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F4721E" strokeWidth="2.2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Cargar o recargar Excel (.xlsx / .xls / .csv)</p>
            <p className="text-xs text-gray-500">Arrastra aquí o haz clic · Funciona offline</p>
          </div>
        </div>
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors shadow-sm shrink-0"
          onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
        >
          Seleccionar archivo
        </button>
      </div>

      {colHint && (
        <div className="mt-2 p-3 bg-white rounded-xl border border-orange-100 text-xs text-gray-500">
          <span className="font-semibold text-orange-600">Columnas detectadas:</span> {colHint}
        </div>
      )}
    </div>
  )
}
