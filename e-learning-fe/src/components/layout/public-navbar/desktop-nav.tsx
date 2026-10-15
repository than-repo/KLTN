import { NavLink, type PublicNavLink } from "./nav-link";

type DesktopNavProps = {
  links: PublicNavLink[];
};

export function DesktopNav({ links }: DesktopNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="hidden shrink-0 items-center gap-1 md:flex"
    >
      {links.map((link) => (
        <NavLink key={link.href} link={link} />
      ))}
    </nav>
  );
}
