'use client'

import { useState } from 'react'
import OTPInput from '@/components/OTPInput'

export default function TestOtpPage() {
  const [val, setVal] = useState('')
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-8">
      <div className="w-full max-w-md bg-surface2 p-8 rounded-xl">
        <h2 className="text-xl font-bold mb-4">OTP Test</h2>
        <p className="text-sm text-muted mb-4">Type into the OTP inputs; focus should move and persist.</p>
        <OTPInput value={val} onChange={setVal} />
        <div className="mt-4 text-sm font-mono">Value: {val}</div>
      </div>
    </div>
  )
}
