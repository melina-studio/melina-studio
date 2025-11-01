import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-full w-full">
      <div className='flex flex-col items-center justify-center h-full'>
        <Link href="/playground/all">Playground</Link>
      </div>
    </div>
  );
}
