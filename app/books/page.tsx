import { permanentRedirect } from "next/navigation";

// /books was merged into /about as a section. The permanent (308) redirect
// preserves the URL fragment so old links land on the books anchor.
export default function BooksPage() {
  permanentRedirect("/about#books");
}
