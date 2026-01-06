interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <p className="text-sm text-red-800">{error}</p>
    </div>
  );
}
