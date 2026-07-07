import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white hard-border hard-shadow rounded-2xl ${className}`}
      {...props}
    />
  );
}
