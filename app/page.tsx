import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Three.js Experiments
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Explore interactive 3D visualizations and experiments built with Three.js and React Three Fiber.
          </p>
          
          <div className="grid gap-4 w-full max-w-md mt-4">
            <Link
              href="/interactive-particle-sphere"
              className="group block p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
            >
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Interactive Particle Sphere
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                A dynamic 3D particle sphere with interactive controls
              </p>
            </Link>
            
            <Link
              href="/interactive-particle-model"
              className="group block p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-400 dark:hover:border-zinc-600 transition-all"
            >
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                Interactive Particle Model
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Custom 3D model with particle system interactions
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
