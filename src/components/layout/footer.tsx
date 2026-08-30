import { CREATOR_INFO } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t bg-white px-4 py-3 text-center text-xs text-zinc-500 sm:px-6 lg:px-8">
      Разработчик: {CREATOR_INFO}
    </footer>
  );
}
