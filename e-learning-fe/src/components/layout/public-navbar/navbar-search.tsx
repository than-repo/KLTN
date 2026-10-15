type NavbarSearchProps = {
  className?: string;
  id: string;
};

export function NavbarSearch({ className = "", id }: NavbarSearchProps) {
  return (
    <form
      action="/courses"
      className={[
        "flex min-h-11 w-full items-center rounded-pill border border-input bg-muted px-2 transition-colors focus-within:border-primary focus-within:bg-card",
        className,
      ].join(" ")}
      method="get"
    >
      <label className="sr-only" htmlFor={id}>
        Search courses
      </label>
      <input
        className="min-w-0 flex-1 bg-transparent px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        id={id}
        name="search"
        placeholder="Search for courses"
        type="search"
      />
      <button
        className="min-h-8 rounded-pill bg-foreground px-4 text-sm font-semibold text-background transition-transform active:scale-95"
        type="submit"
      >
        Search
      </button>
    </form>
  );
}
