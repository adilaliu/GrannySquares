import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-6">
          Sorry, we couldn't complete your authentication. This could be due to an expired 
          or invalid authentication code.
        </p>
        <div className="space-y-4">
          <Link
            href="/auth/sign-in"
            className="block w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Try Again
          </Link>
          <Link
            href="/"
            className="block w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
