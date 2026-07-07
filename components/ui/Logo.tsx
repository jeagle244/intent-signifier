import Image from "next/image";
import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <Image src="/lemfi-logo.png" alt="LemFi" width={140} height={31} priority />
    </Link>
  );
}
