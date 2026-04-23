import type { Metadata } from 'next';
import PhotoEditorInteractiveTest from './components/PhotoEditorInteractiveTest';

export const metadata: Metadata = {
  title: 'Create Test - The Agency Brand Studio',
  description: 'Experimental workspace for testing new branded overlay formats.',
};

export default function CreateTestPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F]">
      <PhotoEditorInteractiveTest />
    </main>
  );
}
