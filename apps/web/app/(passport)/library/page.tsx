import { redirect } from 'next/navigation';

export default function LibraryAliasPage() {
  redirect('/opportunities?selected=none');
}
