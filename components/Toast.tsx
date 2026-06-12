'use client'
import { useEffect, useState } from 'react'

interface Props { msg: string; err?: boolean }

export default function Toast({ msg, err }: Props) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(true) }, [])
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999,
        background: '#2B2D42', color: 'white', padding: '12px 20px',
        borderRadius: 10, fontSize: '.84rem', fontWeight: 600,
        borderLeft: `4px solid ${err ? '#EF4444' : '#F4721E'}`,
        boxShadow: '0 8px 24px rgba(0,0,0,.25)',
        transform: visible ? 'translateY(0)' : 'translateY(80px)',
        opacity: visible ? 1 : 0,
        transition: 'transform .3s, opacity .3s',
      }}
    >
      {msg}
    </div>
  )
}
