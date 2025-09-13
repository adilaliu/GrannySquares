'use client'

import { useState } from 'react'

export default function SimpleAuthTest() {
  const [message, setMessage] = useState('')

  const handleClick = () => {
    setMessage('Button clicked!')
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Simple Auth Test</h2>
      <button
        onClick={handleClick}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Test Button
      </button>
      {message && (
        <p className="mt-4 text-green-600">{message}</p>
      )}
    </div>
  )
}
