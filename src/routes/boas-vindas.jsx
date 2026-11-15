import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/components/auth/LoginPage';

export const Route = createFileRoute('/boas-vindas')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Boas-vindas · Quebrando a Banca — A Ascensão' },
      { name: 'description', content: 'Conhecimento · Estratégia · Disciplina · Conquista.' },
    ],
  }),
  component: LoginPage,
});