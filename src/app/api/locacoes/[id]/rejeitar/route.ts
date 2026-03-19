import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Fluxo de rejeicao manual desativado. O uso da vaga so pode falhar por indisponibilidade, conflito de periodo ou regra do sistema.',
    },
    { status: 410 }
  );
}
