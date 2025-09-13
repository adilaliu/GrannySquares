// import AuthExample from "./components/AuthExample";
import WavyGrid from "./components/WavyGrid";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 mb-16">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">Granny Squares</h1>
        {/* <AuthExample /> */}
      </div>

      <WavyGrid />
    </div>
  );
}
