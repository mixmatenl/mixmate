import React from 'react'

export default function Rapporten() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
      <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p className="font-medium text-gray-500">Rapporten komen binnenkort</p>
      <p className="text-sm">Hier komen verbruiksstatistieken en populaire cocktails.</p>
    </div>
  )
}
