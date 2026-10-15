type CourseCatalogStateProps = {
  message: string;
  title: string;
};

export function CourseCatalogState({ message, title }: CourseCatalogStateProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
