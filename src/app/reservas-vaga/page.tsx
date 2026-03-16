import { redirect } from 'next/navigation';

export default function ReservasVagaPage() {
  redirect('/minhas-locacoes?visualizacao=proprietario');
}
