"use client";

import * as React from "react";
import { navigate } from "./router";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

const Link = React.forwardRef<HTMLAnchorElement, Props>(function Link({ href, onClick, children, ...rest }, ref) {
  return (
    <a
      ref={ref}
      href={`#${href}`}
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
