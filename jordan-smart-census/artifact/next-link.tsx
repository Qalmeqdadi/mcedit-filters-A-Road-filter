import * as React from "react";
import { navigate } from "./router";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string; prefetch?: boolean };

const Link = React.forwardRef<HTMLAnchorElement, Props>(function Link({ href, onClick, children, prefetch, ...rest }, ref) {
  void prefetch;
  return (
    <a
      ref={ref}
      href={href === "/" ? "#" : `#${href.slice(1)}`}
      data-href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
});

export default Link;
